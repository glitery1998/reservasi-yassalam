"use client";
import { useState } from "react";
import Link from "next/link";

type Reservation = {
  Id: number;
  nama_tamu: string;
  no_whatsapp: string;
  outlet: string;
  tanggal: string;
  jam: string;
  jam_selesai: string;
  jumlah_tamu: number;
  status: string;
  meja_id: number | null;
  share_token: string | null;
  catatan: string | null;
};

type TableData = { Id: number; nama_meja: string | null; nomor_meja: number };

function formatJam(jam: string) {
  return (jam || "").slice(0, 5);
}

// Gabungkan baris-baris reservasi yang share_token-nya sama jadi 1 entri saja
// (ambil baris dengan Id terkecil sebagai wakil dari grup meja gabungan).
function dedupeByShareToken(rows: Reservation[]): Reservation[] {
  const bestByToken = new Map<string, Reservation>();
  const noToken: Reservation[] = [];
  for (const r of rows) {
    if (!r.share_token) { noToken.push(r); continue; }
    const existing = bestByToken.get(r.share_token);
    if (!existing || r.Id < existing.Id) bestByToken.set(r.share_token, r);
  }
  return [...bestByToken.values(), ...noToken];
}

const statusStyle: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Cancelled: "bg-red-50 text-red-600 border-red-200",
  "No-Show": "bg-orange-50 text-orange-700 border-orange-300",
};

const statusLabel: Record<string, string> = {
  Pending: "Menunggu Konfirmasi",
  Confirmed: "Terkonfirmasi",
  Completed: "Selesai",
  Cancelled: "Dibatalkan",
  "No-Show": "Tidak Hadir",
};

