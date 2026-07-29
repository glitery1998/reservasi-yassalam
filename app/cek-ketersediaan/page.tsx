"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../supabase";

type TableData = {
  Id: number; outlet: string; nomor_meja: number; nama_meja: string | null;
  kapasitas: number; posisi: string; kapasitas_minimum: number | null;
};

type MejaGabungan = {
  Id: number; outlet: string; nama: string; meja_ids: number[];
  kapasitas_total: number; kapasitas_minimum: number | null; aktif: boolean;
};

type HasilTanggal = { tanggal: string; tersedia: boolean; jumlahOpsi: number; daftarMeja: string[] };

function timeToMinutes(t: string) {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
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
  const [dariTanggal, setDariTanggal] = useState(() => new Date().toISOString().split("T")[0]);
  const [sampaiTanggal, setSampaiTanggal] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  });
  const [hasil, setHasil] = useState<HasilTanggal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      .select("Id, outlet, nomor_meja, nama_meja, kapasitas, posisi, kapasitas_minimum").eq("outlet", outlet);
    const { data: gabunganData } = await supabase.from("MejaGabungan")
      .select("Id, outlet, nama, meja_ids, kapasitas_total, kapasitas_minimum, aktif").eq("outlet", outlet).eq("aktif", true);

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
      dates.push(d.toISOString().split("T")[0]);
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
      const mejaTersedia = outletTables.filter((t) => !bookedByDate[tgl].has(t.Id));
      const gabunganTersedia = outletGabungan.filter((g) => g.meja_ids.every((id) => !bookedByDate[tgl].has(id)));
      const jumlahOpsi = mejaTersedia.length + gabunganTersedia.length;
      const daftarMeja = [
        ...mejaTersedia.map((t) => t.nama_meja || `Meja ${t.nomor_meja}`),
        ...gabunganTersedia.map((g) => g.nama),
      ];
      return { tanggal: tgl, tersedia: jumlahOpsi > 0, jumlahOpsi, daftarMeja };
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
              <input type="date" value={dariTanggal} onChange={(e) => setDariTanggal(e.target.value)}
                className="w-full h-[46px] px-3 rounded-xl border border-[#E8DCC8] bg-[#FDF6EC] text-[#5C3D1A] outline-none focus:border-[#C8973E] transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8B7355] tracking-[0.1em] uppercase mb-1.5">Sampai tanggal</label>
              <input type="date" value={sampaiTanggal} onChange={(e) => setSampaiTanggal(e.target.value)}
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
                        <p className="text-xs text-[#8B7355] mt-0.5">{h.tersedia ? `${h.jumlahOpsi} meja tersedia` : "Semua meja penuh jam ini"}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${h.tersedia ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {h.tersedia ? "Tersedia" : "Penuh"}
                        </span>
                        {h.tersedia && (
                          <button onClick={() => reservasiTanggalIni(h.tanggal)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#C8973E] text-white text-xs font-semibold hover:bg-[#A67B2E] transition-colors">
                            Reservasi
                          </button>
                        )}
                      </div>
                    </div>
                    {h.tersedia && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {h.daftarMeja.slice(0, batasTampil).map((nama) => (
                          <span key={nama} className="text-[11px] text-[#8B7355] bg-[#FDF6EC] border border-[#E8DCC8] rounded-full px-2.5 py-1">{nama}</span>
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
      </div>
    </div>
  );
}