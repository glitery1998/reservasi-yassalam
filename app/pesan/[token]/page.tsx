"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../supabase";

type ReservationRow = {
  Id: number; nama_tamu: string; no_whatsapp: string; outlet: string; tanggal: string; jam: string; jam_selesai: string;
  meja_id: number | null; share_token: string | null; menu_finalized: boolean | null;
};
type TableInfo = { Id: number; nomor_meja: number; nama_meja: string | null; };
type MenuKategori = { Id: number; outlet: string; nama: string; urutan: number; aktif: boolean; };
type MenuItemT = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
  kategori_id: number | null; foto_url: string | null; urutan: number; aktif: boolean; punya_varian: boolean;
};
type MenuVarian = { Id: number; menu_id: number; nama: string; harga_tambahan: number; urutan: number; aktif: boolean; };
type MenuAddon = { Id: number; menu_id: number; nama: string; harga_tambahan: number; urutan: number; aktif: boolean; };
type OrderedItem = {
  Id: number; reservation_id: number; menu_id: number; varian_id: number | null; addon_ids: number[];
  jumlah_porsi: number; harga_satuan: number; subtotal: number; catatan: string | null; nama_pemesan: string | null; created_at: string;
};

function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
const outletAddress: Record<string, string> = {
  solo: "Jl. Kapten Mulyadi No. 193, Pasar Kliwon, Surakarta",
  jogja: "Jl. Timoho No. 56, Muja Muju, Umbulharjo, DIY",
};

