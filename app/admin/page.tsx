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
  share_token: string | null; menu_finalized: boolean | null;
};
type ReservationMenuItemT = {
  Id: number; reservation_id: number; menu_id: number; varian_id: number | null; addon_ids: number[];
  jumlah_porsi: number; harga_satuan: number; subtotal: number; catatan: string | null; nama_pemesan: string | null;
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
type MenuKategori = {
  Id: number; outlet: string; nama: string; urutan: number; aktif: boolean;
};
type MenuItem = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
  kategori_id: number | null; foto_url: string | null; urutan: number;
  aktif: boolean; punya_varian: boolean;
};
type MenuVarian = {
  Id: number; menu_id: number; nama: string; harga_tambahan: number;
  urutan: number; aktif: boolean;
};
type MenuAddon = {
  Id: number; menu_id: number; nama: string; harga_tambahan: number;
  urutan: number; aktif: boolean;
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

function GabunganCardImage({ gabungan, tables }: { gabungan: MejaGabungan; tables: TableData[] }) {
  const photos = (gabungan.meja_ids || [])
    .map((id) => tables.find((t) => t.Id === id)?.foto_url)
    .filter((url): url is string => !!url);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);
  if (photos.length === 0) return (
    <div className="w-full h-full bg-gradient-to-br from-[#E8DCC8] to-[#D4C4A8] flex flex-col items-center justify-center gap-1">
      <span className="text-2xl text-[#C8973E]/30">📷</span>
      <span className="text-[10px] text-[#8B7355]">Belum ada foto meja</span>
    </div>
  );
  return <>
    {photos.map((url, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={url} src={url} alt={gabungan.nama} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
    {photos.length > 1 && (
      <div className="absolute bottom-2 right-2 flex gap-1 z-10">
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
  const [tab, setTab] = useState<"reservasi" | "area" | "gabungan" | "menu">("reservasi");
  const [drillArea, setDrillArea] = useState<Area | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [gabunganList, setGabunganList] = useState<MejaGabungan[]>([]);
  const [filterOutlet, setFilterOutlet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [cutoffSetting, setCutoffSetting] = useState("4");
  const [savingCutoff, setSavingCutoff] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [loadingOrderKeys, setLoadingOrderKeys] = useState<Set<string>>(new Set());
  const [ordersCache, setOrdersCache] = useState<Record<string, ReservationMenuItemT[]>>({});
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [allVarianAdmin, setAllVarianAdmin] = useState<MenuVarian[]>([]);
  const [allAddonAdmin, setAllAddonAdmin] = useState<MenuAddon[]>([]);
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

  // ===== MENU =====
  const [menuKategoriList, setMenuKategoriList] = useState<MenuKategori[]>([]);
  const [menuItemList, setMenuItemList] = useState<MenuItem[]>([]);
  const [drillKategori, setDrillKategori] = useState<MenuKategori | null>(null);
  const [showKategoriForm, setShowKategoriForm] = useState(false);
  const [editKategori, setEditKategori] = useState<MenuKategori | null>(null);
  const [kOutlet, setKOutlet] = useState("solo");
  const [kNama, setKNama] = useState("");
  const [kUrutan, setKUrutan] = useState("0");

  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [editMenuItem, setEditMenuItem] = useState<MenuItem | null>(null);
  const [miNama, setMiNama] = useState("");
  const [miDesc, setMiDesc] = useState("");
  const [miHarga, setMiHarga] = useState("");
  const [miPunyaVarian, setMiPunyaVarian] = useState(false);
  const [uploadingMenuItem, setUploadingMenuItem] = useState(false);

  const [manageMenuItem, setManageMenuItem] = useState<MenuItem | null>(null);
  const [menuVarianList, setMenuVarianList] = useState<MenuVarian[]>([]);
  const [menuAddonList, setMenuAddonList] = useState<MenuAddon[]>([]);
  const [vNama, setVNama] = useState("");
  const [vHarga, setVHarga] = useState("");
  const [adNama, setAdNama] = useState("");
  const [adHarga, setAdHarga] = useState("");

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
  const fetchMenuKategori = useCallback(async () => { const { data } = await supabase.from("MenuKategori").select("*").order("outlet").order("urutan"); setMenuKategoriList(data || []); }, []);
  const fetchMenuItems = useCallback(async () => { const { data } = await supabase.from("MenuPaket").select("*").order("outlet").order("urutan"); setMenuItemList(data || []); }, []);
  const fetchVarian = useCallback(async (menuId: number) => { const { data } = await supabase.from("MenuVarian").select("*").eq("menu_id", menuId).order("urutan"); setMenuVarianList(data || []); }, []);
  const fetchAddon = useCallback(async (menuId: number) => { const { data } = await supabase.from("MenuAddon").select("*").eq("menu_id", menuId).order("urutan"); setMenuAddonList(data || []); }, []);

  const fetchCutoffSetting = useCallback(async () => {
    const { data } = await supabase.from("AppSettings").select("value").eq("key", "menu_cutoff_hours").single();
    if (data?.value) setCutoffSetting(data.value);
  }, []);
  async function saveCutoffSetting() {
    setSavingCutoff(true);
    const { error } = await supabase.from("AppSettings").update({ value: cutoffSetting }).eq("key", "menu_cutoff_hours");
    setSavingCutoff(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    alert("Pengaturan disimpan.");
  }

  const fetchAllMenuLookups = useCallback(async () => {
    const { data: mi } = await supabase.from("MenuPaket").select("*");
    setAllMenuItems(mi || []);
    const { data: mv } = await supabase.from("MenuVarian").select("*");
    setAllVarianAdmin(mv || []);
    const { data: ma } = await supabase.from("MenuAddon").select("*");
    setAllAddonAdmin(ma || []);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (tab === "reservasi") { void fetchReservations(); void fetchAllMenuLookups(); void fetchTables(); void fetchCutoffSetting(); }
    if (tab === "area") { void fetchAreas(); void fetchTables(); }
    if (tab === "gabungan") { void fetchGabungan(); void fetchTables(); }
    if (tab === "menu") { void fetchMenuKategori(); void fetchMenuItems(); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, fetchReservations, fetchAreas, fetchTables, fetchGabungan, fetchMenuKategori, fetchMenuItems, fetchAllMenuLookups, fetchCutoffSetting]);

  async function updateStatus(id: number, s: string) { await supabase.from("Reservation").update({ status: s }).eq("Id", id); fetchReservations(); }
  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function formatJam(jam: string) { return (jam || "").slice(0, 5); }
  function sendMenuLinkWA(r: Reservation) {
    if (!r.share_token) { alert("Reservasi ini belum punya link menu."); return; }
    const link = `${window.location.origin}/pesan/${r.share_token}`;
    const msg = `Halo ${r.nama_tamu}, ini link untuk pesan menu reservasi Anda di Yassalam:\n${link}\n\nBisa dibagikan ke teman/rombongan Anda juga ya 🙏`;
    window.open(`https://wa.me/${r.no_whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }
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

  function orderKey(r: Reservation) { return r.share_token || `id-${r.Id}`; }
  function getOrderMenuName(id: number) { return allMenuItems.find((m) => m.Id === id)?.nama_paket || "Menu"; }
  function getOrderVarianName(id: number | null) { if (!id) return null; return allVarianAdmin.find((v) => v.Id === id)?.nama || null; }
  function getOrderAddonNames(ids: number[]) { return (ids || []).map((id) => allAddonAdmin.find((a) => a.Id === id)?.nama).filter(Boolean).join(", "); }

  async function toggleExpandOrders(r: Reservation) {
    const key = orderKey(r);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (!ordersCache[key]) {
      setLoadingOrderKeys((prev) => new Set(prev).add(key));
      let resIds = [r.Id];
      if (r.share_token) {
        const { data: groupRes } = await supabase.from("Reservation").select("Id").eq("share_token", r.share_token);
        resIds = (groupRes || []).map((x: { Id: number }) => x.Id);
      }
      const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds).order("created_at");
      setOrdersCache((prev) => ({ ...prev, [key]: orderData || [] }));
      setLoadingOrderKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  // ===== MENU KATEGORI =====
  function openKategoriForm(k?: MenuKategori) {
    if (k) { setEditKategori(k); setKOutlet(k.outlet); setKNama(k.nama); setKUrutan(String(k.urutan)); }
    else { setEditKategori(null); setKOutlet("solo"); setKNama(""); setKUrutan("0"); }
    setShowKategoriForm(true);
  }
  async function saveKategori() {
    if (!kNama.trim()) { alert("Isi nama kategori"); return; }
    const p = { outlet: kOutlet, nama: kNama, urutan: Number(kUrutan), aktif: true };
    const { error } = editKategori ? await supabase.from("MenuKategori").update(p).eq("Id", editKategori.Id) : await supabase.from("MenuKategori").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowKategoriForm(false); fetchMenuKategori();
  }
  async function deleteKategori(id: number) { if (!confirm("Hapus kategori ini? Menu di dalamnya tidak ikut terhapus.")) return; await supabase.from("MenuKategori").delete().eq("Id", id); fetchMenuKategori(); }
  async function toggleKategoriAktif(k: MenuKategori) { await supabase.from("MenuKategori").update({ aktif: !k.aktif }).eq("Id", k.Id); fetchMenuKategori(); }

  // ===== MENU ITEM =====
  function openMenuItemForm(m?: MenuItem) {
    if (m) { setEditMenuItem(m); setMiNama(m.nama_paket); setMiDesc(m.deskripsi || ""); setMiHarga(String(m.harga)); setMiPunyaVarian(m.punya_varian); }
    else { setEditMenuItem(null); setMiNama(""); setMiDesc(""); setMiHarga(""); setMiPunyaVarian(false); }
    setShowMenuItemForm(true);
  }
  async function saveMenuItem() {
    if (!drillKategori) return;
    if (!miNama.trim()) { alert("Isi nama menu"); return; }
    const p = { nama_paket: miNama, deskripsi: miDesc, harga: Number(miHarga) || 0, outlet: drillKategori.outlet, kategori_id: drillKategori.Id, punya_varian: miPunyaVarian, aktif: true };
    const { error } = editMenuItem ? await supabase.from("MenuPaket").update(p).eq("Id", editMenuItem.Id) : await supabase.from("MenuPaket").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowMenuItemForm(false); fetchMenuItems();
  }
  async function deleteMenuItem(id: number) { if (!confirm("Hapus menu ini?")) return; await supabase.from("MenuPaket").delete().eq("Id", id); fetchMenuItems(); }
  async function toggleMenuItemAktif(m: MenuItem) { await supabase.from("MenuPaket").update({ aktif: !m.aktif }).eq("Id", m.Id); fetchMenuItems(); }
  async function uploadMenuItemPhoto(menuId: number, file: File) {
    setUploadingMenuItem(true);
    try {
      const compressed = await compressImage(file);
      const path = `menu/${menuId}-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" });
      if (error) { alert("Upload gagal: " + error.message); setUploadingMenuItem(false); return; }
      const { data: u } = supabase.storage.from("photos").getPublicUrl(path);
      await supabase.from("MenuPaket").update({ foto_url: u.publicUrl }).eq("Id", menuId);
    } catch { alert("Gagal memproses gambar."); }
    setUploadingMenuItem(false); fetchMenuItems();
  }

  // ===== VARIAN & ADDON =====
  function openManageMenuItem(m: MenuItem) {
    setManageMenuItem(m); fetchVarian(m.Id); fetchAddon(m.Id);
    setVNama(""); setVHarga(""); setAdNama(""); setAdHarga("");
  }
  async function addVarian() {
    if (!manageMenuItem || !vNama.trim()) { alert("Isi nama varian"); return; }
    const { error } = await supabase.from("MenuVarian").insert({ menu_id: manageMenuItem.Id, nama: vNama, harga_tambahan: Number(vHarga) || 0, urutan: menuVarianList.length, aktif: true });
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setVNama(""); setVHarga(""); fetchVarian(manageMenuItem.Id);
  }
  async function deleteVarian(id: number) { if (!manageMenuItem) return; await supabase.from("MenuVarian").delete().eq("Id", id); fetchVarian(manageMenuItem.Id); }
  async function addAddon() {
    if (!manageMenuItem || !adNama.trim()) { alert("Isi nama add-on"); return; }
    const { error } = await supabase.from("MenuAddon").insert({ menu_id: manageMenuItem.Id, nama: adNama, harga_tambahan: Number(adHarga) || 0, urutan: menuAddonList.length, aktif: true });
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setAdNama(""); setAdHarga(""); fetchAddon(manageMenuItem.Id);
  }
  async function deleteAddon(id: number) { if (!manageMenuItem) return; await supabase.from("MenuAddon").delete().eq("Id", id); fetchAddon(manageMenuItem.Id); }

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
            { key: "menu", label: "Menu", icon: "🍽" },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key as typeof tab); setDrillArea(null); setDrillKategori(null); }}
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
          <div className="bg-white border-2 border-[#E8DCC8] rounded-2xl p-5 mb-4 flex flex-wrap gap-3 items-center">
            <span className="text-[#C8973E] text-xs font-bold tracking-wider uppercase mr-2">Filter:</span>
            <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)} className={filterClass}>
              <option value="">Semua Outlet</option><option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterClass}>
              <option value="">Semua Status</option><option value="Pending">Pending</option><option value="Confirmed">Confirmed</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
            </select>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={filterClass} />
            <button onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-2 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-sm font-bold hover:bg-[#C8973E]/5">📅 Hari Ini</button>
            {(filterOutlet || filterStatus || filterDate) && <button onClick={() => { setFilterOutlet(""); setFilterStatus(""); setFilterDate(""); }} className="text-sm text-[#C8973E] hover:underline">✕ Reset</button>}
          </div>

          <div className="bg-[#FDF6EC] border-2 border-[#C8973E]/15 rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-3">
            <span className="text-[#C8973E] text-xs font-bold tracking-wider uppercase">⚙ Batas Waktu Pesan Menu:</span>
            <input type="number" min="0" value={cutoffSetting} onChange={(e) => setCutoffSetting(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E8DCC8] bg-white text-sm text-[#5C3D1A] outline-none focus:border-[#C8973E] text-center" />
            <span className="text-sm text-[#8B7355]">jam sebelum jam reservasi</span>
            <button onClick={saveCutoffSetting} disabled={savingCutoff}
              className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-md shadow-[#C8973E]/20 disabled:opacity-50">
              {savingCutoff ? "Menyimpan..." : "Simpan"}
            </button>
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
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm items-center">
                        <span className="text-[#8B7355]">📍 <span className="capitalize text-[#5C3D1A]">{r.outlet}</span></span>
                        <span className="text-[#8B7355]">📅 <span className="text-[#5C3D1A]">{r.tanggal}</span></span>
                        <span className="text-[#8B7355]">🕐 <span className="text-[#5C3D1A]">{formatJam(r.jam)}</span></span>
                        <span className="text-[#8B7355]">👥 <span className="text-[#5C3D1A]">{r.jumlah_tamu} orang</span></span>
                        {r.meja_id && <span className="text-[#8B7355]">🪑 <span className="text-[#C8973E] font-semibold">{getMejaLabel(r.meja_id)}</span></span>}
                        {r.share_token && reservations.filter((x) => x.share_token === r.share_token).length > 1 && (
                          <span className="bg-[#C8973E]/10 text-[#C8973E] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#C8973E]/20">🔗 Gabungan {reservations.filter((x) => x.share_token === r.share_token).length} meja</span>
                        )}
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
                      {r.share_token && (
                        <button onClick={() => sendMenuLinkWA(r)} className="px-5 py-2.5 rounded-xl border-2 border-[#25D366] text-[#1DA851] text-sm font-bold hover:bg-[#25D366]/10 flex items-center justify-center gap-1.5">
                          <span>📲</span> Kirim Link Menu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TOMBOL & PANEL PESANAN MENU */}
                  <div className="mt-3 pt-3 border-t border-[#E8DCC8]">
                    <button onClick={() => toggleExpandOrders(r)}
                      className="flex items-center gap-2 text-sm font-bold text-[#C8973E] hover:text-[#A67B2E] transition-colors">
                      <span>{expandedKeys.has(orderKey(r)) ? "▼" : "▶"}</span>
                      🍽 Pesanan Menu
                      {r.menu_finalized ? (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Terkirim</span>
                      ) : (
                        <span className="bg-[#FDF6EC] text-[#B8A88A] border border-[#E8DCC8] text-[10px] px-2 py-0.5 rounded-full font-bold">Belum Dikirim</span>
                      )}
                    </button>

                    {expandedKeys.has(orderKey(r)) && (
                      <div className="mt-3">
                        {loadingOrderKeys.has(orderKey(r)) ? (
                          <p className="text-sm text-[#B8A88A]">Memuat pesanan...</p>
                        ) : (ordersCache[orderKey(r)] || []).length === 0 ? (
                          <p className="text-sm text-[#B8A88A] bg-[#FDF6EC] rounded-xl p-3">Belum ada pesanan menu.</p>
                        ) : (
                          <div className="bg-[#FDF6EC] border border-[#E8DCC8] rounded-xl divide-y divide-[#E8DCC8] overflow-hidden">
                            {(ordersCache[orderKey(r)] || []).map((o) => (
                              <div key={o.Id} className="p-3 flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#5C3D1A] text-sm">{o.jumlah_porsi}× {getOrderMenuName(o.menu_id)}</p>
                                  {getOrderVarianName(o.varian_id) && <p className="text-xs text-[#8B7355]">Varian: {getOrderVarianName(o.varian_id)}</p>}
                                  {o.addon_ids?.length > 0 && <p className="text-xs text-[#8B7355]">Add-on: {getOrderAddonNames(o.addon_ids)}</p>}
                                  {o.nama_pemesan && <p className="text-xs text-[#C8973E] font-semibold">Pemesan: {o.nama_pemesan}</p>}
                                  {o.catatan && <p className="text-xs text-[#8B7355] italic">📝 {o.catatan}</p>}
                                </div>
                                <p className="font-bold text-[#C8973E] text-sm shrink-0">{formatRupiah(o.subtotal)}</p>
                              </div>
                            ))}
                            {(() => {
                              const items = ordersCache[orderKey(r)] || [];
                              const subtotal = items.reduce((s, o) => s + o.subtotal, 0);
                              const pajak = Math.round(subtotal * 0.1);
                              return (
                                <div className="p-3 bg-white space-y-1">
                                  <div className="flex justify-between text-xs"><span className="text-[#8B7355]">Subtotal</span><span className="text-[#5C3D1A]">{formatRupiah(subtotal)}</span></div>
                                  <div className="flex justify-between text-xs"><span className="text-[#8B7355]">Pajak (10%)</span><span className="text-[#5C3D1A]">{formatRupiah(pajak)}</span></div>
                                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#E8DCC8]"><span className="text-[#5C3D1A]">Total</span><span className="text-[#C8973E]">{formatRupiah(subtotal + pajak)}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gabunganList.map((g) => (
                <div key={g.Id} className={`bg-white border rounded-xl overflow-hidden transition-all ${g.aktif ? "border-[#E8DCC8] hover:border-[#C8973E]/30 hover:shadow-md hover:shadow-[#C8973E]/5" : "border-gray-200 opacity-60"}`}>
                  <div className="relative w-full h-28">
                    <GabunganCardImage gabungan={g} tables={tables} />
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-[#5C3D1A] text-sm font-serif">{g.nama}</h3>
                      <span className="bg-[#FDF6EC] text-[#8B7355] text-[9px] px-1.5 py-0.5 rounded-full capitalize border border-[#E8DCC8]">{g.outlet}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${g.aktif ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>{g.aktif ? "Aktif" : "Nonaktif"}</span>
                    </div>
                    {g.deskripsi && <p className="text-[#8B7355] text-xs">{g.deskripsi}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(g.meja_ids || []).map((id) => (
                        <span key={id} className="bg-[#FDF6EC] text-[#C8973E] text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-[#C8973E]/20">{getMejaLabel(id)}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-[#8B7355]">👥 <span className="text-[#5C3D1A]">{g.kapasitas_minimum ? `${g.kapasitas_minimum}–` : ""}{g.kapasitas_total} orang</span></span>
                      {g.dp_minimum && <span className="text-[#C8973E] font-semibold">DP {formatRupiah(g.dp_minimum)}</span>}
                    </div>
                    {g.minimum_transaksi && <p className="text-[11px] text-[#8B7355]">Min. trx {formatRupiah(g.minimum_transaksi)}</p>}
                    <div className="flex gap-1.5 pt-1.5">
                      <button onClick={() => toggleGabunganAktif(g)} className={`flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${g.aktif ? "border-[#E8DCC8] text-[#8B7355] hover:bg-[#FDF6EC]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{g.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => openGabunganForm(g)} className="flex-1 px-2 py-1.5 rounded-lg border border-[#C8973E]/30 text-[#C8973E] text-[11px] font-semibold hover:bg-[#C8973E]/5">Edit</button>
                      <button onClick={() => deleteGabungan(g.Id)} className="px-2 py-1.5 rounded-lg border border-red-200 text-red-400 text-[11px] hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ========== TAB MENU: LIST KATEGORI ========== */}
        {tab === "menu" && !drillKategori && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Kategori Menu</h2><p className="text-[#8B7355] text-sm mt-1">Klik kategori untuk kelola menu di dalamnya</p></div>
            <button onClick={() => openKategoriForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20 active:scale-[0.98]">+ Tambah Kategori</button>
          </div>
          {showKategoriForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
                <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">{editKategori ? "Edit Kategori" : "Kategori Baru"}</h3><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={kOutlet} onChange={(e) => setKOutlet(e.target.value)} className={inputClass}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Kategori</label><input value={kNama} onChange={(e) => setKNama(e.target.value)} placeholder="Contoh: Makanan Utama" className={inputClass} /></div>
                <div><label className={labelClass}>Urutan</label><input type="number" value={kUrutan} onChange={(e) => setKUrutan(e.target.value)} className={inputClass} /></div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowKategoriForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Batal</button>
                  <button onClick={saveKategori} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          {menuKategoriList.length === 0 ? <p className="text-center text-[#B8A88A] py-16">Belum ada kategori. Klik &quot;+ Tambah Kategori&quot;.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuKategoriList.map((k) => {
                const jumlahMenu = menuItemList.filter((m) => m.kategori_id === k.Id).length;
                return (
                  <div key={k.Id} className={`bg-white rounded-2xl border-2 p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all ${k.aktif ? "border-[#E8DCC8] hover:border-[#C8973E]/30" : "border-gray-200 opacity-60"}`}>
                    <button onClick={() => setDrillKategori(k)} className="text-left w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#5C3D1A] text-lg font-serif">{k.nama} →</h3>
                        <span className="bg-[#FDF6EC] text-[#8B7355] text-[10px] px-2.5 py-0.5 rounded-full capitalize border border-[#E8DCC8]">{k.outlet}</span>
                        {!k.aktif && <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 font-bold">Nonaktif</span>}
                      </div>
                      <p className="text-[#C8973E] text-xs mt-2 font-semibold">{jumlahMenu} menu terdaftar</p>
                    </button>
                    <div className="flex gap-2 pt-3">
                      <button onClick={() => toggleKategoriAktif(k)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${k.aktif ? "border-[#E8DCC8] text-[#8B7355] hover:bg-[#FDF6EC]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{k.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => openKategoriForm(k)} className="flex-1 py-2 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/5">Edit</button>
                      <button onClick={() => deleteKategori(k.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>)}

        {/* ========== DRILL-DOWN MENU ITEM ========== */}
        {tab === "menu" && drillKategori && (<>
          <div className="flex justify-between items-center mb-8">
            <div>
              <button onClick={() => setDrillKategori(null)} className="text-sm text-[#C8973E] hover:underline mb-2">← Kembali ke Kategori</button>
              <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">{drillKategori.nama} <span className="text-[#8B7355] text-base capitalize">· {drillKategori.outlet}</span></h2>
            </div>
            <button onClick={() => openMenuItemForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold shadow-lg shadow-[#C8973E]/20">+ Tambah Menu</button>
          </div>
          {showMenuItemForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">{editMenuItem ? "Edit Menu" : "Menu Baru"}</h3>
                  <p className="text-[#8B7355] text-xs mt-1">{drillKategori.nama} · <span className="capitalize">{drillKategori.outlet}</span></p><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                <div><label className={labelClass}>Nama Menu</label><input value={miNama} onChange={(e) => setMiNama(e.target.value)} placeholder="Contoh: Nasi Mandhi" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi</label><textarea value={miDesc} onChange={(e) => setMiDesc(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Nasi mandhi dengan daging kambing empuk" /></div>
                <div><label className={labelClass}>Harga Dasar (Rp)</label><input type="number" value={miHarga} onChange={(e) => setMiHarga(e.target.value)} placeholder="45000" className={inputClass} /></div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={miPunyaVarian} onChange={(e) => setMiPunyaVarian(e.target.checked)} className="w-4 h-4 accent-[#C8973E]" />
                  <span className="text-sm text-[#5C3D1A]">Menu ini punya varian (misal: ukuran/porsi)</span>
                </label>
                <p className="text-xs text-[#B8A88A]">Varian &amp; Add-on diatur lewat tombol &quot;Kelola&quot; setelah menu disimpan.</p>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowMenuItemForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Batal</button>
                  <button onClick={saveMenuItem} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Kelola Varian & Add-on */}
          {manageMenuItem && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#C8973E]/20 rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div><h3 className="text-xl font-bold text-[#5C3D1A] font-serif">Kelola {manageMenuItem.nama_paket}</h3><div className="w-12 h-0.5 bg-[#C8973E] mt-2" /></div>
                  <button onClick={() => setManageMenuItem(null)} className="text-[#8B7355] hover:text-[#5C3D1A] text-xl">✕</button>
                </div>

                {/* VARIAN */}
                <div>
                  <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Varian (pilih 1, wajib bila diaktifkan)</p>
                  {!manageMenuItem.punya_varian && <p className="text-xs text-[#B8A88A] mb-2 italic">Menu ini belum diaktifkan untuk varian. Aktifkan lewat Edit Menu.</p>}
                  <div className="space-y-2 mb-3">
                    {menuVarianList.map((v) => (
                      <div key={v.Id} className="flex items-center justify-between bg-[#FDF6EC] border border-[#E8DCC8] rounded-xl px-4 py-2.5">
                        <div><p className="font-semibold text-[#5C3D1A] text-sm">{v.nama}</p><p className="text-xs text-[#8B7355]">{v.harga_tambahan > 0 ? `+${formatRupiah(v.harga_tambahan)}` : "Tanpa tambahan biaya"}</p></div>
                        <button onClick={() => deleteVarian(v.Id)} className="text-red-400 hover:text-red-600 text-sm">🗑</button>
                      </div>
                    ))}
                    {menuVarianList.length === 0 && <p className="text-xs text-[#B8A88A]">Belum ada varian.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input value={vNama} onChange={(e) => setVNama(e.target.value)} placeholder="Nama varian (mis. Jumbo)" className={inputClass + " flex-1 min-w-0 !w-auto"} />
                    <input type="number" value={vHarga} onChange={(e) => setVHarga(e.target.value)} placeholder="+Rp" className={inputClass + " w-24 shrink-0 !w-24"} />
                    <button onClick={addVarian} className="px-4 py-3 rounded-xl bg-[#C8973E] text-white text-sm font-bold shrink-0">+ Tambah</button>
                  </div>
                </div>

                <div className="border-t border-[#E8DCC8]" />

                {/* ADD-ON */}
                <div>
                  <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Add-on (opsional, boleh pilih lebih dari satu)</p>
                  <div className="space-y-2 mb-3">
                    {menuAddonList.map((a) => (
                      <div key={a.Id} className="flex items-center justify-between bg-[#FDF6EC] border border-[#E8DCC8] rounded-xl px-4 py-2.5">
                        <div><p className="font-semibold text-[#5C3D1A] text-sm">{a.nama}</p><p className="text-xs text-[#8B7355]">{a.harga_tambahan > 0 ? `+${formatRupiah(a.harga_tambahan)}` : "Gratis"}</p></div>
                        <button onClick={() => deleteAddon(a.Id)} className="text-red-400 hover:text-red-600 text-sm">🗑</button>
                      </div>
                    ))}
                    {menuAddonList.length === 0 && <p className="text-xs text-[#B8A88A]">Belum ada add-on.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input value={adNama} onChange={(e) => setAdNama(e.target.value)} placeholder="Nama add-on (mis. Tambah Keju)" className={inputClass + " flex-1 min-w-0 !w-auto"} />
                    <input type="number" value={adHarga} onChange={(e) => setAdHarga(e.target.value)} placeholder="+Rp" className={inputClass + " w-24 shrink-0 !w-24"} />
                    <button onClick={addAddon} className="px-4 py-3 rounded-xl bg-[#C8973E] text-white text-sm font-bold shrink-0">+ Tambah</button>
                  </div>
                </div>

                <button onClick={() => setManageMenuItem(null)} className="w-full py-3 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC]">Tutup</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItemList.filter((m) => m.kategori_id === drillKategori.Id).map((m) => (
              <div key={m.Id} className={`bg-white border-2 rounded-2xl overflow-hidden group transition-all ${m.aktif ? "border-[#E8DCC8] hover:border-[#C8973E]/30 hover:shadow-xl hover:shadow-[#C8973E]/5" : "border-gray-200 opacity-60"}`}>
                <div className="h-40 bg-[#FDF6EC] relative overflow-hidden">
                  {m.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.foto_url} alt={m.nama_paket} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2"><span className="text-3xl text-[#C8973E]/20">🍽</span><span className="text-xs text-[#8B7355]">Belum ada foto</span></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {m.punya_varian && <span className="absolute bottom-3 left-3 bg-[#C8973E] text-white text-[10px] px-3 py-1 rounded-full font-bold">Ada Varian</span>}
                  {!m.aktif && <span className="absolute top-3 right-3 bg-gray-800/80 text-white text-[10px] px-3 py-1 rounded-full font-bold">Nonaktif</span>}
                </div>
                <div className="p-5 space-y-2">
                  <p className="font-bold text-[#5C3D1A] text-lg font-serif">{m.nama_paket}</p>
                  {m.deskripsi && <p className="text-[#8B7355] text-xs line-clamp-2">{m.deskripsi}</p>}
                  <p className="text-[#C8973E] font-bold text-sm">{formatRupiah(m.harga)}</p>
                  <label className="inline-block cursor-pointer pt-1">
                    <span className="text-xs text-[#C8973E] font-semibold hover:text-[#A67B2E]">{uploadingMenuItem ? "⏳ Mengupload..." : m.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMenuItemPhoto(m.Id, f); }} />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openManageMenuItem(m)} className="flex-1 py-2 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/5">Kelola Varian/Add-on</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleMenuItemAktif(m)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${m.aktif ? "border-[#E8DCC8] text-[#8B7355] hover:bg-[#FDF6EC]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{m.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                    <button onClick={() => openMenuItemForm(m)} className="flex-1 py-2 rounded-xl border-2 border-[#C8973E]/30 text-[#C8973E] text-xs font-bold hover:bg-[#C8973E]/5">Edit</button>
                    <button onClick={() => deleteMenuItem(m.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {menuItemList.filter((m) => m.kategori_id === drillKategori.Id).length === 0 && (
              <p className="text-[#8B7355] col-span-full text-center py-10">Belum ada menu. Klik &quot;+ Tambah Menu&quot;.</p>
            )}
          </div>
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