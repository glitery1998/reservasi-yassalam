import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const noWa = body?.noWa;

  if (!noWa || typeof noWa !== "string") {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("Reservation")
    .select("Id")
    .eq("no_whatsapp", noWa)
    .gte("created_at", cutoff)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: "Gagal cek rate limit" }, { status: 500 });
  }

  return NextResponse.json({ limited: (data?.length || 0) > 0 });
}