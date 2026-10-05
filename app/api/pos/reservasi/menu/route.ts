import { NextResponse } from "next/server";
import { OUTLETS, keyValid, supabaseAdmin } from "../../_shared";

export const dynamic = "force-dynamic";

type KategoriRow = { Id: number; nama: string };
type MenuRow = {
  Id: number;
  nama_paket: string;
  harga: number;
  kategori_id: number | null;
  punya_varian: boolean;
};
type OptRow = { Id: number; menu_id: number; nama: string; harga_tambahan: number };

export async function GET(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const outlet = new URL(request.url).searchParams.get("outlet") || "";
  if (!OUTLETS.includes(outlet)) {
    return NextResponse.json({ error: "Outlet tidak valid" }, { status: 400 });
  }

  const { data: katData } = await supabaseAdmin
    .from("MenuKategori")
    .select("Id, nama")
    .eq("outlet", outlet)
    .eq("aktif", true)
    .order("urutan");
  const kategori = (katData || []) as KategoriRow[];

  const { data: menuData, error } = await supabaseAdmin
    .from("MenuPaket")
    .select("Id, nama_paket, harga, kategori_id, punya_varian")
    .eq("outlet", outlet)
    .eq("aktif", true)
    .order("urutan");
  if (error) return NextResponse.json({ error: "Gagal mengambil menu" }, { status: 500 });
  const menu = (menuData || []) as MenuRow[];

  const menuIds = menu.map((m) => m.Id);
  let varian: OptRow[] = [];
  let addons: OptRow[] = [];
  if (menuIds.length > 0) {
    const { data: v } = await supabaseAdmin
      .from("MenuVarian")
      .select("Id, menu_id, nama, harga_tambahan")
      .in("menu_id", menuIds)
      .eq("aktif", true)
      .order("urutan");
    varian = (v || []) as OptRow[];
    const { data: a } = await supabaseAdmin
      .from("MenuAddon")
      .select("Id, menu_id, nama, harga_tambahan")
      .in("menu_id", menuIds)
      .eq("aktif", true)
      .order("urutan");
    addons = (a || []) as OptRow[];
  }

  const opt = (o: OptRow) => ({ id: o.Id, nama: o.nama, harga_tambahan: o.harga_tambahan || 0 });

  return NextResponse.json({
    kategori: kategori.map((k) => ({ id: k.Id, nama: k.nama })),
    menu: menu.map((m) => ({
      id: m.Id,
      nama: m.nama_paket,
      harga: m.harga || 0,
      kategori_id: m.kategori_id,
      punya_varian: !!m.punya_varian,
      varian: varian.filter((x) => x.menu_id === m.Id).map(opt),
      addons: addons.filter((x) => x.menu_id === m.Id).map(opt),
    })),
  });
}