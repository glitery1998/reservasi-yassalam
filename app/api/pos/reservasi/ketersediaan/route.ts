import { NextResponse } from "next/server";
import { DATE_RE, OUTLETS, TIME_RE, addMinutes, findKonflik, keyValid, supabaseAdmin } from "../../_shared";

export const dynamic = "force-dynamic";

type TableRow = {
  Id: number;
  nomor_meja: number;
  nama_meja: string | null;
  kapasitas: number;
  kapasitas_minimum: number | null;
  dp_minimum: number | null;
  posisi: string | null;
};

type GabunganRow = {
  Id: number;
  nama: string;
  meja_ids: number[];
  kapasitas_total: number;
  kapasitas_minimum: number | null;
  dp_minimum: number | null;
};

export async function GET(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet") || "";
  const tanggal = searchParams.get("tanggal") || "";
  const jam = searchParams.get("jam") || "";
  if (!OUTLETS.includes(outlet) || !DATE_RE.test(tanggal) || !TIME_RE.test(jam)) {
    return NextResponse.json({ error: "Outlet, tanggal (YYYY-MM-DD), dan jam (HH:MM) wajib diisi" }, { status: 400 });
  }
  const jamMulai = jam.slice(0, 5);
  const jsParam = searchParams.get("jam_selesai") || "";
  const jamSelesai = TIME_RE.test(jsParam) ? jsParam.slice(0, 5) : addMinutes(jamMulai, 120);

  const { data: tablesData, error } = await supabaseAdmin
    .from("Tables")
    .select("Id, nomor_meja, nama_meja, kapasitas, kapasitas_minimum, dp_minimum, posisi")
    .eq("outlet", outlet)
    .order("nomor_meja");
  if (error) return NextResponse.json({ error: "Gagal mengambil data meja" }, { status: 500 });
  const tables = (tablesData || []) as TableRow[];

  const { data: gabData } = await supabaseAdmin
    .from("MejaGabungan")
    .select("Id, nama, meja_ids, kapasitas_total, kapasitas_minimum, dp_minimum")
    .eq("outlet", outlet)
    .eq("aktif", true);
  const gabungan = (gabData || []) as GabunganRow[];

  const konflik = await findKonflik(
    tables.map((t) => t.Id),
    tanggal,
    jamMulai,
    jamSelesai
  );

  const { data: liburData } = await supabaseAdmin
    .from("LiburOutlet")
    .select("alasan")
    .eq("outlet", outlet)
    .lte("tanggal_mulai", tanggal)
    .gte("tanggal_selesai", tanggal)
    .limit(1);

  return NextResponse.json({
    tanggal,
    jam: jamMulai,
    jam_selesai: jamSelesai,
    libur: liburData && liburData.length > 0 ? { alasan: liburData[0].alasan ?? null } : null,
    tables: tables.map((t) => ({
      id: t.Id,
      nama: t.nama_meja || `Meja ${t.nomor_meja}`,
      kapasitas: t.kapasitas,
      kapasitas_minimum: t.kapasitas_minimum,
      dp_minimum: t.dp_minimum,
      posisi: t.posisi,
      konflik: konflik.filter((k) => k.meja_id === t.Id),
    })),
    gabungan: gabungan.map((g) => ({
      id: g.Id,
      nama: g.nama,
      meja_ids: g.meja_ids,
      kapasitas_total: g.kapasitas_total,
      kapasitas_minimum: g.kapasitas_minimum,
      dp_minimum: g.dp_minimum,
      konflik: konflik.filter((k) => g.meja_ids.includes(k.meja_id)),
    })),
  });
}