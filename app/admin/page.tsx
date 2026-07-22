/* eslint-disable @next/next/no-img-element */
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
  Id: number; outlet: string; nomor_meja: number; kapasitas: number;
  posisi: string; status: string;
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<"reservasi" | "area" | "meja">("reservasi");
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
  const [uploading, setUploading] = useState(false);

  const [aOutlet, setAOutlet] = useState("solo");
  const [aNama, setANama] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aKap, setAKap] = useState("4");
  const [aUrutan, setAUrutan] = useState("0");

  const [tOutlet, setTOutlet] = useState("solo");
  const [tNomor, setTNomor] = useState("");
  const [tKap, setTKap] = useState("4");
  const [tPosisi, setTPosisi] = useState("indoor-tengah");

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
    if (tab === "area") void fetchAreas();
    if (tab === "meja") void fetchTables();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, fetchReservations, fetchAreas, fetchTables]);

  async function updateStatus(id: number, s: string) {
    await supabase.from("Reservation").update({ status: s }).eq("Id", id);
    fetchReservations();
  }
  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

  function openAreaForm(area?: Area) {
    if (area) { setEditArea(area); setAOutlet(area.outlet); setANama(area.nama); setASlug(area.slug); setADesc(area.deskripsi || ""); setAKap(String(area.kapasitas_max)); setAUrutan(String(area.urutan)); }
    else { setEditArea(null); setAOutlet("solo"); setANama(""); setASlug(""); setADesc(""); setAKap("4"); setAUrutan("0"); }
    setShowAreaForm(true);
  }
  async function saveArea() {
    const p = { outlet: aOutlet, nama: aNama, slug: aSlug, deskripsi: aDesc, kapasitas_max: Number(aKap), urutan: Number(aUrutan) };
    if (editArea) await supabase.from("Areas").update(p).eq("Id", editArea.Id);
    else await supabase.from("Areas").insert(p);
    setShowAreaForm(false); fetchAreas();
  }
  async function deleteArea(id: number) { if (!confirm("Hapus area ini?")) return; await supabase.from("Areas").delete().eq("Id", id); fetchAreas(); }
  async function uploadPhoto(areaId: number, file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const rand = Math.random().toString(36).slice(2, 10);
    const path = `areas/${areaId}-${rand}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file);
    if (error) { alert("Upload gagal: " + error.message); setUploading(false); return; }
    const { data: u } = supabase.storage.from("photos").getPublicUrl(path);
    await supabase.from("Areas").update({ foto_url: u.publicUrl }).eq("Id", areaId);
    setUploading(false); fetchAreas();
  }
  function openTableForm(t?: TableData) {
    if (t) { setEditTable(t); setTOutlet(t.outlet); setTNomor(String(t.nomor_meja)); setTKap(String(t.kapasitas)); setTPosisi(t.posisi); }
    else { setEditTable(null); setTOutlet("solo"); setTNomor(""); setTKap("4"); setTPosisi("indoor-tengah"); }
    setShowTableForm(true);
  }
  async function saveTable() {
    const p = { outlet: tOutlet, nomor_meja: Number(tNomor), kapasitas: Number(tKap), posisi: tPosisi };
    if (editTable) await supabase.from("Tables").update(p).eq("Id", editTable.Id);
    else await supabase.from("Tables").insert(p);
    setShowTableForm(false); fetchTables();
  }
  async function deleteTable(id: number) { if (!confirm("Hapus meja ini?")) return; await supabase.from("Tables").delete().eq("Id", id); fetchTables(); }

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
            { key: "area", label: "Area / Ruangan", icon: "🏛" },
            { key: "meja", label: "Meja", icon: "🪑" },
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

        {/* ========== TAB AREA ========== */}
        {tab === "area" && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">Area &amp; Ruangan</h2>
                <p className="text-gray-500 text-sm mt-1">Kelola area, upload foto, dan atur kapasitas</p>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Kapasitas Max</label>
                      <input type="number" value={aKap} onChange={(e) => setAKap(e.target.value)} className={modalInput} /></div>
                    <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Urutan</label>
                      <input type="number" value={aUrutan} onChange={(e) => setAUrutan(e.target.value)} className={modalInput} /></div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setShowAreaForm(false)} className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 font-semibold hover:bg-white/5">Batal</button>
                    <button onClick={saveArea} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black font-bold">Simpan</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {areas.map((a) => (
                <div key={a.Id} className="bg-[#111] border border-[#C8973E]/10 rounded-3xl overflow-hidden group hover:border-[#C8973E]/30 transition-all hover:shadow-xl hover:shadow-[#C8973E]/5">
                  <div className="h-44 bg-[#0a0a0a] relative overflow-hidden">
                    {a.foto_url ? (
                      <img src={a.foto_url} alt={a.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl text-[#C8973E]/20">📷</span>
                        <span className="text-xs text-gray-700">Belum ada foto</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <span className="bg-[#C8973E] text-black text-[10px] px-3 py-1 rounded-full font-bold tracking-wider uppercase">Max {a.kapasitas_max} orang</span>
                      <span className="bg-black/60 text-white/80 text-[10px] px-3 py-1 rounded-full capitalize backdrop-blur-sm">{a.outlet}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-white text-lg font-serif">{a.nama}</h3>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{a.deskripsi}</p>
                    </div>
                    <label className="inline-block cursor-pointer">
                      <span className="text-xs text-[#C8973E] font-semibold hover:text-[#D4A44A] transition-colors">
                        {uploading ? "⏳ Mengupload..." : a.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(a.Id, f); }} />
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openAreaForm(a)} className="flex-1 py-2.5 rounded-xl border border-[#C8973E]/30 text-[#C8973E] text-sm font-bold hover:bg-[#C8973E]/10 transition-all">Edit</button>
                      <button onClick={() => deleteArea(a.Id)} className="py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-all">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ========== TAB MEJA ========== */}
        {tab === "meja" && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">Kelola Meja</h2>
                <p className="text-gray-500 text-sm mt-1">Tambah, edit, atau hapus meja di setiap outlet</p>
              </div>
              <button onClick={() => openTableForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black text-sm font-bold hover:shadow-lg hover:shadow-[#C8973E]/20 transition-all">+ Tambah Meja</button>
            </div>

            {showTableForm && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                <div className="bg-[#1a1a1a] border border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif">{editTable ? "Edit Meja" : "Meja Baru"}</h3>
                    <div className="w-12 h-0.5 bg-[#C8973E] mt-2" />
                  </div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Outlet</label>
                    <select value={tOutlet} onChange={(e) => setTOutlet(e.target.value)} className={modalInput}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Nomor Meja</label>
                    <input type="number" value={tNomor} onChange={(e) => setTNomor(e.target.value)} className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Kapasitas</label>
                    <input type="number" value={tKap} onChange={(e) => setTKap(e.target.value)} className={modalInput} /></div>
                  <div><label className="block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase">Area / Posisi</label>
                    <select value={tPosisi} onChange={(e) => setTPosisi(e.target.value)} className={modalInput}>
                      <option value="indoor-jendela">Dekat Jendela</option><option value="indoor-tengah">Indoor Tengah</option>
                      <option value="indoor-pojok">Indoor Pojok</option><option value="outdoor">Outdoor</option><option value="vip">VIP Room</option>
                    </select></div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setShowTableForm(false)} className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 font-semibold hover:bg-white/5">Batal</button>
                    <button onClick={saveTable} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-black font-bold">Simpan</button>
                  </div>
                </div>
              </div>
            )}

            {["solo", "jogja"].map((outlet) => {
              const filtered = tables.filter((t) => t.outlet === outlet);
              if (filtered.length === 0) return null;
              return (
                <div key={outlet} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[#C8973E]">◈</span>
                    <h3 className="text-sm font-bold text-[#C8973E] tracking-[0.2em] uppercase">{outlet === "solo" ? "Solo" : "Yogyakarta"}</h3>
                    <div className="flex-1 h-[1px] bg-[#C8973E]/15" />
                    <span className="text-xs text-gray-600">{filtered.length} meja</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {filtered.map((t) => (
                      <div key={t.Id} className="bg-[#111] border border-[#C8973E]/10 rounded-2xl p-5 hover:border-[#C8973E]/30 transition-all group">
                        <div className="w-10 h-10 bg-[#C8973E]/10 rounded-xl flex items-center justify-center mb-3">
                          <span className="text-[#C8973E] font-bold">{t.nomor_meja}</span>
                        </div>
                        <p className="font-bold text-white">Meja {t.nomor_meja}</p>
                        <p className="text-[#C8973E] text-sm font-semibold mt-1">{t.kapasitas} orang</p>
                        <p className="text-gray-600 text-xs capitalize mt-1">{t.posisi.replace("-", " ")}</p>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => openTableForm(t)} className="flex-1 py-2 rounded-lg border border-[#C8973E]/20 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/10">Edit</button>
                          <button onClick={() => deleteTable(t.Id)} className="py-2 px-3 rounded-lg border border-red-500/20 text-red-400 text-xs hover:bg-red-500/10">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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