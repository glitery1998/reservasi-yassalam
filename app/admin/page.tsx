"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../supabase";

type Reservation = {
  Id: number; created_at: string; nama_tamu: string; no_whatsapp: string;
  outlet: string; tanggal: string; jam: string; jumlah_tamu: number;
  catatan: string | null; status: string; meja_id: number | null;
  menu_paket_id: number | null; dp_amount: number | null;
};
type Area = {
  Id: number; outlet: string; nama: string; slug: string;
  deskripsi: string | null; kapasitas_max: number; foto_url: string | null; urutan: number;
};
type TableData = {
  Id: number; outlet: string; nomor_meja: number; nama_meja: string | null;
  kapasitas: number; posisi: string; status: string;
  foto_url: string | null; dp_minimum: number | null;
};
function AreaCardImage({ area, tables }: { area: Area; tables: TableData[] }) {
  const photos = tables.filter((t) => t.outlet === area.outlet && t.posisi === area.slug && t.foto_url).map((t) => t.foto_url as string);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <span className="text-3xl text-[#C8973E]/20">📷</span>
        <span className="text-xs text-gray-700">Belum ada foto meja</span>
      </div>
    );
  }

  return (
    <>
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={area.nama}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
      {photos.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1 z-10">
          {photos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      )}
    </>
  );
}
function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas tidak didukung")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob); else reject(new Error("Gagal kompres gambar"));
      }, "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}
