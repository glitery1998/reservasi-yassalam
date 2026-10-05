import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const OUTLET_KEYS = ["solo", "jogja"];

type SyncOption = { id: string; name: string; extra_price: number };
type SyncItem = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  outlet_keys: string[];
  varian: SyncOption[];
  addons: SyncOption[];
};
type SyncCategory = { id: string; name: string; sort_order: number };

type TableName = "MenuKategori" | "MenuPaket" | "MenuVarian" | "MenuAddon";
type ExistingRow = Record<string, unknown> & { Id: number; pos_id: string; aktif: boolean };
type Wanted = { pos_id: string; fields: Record<string, unknown>; insertOnly?: Record<string, unknown> };
type Counter = { baru: number; diperbarui: number; dinonaktifkan: number };

function keyValid(provided: string | null) {
  const expected = process.env.POS_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function reconcile(table: TableName, existing: ExistingRow[], wanted: Wanted[], dry: boolean) {
  const byPos = new Map(existing.map((r) => [r.pos_id, r]));
  const ids = new Map<string, number>();
  const toInsert: Wanted[] = [];
  const counter: Counter = { baru: 0, diperbarui: 0, dinonaktifkan: 0 };

  for (const w of wanted) {
    const row = byPos.get(w.pos_id);
    if (!row) {
      toInsert.push(w);
      continue;
    }
    ids.set(w.pos_id, row.Id);
    const changed = Object.entries(w.fields).some(([k, v]) => row[k] !== v);
    if (changed) {
      counter.diperbarui++;
      if (!dry) {
        const { error } = await supabaseAdmin.from(table).update(w.fields).eq("Id", row.Id);
        if (error) throw new Error(`Gagal memperbarui ${table}: ${error.message}`);
      }
    }
  }

  if (toInsert.length > 0) {
    counter.baru = toInsert.length;
    if (dry) {
      toInsert.forEach((w, i) => ids.set(w.pos_id, -(i + 1)));
    } else {
      const { data, error } = await supabaseAdmin
        .from(table)
        .insert(toInsert.map((w) => ({ ...w.fields, ...w.insertOnly, pos_id: w.pos_id })))
        .select("Id, pos_id");
      if (error || !data) throw new Error(`Gagal menyimpan ${table}: ${error?.message}`);
      (data as { Id: number; pos_id: string }[]).forEach((r) => ids.set(r.pos_id, r.Id));
    }
  }

  const wantedSet = new Set(wanted.map((w) => w.pos_id));
  const stale = existing.filter((r) => r.aktif && !wantedSet.has(r.pos_id));
  if (stale.length > 0) {
    counter.dinonaktifkan = stale.length;
    if (!dry) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ aktif: false })
        .in("Id", stale.map((r) => r.Id));
      if (error) throw new Error(`Gagal menonaktifkan ${table}: ${error.message}`);
    }
  }

  return { ids, counter };
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.categories) || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Data menu tidak lengkap" }, { status: 400 });
  }

  // Aman secara default: hanya menulis kalau dry_run dikirim persis false
  const dry = body.dry_run !== false;
  const categories = body.categories as SyncCategory[];
  const items = body.items as SyncItem[];

  try {
    const summary = [];

    for (const outlet of OUTLET_KEYS) {
      const outletItems = items.filter((i) => i.outlet_keys.includes(outlet));
      const usedCategoryIds = new Set(outletItems.map((i) => i.category_id).filter((id): id is string => !!id));
      const outletCategories = categories.filter((c) => usedCategoryIds.has(c.id));

      // 1. Kategori
      const { data: exCat } = await supabaseAdmin
        .from("MenuKategori")
        .select("Id, pos_id, aktif, outlet, nama, urutan")
        .eq("outlet", outlet)
        .not("pos_id", "is", null);
      const catRes = await reconcile(
        "MenuKategori",
        (exCat || []) as ExistingRow[],
        outletCategories.map((c, idx) => ({
          pos_id: c.id,
          fields: { outlet, nama: c.name, urutan: idx, aktif: true },
        })),
        dry
      );

      // 2. Menu
      const { data: exMenu } = await supabaseAdmin
        .from("MenuPaket")
        .select("Id, pos_id, aktif, outlet, nama_paket, harga, kategori_id, punya_varian, urutan, foto_url")
        .eq("outlet", outlet)
        .not("pos_id", "is", null);
      const menuRes = await reconcile(
        "MenuPaket",
        (exMenu || []) as ExistingRow[],
        outletItems.map((it, idx) => ({
          pos_id: it.id,
          fields: {
            outlet,
            nama_paket: it.name,
            harga: Math.round(it.price),
            kategori_id: it.category_id ? (catRes.ids.get(it.category_id) ?? null) : null,
            punya_varian: it.varian.length > 0,
            aktif: it.is_available,
            urutan: idx,
            ...(it.image_url ? { foto_url: it.image_url } : {}),
          },
          insertOnly: { deskripsi: "" },
        })),
        dry
      );

      // 3. Varian & addon (pos_id gabungan "menu:opsi" supaya unik per menu)
      const realMenuIds = Array.from(menuRes.ids.values()).filter((id) => id > 0);

      let exVar: ExistingRow[] = [];
      let exAddon: ExistingRow[] = [];
      if (realMenuIds.length > 0) {
        const { data: v } = await supabaseAdmin
          .from("MenuVarian")
          .select("Id, pos_id, aktif, menu_id, nama, harga_tambahan, urutan")
          .in("menu_id", realMenuIds)
          .not("pos_id", "is", null);
        exVar = (v || []) as ExistingRow[];
        const { data: a } = await supabaseAdmin
          .from("MenuAddon")
          .select("Id, pos_id, aktif, menu_id, nama, harga_tambahan, urutan")
          .in("menu_id", realMenuIds)
          .not("pos_id", "is", null);
        exAddon = (a || []) as ExistingRow[];
      }

      const varianWanted: Wanted[] = [];
      const addonWanted: Wanted[] = [];
      outletItems.forEach((it) => {
        const menuId = menuRes.ids.get(it.id);
        if (menuId == null) return;
        it.varian.forEach((v, idx) => {
          varianWanted.push({
            pos_id: `${it.id}:${v.id}`,
            fields: { menu_id: menuId, nama: v.name, harga_tambahan: Math.round(v.extra_price), urutan: idx, aktif: true },
          });
        });
        it.addons.forEach((a, idx) => {
          addonWanted.push({
            pos_id: `${it.id}:${a.id}`,
            fields: { menu_id: menuId, nama: a.name, harga_tambahan: Math.round(a.extra_price), urutan: idx, aktif: true },
          });
        });
      });

      const varRes = await reconcile("MenuVarian", exVar, varianWanted, dry);
      const addRes = await reconcile("MenuAddon", exAddon, addonWanted, dry);

      summary.push({
        outlet,
        kategori: catRes.counter,
        menu: menuRes.counter,
        varian: varRes.counter,
        addon: addRes.counter,
      });
    }

    return NextResponse.json({ dry_run: dry, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal sinkron menu" }, { status: 500 });
  }
}