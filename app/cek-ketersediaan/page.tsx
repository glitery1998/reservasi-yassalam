"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../supabase";

type TableData = {
  Id: number; outlet: string; nomor_meja: number; nama_meja: string | null;
  kapasitas: number; posisi: string; kapasitas_minimum: number | null;
  foto_url: string | null;
};

type MejaGabungan = {
  Id: number; outlet: string; nama: string; meja_ids: number[];
  kapasitas_total: number; kapasitas_minimum: number | null; aktif: boolean;
};

type MejaInfo = { nama: string; foto_url: string | null };
type HasilTanggal = { tanggal: string; tersedia: boolean; jumlahOpsi: number; daftarMeja: MejaInfo[]; libur: string | null };

function timeToMinutes(t: string) {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
}

// Format tanggal pakai komponen tanggal LOKAL (bukan toISOString yang selalu convert ke UTC dan bisa geser mundur 1 hari di WIB)
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTanggalIndo(tgl: string) {
  const d = new Date(tgl + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

export default function CekKetersediaanPage() {
  const router = useRouter();
  const [outlet, setOutlet] = useState("solo");
  const [jumlahTamu, setJumlahTamu] = useState("2");
  const [jamMulai, setJamMulai] = useState("19:00");
  const [dariTanggal, setDariTanggal] = useState(() => toDateStr(new Date()));
  const [sampaiTanggal, setSampaiTanggal] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 6);
    return toDateStr(d);
  });
  const [hasil, setHasil] = useState<HasilTanggal[] | null>(null);
  const [liburOutlet, setLiburOutlet] = useState<{ tanggal_mulai: string; tanggal_selesai: string; alasan: string | null }[]>([]);

  useEffect(() => {
    supabase.from("LiburOutlet").select("tanggal_mulai, tanggal_selesai, alasan").eq("outlet", outlet)
      .then(({ data }) => setLiburOutlet(data || []));
  }, [outlet]);

  function cekLibur(tgl: string) {
    return liburOutlet.find((l) => tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai) || null;
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liburPopup, setLiburPopup] = useState<{ tanggal: string; alasan: string } | null>(null);
  const [lightboxMeja, setLightboxMeja] = useState<MejaInfo | null>(null);

  async function cariKetersediaan() {
    setError("");
    if (!jamMulai) { setError("Pilih jam kunjungan dulu ya."); return; }
    if (dariTanggal > sampaiTanggal) { setError('Tanggal "sampai" harus setelah tanggal "dari".'); return; }

    const tamu = Number(jumlahTamu) || 1;
    setLoading(true);
    setHasil(null);

    const [jh, jm] = jamMulai.split(":").map(Number);
    const startMin = jh * 60 + jm;
    const endMin = startMin + 120;

    const { data: tablesData } = await supabase.from("Tables")
      .select("Id, outlet, nomor_meja, nama_meja, kapasitas, posisi, kapasitas_minimum, foto_url").eq("outlet", outlet);
    const { data: gabunganData } = await supabase.from("MejaGabungan")
      .select("Id, outlet, nama, meja_ids, kapasitas_total, kapasitas_minimum, aktif").eq("outlet", outlet).eq("aktif", true);
    const { data: liburData } = await supabase.from("LiburOutlet")
      .select("tanggal_mulai, tanggal_selesai, alasan").eq("outlet", outlet);
    const liburRows = (liburData || []) as { tanggal_mulai: string; tanggal_selesai: string; alasan: string | null }[];

    const outletTables = ((tablesData || []) as TableData[])
      .filter((t) => t.kapasitas >= tamu && (!t.kapasitas_minimum || tamu >= t.kapasitas_minimum));
    const outletGabungan = ((gabunganData || []) as MejaGabungan[])
      .filter((g) => g.kapasitas_total >= tamu && (!g.kapasitas_minimum || tamu >= g.kapasitas_minimum));

    if (outletTables.length === 0 && outletGabungan.length === 0) {
      setError(`Tidak ada meja dengan kapasitas cukup untuk ${tamu} orang di outlet ini.`);
      setLoading(false);
      return;
    }

    const { data: resData } = await supabase.from("Reservation").select("meja_id, tanggal, jam, jam_selesai")
      .eq("outlet", outlet).gte("tanggal", dariTanggal).lte("tanggal", sampaiTanggal)
      .in("status", ["Pending", "Confirmed"]);
    const { data: holdData } = await supabase.from("BookingHold").select("meja_id, tanggal, jam, jam_selesai")
      .gte("tanggal", dariTanggal).lte("tanggal", sampaiTanggal)
      .not("status", "in", "(completed,cancelled,expired,released)");

    const resRows = (resData || []) as { meja_id: number | null; tanggal: string; jam: string; jam_selesai: string }[];
    const holdRows = (holdData || []) as { meja_id: number; tanggal: string; jam: string; jam_selesai: string }[];

    const dates: string[] = [];
    const dari = new Date(dariTanggal + "T00:00:00");
    const sampai = new Date(sampaiTanggal + "T00:00:00");
    for (let d = new Date(dari); d <= sampai; d.setDate(d.getDate() + 1)) {
      dates.push(toDateStr(d));
    }

    const bookedByDate: Record<string, Set<number>> = {};
    dates.forEach((tgl) => { bookedByDate[tgl] = new Set<number>(); });
    resRows.forEach((r) => {
      if (r.meja_id == null || !bookedByDate[r.tanggal]) return;
      const rStart = timeToMinutes(r.jam);
      const rEnd = r.jam_selesai ? timeToMinutes(r.jam_selesai) : rStart + 120;
      if (startMin < rEnd && endMin > rStart) bookedByDate[r.tanggal].add(r.meja_id);
    });
    holdRows.forEach((h) => {
      if (!bookedByDate[h.tanggal]) return;
      const hStart = timeToMinutes(h.jam);
      const hEnd = h.jam_selesai ? timeToMinutes(h.jam_selesai) : hStart + 120;
      if (startMin < hEnd && endMin > hStart) bookedByDate[h.tanggal].add(h.meja_id);
    });

    const hasilPerTanggal: HasilTanggal[] = dates.map((tgl) => {
      const liburInfo = liburRows.find((l) => tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai);
      if (liburInfo) {
        return { tanggal: tgl, tersedia: false, jumlahOpsi: 0, daftarMeja: [], libur: liburInfo.alasan || "Outlet libur" };
      }
      const mejaTersedia = outletTables.filter((t) => !bookedByDate[tgl].has(t.Id));
      const gabunganTersedia = outletGabungan.filter((g) => g.meja_ids.every((id) => !bookedByDate[tgl].has(id)));
      const jumlahOpsi = mejaTersedia.length + gabunganTersedia.length;
      const daftarMeja: MejaInfo[] = [
        ...mejaTersedia.map((t) => ({ nama: t.nama_meja || `Meja ${t.nomor_meja}`, foto_url: t.foto_url })),
        ...gabunganTersedia.map((g) => ({ nama: g.nama, foto_url: null })),
      ];
      return { tanggal: tgl, tersedia: jumlahOpsi > 0, jumlahOpsi, daftarMeja, libur: null };
    });

    setHasil(hasilPerTanggal);
    setLoading(false);
  }

  function reservasiTanggalIni(tgl: string) {
    router.push(`/?outlet=${outlet}&tanggal=${tgl}&jam=${jamMulai}&tamu=${jumlahTamu}&mulai=1`);
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
              <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
              <path d="M8 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[#C8973E] text-xs tracking-[0.3em] uppercase font-semibold">Yassalam Arabian Resto</p>
          <h1 className="font-serif text-3xl text-[#5C3D1A] mt-1.5">Cek Ketersediaan Reservasi</h1>
          <div className="w-8 h-px bg-[#C8973E] mx-auto my-3.5" />
          <p className="text-[#8B7355] text-sm max-w-sm mx-auto leading-relaxed">Cari meja kosong sesuai tanggal, jam, dan jumlah tamu sebelum kamu reservasi.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8DCC8] p-5 sm:p-6" style={{ boxShadow: "0 4px 16px rgba(92,61,26,0.06)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Outlet</label>
              <select value={outlet} onChange={(e) => setOutlet(e.target.value)}
                className="w-full h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all">
                <option value="solo">Solo</option>
                <option value="jogja">Yogyakarta</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Jumlah tamu</label>
              <input type="number" min="1" value={jumlahTamu} onChange={(e) => setJumlahTamu(e.target.value)}
                className="w-full h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Dari tanggal</label>
              <input type="date" value={dariTanggal} onChange={(e) => {
                  const val = e.target.value; setDariTanggal(val);
                  const info = cekLibur(val);
                  if (info) setLiburPopup({ tanggal: formatTanggalIndo(val), alasan: info.alasan || "Outlet libur pada tanggal ini" });
                }}
                className="w-full h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Sampai tanggal</label>
              <input type="date" value={sampaiTanggal} onChange={(e) => {
                  const val = e.target.value; setSampaiTanggal(val);
                  const info = cekLibur(val);
                  if (info) setLiburPopup({ tanggal: formatTanggalIndo(val), alasan: info.alasan || "Outlet libur pada tanggal ini" });
                }}
                className="w-full h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Jam kunjungan</label>
              <div className="flex gap-2">
                <select value={jamMulai.split(":")[0] || ""} onChange={(e) => {
                  const hh = e.target.value; const mm = jamMulai.split(":")[1] || "00";
                  setJamMulai(`${hh}:${mm}`);
                }} className="flex-1 h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all">
                  {Array.from({ length: 14 }, (_, i) => String(i + 7).padStart(2, "0")).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select value={jamMulai.split(":")[1] || "00"} onChange={(e) => {
                  const mm = e.target.value; const hh = jamMulai.split(":")[0] || "07";
                  setJamMulai(`${hh}:${mm}`);
                }} className="flex-1 h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all">
                  {["00", "30"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={cariKetersediaan} disabled={loading}
            className="w-full mt-4 h-[46px] rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-all">
            {loading ? "Mencari..." : "Cari Ketersediaan"}
          </button>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {hasil && (
          <div className="mt-8">
            <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Hasil pencarian</p>
            <div className="space-y-2.5">
              {hasil.map((h) => {
                const batasTampil = 4;
                const sisanya = h.daftarMeja.length - batasTampil;
                return (
                  <div key={h.tanggal} className="bg-white rounded-2xl border border-[#E8DCC8] px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-[#5C3D1A] capitalize">{formatTanggalIndo(h.tanggal)}</p>
                        <p className="text-xs text-[#8B7355] mt-0.5">
                          {h.libur ? h.libur : h.tersedia ? `${h.jumlahOpsi} meja tersedia` : "Semua meja penuh jam ini"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${h.libur ? "bg-gray-100 text-gray-500" : h.tersedia ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {h.libur ? "Libur" : h.tersedia ? "Tersedia" : "Penuh"}
                        </span>
                        {h.tersedia && !h.libur && (
                          <button onClick={() => reservasiTanggalIni(h.tanggal)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#C8973E] text-white text-xs font-semibold hover:bg-[#A67B2E] transition-colors">
                            Reservasi
                          </button>
                        )}
                      </div>
                    </div>
                    {h.tersedia && !h.libur && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {h.daftarMeja.slice(0, batasTampil).map((meja) => (
                          <button key={meja.nama} onClick={() => meja.foto_url ? setLightboxMeja(meja) : null}
                            className={`text-[11px] bg-[#FDF6EC] border border-[#E8DCC8] rounded-full px-2.5 py-1 transition-all ${meja.foto_url ? "text-[#C8973E] font-semibold cursor-pointer hover:bg-[#C8973E]/10 hover:border-[#C8973E]/40" : "text-[#8B7355] cursor-default"}`}>
                            {meja.foto_url && <span className="mr-1">📷</span>}{meja.nama}
                          </button>
                        ))}
                        {sisanya > 0 && (
                          <span className="text-[11px] text-[#B5A594] px-2.5 py-1">+{sisanya} lainnya</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Popup notifikasi libur */}
        {liburPopup && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm" onClick={() => setLiburPopup(null)}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="text-white font-bold text-lg font-serif">Outlet Libur</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[#5C3D1A] font-bold text-sm">{liburPopup.tanggal}</p>
                <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{liburPopup.alasan}</p>
                <p className="text-[#8B7355] text-xs mt-3">Outlet tidak menerima reservasi pada tanggal ini. Silakan pilih tanggal lain.</p>
                <button onClick={() => setLiburPopup(null)}
                  className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm transition-all active:scale-[0.98]">
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox foto meja */}
        {lightboxMeja && lightboxMeja.foto_url && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm" onClick={() => setLightboxMeja(null)}>
            <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLightboxMeja(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-[#5C3D1A] font-bold text-sm flex items-center justify-center shadow-lg z-10">✕</button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxMeja.foto_url} alt={lightboxMeja.nama}
                className="w-full rounded-2xl shadow-2xl object-cover max-h-[70vh]" />
              <p className="text-center text-white font-bold mt-3 text-lg drop-shadow">{lightboxMeja.nama}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}