export default function AdminDashboard() {
  const [tab, setTab] = useState<"reservasi" | "area">("reservasi");
  const [drillArea, setDrillArea] = useState<Area | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [filterOutlet, setFilterOutlet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [showTableForm, setShowTableForm] = useState(false);
  const [uploadingTable, setUploadingTable] = useState(false);

  const [aOutlet, setAOutlet] = useState("solo");
  const [aNama, setANama] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aUrutan, setAUrutan] = useState("0");

  const [tNomor, setTNomor] = useState("");
  const [tNama, setTNama] = useState("");
  const [tKap, setTKap] = useState("4");
  const [tDp, setTDp] = useState("");

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("Reservation").select("*").order("created_at", { ascending: false });
    if (filterOutlet) q = q.eq("outlet", filterOutlet);
    if (filterStatus) q = q.eq("status", filterStatus);
    if (filterDate) q = q.eq("tanggal", filterDate);
    const { data } = await q;
    setReservations(data || []);
    setLoading(false);
  }, [filterOutlet, filterStatus, filterDate]);

  const fetchAreas = useCallback(async () => {
    const { data } = await supabase.from("Areas").select("*").order("outlet").order("urutan");
    setAreas(data || []);
  }, []);

  const fetchTables = useCallback(async () => {
    const { data } = await supabase.from("Tables").select("*").order("outlet").order("nomor_meja");
    setTables(data || []);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (tab === "reservasi") void fetchReservations();
    if (tab === "area") { void fetchAreas(); void fetchTables(); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, fetchReservations, fetchAreas, fetchTables]);

  async function updateStatus(id: number, s: string) {
    await supabase.from("Reservation").update({ status: s }).eq("Id", id);
    fetchReservations();
  }
  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

  function openAreaForm(area?: Area) {
    if (area) { setEditArea(area); setAOutlet(area.outlet); setANama(area.nama); setASlug(area.slug); setADesc(area.deskripsi || ""); setAUrutan(String(area.urutan)); }
    else { setEditArea(null); setAOutlet("solo"); setANama(""); setASlug(""); setADesc(""); setAUrutan("0"); }
    setShowAreaForm(true);
  }
  function totalKapasitas(a: Area) {
    return tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).reduce((sum, t) => sum + t.kapasitas, 0);
  }
  async function saveArea() {
    const p = { outlet: aOutlet, nama: aNama, slug: aSlug, deskripsi: aDesc, urutan: Number(aUrutan) };
    const { error } = editArea
      ? await supabase.from("Areas").update(p).eq("Id", editArea.Id)
      : await supabase.from("Areas").insert(p);
    if (error) { alert("Gagal simpan area: " + error.message); return; }
    setShowAreaForm(false); fetchAreas();
  }
  async function deleteArea(id: number) { if (!confirm("Hapus area ini?")) return; await supabase.from("Areas").delete().eq("Id", id); fetchAreas(); }
  
  function openTableForm(t?: TableData) {
    if (t) { setEditTable(t); setTNomor(String(t.nomor_meja)); setTNama(t.nama_meja || ""); setTKap(String(t.kapasitas)); setTDp(t.dp_minimum ? String(t.dp_minimum) : ""); }
    else { setEditTable(null); setTNomor(""); setTNama(""); setTKap("4"); setTDp(""); }
    setShowTableForm(true);
  }
  async function saveTable() {
    if (!drillArea) return;
    const p = {
      outlet: drillArea.outlet, posisi: drillArea.slug,
      nomor_meja: Number(tNomor), nama_meja: tNama || null,
      kapasitas: Number(tKap), dp_minimum: tDp ? Number(tDp) : null,
    };
    const { error } = editTable
      ? await supabase.from("Tables").update(p).eq("Id", editTable.Id)
      : await supabase.from("Tables").insert(p);
    if (error) { alert("Gagal simpan meja: " + error.message); return; }
    setShowTableForm(false); fetchTables();
  }
  async function deleteTable(id: number) { if (!confirm("Hapus meja ini?")) return; await supabase.from("Tables").delete().eq("Id", id); fetchTables(); }
  async function uploadTablePhoto(tableId: number, file: File) {
    setUploadingTable(true);
    try {
      const compressed = await compressImage(file);
      const rand = crypto.randomUUID();
      const path = `tables/${tableId}-${rand}.jpg`;
      const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" });
      if (error) { alert("Upload gagal: " + error.message); setUploadingTable(false); return; }
      const { data: u } = supabase.storage.from("photos").getPublicUrl(path);
      await supabase.from("Tables").update({ foto_url: u.publicUrl }).eq("Id", tableId);
    } catch {
      alert("Gagal memproses gambar. Coba foto lain.");
    }
    setUploadingTable(false); fetchTables();
  }

  const stats = {
    total: reservations.length, pending: reservations.filter((r) => r.status === "Pending").length,
    confirmed: reservations.filter((r) => r.status === "Confirmed").length,
    completed: reservations.filter((r) => r.status === "Completed").length,
    cancelled: reservations.filter((r) => r.status === "Cancelled").length,
  };

  const statusStyle: Record<string, string> = {
    Pending: "bg-[#C8973E]/20 text-[#C8973E] border-[#C8973E]/40",
    Confirmed: "bg-white/10 text-white border-white/20",
    Completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const modalInput = "w-full px-4 py-3 rounded-xl border-2 border-[#C8973E]/20 bg-[#111] outline-none focus:border-[#C8973E] text-white text-sm placeholder-gray-600";
  const filterInput = "px-3 py-2 rounded-lg border border-[#C8973E]/20 bg-[#111] text-sm text-gray-300 outline-none focus:border-[#C8973E]";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C8973E]/10 via-transparent to-[#C8973E]/10" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <p className="text-[#C8973E] text-[10px] tracking-[0.4em] uppercase font-semibold">Yassalam Arabian Resto</p>
            <h1 className="text-2xl font-bold text-white font-serif mt-1">Dashboard Admin</h1>
          </div>
          <Link href="/" className="px-5 py-2 rounded-xl border border-[#C8973E]/30 text-[#C8973E] text-sm font-semibold hover:bg-[#C8973E]/10 transition-all">← Website</Link>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex bg-[#111] rounded-2xl p-1.5 border border-[#C8973E]/10">
          {[
            { key: "reservasi", label: "Reservasi", icon: "📋" },
            { key: "area", label: "Area & Meja", icon: "🏛" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black shadow-lg shadow-[#C8973E]/20" : "text-gray-500 hover:text-[#C8973E]"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ========== TAB RESERVASI ========== */}
        {tab === "reservasi" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Total", value: stats.total, accent: "border-[#C8973E]/30", text: "text-[#C8973E]" },
                { label: "Pending", value: stats.pending, accent: "border-[#C8973E]/20", text: "text-[#C8973E]" },
                { label: "Confirmed", value: stats.confirmed, accent: "border-white/10", text: "text-white" },
                { label: "Completed", value: stats.completed, accent: "border-emerald-500/20", text: "text-emerald-400" },
                { label: "Cancelled", value: stats.cancelled, accent: "border-red-500/20", text: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className={`bg-[#111] ${s.accent} border rounded-2xl p-5 text-center`}>
                  <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-xs mt-2 text-gray-500 tracking-wider uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-[#111] border border-[#C8973E]/10 rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-center">
              <span className="text-[#C8973E] text-xs font-bold tracking-wider uppercase mr-2">Filter:</span>
              <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)} className={filterInput}>
                <option value="">Semua Outlet</option><option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterInput}>
                <option value="">Semua Status</option><option value="Pending">Pending</option><option value="Confirmed">Confirmed</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
              </select>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={filterInput} />
              {(filterOutlet || filterStatus || filterDate) && (
                <button onClick={() => { setFilterOutlet(""); setFilterStatus(""); setFilterDate(""); }} className="text-sm text-[#C8973E] hover:underline">✕ Reset</button>
              )}
            </div>

            {/* Cards */}
            {loading ? <p className="text-center text-gray-600 py-16">Memuat data...</p> : reservations.length === 0 ? <p className="text-center text-gray-600 py-16">Tidak ada reservasi</p> : (
              <div className="space-y-4">
                {reservations.map((r) => (
                  <div key={r.Id} className="bg-[#111] border border-[#C8973E]/10 rounded-2xl p-6 hover:border-[#C8973E]/25 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-white text-xl">{r.nama_tamu}</h3>
                          <span className={`text-[10px] px-3 py-1 rounded-full border font-bold tracking-wider uppercase ${statusStyle[r.status] || ""}`}>{r.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          <span className="text-gray-400">📍 <span className="capitalize text-white/80">{r.outlet}</span></span>
                          <span className="text-gray-400">📅 <span className="text-white/80">{r.tanggal}</span></span>
                          <span className="text-gray-400">🕐 <span className="text-white/80">{r.jam}</span></span>
                          <span className="text-gray-400">👥 <span className="text-white/80">{r.jumlah_tamu} orang</span></span>
                          {r.meja_id && <span className="text-gray-400">🪑 <span className="text-[#C8973E]">Meja #{r.meja_id}</span></span>}
                        </div>
                        <div className="text-sm text-gray-400">📱 <span className="text-white/70">{r.no_whatsapp}</span>{r.dp_amount ? <span className="ml-5 text-[#C8973E] font-semibold">💰 {formatRupiah(r.dp_amount)}</span> : null}</div>
                        {r.catatan && <p className="text-sm text-gray-500 italic border-l-2 border-[#C8973E]/30 pl-3 mt-1">📝 {r.catatan}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col">
                        {r.status === "Pending" && (<>
                          <button onClick={() => updateStatus(r.Id, "Confirmed")} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black text-sm font-bold hover:shadow-lg hover:shadow-[#C8973E]/20 transition-all">✓ Konfirmasi</button>
                          <button onClick={() => updateStatus(r.Id, "Cancelled")} className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10">✕ Tolak</button>
                        </>)}
                        {r.status === "Confirmed" && <button onClick={() => updateStatus(r.Id, "Completed")} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">✓ Selesai</button>}
                        {r.status === "Cancelled" && <button onClick={() => updateStatus(r.Id, "Pending")} className="px-5 py-2.5 rounded-xl border border-[#C8973E]/30 text-[#C8973E] text-sm font-semibold hover:bg-[#C8973E]/10">↩ Kembalikan</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== TAB AREA & MEJA ========== */}
        {tab === "area" && !drillArea && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">Area &amp; Ruangan</h2>
                <p className="text-gray-500 text-sm mt-1">Klik salah satu area untuk kelola meja di dalamnya</p>
              </div>
              <button onClick={() => openAreaForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black text-sm font-bold hover:shadow-lg hover:shadow-[#C8973E]/20 transition-all">+ Tambah Area</button>
            </div>

            {showAreaForm && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                <div className="bg-[#1a1a1a] border border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif">{editArea ? "Edit Area" : "Area Baru"}</h3>
                    <div className="w-12 h-0.5 bg-[#C8973E] mt-2" />
                  </div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Outlet</label>
                    <select value={aOutlet} onChange={(e) => setAOutlet(e.target.value)} className={modalInput}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Nama Area</label>
                    <input value={aNama} onChange={(e) => setANama(e.target.value)} placeholder="Contoh: VIP Room" className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Slug</label>
                    <input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="Contoh: vip" className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Deskripsi</label>
                    <textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2} className={modalInput + " resize-none"} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Urutan</label>
                    <input type="number" value={aUrutan} onChange={(e) => setAUrutan(e.target.value)} className={modalInput} /></div>
                  <p className="text-xs text-gray-600 -mt-2">Kapasitas Max akan otomatis dihitung dari total kapasitas semua meja di area ini setelah disimpan.</p>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setShowAreaForm(false)} className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 font-semibold hover:bg-white/5">Batal</button>
                    <button onClick={saveArea} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black font-bold">Simpan</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {areas.map((a) => {
                const jumlahMeja = tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).length;
                return (
                  <div key={a.Id} className="bg-[#111] border border-[#C8973E]/10 rounded-3xl overflow-hidden group hover:border-[#C8973E]/30 transition-all hover:shadow-xl hover:shadow-[#C8973E]/5">
                    <button onClick={() => setDrillArea(a)} className="w-full h-44 bg-[#0a0a0a] relative overflow-hidden block text-left">
                      <AreaCardImage area={a} tables={tables} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <span className="bg-[#C8973E] text-black text-[10px] px-3 py-1 rounded-full font-bold tracking-wider uppercase">Max {totalKapasitas(a)} orang</span>
                        <span className="bg-black/60 text-white/80 text-[10px] px-3 py-1 rounded-full capitalize backdrop-blur-sm">{a.outlet}</span>
                      </div>
                    </button>
                    <div className="p-5 space-y-3">
                      <button onClick={() => setDrillArea(a)} className="text-left w-full">
                        <h3 className="font-bold text-white text-lg font-serif hover:text-[#C8973E] transition-colors">{a.nama} →</h3>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{a.deskripsi}</p>
                        <p className="text-[#C8973E]/70 text-xs mt-2">{jumlahMeja} meja terdaftar</p>
                      </button>
                      <p className="text-xs text-gray-600">Foto diambil otomatis dari foto tiap meja di area ini. Upload foto lewat kartu meja saat masuk ke area.</p>
                      <div className="flex gap-2 pt-1">
                        <button onClick={(e) => { e.stopPropagation(); openAreaForm(a); }} className="flex-1 py-2.5 rounded-xl border border-[#C8973E]/30 text-[#C8973E] text-sm font-bold hover:bg-[#C8973E]/10 transition-all">Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteArea(a.Id); }} className="py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-all">🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ========== DRILL-DOWN: MEJA DI DALAM AREA ========== */}
        {tab === "area" && drillArea && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <button onClick={() => setDrillArea(null)} className="text-sm text-[#C8973E]/70 hover:text-[#C8973E] mb-2 transition-colors">← Kembali ke Area</button>
                <h2 className="text-xl font-bold text-white font-serif">{drillArea.nama} <span className="text-gray-500 text-base capitalize">· {drillArea.outlet}</span></h2>
                <p className="text-gray-500 text-sm mt-1">Total kapasitas area ini: <span className="text-[#C8973E] font-semibold">{totalKapasitas(drillArea)} orang</span></p>
              </div>
              <button onClick={() => openTableForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black text-sm font-bold hover:shadow-lg hover:shadow-[#C8973E]/20 transition-all">+ Tambah Meja</button>
            </div>

            {showTableForm && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                <div className="bg-[#1a1a1a] border border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif">{editTable ? "Edit Meja" : "Meja Baru"}</h3>
                    <p className="text-gray-500 text-xs mt-1">{drillArea.nama} · <span className="capitalize">{drillArea.outlet}</span></p>
                    <div className="w-12 h-0.5 bg-[#C8973E] mt-2" />
                  </div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Nomor Meja</label>
                    <input type="number" value={tNomor} onChange={(e) => setTNomor(e.target.value)} className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Nama Meja <span className="normal-case font-normal text-gray-600">(opsional)</span></label>
                    <input value={tNama} onChange={(e) => setTNama(e.target.value)} placeholder="Contoh: Meja Sultan" className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Kapasitas</label>
                    <input type="number" value={tKap} onChange={(e) => setTKap(e.target.value)} className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">DP Minimum (Rp)</label>
                    <input type="number" value={tDp} onChange={(e) => setTDp(e.target.value)} placeholder="Contoh: 50000" className={modalInput} /></div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setShowTableForm(false)} className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 font-semibold hover:bg-white/5">Batal</button>
                    <button onClick={saveTable} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black font-bold">Simpan</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).map((t) => (
                <div key={t.Id} className="bg-[#111] border border-[#C8973E]/10 rounded-3xl overflow-hidden group hover:border-[#C8973E]/30 transition-all">
                  <div className="h-40 bg-[#0a0a0a] relative overflow-hidden">
                    {t.foto_url ? (
                      <img src={t.foto_url} alt={t.nama_meja || `Meja ${t.nomor_meja}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl text-[#C8973E]/20">📷</span>
                        <span className="text-xs text-gray-700">Belum ada foto</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 bg-[#C8973E] text-black text-[10px] px-3 py-1 rounded-full font-bold tracking-wider uppercase">{t.kapasitas} orang</span>
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="font-bold text-white text-lg">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                    {t.nama_meja && <p className="text-gray-500 text-xs">No. {t.nomor_meja}</p>}
                    <p className="text-[#C8973E] text-sm font-semibold">{t.dp_minimum ? `DP min. Rp ${t.dp_minimum.toLocaleString("id-ID")}` : "Tanpa DP"}</p>
                    <label className="inline-block cursor-pointer pt-1">
                      <span className="text-xs text-[#C8973E] font-semibold hover:text-[#D4A44A] transition-colors">
                        {uploadingTable ? "⏳ Mengupload..." : t.foto_url ? "📷 Ganti Foto Meja" : "📷 Upload Foto Meja"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTablePhoto(t.Id, f); }} />
                    </label>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => openTableForm(t)} className="flex-1 py-2 rounded-lg border border-[#C8973E]/20 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/10">Edit</button>
                      <button onClick={() => deleteTable(t.Id)} className="py-2 px-3 rounded-lg border border-red-500/20 text-red-400 text-xs hover:bg-red-500/10">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
              {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).length === 0 && (
                <p className="text-gray-600 col-span-full text-center py-10">Belum ada meja di area ini. Klik &quot;+ Tambah Meja&quot;.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#C8973E]/10 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-gray-700 text-xs">© 2026 Yassalam Arabian Resto &amp; Catering</p>
        </div>
      </div>
    </div>
  );
}