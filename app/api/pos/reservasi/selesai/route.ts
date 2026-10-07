import { NextResponse } from "next/server";
import { keyValid, logActivity, supabaseAdmin } from "../../_shared";

export const dynamic = "force-dynamic";

const REF_RE = /^[A-Za-z0-9-]{4,80}$/;

type Row = { Id: number; status: string; nama_tamu: string; tanggal: string; jam: string };

// ref = share_token reservasi, atau "id-123" untuk reservasi lama yang belum punya token
export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ref = String(body?.ref || "").trim();
  if (!REF_RE.test(ref)) {
    return NextResponse.json({ error: "Referensi reservasi tidak valid" }, { status: 400 });
  }

  let query = supabaseAdmin.from("Reservation").select("Id, status, nama_tamu, tanggal, jam");
  if (/^id-\d+$/.test(ref)) {
    query = query.eq("Id", Number(ref.slice(3)));
  } else {
    query = query.eq("share_token", ref);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Gagal membaca reservasi" }, { status: 500 });

  const rows = (data || []) as Row[];
  if (rows.length === 0) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });

  const target = rows.filter((r) => ["Pending", "Confirmed"].includes(r.status));
  if (target.length === 0) return NextResponse.json({ success: true, updated: 0 });

  const { error: updateError } = await supabaseAdmin
    .from("Reservation")
    .update({ status: "Completed" })
    .in(
      "Id",
      target.map((r) => r.Id)
    );
  if (updateError) {
    return NextResponse.json({ error: "Gagal menandai reservasi selesai" }, { status: 500 });
  }

  await logActivity(
    "POS",
    "Reservasi selesai (POS)",
    `${rows[0].nama_tamu} (${rows[0].tanggal} ${rows[0].jam.slice(0, 5)}) · pesanan lunas`
  );

  return NextResponse.json({ success: true, updated: target.length });
}
