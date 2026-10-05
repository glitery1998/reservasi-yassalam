import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ReservationRow = {
  Id: number;
  nama_tamu: string;
  no_whatsapp: string | null;
  outlet: string;
  tanggal: string;
  jam: string;
  jam_selesai: string | null;
  jumlah_tamu: number;
  catatan: string | null;
  status: string;
  meja_id: number | null;
  dp_amount: number | null;
  dp_status: string | null;
  share_token: string | null;
  menu_finalized: boolean | null;
  checked_in_at: string | null;
};

type MenuItemRow = {
  Id: number;
  reservation_id: number;
  menu_id: number;
  varian_id: number | null;
  addon_ids: number[] | null;
  jumlah_porsi: number;
  harga_satuan: number;
  subtotal: number;
  catatan: string | null;
  nama_pemesan: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function keyValid(provided: string | null) {
  const expected = process.env.POS_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function todayJakarta() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// pos_id varian/addon berbentuk "menuPosId:optionId" → ambil optionId-nya
function optionIdOf(posId: string | null | undefined) {
  if (!posId) return null;
  return posId.split(":").pop() ?? null;
}

export async function GET(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet");
  if (outlet !== "solo" && outlet !== "jogja") {
    return NextResponse.json({ error: "Outlet tidak valid" }, { status: 400 });
  }

  const dari = searchParams.get("dari") || todayJakarta();
  const sampai = searchParams.get("sampai") || dari;
  if (!DATE_RE.test(dari) || !DATE_RE.test(sampai)) {
    return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD" }, { status: 400 });
  }

  const { data: rowsData, error } = await supabaseAdmin
    .from("Reservation")
    .select(
      "Id, nama_tamu, no_whatsapp, outlet, tanggal, jam, jam_selesai, jumlah_tamu, catatan, status, meja_id, dp_amount, dp_status, share_token, menu_finalized, checked_in_at"
    )
    .eq("outlet", outlet)
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal", { ascending: true })
    .order("jam", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Gagal mengambil data reservasi" }, { status: 500 });
  }

  const rows = (rowsData || []) as ReservationRow[];
  if (rows.length === 0) return NextResponse.json({ reservations: [] });

  const reservationIds = rows.map((r) => r.Id);
  const mejaIds = Array.from(
    new Set(rows.map((r) => r.meja_id).filter((id): id is number => id != null))
  );

  const { data: itemsData } = await supabaseAdmin
    .from("ReservationMenuItem")
    .select(
      "Id, reservation_id, menu_id, varian_id, addon_ids, jumlah_porsi, harga_satuan, subtotal, catatan, nama_pemesan"
    )
    .in("reservation_id", reservationIds)
    .order("Id", { ascending: true });
  const items = (itemsData || []) as MenuItemRow[];

  const tableNameMap = new Map<number, string>();
  if (mejaIds.length > 0) {
    const { data: tablesData } = await supabaseAdmin
      .from("Tables")
      .select("Id, nama_meja, nomor_meja")
      .in("Id", mejaIds);
    (tablesData || []).forEach((t: { Id: number; nama_meja: string | null; nomor_meja: number }) => {
      tableNameMap.set(t.Id, t.nama_meja || `Meja ${t.nomor_meja}`);
    });
  }

  const paketMap = new Map<number, string>();
  const paketPosMap = new Map<number, string | null>();
  const menuIds = Array.from(new Set(items.map((i) => i.menu_id)));
  if (menuIds.length > 0) {
    const { data } = await supabaseAdmin.from("MenuPaket").select("Id, nama_paket, pos_id").in("Id", menuIds);
    (data || []).forEach((p: { Id: number; nama_paket: string; pos_id: string | null }) => {
      paketMap.set(p.Id, p.nama_paket);
      paketPosMap.set(p.Id, p.pos_id);
    });
  }

  const varianMap = new Map<number, string>();
  const varianPosMap = new Map<number, string | null>();
  const varianIds = Array.from(
    new Set(items.map((i) => i.varian_id).filter((id): id is number => id != null))
  );
  if (varianIds.length > 0) {
    const { data } = await supabaseAdmin.from("MenuVarian").select("Id, nama, pos_id").in("Id", varianIds);
    (data || []).forEach((v: { Id: number; nama: string; pos_id: string | null }) => {
      varianMap.set(v.Id, v.nama);
      varianPosMap.set(v.Id, optionIdOf(v.pos_id));
    });
  }

  const addonMap = new Map<number, string>();
  const addonPosMap = new Map<number, string | null>();
  const addonIds = Array.from(new Set(items.flatMap((i) => i.addon_ids || [])));
  if (addonIds.length > 0) {
    const { data } = await supabaseAdmin.from("MenuAddon").select("Id, nama, pos_id").in("Id", addonIds);
    (data || []).forEach((a: { Id: number; nama: string; pos_id: string | null }) => {
      addonMap.set(a.Id, a.nama);
      addonPosMap.set(a.Id, optionIdOf(a.pos_id));
    });
  }

  const itemsByReservation = new Map<number, MenuItemRow[]>();
  items.forEach((i) => {
    const list = itemsByReservation.get(i.reservation_id);
    if (list) list.push(i);
    else itemsByReservation.set(i.reservation_id, [i]);
  });

  // Meja gabungan = beberapa baris dengan share_token yang sama → jadikan satu reservasi
  const groups = new Map<string, ReservationRow[]>();
  rows.forEach((r) => {
    const key = r.share_token || `id-${r.Id}`;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  });

  const reservations = Array.from(groups.entries()).map(([key, group]) => {
    const sorted = [...group].sort((a, b) => a.Id - b.Id);
    const primary = sorted[0];

    const gabunganNama =
      sorted
        .map((r) => r.catatan?.match(/^\[Gabungan: (.+)\]$/)?.[1])
        .find((n): n is string => !!n) ?? null;

    const meja = sorted
      .filter((r) => r.meja_id != null)
      .map((r) => ({
        id: r.meja_id as number,
        nama: tableNameMap.get(r.meja_id as number) ?? `Meja #${r.meja_id}`,
      }));

    const menuItems = sorted.flatMap((r) =>
      (itemsByReservation.get(r.Id) || []).map((i) => ({
        id: i.Id,
        nama: paketMap.get(i.menu_id) ?? "Menu",
        pos_menu_id: paketPosMap.get(i.menu_id) ?? null,
        varian: i.varian_id != null ? varianMap.get(i.varian_id) ?? null : null,
        varian_option_id: i.varian_id != null ? varianPosMap.get(i.varian_id) ?? null : null,
        addons: (i.addon_ids || []).map((id) => addonMap.get(id)).filter((n): n is string => !!n),
        addon_option_ids: (i.addon_ids || [])
          .map((id) => addonPosMap.get(id))
          .filter((n): n is string => !!n),
        jumlah_porsi: i.jumlah_porsi,
        harga_satuan: i.harga_satuan,
        subtotal: i.subtotal,
        catatan: i.catatan,
        nama_pemesan: i.nama_pemesan,
      }))
    );

    return {
      key,
      ids: sorted.map((r) => r.Id),
      nama_tamu: primary.nama_tamu,
      no_whatsapp: primary.no_whatsapp,
      outlet: primary.outlet,
      tanggal: primary.tanggal,
      jam: primary.jam,
      jam_selesai: primary.jam_selesai,
      jumlah_tamu: primary.jumlah_tamu,
      catatan: primary.catatan,
      status: primary.status,
      checked_in_at: primary.checked_in_at,
      menu_finalized: primary.menu_finalized,
      dp_status: primary.dp_status,
      dp_amount: sorted.reduce((s, r) => s + (r.dp_amount || 0), 0),
      gabungan_nama: gabunganNama,
      meja,
      menu_items: menuItems,
      menu_total: menuItems.reduce((s, i) => s + (i.subtotal || 0), 0),
    };
  });

  return NextResponse.json({ reservations });
}