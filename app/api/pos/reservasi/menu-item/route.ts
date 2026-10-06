import { NextResponse, after } from "next/server";
import { keyValid, logActivity, supabaseAdmin } from "../../_shared";
import { loadGrup, parseIds } from "../../_pesan";

export const dynamic = "force-dynamic";

type MenuRow = { Id: number; nama_paket: string; harga: number; outlet: string; aktif: boolean; punya_varian: boolean };
type OptRow = { Id: number; nama: string; harga_tambahan: number };
type Baris = { varian_id: number | null; jumlah_porsi: number; catatan: string | null };
type Entry = { menu_id: number; addon_ids: number[]; baris: Baris[] };

function parseIntList(raw: unknown): number[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 30) return null;
  const list = raw.map(Number);
  if (!list.every((n) => Number.isInteger(n) && n > 0)) return null;
  return Array.from(new Set(list));
}

function parseBaris(raw: unknown): Baris[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) return null;
  const out: Baris[] = [];
  for (const b of raw) {
    const jumlah = Number(b?.jumlah_porsi);
    const varian = b?.varian_id == null ? null : Number(b.varian_id);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 99) return null;
    if (varian != null && (!Number.isInteger(varian) || varian <= 0)) return null;
    out.push({
      varian_id: varian,
      jumlah_porsi: jumlah,
      catatan: b?.catatan ? String(b.catatan).trim().slice(0, 300) || null : null,
    });
  }
  return out;
}

function parseEntries(raw: unknown): Entry[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) return null;
  const out: Entry[] = [];
  for (const e of raw) {
    const menuId = Number(e?.menu_id);
    const addonIds = parseIntList(e?.addon_ids);
    const baris = parseBaris(e?.baris);
    if (!Number.isInteger(menuId) || menuId <= 0 || addonIds === null || !baris) return null;
    out.push({ menu_id: menuId, addon_ids: addonIds, baris });
  }
  return out;
}

type Siap =
  | { ok: true; nama: string; rows: (Baris & { harga_satuan: number; subtotal: number })[] }
  | { ok: false; error: string; nama: string | null };

