import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function timeToMinutes(t: string) {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
}

type TableData = {
  Id: number; outlet: string; nomor_meja: number; nama_meja: string | null;
  kapasitas: number; posisi: string; kapasitas_minimum: number | null;
  foto_url: string | null;
};
type MejaGabungan = {
  Id: number; outlet: string; nama: string; meja_ids: number[];
  kapasitas_total: number; kapasitas_minimum: number | null; aktif: boolean;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { outlet, jumlahTamu, jamMulai, dariTanggal, sampaiTanggal } = body || {};

  if (!outlet || !jamMulai || !dariTanggal || !sampaiTanggal) {
    return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
  }

  const tamu = Number(jumlahTamu) || 1;
  const [jh, jm] = String(jamMulai).split(":").map(Number);
  const startMin = jh * 60 + jm;
  const endMin = startMin + 120;

  const { data: tablesData } = await supabaseAdmin.from("Tables")
    .select("Id, outlet, nomor_meja, nama_meja, kapasitas, posisi, kapasitas_minimum, foto_url").eq("outlet", outlet);
  const { data: gabunganData } = await supabaseAdmin.from("MejaGabungan")
    .select("Id, outlet, nama, meja_ids, kapasitas_total, kapasitas_minimum, aktif").eq("outlet", outlet).eq("aktif", true);
  const { data: liburData } = await supabaseAdmin.from("LiburOutlet")
    .select("tanggal_mulai, tanggal_selesai, alasan").eq("outlet", outlet);

  const liburRows = (liburData || []) as { tanggal_mulai: string; tanggal_selesai: string; alasan: string | null }[];
  const outletTables = ((tablesData || []) as TableData[])
    .filter((t) => t.kapasitas >= tamu && (!t.kapasitas_minimum || tamu >= t.kapasitas_minimum));
  const outletGabungan = ((gabunganData || []) as MejaGabungan[])
    .filter((g) => g.kapasitas_total >= tamu && (!g.kapasitas_minimum || tamu >= g.kapasitas_minimum));

  if (outletTables.length === 0 && outletGabungan.length === 0) {
    return NextResponse.json({ error: `Tidak ada meja dengan kapasitas cukup untuk ${tamu} orang di outlet ini.` }, { status: 200 });
  }

  const { data: resData } = await supabaseAdmin.from("Reservation").select("meja_id, tanggal, jam, jam_selesai")
    .eq("outlet", outlet).gte("tanggal", dariTanggal).lte("tanggal", sampaiTanggal)
    .in("status", ["Pending", "Confirmed"]);
  const { data: holdData } = await supabaseAdmin.from("BookingHold").select("meja_id, tanggal, jam, jam_selesai")
    .gte("tanggal", dariTanggal).lte("tanggal", sampaiTanggal)
    .not("status", "in", "(completed,cancelled,expired,released)");

  const resRows = (resData || []) as { meja_id: number | null; tanggal: string; jam: string; jam_selesai: string }[];
  const holdRows = (holdData || []) as { meja_id: number; tanggal: string; jam: string; jam_selesai: string }[];

  const dates: string[] = [];
  const dari = new Date(dariTanggal + "T00:00:00");
  const sampai = new Date(sampaiTanggal + "T00:00:00");
  for (let d = new Date(dari); d <= sampai; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }

  const bookedByDate: Record<string, Set<number>> = {};
  dates.forEach((tgl) => { bookedByDate[tgl] = new Set<number>(); });
  resRows.forEach((r) => {
    if (r.meja_id == null || !bookedByDate[r.tanggal]) return;
    const rStart = timeToMinutes(r.jam);
    const rEnd = r.jam_selesai ? timeToMinutes(r.jam_selesai) : rStart + 120;
    if (startMin < rEnd && endMin > rStart) bookedByDate[r.tanggal].add(r.meja_id);
  });
  holdRows.forEach((h) => {
    if (!bookedByDate[h.tanggal]) return;
    const hStart = timeToMinutes(h.jam);
    const hEnd = h.jam_selesai ? timeToMinutes(h.jam_selesai) : hStart + 120;
    if (startMin < hEnd && endMin > hStart) bookedByDate[h.tanggal].add(h.meja_id);
  });

  const hasilPerTanggal = dates.map((tgl) => {
    const liburInfo = liburRows.find((l) => tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai);
    if (liburInfo) {
      return { tanggal: tgl, tersedia: false, jumlahOpsi: 0, daftarMeja: [], libur: liburInfo.alasan || "Outlet libur" };
    }
    const mejaTersedia = outletTables.filter((t) => !bookedByDate[tgl].has(t.Id));
    const gabunganTersedia = outletGabungan.filter((g) => g.meja_ids.every((id) => !bookedByDate[tgl].has(id)));
    const jumlahOpsi = mejaTersedia.length + gabunganTersedia.length;
    const daftarMeja = [
      ...mejaTersedia.map((t) => ({ id: t.Id, tipe: "tunggal" as const, nama: t.nama_meja || `Meja ${t.nomor_meja}`, foto_url: t.foto_url })),
      ...gabunganTersedia.map((g) => ({ id: g.Id, tipe: "gabungan" as const, nama: g.nama, foto_url: null })),
    ];
    return { tanggal: tgl, tersedia: jumlahOpsi > 0, jumlahOpsi, daftarMeja, libur: null };
  });

  return NextResponse.json({ hasil: hasilPerTanggal });
}