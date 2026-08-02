import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Pakai service role key — kunci penuh yang HANYA boleh dipakai di server,
// tidak pernah dikirim ke browser. Beda dengan anon key yang memang publik.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeWhatsapp(nomor: string) {
  let n = (nomor || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("620")) n = "62" + n.slice(3);
  else if (!n.startsWith("62")) n = "62" + n;
  return n;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nomorWa = body?.nomorWa;

  if (!nomorWa || typeof nomorWa !== "string" || nomorWa.trim().length < 8) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  }

  const normalized = normalizeWhatsapp(nomorWa);
  const variants = Array.from(new Set([
    normalized,
    "0" + normalized.slice(2),
    normalized.slice(2),
  ]));

  const { data, error } = await supabaseAdmin
    .from("Reservation")
    .select("Id, nama_tamu, no_whatsapp, outlet, tanggal, jam, jam_selesai, jumlah_tamu, status, meja_id, share_token, catatan")
    .in("no_whatsapp", variants)
    .order("tanggal", { ascending: false })
    .order("jam", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }

  const rows = data || [];
  const mejaIds = Array.from(new Set(rows.map((r) => r.meja_id).filter((id): id is number => id != null)));

  let tables: { Id: number; nama_meja: string | null; nomor_meja: number }[] = [];
  if (mejaIds.length > 0) {
    const { data: tableData } = await supabaseAdmin
      .from("Tables")
      .select("Id, nama_meja, nomor_meja")
      .in("Id", mejaIds);
    tables = tableData || [];
  }

  return NextResponse.json({ reservations: rows, tables });
}