// Validasi pilihan dan hitung harga tiap baris, sama seperti halaman pesan tamu
async function siapkan(menuId: number, outlet: string, baris: Baris[], addonIds: number[]): Promise<Siap> {
  const [menuRes, varRes, addRes] = await Promise.all([
    supabaseAdmin
      .from("MenuPaket")
      .select("Id, nama_paket, harga, outlet, aktif, punya_varian")
      .eq("Id", menuId)
      .maybeSingle(),
    supabaseAdmin.from("MenuVarian").select("Id, nama, harga_tambahan").eq("menu_id", menuId).eq("aktif", true),
    addonIds.length > 0
      ? supabaseAdmin.from("MenuAddon").select("Id, nama, harga_tambahan").eq("menu_id", menuId).eq("aktif", true)
      : Promise.resolve({ data: [] }),
  ]);

  const menu = menuRes.data as MenuRow | null;
  if (!menu || menu.outlet !== outlet) return { ok: false, error: "Menu tidak ditemukan di outlet ini", nama: null };
  if (!menu.aktif) return { ok: false, error: "Menu ini sedang nonaktif", nama: menu.nama_paket };

  const varianList = (varRes.data || []) as OptRow[];
  const addonList = (addRes.data || []) as OptRow[];
  const wajibVarian = menu.punya_varian && varianList.length > 0;

  let addonExtra = 0;
  for (const id of addonIds) {
    const a = addonList.find((x) => x.Id === id);
    if (!a) return { ok: false, error: "Addon tidak valid untuk menu ini", nama: menu.nama_paket };
    addonExtra += a.harga_tambahan || 0;
  }

  const rows: (Baris & { harga_satuan: number; subtotal: number })[] = [];
  for (const b of baris) {
    let varianExtra = 0;
    if (b.varian_id != null) {
      const v = varianList.find((x) => x.Id === b.varian_id);
      if (!v) return { ok: false, error: "Varian tidak valid untuk menu ini", nama: menu.nama_paket };
      varianExtra = v.harga_tambahan || 0;
    } else if (wajibVarian) {
      return { ok: false, error: "Pilih varian untuk setiap porsi", nama: menu.nama_paket };
    }
    const satuan = (menu.harga || 0) + varianExtra + addonExtra;
    rows.push({ ...b, harga_satuan: satuan, subtotal: satuan * b.jumlah_porsi });
  }

  return { ok: true, nama: menu.nama_paket, rows };
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const ids = parseIds(body?.ids);
  const dibuatOleh = String(body?.dibuat_oleh || "").trim();

  if (!["tambah", "tambah_banyak", "ubah", "hapus"].includes(action)) {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }
  if (!ids) return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });

  const grup = await loadGrup(ids, false);
  if (!grup) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (!["Pending", "Confirmed"].includes(grup.status)) {
    return NextResponse.json({ error: `Reservasi berstatus ${grup.status}, menu tidak bisa diubah` }, { status: 400 });
  }
  if (grup.checked_in) {
    return NextResponse.json({ error: "Tamu sudah hadir. Ubah menu lewat Orderan Berjalan." }, { status: 400 });
  }

  const label = `${grup.nama_tamu} (${grup.tanggal} ${grup.jam.slice(0, 5)})`;
  const petugas = `${dibuatOleh} (POS)`;
  const itemId = Number(body?.item_id);

  // Pastikan baris menu memang milik reservasi ini
  async function cariBaris() {
    if (!Number.isInteger(itemId) || itemId <= 0) return null;
    const { data } = await supabaseAdmin
      .from("ReservationMenuItem")
      .select("Id, reservation_id, menu_id, nama_pemesan")
      .eq("Id", itemId)
      .maybeSingle();
    const row = data as { Id: number; reservation_id: number; menu_id: number; nama_pemesan: string | null } | null;
    if (!row || !grup!.ids.includes(row.reservation_id)) return null;
    return row;
  }

  if (action === "hapus") {
    const row = await cariBaris();
    if (!row) return NextResponse.json({ error: "Menu tidak ditemukan di reservasi ini" }, { status: 404 });
    const { error } = await supabaseAdmin.from("ReservationMenuItem").delete().eq("Id", row.Id);
    if (error) return NextResponse.json({ error: "Gagal menghapus menu" }, { status: 500 });
    after(() => logActivity(petugas, "Ubah menu reservasi (POS)", `${label} · hapus menu`));
    return NextResponse.json({ success: true });
  }

  if (action === "tambah_banyak") {
    const entries = parseEntries(body?.entries);
    if (!entries) return NextResponse.json({ error: "Daftar menu tidak valid" }, { status: 400 });

    const results = await Promise.all(entries.map((e) => siapkan(e.menu_id, grup.outlet, e.baris, e.addon_ids)));

    const payload: Record<string, unknown>[] = [];
    let totalPorsi = 0;
    for (let i = 0; i < results.length; i++) {
      const h = results[i];
      const e = entries[i];
      if (!h.ok) {
        return NextResponse.json(
          { error: `${h.nama ?? `Menu #${e.menu_id}`}: ${h.error}` },
          { status: 400 }
        );
      }
      h.rows.forEach((r) => {
        totalPorsi += r.jumlah_porsi;
        payload.push({
          reservation_id: grup.primaryId,
          menu_id: e.menu_id,
          varian_id: r.varian_id,
          addon_ids: e.addon_ids,
          jumlah_porsi: r.jumlah_porsi,
          harga_satuan: r.harga_satuan,
          subtotal: r.subtotal,
          catatan: r.catatan,
          nama_pemesan: petugas,
        });
      });
    }

    // Satu perintah insert: semua menu masuk, atau tidak ada sama sekali
    const { error } = await supabaseAdmin.from("ReservationMenuItem").insert(payload);
    if (error) return NextResponse.json({ error: "Gagal menambah menu" }, { status: 500 });
    after(() =>
      logActivity(petugas, "Ubah menu reservasi (POS)", `${label} · tambah ${entries.length} menu (${totalPorsi} porsi)`)
    );
    return NextResponse.json({ success: true });
  }

  const baris = parseBaris(body?.baris);
  const addonIds = parseIntList(body?.addon_ids);
  if (!baris) return NextResponse.json({ error: "Daftar porsi tidak valid" }, { status: 400 });
  if (addonIds === null) return NextResponse.json({ error: "Addon tidak valid" }, { status: 400 });

  if (action === "tambah") {
    const menuId = Number(body?.menu_id);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      return NextResponse.json({ error: "Menu tidak valid" }, { status: 400 });
    }
    const h = await siapkan(menuId, grup.outlet, baris, addonIds);
    if (!h.ok) return NextResponse.json({ error: h.error }, { status: 400 });

    const { error } = await supabaseAdmin.from("ReservationMenuItem").insert(
      h.rows.map((r) => ({
        reservation_id: grup.primaryId,
        menu_id: menuId,
        varian_id: r.varian_id,
        addon_ids: addonIds,
        jumlah_porsi: r.jumlah_porsi,
        harga_satuan: r.harga_satuan,
        subtotal: r.subtotal,
        catatan: r.catatan,
        nama_pemesan: petugas,
      }))
    );
    if (error) return NextResponse.json({ error: "Gagal menambah menu" }, { status: 500 });
    const total = h.rows.reduce((s, r) => s + r.jumlah_porsi, 0);
    after(() => logActivity(petugas, "Ubah menu reservasi (POS)", `${label} · tambah ${total}x ${h.nama}`));
    return NextResponse.json({ success: true });
  }

  // ubah: simpan baris baru dulu, baru hapus baris lama (kalau gagal, data lama tetap aman)
  const row = await cariBaris();
  if (!row) return NextResponse.json({ error: "Menu tidak ditemukan di reservasi ini" }, { status: 404 });
  const h = await siapkan(row.menu_id, grup.outlet, baris, addonIds);
  if (!h.ok) return NextResponse.json({ error: h.error }, { status: 400 });

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("ReservationMenuItem")
    .insert(
      h.rows.map((r) => ({
        reservation_id: row.reservation_id,
        menu_id: row.menu_id,
        varian_id: r.varian_id,
        addon_ids: addonIds,
        jumlah_porsi: r.jumlah_porsi,
        harga_satuan: r.harga_satuan,
        subtotal: r.subtotal,
        catatan: r.catatan,
        nama_pemesan: row.nama_pemesan ?? petugas,
      }))
    )
    .select("Id");
  if (insertError || !inserted) return NextResponse.json({ error: "Gagal mengubah menu" }, { status: 500 });

  const { error: deleteError } = await supabaseAdmin.from("ReservationMenuItem").delete().eq("Id", row.Id);
  if (deleteError) {
    await supabaseAdmin
      .from("ReservationMenuItem")
      .delete()
      .in("Id", (inserted as { Id: number }[]).map((r) => r.Id));
    return NextResponse.json({ error: "Gagal mengubah menu" }, { status: 500 });
  }

  const total = h.rows.reduce((s, r) => s + r.jumlah_porsi, 0);
  after(() => logActivity(petugas, "Ubah menu reservasi (POS)", `${label} · ubah ${total}x ${h.nama}`));
  return NextResponse.json({ success: true });
}