export default function PesanMenuPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [cutoffHours, setCutoffHours] = useState(4);
  const [kategoriList, setKategoriList] = useState<MenuKategori[]>([]);
  const [itemList, setItemList] = useState<MenuItemT[]>([]);
  const [varianList, setVarianList] = useState<MenuVarian[]>([]);
  const [addonList, setAddonList] = useState<MenuAddon[]>([]);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [tablesInfo, setTablesInfo] = useState<TableInfo[]>([]);
  const [activeKategori, setActiveKategori] = useState<number | null>(null);

  const [pickedItem, setPickedItem] = useState<MenuItemT | null>(null);
  const [pickVarian, setPickVarian] = useState<number | null>(null);
  const [pickAddons, setPickAddons] = useState<number[]>([]);
  const [pickQty, setPickQty] = useState(1);
  const [pickNama, setPickNama] = useState("");
  const [pickCatatan, setPickCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [waVerify, setWaVerify] = useState("");
  const [waError, setWaError] = useState("");
  const [cancelingFinalize, setCancelingFinalize] = useState(false);

  const primaryReservation = reservations[0] || null;

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data: resData } = await supabase.from("Reservation").select("*").eq("share_token", token);
    if (!resData || resData.length === 0) { setNotFound(true); setLoading(false); return; }
    setReservations(resData);
    const outlet = resData[0].outlet;
    const resIds = resData.map((r: ReservationRow) => r.Id);

    const { data: settingData } = await supabase.from("AppSettings").select("value").eq("key", "menu_cutoff_hours").single();
    if (settingData?.value) setCutoffHours(Number(settingData.value) || 4);

    const { data: kategoriData } = await supabase.from("MenuKategori").select("*").eq("outlet", outlet).eq("aktif", true).order("urutan");
    setKategoriList(kategoriData || []);
    if (kategoriData && kategoriData.length > 0) setActiveKategori((k) => k ?? kategoriData[0].Id);

    const { data: itemData } = await supabase.from("MenuPaket").select("*").eq("outlet", outlet).eq("aktif", true).order("urutan");
    setItemList(itemData || []);

    const menuIds = (itemData || []).map((m: MenuItemT) => m.Id);
    if (menuIds.length > 0) {
      const { data: varData } = await supabase.from("MenuVarian").select("*").in("menu_id", menuIds).eq("aktif", true).order("urutan");
      setVarianList(varData || []);
      const { data: addData } = await supabase.from("MenuAddon").select("*").in("menu_id", menuIds).eq("aktif", true).order("urutan");
      setAddonList(addData || []);
    }

    const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds).order("created_at");
    setOrderedItems(orderData || []);

    const mejaIds = resData.map((r: ReservationRow) => r.meja_id).filter((id: number | null): id is number => id !== null);
    if (mejaIds.length > 0) {
      const { data: tableData } = await supabase.from("Tables").select("Id, nomor_meja, nama_meja").in("Id", mejaIds);
      setTablesInfo(tableData || []);
    }

    setLoading(false);
  }, [token]);

  const refreshOrders = useCallback(async () => {
    const resIds = reservations.map((r) => r.Id);
    if (resIds.length === 0) return;
    const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds).order("created_at");
    setOrderedItems(orderData || []);
  }, [reservations]);

  async function finalizeOrder() {
    if (!token || !primaryReservation) return;
    const last4 = (primaryReservation.no_whatsapp || "").slice(-4);
    if (waVerify.trim() !== last4) {
      setWaError("4 digit tidak cocok. Coba tanya ke yang membuat reservasi ini.");
      return;
    }
    setWaError("");
    setFinalizing(true);
    const { error } = await supabase.from("Reservation").update({ menu_finalized: true }).eq("share_token", token);
    setFinalizing(false);
    if (error) { alert("Gagal mengirim pesanan: " + error.message); return; }
    setReservations((prev) => prev.map((r) => ({ ...r, menu_finalized: true })));
    setShowFinalizeConfirm(false);
    setWaVerify("");
  }

  async function cancelFinalize() {
    if (!token) return;
    if (!confirm("Batalkan pengiriman menu? Pesanan akan bisa diedit lagi.")) return;
    setCancelingFinalize(true);
    const { error } = await supabase.from("Reservation").update({ menu_finalized: false }).eq("share_token", token);
    setCancelingFinalize(false);
    if (error) { alert("Gagal membatalkan: " + error.message); return; }
    setReservations((prev) => prev.map((r) => ({ ...r, menu_finalized: false })));
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadAll();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadAll]);

  function openPickItem(item: MenuItemT) {
    setPickedItem(item);
    setPickVarian(null);
    setPickAddons([]);
    setPickQty(1);
    setPickNama("");
    setPickCatatan("");
  }
  function toggleAddon(id: number) {
    setPickAddons((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  const itemVarianList = pickedItem ? varianList.filter((v) => v.menu_id === pickedItem.Id) : [];
  const itemAddonList = pickedItem ? addonList.filter((a) => a.menu_id === pickedItem.Id) : [];

  const pickSubtotalSatuan = pickedItem
    ? pickedItem.harga
      + (pickVarian ? (itemVarianList.find((v) => v.Id === pickVarian)?.harga_tambahan || 0) : 0)
      + pickAddons.reduce((s, id) => s + (itemAddonList.find((a) => a.Id === id)?.harga_tambahan || 0), 0)
    : 0;

  async function submitOrder() {
    if (!pickedItem || !primaryReservation) return;
    if (pickedItem.punya_varian && itemVarianList.length > 0 && !pickVarian) {
      alert("Pilih varian dulu ya");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ReservationMenuItem").insert({
      reservation_id: primaryReservation.Id,
      menu_id: pickedItem.Id,
      varian_id: pickVarian,
      addon_ids: pickAddons,
      jumlah_porsi: pickQty,
      harga_satuan: pickSubtotalSatuan,
      subtotal: pickSubtotalSatuan * pickQty,
      catatan: pickCatatan || null,
      nama_pemesan: pickNama || null,
    });
    setSubmitting(false);
    if (error) { alert("Gagal menyimpan pesanan: " + error.message); return; }
    setPickedItem(null);
    refreshOrders();
  }

  async function deleteOrderedItem(id: number) {
    if (!confirm("Hapus item ini dari pesanan?")) return;
    await supabase.from("ReservationMenuItem").delete().eq("Id", id);
    refreshOrders();
  }

  async function updateOrderedQty(o: OrderedItem, newQty: number) {
    if (newQty < 1) { deleteOrderedItem(o.Id); return; }
    const newSubtotal = o.harga_satuan * newQty;
    await supabase.from("ReservationMenuItem").update({ jumlah_porsi: newQty, subtotal: newSubtotal }).eq("Id", o.Id);
    refreshOrders();
  }

  if (loading) {
    return <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center"><p className="text-[#8B7355]">Memuat...</p></div>;
  }
  if (notFound || !primaryReservation) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-xl font-bold text-[#5C3D1A] font-serif">Link tidak ditemukan</h1>
          <p className="text-[#8B7355] text-sm mt-2">Link pesan menu ini tidak valid atau sudah tidak berlaku.</p>
        </div>
      </div>
    );
  }

  const reservationDate = new Date(`${primaryReservation.tanggal}T${primaryReservation.jam}:00`);
  const deadline = new Date(reservationDate.getTime() - cutoffHours * 60 * 60 * 1000);
  const finalized = !!primaryReservation.menu_finalized;
  // eslint-disable-next-line react-hooks/purity
  const timeLocked = Date.now() > deadline.getTime();
  const locked = timeLocked || finalized;
  const subtotalSemua = orderedItems.reduce((s, o) => s + o.subtotal, 0);
  const pajak = Math.round(subtotalSemua * 0.1);
  const grandTotal = subtotalSemua + pajak;

  function getMejaLabel(id: number) { const t = tablesInfo.find((t) => t.Id === id); return t ? (t.nama_meja || `Meja ${t.nomor_meja}`) : "Meja"; }
  function getMenuName(id: number) { return itemList.find((m) => m.Id === id)?.nama_paket || "Menu"; }
  function getVarianName(id: number | null) { if (!id) return null; return varianList.find((v) => v.Id === id)?.nama || null; }
  function getAddonNames(ids: number[]) { return ids.map((id) => addonList.find((a) => a.Id === id)?.nama).filter(Boolean).join(", "); }

  return (
    <div className="min-h-screen bg-[#FDF6EC] pb-28">
      {/* HEADER */}
      <div className="bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden pb-8 pt-7 px-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="relative">
          <Image src="/logo.PNG" alt="Yassalam" width={48} height={48} className="mx-auto drop-shadow-lg" />
          <p className="text-[#C8973E] text-[10px] tracking-[0.4em] uppercase font-semibold mt-3">Yassalam Arabian Resto</p>
          <h1 className="text-xl font-bold text-white font-serif mt-1">Pesan Menu Bersama</h1>
          <p className="text-[#C8973E]/40 mt-2 text-xs">━━ ✦ ━━</p>
        </div>
      </div>

      {/* KARTU DETAIL RESERVASI */}
      <div className="max-w-2xl mx-auto px-4 mt-5">
        <div className="bg-white border border-[#C8973E]/15 rounded-2xl shadow-lg shadow-[#C8973E]/5 overflow-hidden">
          <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white text-base">👤</span>
              <p className="font-bold text-white font-serif">{primaryReservation.nama_tamu}</p>
            </div>
            <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-bold capitalize backdrop-blur-sm">{primaryReservation.outlet}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#E8DCC8] border-b border-[#E8DCC8]">
            <div className="p-4">
              <p className="text-[10px] text-[#B8A88A] tracking-wider uppercase mb-1 flex items-center gap-1">📅 Tanggal</p>
              <p className="font-bold text-[#5C3D1A] text-sm">{primaryReservation.tanggal}</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] text-[#B8A88A] tracking-wider uppercase mb-1 flex items-center gap-1">🕐 Jam</p>
              <p className="font-bold text-[#5C3D1A] text-sm">{primaryReservation.jam} – {primaryReservation.jam_selesai}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#E8DCC8]">
            <div className="p-4">
              <p className="text-[10px] text-[#B8A88A] tracking-wider uppercase mb-2 flex items-center gap-1">🪑 Meja</p>
              <div className="flex flex-wrap gap-1.5">
                {reservations.map((r) => r.meja_id && (
                  <span key={r.Id} className="bg-[#FDF6EC] text-[#C8973E] text-xs font-bold px-3 py-1.5 rounded-full border border-[#C8973E]/20">{getMejaLabel(r.meja_id)}</span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-[#FDF6EC]/50">
              <p className="text-[10px] text-[#B8A88A] tracking-wider uppercase mb-1 flex items-center gap-1">📍 Lokasi Outlet</p>
              <p className="font-bold text-[#5C3D1A] text-sm capitalize">Yassalam {primaryReservation.outlet}</p>
              <p className="text-[#8B7355] text-xs mt-0.5 leading-snug">{outletAddress[primaryReservation.outlet] || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {finalized ? (
        <div className="max-w-md mx-auto px-4 mt-6">
          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h2 className="font-bold text-[#5C3D1A] font-serif">Pesanan Sudah Dikirim</h2>
            <p className="text-[#8B7355] text-sm mt-2">Pesanan menu ini sudah final dan tidak bisa diubah lagi. Tunjukkan halaman ini ke staff saat tiba di outlet.</p>
            {!timeLocked && (
              <button onClick={cancelFinalize} disabled={cancelingFinalize}
                className="mt-4 text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-all disabled:opacity-50">
                {cancelingFinalize ? "Membatalkan..." : "↩ Batalkan Pengiriman, Edit Lagi"}
              </button>
            )}
          </div>
        </div>
      ) : timeLocked ? (
        <div className="max-w-md mx-auto px-4 mt-6">
          <div className="bg-white border-2 border-[#E8DCC8] rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">⏰</p>
            <h2 className="font-bold text-[#5C3D1A] font-serif">Waktu Pemesanan Menu Sudah Ditutup</h2>
            <p className="text-[#8B7355] text-sm mt-2">Pemesanan menu untuk reservasi ini ditutup {cutoffHours} jam sebelum jam kunjungan. Silakan pesan langsung di tempat.</p>
          </div>
        </div>
      ) : (
        <>
          {/* KATEGORI FILTER */}
          <div className="max-w-2xl mx-auto px-4 mt-6">
            <p className="text-[10px] font-bold text-[#C8973E] tracking-[0.2em] uppercase mb-2">Kategori</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {kategoriList.map((k) => (
                <button key={k.Id} onClick={() => setActiveKategori(k.Id)}
                  className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${activeKategori === k.Id ? "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white border-transparent shadow-md shadow-[#C8973E]/20" : "bg-white border-[#E8DCC8] text-[#8B7355] hover:border-[#C8973E]/40"}`}>
                  {k.nama}
                </button>
              ))}
            </div>
          </div>

          {/* LIST MENU */}
          <div className="max-w-2xl mx-auto px-4 mt-5 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            {itemList.filter((m) => m.kategori_id === activeKategori).map((m) => (
              <div key={m.Id} className="bg-white border border-[#E8DCC8] rounded-2xl overflow-hidden group hover:border-[#C8973E]/30 hover:shadow-lg hover:shadow-[#C8973E]/5 transition-all flex sm:block gap-3 sm:gap-0 p-3 sm:p-0">
                <div className="w-24 h-24 sm:w-full sm:h-36 rounded-xl sm:rounded-none bg-[#FDF6EC] relative overflow-hidden shrink-0">
                  {m.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.foto_url} alt={m.nama_paket} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl text-[#C8973E]/20">🍽</div>
                  )}
                  <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  {m.punya_varian && <span className="absolute bottom-1.5 left-1.5 bg-[#C8973E] text-white text-[8px] sm:text-[10px] px-2 py-0.5 sm:py-1 rounded-full font-bold">Varian</span>}
                </div>
                <div className="flex-1 min-w-0 sm:p-4">
                  <p className="font-bold text-[#5C3D1A] text-sm font-serif line-clamp-1">{m.nama_paket}</p>
                  {m.deskripsi && <p className="text-xs text-[#8B7355] mt-1 line-clamp-2 leading-relaxed">{m.deskripsi}</p>}
                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <p className="text-[#C8973E] font-bold text-sm">{formatRupiah(m.harga)}</p>
                    <button onClick={() => openPickItem(m)}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-lg font-bold flex items-center justify-center shadow-md shadow-[#C8973E]/30 active:scale-90 transition-all shrink-0">
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {itemList.filter((m) => m.kategori_id === activeKategori).length === 0 && (
              <p className="text-center text-[#B8A88A] py-10 text-sm sm:col-span-full">Belum ada menu di kategori ini.</p>
            )}
          </div>
        </>
      )}

      {/* BAR KERANJANG MENGAMBANG */}
      {orderedItems.length > 0 && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-5 left-4 right-4 max-w-2xl mx-auto z-40 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white rounded-2xl shadow-xl shadow-black/20 px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex items-center gap-3">
            <span className="bg-white/25 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{orderedItems.reduce((s, o) => s + o.jumlah_porsi, 0)}</span>
            <span className="font-bold text-sm">{finalized ? "Lihat Pesanan" : "Lihat Keranjang"}</span>
          </div>
          <span className="font-bold">{formatRupiah(grandTotal)}</span>
        </button>
      )}

      {/* MODAL KERANJANG / DAFTAR PESANAN */}
      {showCart && (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowCart(false)}>
      <div className="bg-[#FDF6EC] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[#C8973E] tracking-[0.15em] uppercase">Pesanan Terkumpul</p>
          <button onClick={() => setShowCart(false)} className="text-[#8B7355] text-xl">✕</button>
        </div>
        {orderedItems.length === 0 ? (
          <p className="text-center text-[#B8A88A] py-8 text-sm bg-white border border-[#E8DCC8] rounded-2xl">Belum ada pesanan.</p>
        ) : (
          <div className="bg-white border border-[#E8DCC8] rounded-2xl divide-y divide-[#E8DCC8]">
            {orderedItems.map((o) => (
              <div key={o.Id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#5C3D1A] text-sm">{getMenuName(o.menu_id)}</p>
                  {getVarianName(o.varian_id) && <p className="text-xs text-[#8B7355]">Varian: {getVarianName(o.varian_id)}</p>}
                  {o.addon_ids?.length > 0 && <p className="text-xs text-[#8B7355]">Add-on: {getAddonNames(o.addon_ids)}</p>}
                  {o.nama_pemesan && <p className="text-xs text-[#C8973E] font-semibold mt-0.5">Pemesan: {o.nama_pemesan}</p>}
                  {o.catatan && <p className="text-xs text-[#8B7355] italic mt-0.5">📝 {o.catatan}</p>}
                  {!locked && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <button onClick={() => updateOrderedQty(o, o.jumlah_porsi - 1)} className="w-7 h-7 rounded-full border border-[#E8DCC8] text-[#8B7355] font-bold text-sm flex items-center justify-center hover:bg-[#FDF6EC] hover:border-[#C8973E]/40 transition-all">−</button>
                      <span className="font-bold text-[#5C3D1A] text-sm w-5 text-center">{o.jumlah_porsi}</span>
                      <button onClick={() => updateOrderedQty(o, o.jumlah_porsi + 1)} className="w-7 h-7 rounded-full border border-[#E8DCC8] text-[#8B7355] font-bold text-sm flex items-center justify-center hover:bg-[#FDF6EC] hover:border-[#C8973E]/40 transition-all">+</button>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <p className="font-bold text-[#C8973E] text-sm">{formatRupiah(o.subtotal)}</p>
                  {!locked && (
                    <button onClick={() => deleteOrderedItem(o.Id)}
                      className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-all"
                      title="Hapus item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="p-4 space-y-1.5 bg-[#FDF6EC] rounded-b-2xl">
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Subtotal</span><span className="text-[#5C3D1A]">{formatRupiah(subtotalSemua)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Pajak (10%)</span><span className="text-[#5C3D1A]">{formatRupiah(pajak)}</span></div>
              <div className="flex justify-between items-center pt-1.5 border-t border-[#C8973E]/20">
                <span className="font-bold text-[#5C3D1A]">Total</span>
                <span className="font-bold text-[#C8973E] text-lg">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {!locked && orderedItems.length > 0 && (
          <button onClick={() => setShowFinalizeConfirm(true)}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold shadow-lg shadow-[#C8973E]/20 transition-all active:scale-[0.98]">
            ✓ Kirim Menu ke Restoran
          </button>
        )}
      </div>
      </div>
      </div>
      )}

      {/* MODAL KONFIRMASI KIRIM MENU */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => { setShowFinalizeConfirm(false); setWaVerify(""); setWaError(""); }}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-6 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-white font-bold text-lg font-serif">Yakin Ingin Kirim Menu?</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-[#5C3D1A] font-bold text-sm">⚠ Ini akan mengunci pesanan SEMUA ORANG</p>
              <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">
                Bukan cuma pesanan Anda — tapi semua pesanan dari teman/rombongan yang pakai link ini juga akan terkunci dan tidak bisa diubah lagi. Pastikan semua sudah selesai memesan.
              </p>
              <div className="mt-4 bg-[#FDF6EC] border border-[#C8973E]/20 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-[#8B7355]">Total tagihan</span>
                <span className="font-bold text-[#C8973E]">{formatRupiah(grandTotal)}</span>
              </div>

              <div className="mt-5 text-left">
                <label className="text-xs font-bold text-[#C8973E] tracking-[0.1em] uppercase">4 Digit Terakhir No. WA Pemesan</label>
                <p className="text-[10px] text-[#B8A88A] mt-0.5 mb-2">Tanyakan ke orang yang membuat reservasi ini kalau Anda tidak tahu.</p>
                <input value={waVerify} onChange={(e) => { setWaVerify(e.target.value.replace(/\D/g, "").slice(0, 4)); setWaError(""); }}
                  inputMode="numeric" maxLength={4} placeholder="0000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] outline-none focus:border-[#C8973E] text-center text-lg tracking-[0.3em] font-bold text-[#5C3D1A]" />
                {waError && <p className="text-red-500 text-xs mt-1.5">{waError}</p>}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowFinalizeConfirm(false); setWaVerify(""); setWaError(""); }}
                  className="flex-1 py-3.5 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-bold text-sm hover:bg-[#FDF6EC] transition-all">
                  Belum, Cek Lagi
                </button>
                <button onClick={finalizeOrder} disabled={finalizing || waVerify.length < 4}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40">
                  {finalizing ? "Mengirim..." : "Ya, Kirim Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PILIH ITEM */}
      {pickedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setPickedItem(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-[#5C3D1A] text-lg font-serif">{pickedItem.nama_paket}</h3>
                <p className="text-[#C8973E] font-bold text-sm mt-1">{formatRupiah(pickedItem.harga)}</p>
              </div>
              <button onClick={() => setPickedItem(null)} className="text-[#8B7355] text-xl">✕</button>
            </div>
            {pickedItem.deskripsi && <p className="text-sm text-[#8B7355]">{pickedItem.deskripsi}</p>}

            {itemVarianList.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.1em] uppercase">Pilih Varian</p>
                <div className="space-y-2">
                  {itemVarianList.map((v) => (
                    <button key={v.Id} onClick={() => setPickVarian(v.Id)}
                      className={`w-full flex justify-between items-center p-3 rounded-xl border-2 text-sm transition-all ${pickVarian === v.Id ? "border-[#C8973E] bg-[#FDF6EC]" : "border-[#E8DCC8]"}`}>
                      <span className="font-semibold text-[#5C3D1A]">{v.nama}</span>
                      <span className="text-[#C8973E]">{v.harga_tambahan > 0 ? `+${formatRupiah(v.harga_tambahan)}` : "Gratis"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {itemAddonList.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.1em] uppercase">Tambahan (opsional)</p>
                <div className="space-y-2">
                  {itemAddonList.map((a) => (
                    <label key={a.Id} className="flex justify-between items-center p-3 rounded-xl border-2 border-[#E8DCC8] text-sm cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={pickAddons.includes(a.Id)} onChange={() => toggleAddon(a.Id)} className="w-4 h-4 accent-[#C8973E]" />
                        <span className="font-semibold text-[#5C3D1A]">{a.nama}</span>
                      </span>
                      <span className="text-[#C8973E]">{a.harga_tambahan > 0 ? `+${formatRupiah(a.harga_tambahan)}` : "Gratis"}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.1em] uppercase">Jumlah</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setPickQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl border-2 border-[#E8DCC8] text-[#5C3D1A] font-bold">−</button>
                <span className="font-bold text-[#5C3D1A] text-lg w-8 text-center">{pickQty}</span>
                <button onClick={() => setPickQty((q) => q + 1)} className="w-10 h-10 rounded-xl border-2 border-[#E8DCC8] text-[#5C3D1A] font-bold">+</button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.1em] uppercase">Nama Pemesan <span className="normal-case font-normal text-[#B8A88A]">(opsional)</span></p>
              <input value={pickNama} onChange={(e) => setPickNama(e.target.value)} placeholder="Mis. Andi" className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] outline-none focus:border-[#C8973E] text-sm text-[#5C3D1A]" />
            </div>

            <div>
              <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.1em] uppercase">Catatan <span className="normal-case font-normal text-[#B8A88A]">(opsional)</span></p>
              <input value={pickCatatan} onChange={(e) => setPickCatatan(e.target.value)} placeholder="Mis. tidak pedas" className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] outline-none focus:border-[#C8973E] text-sm text-[#5C3D1A]" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E8DCC8]">
              <span className="text-sm text-[#8B7355]">Subtotal</span>
              <span className="font-bold text-[#C8973E] text-lg">{formatRupiah(pickSubtotalSatuan * pickQty)}</span>
            </div>

            <button onClick={submitOrder} disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Tambah ke Pesanan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}