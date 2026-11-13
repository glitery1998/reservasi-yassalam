import { NextResponse } from "next/server";
import { keyValid, OUTLETS, supabaseAdmin } from "../_shared";

export const dynamic = "force-dynamic";

// Sinkron meja dari backoffice (POS) ke website reservasi untuk satu outlet.
// Backoffice adalah sumber nama dan kapasitas; area hanya untuk meja yang baru dibuat. Foto, DP minimum, minimum transaksi, dan deskripsi
// tetap diatur di admin website dan tidak disentuh. Meja website yang tidak ada di backoffice tidak dihapus
// (bisa masih punya reservasi), hanya dilaporkan.

type MejaMasuk = {
  pos_id: string;
  website_id: number | null;
  nama: string;
  area: string;
  kapasitas: number | null;
  // dipakai hanya untuk meja yang baru dibuat bila kapasitas kosong
  kapasitas_bawaan?: number | null;
};
type TableRow = { Id: number; nomor_meja: number; nama_meja: string | null; posisi: string; kapasitas: number };
type AreaRow = { Id: number; nama: string; slug: string; urutan: number };

// "Majelis Almaz", "majelis almaz", "Almaz" dianggap meja yang sama
function kunciNama(nama: string) {
  return nama
    .toLowerCase()
    .replace(/majelis/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const outlet = String(body?.outlet ?? "");
  const dry = body?.dry_run !== false;
  const masuk = (Array.isArray(body?.meja) ? body.meja : []) as MejaMasuk[];
  if (!OUTLETS.includes(outlet)) return NextResponse.json({ error: "Outlet tidak dikenal" }, { status: 400 });
  if (masuk.length === 0) return NextResponse.json({ error: "Tidak ada meja yang dikirim" }, { status: 400 });
  for (const m of masuk) {
    if (!m.pos_id || !m.nama?.trim() || !m.area?.trim()) {
      return NextResponse.json({ error: "Setiap meja wajib punya id, nama, dan area" }, { status: 400 });
    }
    if (m.kapasitas != null && (!Number.isInteger(m.kapasitas) || m.kapasitas < 1)) {
      return NextResponse.json({ error: `Kapasitas ${m.nama} tidak valid` }, { status: 400 });
    }
  }

  const [{ data: tablesData, error: e1 }, { data: areasData, error: e2 }] = await Promise.all([
    supabaseAdmin.from("Tables").select("Id, nomor_meja, nama_meja, posisi, kapasitas").eq("outlet", outlet),
    supabaseAdmin.from("Areas").select("Id, nama, slug, urutan").eq("outlet", outlet),
  ]);
  if (e1 || e2) return NextResponse.json({ error: "Gagal membaca meja website" }, { status: 500 });
  const tables = (tablesData || []) as TableRow[];
  const areas = (areasData || []) as AreaRow[];

  try {
    // Area hanya dipakai untuk meja BARU. Meja yang sudah ada di website tetap di areanya
    // (area website punya foto dan deskripsi sendiri, namanya boleh berbeda dengan area backoffice).
    const slugByArea = new Map<string, string>();
    const areaBaru: string[] = [];
    let urutan = areas.reduce((m, a) => Math.max(m, a.urutan ?? 0), 0);
    async function slugArea(namaArea: string) {
      const nama = namaArea.trim();
      const tersimpan = slugByArea.get(nama);
      if (tersimpan) return tersimpan;
      const ada = areas.find((a) => a.slug.toLowerCase() === nama.toLowerCase() || a.nama.toLowerCase() === nama.toLowerCase());
      if (ada) {
        slugByArea.set(nama, ada.slug);
        return ada.slug;
      }
      slugByArea.set(nama, nama);
      areaBaru.push(nama);
      if (!dry) {
        urutan += 1;
        const { error } = await supabaseAdmin.from("Areas").insert({ outlet, nama, slug: nama, deskripsi: "", urutan });
        if (error) throw new Error(`Gagal membuat area ${nama}: ${error.message}`);
      }
      return nama;
    }

    // 2. Meja: sambungan lama dulu, lalu nama yang sama, sisanya dibuat baru
    const terpakai = new Set<number>();
    const pasangan = new Map<string, TableRow>();
    for (const m of masuk) {
      const t = m.website_id != null ? tables.find((x) => x.Id === m.website_id) : undefined;
      if (t) {
        pasangan.set(m.pos_id, t);
        terpakai.add(t.Id);
      }
    }
    for (const m of masuk) {
      if (pasangan.has(m.pos_id)) continue;
      const k = kunciNama(m.nama);
      const t = tables.find((x) => !terpakai.has(x.Id) && kunciNama(x.nama_meja || `Meja ${x.nomor_meja}`) === k);
      if (t) {
        pasangan.set(m.pos_id, t);
        terpakai.add(t.Id);
      }
    }

    let nomor = tables.reduce((mx, t) => Math.max(mx, t.nomor_meja ?? 0), 0);
    const hasil: { pos_id: string; website_id: number; kapasitas: number; status: "baru" | "diperbarui" | "sama" }[] = [];
    for (const m of masuk) {
      const nama = m.nama.trim();
      const t = pasangan.get(m.pos_id);
      if (t) {
        const kapasitas = m.kapasitas ?? t.kapasitas;
        const berubah = t.nama_meja !== nama || t.kapasitas !== kapasitas;
        if (berubah && !dry) {
          const { error } = await supabaseAdmin.from("Tables").update({ nama_meja: nama, kapasitas }).eq("Id", t.Id);
          if (error) throw new Error(`Gagal memperbarui ${nama}: ${error.message}`);
        }
        hasil.push({ pos_id: m.pos_id, website_id: t.Id, kapasitas, status: berubah ? "diperbarui" : "sama" });
        continue;
      }
      const posisi = await slugArea(m.area);
      nomor += 1;
      const kapasitas = m.kapasitas ?? (Number.isInteger(m.kapasitas_bawaan) && m.kapasitas_bawaan! > 0 ? m.kapasitas_bawaan! : 4);
      let id = -nomor;
      if (!dry) {
        const { data, error } = await supabaseAdmin
          .from("Tables")
          .insert({ outlet, nomor_meja: nomor, nama_meja: nama, posisi, kapasitas, status: "available" })
          .select("Id")
          .single();
        if (error || !data) throw new Error(`Gagal membuat meja ${nama}: ${error?.message}`);
        id = (data as { Id: number }).Id;
      }
      hasil.push({ pos_id: m.pos_id, website_id: id, kapasitas, status: "baru" });
    }

    const tidakAdaDiBackoffice = tables
      .filter((t) => !terpakai.has(t.Id))
      .map((t) => t.nama_meja || `Meja ${t.nomor_meja}`);

    return NextResponse.json({
      ok: true,
      dry_run: dry,
      area_baru: areaBaru,
      meja: hasil,
      ringkasan: {
        baru: hasil.filter((h) => h.status === "baru").length,
        diperbarui: hasil.filter((h) => h.status === "diperbarui").length,
        sama: hasil.filter((h) => h.status === "sama").length,
      },
      hanya_di_website: tidakAdaDiBackoffice,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal sinkron meja" }, { status: 500 });
  }
}
