import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function keyValid(provided: string | null) {
  const expected = process.env.POS_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 20 ||
    !ids.every((n: unknown) => Number.isInteger(n))
  ) {
    return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("Reservation")
    .update({ checked_in_at: new Date().toISOString() })
    .in("Id", ids as number[])
    .is("checked_in_at", null);

  if (error) {
    return NextResponse.json({ error: "Gagal menandai hadir" }, { status: 500 });
  }

  // Catat di log aktivitas admin website (kalau gagal, tidak masalah)
  await supabaseAdmin.from("ActivityLog").insert({
    admin_email: null,
    admin_nama: "POS",
    action: "Tandai hadir (POS)",
    detail: `Reservasi Id ${(ids as number[]).join(", ")}`,
  });

  return NextResponse.json({ success: true });
}