export default function CekReservasiPage() {
  const [nomorWa, setNomorWa] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasil, setHasil] = useState<Reservation[]>([]);
  const [semuaBaris, setSemuaBaris] = useState<Reservation[]>([]); // data mentah (belum di-dedup), buat cari sibling meja gabungan
  const [tables, setTables] = useState<TableData[]>([]);
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [error, setError] = useState("");

  async function handleCari(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nomorWa.trim()) { setError("Masukkan nomor WhatsApp kamu dulu ya."); return; }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch("/api/cek-reservasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorWa }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Gagal mengambil data. Coba lagi sebentar ya.");
        setHasil([]);
        setTables([]);
        setLoading(false);
        return;
      }

      const rows = json.reservations as Reservation[];
      setHasil(dedupeByShareToken(rows));
      setSemuaBaris(rows);
      setTables(json.tables as TableData[]);
    } catch {
      setError("Gagal mengambil data. Coba lagi sebentar ya.");
    }

    setLoading(false);
  }

  function getMejaLabel(id: number | null) {
    if (!id) return null;
    const t = tables.find((x) => x.Id === id);
    return t ? (t.nama_meja || `Meja ${t.nomor_meja}`) : null;
  }
  // Untuk reservasi gabungan, gabungkan label semua meja sibling (mis. "Meja 1 & Meja 2")
  function getReservasiMejaLabel(r: Reservation) {
    if (!r.meja_id) return null;
    if (!r.share_token) return getMejaLabel(r.meja_id);
    const siblingMejaIds = semuaBaris
      .filter((x) => x.share_token === r.share_token)
      .map((x) => x.meja_id)
      .filter((id): id is number => id != null);
    if (siblingMejaIds.length <= 1) return getMejaLabel(r.meja_id);
    return siblingMejaIds.map((id) => getMejaLabel(id)).join(" & ");
  }
  // Ambil semua nomor meja (bukan Id) untuk reservasi ini — dipakai buat angka besar di stub tiket (mis. "1+2")
  function getSiblingNomorMeja(r: Reservation): number[] {
    if (!r.meja_id) return [];
    if (!r.share_token) {
      const t = tables.find((x) => x.Id === r.meja_id);
      return t ? [t.nomor_meja] : [];
    }
    const siblingMejaIds = semuaBaris
      .filter((x) => x.share_token === r.share_token)
      .map((x) => x.meja_id)
      .filter((id): id is number => id != null);
    return siblingMejaIds
      .map((id) => tables.find((x) => x.Id === id)?.nomor_meja)
      .filter((n): n is number => n != null);
  }

  async function downloadTiket(r: Reservation) {
    const jsPDF = (await import("jspdf")).default;
    const QRCode = (await import("qrcode")).default;

    // Data meja — dukung meja tunggal MAUPUN meja gabungan
    const siblingNomorMeja = getSiblingNomorMeja(r);
    const isGabungan = siblingNomorMeja.length > 1;
    const mejaBigLabel = isGabungan ? (siblingNomorMeja.join("+") || "-") : String(siblingNomorMeja[0] ?? "-");
    const mejaInfoValue = getReservasiMejaLabel(r) || "-";
    const kodeTiket = `YSL-${r.outlet.toUpperCase().slice(0, 3)}-${r.tanggal.replace(/-/g, "")}-M${mejaBigLabel}`;

    // QR code asli (bisa discan admin dengan kamera HP biasa) — encode share_token
    const qrPayload = r.share_token ? `YSL-CHECKIN:${r.share_token}` : null;
    const qrDataUrl = qrPayload
      ? await QRCode.toDataURL(qrPayload, { margin: 0, width: 240, color: { dark: "#3D2B14", light: "#FFFFFF" } })
      : null;

    // Format tiket ala konser: landscape, ada stub sobekan di sisi kanan
    const pdf = new jsPDF("l", "mm", [200, 85]);
    const w = 200, h = 85;
    const stubW = 60, stubX = w - stubW;
    const cx2 = stubX + stubW / 2;

    const gold: [number, number, number] = [200, 151, 62];
    const brown1: [number, number, number] = [42, 26, 14];
    const cream: [number, number, number] = [255, 252, 245];
    const textDark: [number, number, number] = [72, 51, 26];
    const textMuted: [number, number, number] = [160, 140, 115];

    pdf.setFillColor(...cream); pdf.rect(0, 0, w, h, "F");
    pdf.setFillColor(...gold); pdf.rect(0, 0, w, 2, "F"); pdf.rect(0, h - 2, w, 2, "F");
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.35); pdf.roundedRect(4, 4, w - 8, h - 8, 3, 3, "S");
    pdf.setDrawColor(220, 195, 150); pdf.setLineWidth(0.15); pdf.roundedRect(10, 7, stubX - 20, 73, 2, 2, "S");
    pdf.setDrawColor(220, 195, 150); pdf.roundedRect(stubX + 10, 7, stubW - 20, 73, 2, 2, "S");

    function diamond(dx: number, dy: number, s: number) {
      pdf.setFillColor(...gold);
      pdf.triangle(dx, dy - s, dx - s, dy, dx, dy + s, "F");
      pdf.triangle(dx, dy - s, dx + s, dy, dx, dy + s, "F");
    }
    diamond(9, 9, 1.4); diamond(w - 9, 9, 1.4); diamond(9, h - 9, 1.4); diamond(w - 9, h - 9, 1.4);

    pdf.setDrawColor(...gold); pdf.setLineDashPattern([1.5, 1.5], 0); pdf.setLineWidth(0.25);
    pdf.line(stubX, 8, stubX, h - 8); pdf.setLineDashPattern([], 0);
    pdf.setFillColor(...cream); pdf.circle(stubX, 3, 3, "F"); pdf.circle(stubX, h - 3, 3, "F");
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.3); pdf.circle(stubX, 3, 3, "S"); pdf.circle(stubX, h - 3, 3, "S");

    /* ===== BAGIAN KIRI ===== */
    const contentR = stubX - 16;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(...gold);
    pdf.setCharSpace(0.5); pdf.text("YASSALAM ARABIAN RESTO & CATERING", 16, 18); pdf.setCharSpace(0);
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(16, 22, contentR, 22);

    pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(...brown1);
    pdf.setCharSpace(0.4); pdf.text("TIKET RESERVASI", 16, 37); pdf.setCharSpace(0);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...gold);
    pdf.text(`a.n. ${r.nama_tamu}`, 16, 45);

    const dcx = (16 + contentR) / 2;
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(16, 51, dcx - 4, 51); pdf.line(dcx + 4, 51, contentR, 51);
    diamond(dcx, 51, 1.5);

    const col = [16, 16 + (contentR - 16) / 3, 16 + ((contentR - 16) / 3) * 2];
    const fields: { lbl: string; val: string }[] = [
      { lbl: "OUTLET", val: r.outlet.charAt(0).toUpperCase() + r.outlet.slice(1) },
      { lbl: "TANGGAL", val: r.tanggal },
      { lbl: "JAM", val: `${formatJam(r.jam)} - ${formatJam(r.jam_selesai)}` },
      { lbl: "JUMLAH TAMU", val: `${r.jumlah_tamu} orang` },
      { lbl: "MEJA", val: mejaInfoValue },
    ];

    fields.forEach((f, i) => {
      const cIdx = i % 3, rIdx = Math.floor(i / 3);
      const x = col[cIdx], y = 58 + rIdx * 14;
      pdf.setFillColor(...gold); pdf.circle(x - 3, y - 2, 0.6, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(...textMuted);
      pdf.text(f.lbl, x, y);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(f.val.length > 16 ? 7 : 8.5); pdf.setTextColor(...textDark);
      pdf.text(f.val, x, y + 6);
    });

    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5); pdf.setTextColor(...gold);
    pdf.text(kodeTiket, 7, h / 2, { align: "center", angle: 90 });

    /* ===== STUB KANAN ===== */
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(...gold);
    pdf.setCharSpace(0.6); pdf.text("MEJA", cx2, 20, { align: "center" }); pdf.setCharSpace(0);
    pdf.setFontSize(32); pdf.setTextColor(...brown1);
    pdf.text(mejaBigLabel, cx2, 37, { align: "center" });
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(cx2 - 12, 41, cx2 + 12, 41);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(...textMuted);
    pdf.text(`${r.outlet.charAt(0).toUpperCase() + r.outlet.slice(1)} - ${r.tanggal}`, cx2, 47, { align: "center" });

    if (qrDataUrl) {
      const qrSize = 23;
      pdf.setFillColor(255, 255, 255); pdf.roundedRect(cx2 - qrSize / 2 - 1.5, 50, qrSize + 3, qrSize + 3, 2, 2, "F");
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.25); pdf.roundedRect(cx2 - qrSize / 2 - 1.5, 50, qrSize + 3, qrSize + 3, 2, 2, "S");
      pdf.addImage(qrDataUrl, "PNG", cx2 - qrSize / 2, 51.5, qrSize, qrSize);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(4.8); pdf.setTextColor(...textMuted);
      pdf.text(kodeTiket, cx2, 78, { align: "center" });
      pdf.setFontSize(4.3); pdf.setTextColor(180, 165, 140);
      pdf.text("Scan saat tiba di outlet", cx2, 79.5, { align: "center" });
    }

    pdf.save(`Tiket-Reservasi-Yassalam-${r.tanggal}.pdf`);
  }
  return (
    <div className="min-h-screen bg-[#FDF6EC] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #C8973E11 0%, transparent 40%), radial-gradient(circle at 80% 80%, #C8973E11 0%, transparent 40%)" }} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 bg-white border border-[#E8DCC8] px-4 py-2 rounded-full text-sm font-medium text-[#5C3D1A] shadow-sm hover:bg-[#FDF6EC] transition-colors mb-9"
        >
          ← Kembali
        </button>

        <div className="text-center mb-7">
          <div className="w-[52px] h-[52px] rounded-full bg-white border border-[#E8DCC8] flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8973E" strokeWidth="1.8">
              <path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[#C8973E] text-xs tracking-[0.3em] uppercase font-semibold">Yassalam Arabian Resto</p>
          <h1 className="font-serif text-3xl text-[#5C3D1A] mt-1.5">Cek Reservasi Saya</h1>
          <div className="w-8 h-px bg-[#C8973E] mx-auto my-3.5" />
          <p className="text-[#8B7355] text-sm max-w-xs mx-auto leading-relaxed">Masukkan nomor WhatsApp yang kamu pakai saat reservasi.</p>
        </div>

        <form onSubmit={handleCari} className="bg-white rounded-2xl border border-[#E8DCC8] p-5 sm:p-6" style={{ boxShadow: "0 4px 16px rgba(92,61,26,0.06)" }}>
          <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-2">Nomor WhatsApp</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#C8973E" className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/>
              </svg>
              <input
                type="tel"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                placeholder="08123456789"
                className="w-full h-[46px] pl-10 pr-4 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-[46px] px-6 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {loading ? "Mencari..." : "Cari Reservasi"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </form>

        <p className="text-center text-xs text-[#B5A594] mt-5">
          Tidak menemukan reservasimu?{" "}
          <a href="https://wa.me/6281222666068" target="_blank" rel="noopener noreferrer" className="text-[#C8973E] font-medium hover:text-[#A67B2E] transition-colors">
            Hubungi kami via WhatsApp
          </a>
        </p>

        {searched && !loading && (
          <div className="mt-8 space-y-4">
            {hasil.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#8B7355]">Tidak ditemukan reservasi dengan nomor ini.</p>
                <p className="text-[#8B7355] text-sm mt-1">Pastikan nomornya sama seperti saat reservasi, atau hubungi kami lewat WhatsApp.</p>
              </div>
            ) : (
              hasil.map((r) => (
                <div key={r.Id} className="bg-white rounded-2xl border border-[#E8DCC8] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-serif text-lg text-[#5C3D1A]">{r.nama_tamu}</h3>
                      <p className="text-xs text-[#8B7355] uppercase tracking-wide mt-0.5 capitalize">{r.outlet} · {r.tanggal}</p>
                    </div>
                    <span className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wide ${statusStyle[r.status] || ""}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F0E6D2]">
                    <div>
                      <p className="text-[10px] text-[#B5A594] uppercase tracking-wide">Jam</p>
                      <p className="text-sm font-semibold text-[#5C3D1A]">{formatJam(r.jam)} – {formatJam(r.jam_selesai)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#B5A594] uppercase tracking-wide">Tamu</p>
                      <p className="text-sm font-semibold text-[#5C3D1A]">{r.jumlah_tamu} orang</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#B5A594] uppercase tracking-wide">Meja</p>
                      <p className="text-sm font-semibold text-[#5C3D1A]">{getReservasiMejaLabel(r) || "—"}</p>
                    </div>
                  </div>

                  {r.catatan && (
                    <p className="text-sm text-[#8B7355] italic mt-3 border-l-2 border-[#C8973E]/40 pl-3">&ldquo;{r.catatan}&rdquo;</p>
                  )}

                  {(() => {
                    const isAktif = r.status === "Pending" || r.status === "Confirmed";
                    const sudahSelesai = r.status === "Completed";
                    const showMenu = !!r.share_token;
                    const showTiket = r.status !== "Cancelled" && r.status !== "No-Show";
                    if (!showMenu && !showTiket) return null;
                    return (
                      <div className="flex gap-2.5 mt-4">
                        {showMenu && (
                          sudahSelesai ? (
                            <button
                              type="button"
                              onClick={() => setShowSelesaiModal(true)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E8DCC8] text-[#8B7355] text-sm font-semibold hover:bg-[#FDF6EC] transition-colors"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M4 19.5V4.5a1 1 0 0 1 1-1h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
                              </svg>
                              Lihat Menu
                            </button>
                          ) : (
                            <Link
                              href={`/pesan/${r.share_token}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E8DCC8] text-[#5C3D1A] text-sm font-semibold hover:bg-[#FDF6EC] transition-colors"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M4 19.5V4.5a1 1 0 0 1 1-1h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
                              </svg>
                              {isAktif ? "Lihat / Ubah Menu" : "Lihat Menu"}
                            </Link>
                          )
                        )}
                        {showTiket && (
                          <button
                            onClick={() => sudahSelesai ? setShowSelesaiModal(true) : downloadTiket(r)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-semibold active:scale-[0.98] transition-all shadow-sm shadow-[#C8973E]/20"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Unduh Tiket
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        )}

        {showSelesaiModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowSelesaiModal(false)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-7 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✓</span>
                </div>
                <h3 className="text-white font-bold text-lg font-serif">Reservasi Sudah Selesai</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[#5C3D1A] text-sm leading-relaxed">
                  Reservasi ini sudah selesai dan tidak bisa diakses atau diunduh lagi. Terima kasih sudah berkunjung ke Yassalam!
                </p>
                <button
                  onClick={() => setShowSelesaiModal(false)}
                  className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}