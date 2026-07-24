"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
  kapasitas_minimum: number | null; minimum_transaksi: number | null;
};
type MejaGabungan = {
  Id: number; created_at: string; outlet: string; nama: string;
  deskripsi: string | null; meja_ids: number[]; kapasitas_total: number;
  kapasitas_minimum: number | null; dp_minimum: number | null;
  minimum_transaksi: number | null; foto_url: string | null; aktif: boolean;
};

function AreaCardImage({ area, tables }: { area: Area; tables: TableData[] }) {
  const photos = tables.filter((t) => t.outlet === area.outlet && t.posisi === area.slug && t.foto_url).map((t) => t.foto_url as string);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);
  if (photos.length === 0) return (
    <div className="w-full h-full bg-gradient-to-br from-[#E8DCC8] to-[#D4C4A8] flex flex-col items-center justify-center gap-2">
      <span className="text-3xl text-[#C8973E]/30">📷</span>
      <span className="text-xs text-[#8B7355]">Belum ada foto</span>
    </div>
  );
  return <>
    {photos.map((url, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={url} src={url} alt={area.nama} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
    {photos.length > 1 && (
      <div className="absolute bottom-3 right-3 flex gap-1 z-10">
        {photos.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />)}
      </div>
    )}
  </>;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas tidak didukung")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error("Gagal")); }, "image/jpeg", quality);
    };
    img.onerror = reject; img.src = url;
  });
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<"reservasi" | "area" | "gabungan">("reservasi");
  const [drillArea, setDrillArea] = useState<Area | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [gabunganList, setGabunganList] = useState<MejaGabungan[]>([]);
  const [filterOutlet, setFilterOutlet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [showTableForm, setShowTableForm] = useState(false);
  const [uploadingTable, setUploadingTable] = useState(false);
  const [showGabunganForm, setShowGabunganForm] = useState(false);
  const [editGabungan, setEditGabungan] = useState<MejaGabungan | null>(null);
  const [gOutlet, setGOutlet] = useState("solo");
  const [gNama, setGNama] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gMejaIds, setGMejaIds] = useState<number[]>([]);
  const [gKapMin, setGKapMin] = useState("");
  const [gDp, setGDp] = useState("");
  const [gMinTrx, setGMinTrx] = useState("");
  const [aOutlet, setAOutlet] = useState("solo");
  const [aNama, setANama] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aUrutan, setAUrutan] = useState("0");
  const [tNomor, setTNomor] = useState("");
  const [tNama, setTNama] = useState("");
  const [tKap, setTKap] = useState("4");
  const [tKapMin, setTKapMin] = useState("");
  const [tDp, setTDp] = useState("");
  const [tMinTrx, setTMinTrx] = useState("");

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("Reservation").select("*").order("created_at", { ascending: false });
    if (filterOutlet) q = q.eq("outlet", filterOutlet);
    if (filterStatus) q = q.eq("status", filterStatus);
    if (filterDate) q = q.eq("tanggal", filterDate);
    const { data } = await q; setReservations(data || []); setLoading(false);
  }, [filterOutlet, filterStatus, filterDate]);
  const fetchAreas = useCallback(async () => { const { data } = await supabase.from("Areas").select("*").order("outlet").order("urutan"); setAreas(data || []); }, []);
  const fetchTables = useCallback(async () => { const { data } = await supabase.from("Tables").select("*").order("outlet").order("nomor_meja"); setTables(data || []); }, []);
  const fetchGabungan = useCallback(async () => { const { data } = await supabase.from("MejaGabungan").select("*").order("outlet").order("nama"); setGabunganList(data || []); }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (tab === "reservasi") void fetchReservations();
    if (tab === "area") { void fetchAreas(); void fetchTables(); }
    if (tab === "gabungan") { void fetchGabungan(); void fetchTables(); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, fetchReservations, fetchAreas, fetchTables, fetchGabungan]);

  async function updateStatus(id: number, s: string) { await supabase.from("Reservation").update({ status: s }).eq("Id", id); fetchReservations(); }
  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function totalKapasitas(a: Area) { return tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).reduce((sum, t) => sum + t.kapasitas, 0); }

  function openAreaForm(area?: Area) {
    if (area) { setEditArea(area); setAOutlet(area.outlet); setANama(area.nama); setASlug(area.slug); setADesc(area.deskripsi || ""); setAUrutan(String(area.urutan)); }
    else { setEditArea(null); setAOutlet("solo"); setANama(""); setASlug(""); setADesc(""); setAUrutan("0"); }
    setShowAreaForm(true);
  }
  async function saveArea() {
    const p = { outlet: aOutlet, nama: aNama, slug: aSlug, deskripsi: aDesc, urutan: Number(aUrutan) };
    const { error } = editArea ? await supabase.from("Areas").update(p).eq("Id", editArea.Id) : await supabase.from("Areas").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowAreaForm(false); fetchAreas();
  }
  async function deleteArea(id: number) { if (!confirm("Hapus area ini?")) return; await supabase.from("Areas").delete().eq("Id", id); fetchAreas(); }

  function openTableForm(t?: TableData) {
    if (t) { setEditTable(t); setTNomor(String(t.nomor_meja)); setTNama(t.nama_meja || ""); setTKap(String(t.kapasitas)); setTKapMin(t.kapasitas_minimum ? String(t.kapasitas_minimum) : ""); setTDp(t.dp_minimum ? String(t.dp_minimum) : ""); setTMinTrx(t.minimum_transaksi ? String(t.minimum_transaksi) : ""); }
    else { setEditTable(null); setTNomor(""); setTNama(""); setTKap("4"); setTKapMin(""); setTDp(""); setTMinTrx(""); }
    setShowTableForm(true);
  }
  async function saveTable() {
    if (!drillArea) return;
    const p = { outlet: drillArea.outlet, posisi: drillArea.slug, nomor_meja: Number(tNomor), nama_meja: tNama || null, kapasitas: Number(tKap), kapasitas_minimum: tKapMin ? Number(tKapMin) : null, dp_minimum: tDp ? Number(tDp) : null, minimum_transaksi: tMinTrx ? Number(tMinTrx) : null };
    const { error } = editTable ? await supabase.from("Tables").update(p).eq("Id", editTable.Id) : await supabase.from("Tables").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowTableForm(false); fetchTables();
  }
  async function deleteTable(id: number) { if (!confirm("Hapus meja ini?")) return; await supabase.from("Tables").delete().eq("Id", id); fetchTables(); }
  async function uploadTablePhoto(tableId: number, file: File) {
    setUploadingTable(true);
    try { const compressed = await compressImage(file); const path = `tables/${tableId}-${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" }); if (error) { alert("Upload gagal: " + error.message); setUploadingTable(false); return; } const { data: u } = supabase.storage.from("photos").getPublicUrl(path); await supabase.from("Tables").update({ foto_url: u.publicUrl }).eq("Id", tableId); } catch { alert("Gagal memproses gambar."); }
    setUploadingTable(false); fetchTables();
  }

  function openGabunganForm(g?: MejaGabungan) {
    if (g) { setEditGabungan(g); setGOutlet(g.outlet); setGNama(g.nama); setGDesc(g.deskripsi || ""); setGMejaIds(g.meja_ids || []); setGKapMin(g.kapasitas_minimum ? String(g.kapasitas_minimum) : ""); setGDp(g.dp_minimum ? String(g.dp_minimum) : ""); setGMinTrx(g.minimum_transaksi ? String(g.minimum_transaksi) : ""); }
    else { setEditGabungan(null); setGOutlet("solo"); setGNama(""); setGDesc(""); setGMejaIds([]); setGKapMin(""); setGDp(""); setGMinTrx(""); }
    setShowGabunganForm(true);
  }
  function toggleMejaInGabungan(id: number) { setGMejaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); }
  function gabunganKapTotal() { return tables.filter((t) => gMejaIds.includes(t.Id)).reduce((s, t) => s + t.kapasitas, 0); }
  async function saveGabungan() {
    if (gMejaIds.length < 2) { alert("Pilih minimal 2 meja"); return; }
    if (!gNama.trim()) { alert("Isi nama gabungan"); return; }
    const p = { outlet: gOutlet, nama: gNama, deskripsi: gDesc || null, meja_ids: gMejaIds, kapasitas_total: gabunganKapTotal(), kapasitas_minimum: gKapMin ? Number(gKapMin) : null, dp_minimum: gDp ? Number(gDp) : null, minimum_transaksi: gMinTrx ? Number(gMinTrx) : null, aktif: true };
    const { error } = editGabungan ? await supabase.from("MejaGabungan").update(p).eq("Id", editGabungan.Id) : await supabase.from("MejaGabungan").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowGabunganForm(false); fetchGabungan();
  }
  async function deleteGabungan(id: number) { if (!confirm("Hapus gabungan ini?")) return; await supabase.from("MejaGabungan").delete().eq("Id", id); fetchGabungan(); }
  async function toggleGabunganAktif(g: MejaGabungan) { await supabase.from("MejaGabungan").update({ aktif: !g.aktif }).eq("Id", g.Id); fetchGabungan(); }
  function getMejaLabel(id: number) { const t = tables.find((t) => t.Id === id); return t ? (t.nama_meja || `Meja ${t.nomor_meja}`) : `#${id}`; }

  const stats = { total: reservations.length, pending: reservations.filter((r) => r.status === "Pending").length, confirmed: reservations.filter((r) => r.status === "Confirmed").length, completed: reservations.filter((r) => r.status === "Completed").length, cancelled: reservations.filter((r) => r.status === "Cancelled").length };
  const statusStyle: Record<string, string> = { Pending: "bg-[#C8973E]/15 text-[#C8973E] border-[#C8973E]/30", Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200", Completed: "bg-blue-50 text-blue-700 border-blue-200", Cancelled: "bg-red-50 text-red-600 border-red-200" };

  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] text-sm placeholder-[#C8B89A] transition-all";
  const labelClass = "block text-[10px] font-bold text-[#C8973E] mb-2 tracking-[0.2em] uppercase";
  const filterClass = "px-3 py-2 rounded-xl border-2 border-[#E8DCC8] bg-[#FEFCF8] text-sm text-[#5C3D1A] outline-none focus:border-[#C8973E]";

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      {/* HEADER */}
      <div className="bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.PNG" alt="Yassalam" width={40} height={40} />
            <div>
              <p className="text-[#C8973E] text-[10px] tracking-[0.4em] uppercase font-semibold">Yassalam Arabian Resto</p>
              <h1 className="text-xl font-bold text-white font-serif">Dashboard Admin</h1>
            </div>
          </div>
          <Link href="/" className="px-5 py-2.5 rounded-xl border border-[#C8973E]/40 text-[#C8973E] text-sm font-semibold hover:bg-[#C8973E]/10 transition-all">← Website</Link>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex bg-white rounded-2xl p-1.5 border border-[#E8DCC8] shadow-sm">
          {[
            { key: "reservasi", label: "Reservasi", icon: "📋" },
            { key: "area", label: "Area & Meja", icon: "🏛" },
            { key: "gabungan", label: "Meja Gabungan", icon: "🔗" },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key as typeof tab); setDrillArea(null); }}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white shadow-lg shadow-[#C8973E]/20" : "text-[#8B7355] hover:text-[#C8973E]"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ========== TAB RESERVASI ========== */}
        {tab === "reservasi" && (<>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total", value: stats.total, bg: "bg-white border-[#C8973E]/20", text: "text-[#C8973E]" },
              { label: "Pending", value: stats.pending, bg: "bg-[#C8973E]/5 border-[#C8973E]/20", text: "text-[#C8973E]" },
              { label: "Confirmed", value: stats.confirmed, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-600" },
              { label: "Completed", value: stats.completed, bg: "bg-blue-50 border-blue-200", text: "text-blue-600" },
              { label: "Cancelled", value: stats.cancelled, bg: "bg-red-50 border-red-200", text: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border-2 rounded-2xl p-5 text-center`}>
                <p className={`text-3xl font-bold font-serif ${s.text}`}>{s.value}</p>
                <p className="text-xs mt-2 text-[#8B7355] tracking-wider uppercase">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border-2 border-[#E8DCC8] rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-center">
            <span className="text-[#C8973E] text-xs font-bold tracking-wider uppercase mr-2">Filter:</span>
            <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)} className={filterClass}>
              <option value="">Semua Outlet</option><option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterClass}>
              <option value="">Semua Status</option><option value="Pending">Pending</option><option value="Confirmed">Confirmed</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
            </select>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={filterClass} />
            {(filterOutlet || filterStatus || filterDate) && <button onClick={() => { setFilterOutlet(""); setFilterStatus(""); setFilterDate(""); }} className="text-sm text-[#C8973E] hover:underline">✕ Reset</button>}
          </div>
          {loading ? <p className="text-center text-[#B8A88A] py-16">Memuat data...</p> : reservations.length === 0 ? <p className="text-center text-[#B8A88A] py-16">Tidak ada reservasi</p> : (
            <div className="space-y-4">
              {reservations.map((r) => (
                <div key={r.Id} className="bg-white border-2 border-[#E8DCC8] rounded-2xl p-6 hover:border-[#C8973E]/30 hover:shadow-lg hover:shadow-[#C8973E]/5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-[#5C3D1A] text-xl font-serif">{r.nama_tamu}</h3>
                        <span className={`text-[10px] px-3 py-1 rounded-full border-2 font-bold tracking-wider uppercase ${statusStyle[r.status] || ""}`}>{r.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span className="text-[#8B7355]">📍 <span className="capitalize text-[#5C3D1A]">{r.outlet}</span></span>
                        <span className="text-[#8B7355]">📅 <span className="text-[#5C3D1A]">{r.tanggal}</span></span>
                        <span className="text-[#8B7355]">🕐 <span className="text-[#5C3D1A]">{r.jam}</span></span>
                        <span className="text-[#8B7355]">👥 <span className="text-[#5C3D1A]">{r.jumlah_tamu} orang</span></span>
                        {r.meja_id && <span className="text-[#8B7355]">🪑 <span className="text-[#C8973E] font-semibold">Meja #{r.meja_id}</span></span>}
                      </div>
                      <div className="text-sm text-[#8B7355]">📱 <span className="text-[#5C3D1A]">{r.no_whatsapp}</span>{r.dp_amount ? <span className="ml-5 text-[#C8973E] font-semibold">💰 {formatRupiah(r.dp_amount)}</span> : null}</div>
                      {r.catatan && <p className="text-sm text-[#8B7355] italic border-l-2 border-[#C8973E]/30 pl-3 mt-1">📝 {r.catatan}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      {r.status === "Pending" && (<>
                        <button onClick={() => updateStatus(r.Id, "Confirmed")} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20 active:scale-[0.98] transition-all">✓ Konfirmasi</button>
                        <button onClick={() => updateStatus(r.Id, "Cancelled")} className="px-5 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50">✕ Tolak</button>
                      </>)}
                      {r.status === "Confirmed" && <button onClick={() => updateStatus(r.Id, "Completed")} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold active:scale-[0.98]">✓ Selesai</button>}
                      {r.status === "Cancelled" && <button onClick={() => updateStatus(r.Id, "Pending")} className="px-5 py-2.5 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-sm font-semibold hover:bg-[#C8973E]/5">↩ Kembalikan</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ========== TAB AREA ========== */}
        {tab === "area" && !drillArea && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Area &amp; Ruangan</h2><p className="text-[#8B7355] text-sm mt-1">Klik area untuk kelola meja</p></div>
            <button onClick={() => openAreaForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20 active:scale-[0.98]">+ Tambah Area</button>
          </div>
          {showAreaForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
                <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">{editArea ? "Edit Area" : "Area Baru"}</h3><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={aOutlet} onChange={(e) => setAOutlet(e.target.value)} className={inputClass}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Area</label><input value={aNama} onChange={(e) => setANama(e.target.value)} placeholder="Contoh: VIP Room" className={inputClass} /></div>
                <div><label className={labelClass}>Slug</label><input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="Contoh: vip" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi</label><textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Urutan</label><input type="number" value={aUrutan} onChange={(e) => setAUrutan(e.target.value)} className={inputClass} /></div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowAreaForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Batal</button>
                  <button onClick={saveArea} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((a) => {
              const jumlahMeja = tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).length;
              return (
                <div key={a.Id} className="group bg-white rounded-2xl overflow-hidden border-2 border-[#E8DCC8] shadow-md hover:shadow-xl hover:shadow-[#C8973E]/10 hover:border-[#C8973E]/30 transition-all hover:-translate-y-1">
                  <button onClick={() => setDrillArea(a)} className="w-full h-44 relative overflow-hidden block text-left">
                    <AreaCardImage area={a} tables={tables} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <span className="bg-[#C8973E] text-white text-[10px] px-3 py-1 rounded-full font-bold">Max {totalKapasitas(a)} orang</span>
                      <span className="bg-white/90 text-[#5C3D1A] text-[10px] px-3 py-1 rounded-full capitalize font-semibold">{a.outlet}</span>
                    </div>
                  </button>
                  <div className="p-5 space-y-3">
                    <button onClick={() => setDrillArea(a)} className="text-left w-full">
                      <h3 className="font-bold text-[#5C3D1A] text-lg font-serif group-hover:text-[#C8973E] transition-colors">{a.nama} →</h3>
                      <p className="text-[#8B7355] text-sm mt-1 line-clamp-2">{a.deskripsi}</p>
                      <p className="text-[#C8973E] text-xs mt-2 font-semibold">{jumlahMeja} meja terdaftar</p>
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); openAreaForm(a); }} className="flex-1 py-2.5 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-sm font-bold hover:bg-[#C8973E]/5">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteArea(a.Id); }} className="py-2.5 px-4 rounded-xl border-2 border-red-200 text-red-400 text-sm hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ========== DRILL-DOWN MEJA ========== */}
        {tab === "area" && drillArea && (<>
          <div className="flex justify-between items-center mb-8">
            <div>
              <button onClick={() => setDrillArea(null)} className="text-sm text-[#C8973E] hover:underline mb-2">← Kembali ke Area</button>
              <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">{drillArea.nama} <span className="text-[#8B7355] text-base capitalize">· {drillArea.outlet}</span></h2>
              <p className="text-[#8B7355] text-sm mt-1">Total kapasitas: <span className="text-[#C8973E] font-semibold">{totalKapasitas(drillArea)} orang</span></p>
            </div>
            <button onClick={() => openTableForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20">+ Tambah Meja</button>
          </div>
          {showTableForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">{editTable ? "Edit Meja" : "Meja Baru"}</h3>
                  <p className="text-[#8B7355] text-xs mt-1">{drillArea.nama} · <span className="capitalize">{drillArea.outlet}</span></p><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                <div><label className={labelClass}>Nomor Meja</label><input type="number" value={tNomor} onChange={(e) => setTNomor(e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Nama Meja <span className="normal-case font-normal text-[#B8A88A]">(opsional)</span></label><input value={tNama} onChange={(e) => setTNama(e.target.value)} placeholder="Contoh: Meja Sultan" className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Kapasitas Max</label><input type="number" value={tKap} onChange={(e) => setTKap(e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Kapasitas Min</label><input type="number" value={tKapMin} onChange={(e) => setTKapMin(e.target.value)} placeholder="Opsional" className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Uang Muka (Rp)</label><input type="number" value={tDp} onChange={(e) => setTDp(e.target.value)} placeholder="50000" className={inputClass} /></div>
                  <div><label className={labelClass}>Min. Transaksi (Rp)</label><input type="number" value={tMinTrx} onChange={(e) => setTMinTrx(e.target.value)} placeholder="300000" className={inputClass} /></div>
                </div>
                <p className="text-xs text-[#B8A88A]">Kapasitas min = minimal tamu. Min. transaksi = minimal belanja customer.</p>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowTableForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Batal</button>
                  <button onClick={saveTable} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).map((t) => (
              <div key={t.Id} className="bg-white border-2 border-[#E8DCC8] rounded-2xl overflow-hidden group hover:border-[#C8973E]/30 hover:shadow-xl hover:shadow-[#C8973E]/5 transition-all">
                <div className="h-40 bg-[#FDF6EC] relative overflow-hidden">
                  {t.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.foto_url} alt={t.nama_meja || `Meja ${t.nomor_meja}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2"><span className="text-3xl text-[#C8973E]/20">📷</span><span className="text-xs text-[#8B7355]">Belum ada foto</span></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 bg-[#C8973E] text-white text-[10px] px-3 py-1 rounded-full font-bold">
                    {t.kapasitas_minimum ? `${t.kapasitas_minimum}–${t.kapasitas}` : t.kapasitas} orang
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <p className="font-bold text-[#5C3D1A] text-lg font-serif">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                  {t.nama_meja && <p className="text-[#8B7355] text-xs">No. {t.nomor_meja}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-[#C8973E] font-semibold">{t.dp_minimum ? `DP ${formatRupiah(t.dp_minimum)}` : "Tanpa DP"}</span>
                    {t.minimum_transaksi && <span className="text-[#8B7355]">Min. trx {formatRupiah(t.minimum_transaksi)}</span>}
                  </div>
                  <label className="inline-block cursor-pointer pt-1">
                    <span className="text-xs text-[#C8973E] font-semibold hover:text-[#A67B2E]">{uploadingTable ? "⏳ Mengupload..." : t.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTablePhoto(t.Id, f); }} />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openTableForm(t)} className="flex-1 py-2 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/5">Edit</button>
                    <button onClick={() => deleteTable(t.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).length === 0 && (
              <p className="text-[#8B7355] col-span-full text-center py-10">Belum ada meja. Klik &quot;+ Tambah Meja&quot;.</p>
            )}
          </div>
        </>)}

        {/* ========== TAB MEJA GABUNGAN ========== */}
        {tab === "gabungan" && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Meja Gabungan</h2><p className="text-[#8B7355] text-sm mt-1">Kombinasi 2+ meja untuk rombongan besar. Semua meja otomatis terkunci saat dibooking.</p></div>
            <button onClick={() => openGabunganForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20">+ Buat Gabungan</button>
          </div>
          {showGabunganForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">{editGabungan ? "Edit Gabungan" : "Gabungan Baru"}</h3><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={gOutlet} onChange={(e) => { setGOutlet(e.target.value); setGMejaIds([]); }} className={inputClass}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Gabungan</label><input value={gNama} onChange={(e) => setGNama(e.target.value)} placeholder="Contoh: Gabungan Meja 1 + 2" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi <span className="normal-case font-normal text-[#B8A88A]">(opsional)</span></label><textarea value={gDesc} onChange={(e) => setGDesc(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Cocok untuk acara keluarga" /></div>
                <div>
                  <label className={labelClass}>Pilih Meja (min 2)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {tables.filter((t) => t.outlet === gOutlet && areas.some((a) => a.slug === t.posisi && a.outlet === t.outlet)).map((t) => (
                      <button key={t.Id} onClick={() => toggleMejaInGabungan(t.Id)}
                        className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${gMejaIds.includes(t.Id) ? "border-[#C8973E] bg-[#FDF6EC]" : "border-[#E8DCC8] hover:border-[#C8973E]/50"}`}>
                        <p className={`font-bold ${gMejaIds.includes(t.Id) ? "text-[#C8973E]" : "text-[#5C3D1A]"}`}>{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
<p className="text-[#8B7355] text-xs">{t.kapasitas} orang · {areas.find((a) => a.slug === t.posisi && a.outlet === t.outlet)?.nama || t.posisi}</p>
                      </button>
                    ))}
                  </div>
                  {gMejaIds.length > 0 && <p className="text-sm text-[#C8973E] mt-2 font-semibold">{gMejaIds.length} meja · Total: {gabunganKapTotal()} orang</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelClass}>Kap. Min</label><input type="number" value={gKapMin} onChange={(e) => setGKapMin(e.target.value)} placeholder="6" className={inputClass} /></div>
                  <div><label className={labelClass}>DP (Rp)</label><input type="number" value={gDp} onChange={(e) => setGDp(e.target.value)} placeholder="200000" className={inputClass} /></div>
                  <div><label className={labelClass}>Min. Trx</label><input type="number" value={gMinTrx} onChange={(e) => setGMinTrx(e.target.value)} placeholder="500000" className={inputClass} /></div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowGabunganForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Batal</button>
                  <button onClick={saveGabungan} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          {gabunganList.length === 0 ? <p className="text-center text-[#B8A88A] py-16">Belum ada meja gabungan.</p> : (
            <div className="space-y-4">
              {gabunganList.map((g) => (
                <div key={g.Id} className={`bg-white border-2 rounded-2xl p-6 transition-all ${g.aktif ? "border-[#E8DCC8] hover:border-[#C8973E]/30 hover:shadow-lg hover:shadow-[#C8973E]/5" : "border-gray-200 opacity-60"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-[#5C3D1A] text-lg font-serif">{g.nama}</h3>
                        <span className="bg-[#FDF6EC] text-[#8B7355] text-[10px] px-3 py-1 rounded-full capitalize border border-[#E8DCC8]">{g.outlet}</span>
                        <span className={`text-[10px] px-3 py-1 rounded-full border-2 font-bold ${g.aktif ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>{g.aktif ? "Aktif" : "Nonaktif"}</span>
                      </div>
                      {g.deskripsi && <p className="text-[#8B7355] text-sm">{g.deskripsi}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {(g.meja_ids || []).map((id) => (
                          <span key={id} className="bg-[#FDF6EC] text-[#C8973E] text-xs px-3 py-1 rounded-full font-semibold border border-[#C8973E]/20">{getMejaLabel(id)}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span className="text-[#8B7355]">👥 <span className="text-[#5C3D1A]">{g.kapasitas_minimum ? `${g.kapasitas_minimum}–` : ""}{g.kapasitas_total} orang</span></span>
                        {g.dp_minimum && <span className="text-[#C8973E] font-semibold">DP {formatRupiah(g.dp_minimum)}</span>}
                        {g.minimum_transaksi && <span className="text-[#8B7355]">Min. trx {formatRupiah(g.minimum_transaksi)}</span>}
                      </div>
                      {g.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.foto_url} alt={g.nama} className="w-full h-40 object-cover rounded-xl mt-3 border-2 border-[#E8DCC8]" />
                      )}
                      <label className="inline-block cursor-pointer mt-2">
                        <span className="text-xs text-[#C8973E] font-semibold hover:text-[#A67B2E]">{g.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          try {
                            const compressed = await compressImage(f);
                            const path = `gabungan/${g.Id}-${crypto.randomUUID()}.jpg`;
                            const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" });
                            if (error) { alert("Upload gagal: " + error.message); return; }
                            const { data: u } = supabase.storage.from("photos").getPublicUrl(path);
                            await supabase.from("MejaGabungan").update({ foto_url: u.publicUrl }).eq("Id", g.Id);
                            fetchGabungan();
                          } catch { alert("Gagal memproses gambar."); }
                        }} />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      <button onClick={() => toggleGabunganAktif(g)} className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${g.aktif ? "border-[#E8DCC8] text-[#8B7355] hover:bg-[#FDF6EC]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{g.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => openGabunganForm(g)} className="px-5 py-2.5 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-sm font-semibold hover:bg-[#C8973E]/5">Edit</button>
                      <button onClick={() => deleteGabungan(g.Id)} className="px-5 py-2.5 rounded-xl border-2 border-red-200 text-red-400 text-sm hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#E8DCC8] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-[#C8973E]/40 text-xs">━━ ✦ ━━</p>
          <p className="text-[#B8A88A] text-xs mt-2">© 2026 Yassalam Arabian Resto &amp; Catering</p>
        </div>
      </div>
    </div>
  );
}