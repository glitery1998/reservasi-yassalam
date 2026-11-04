import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BUCKET } from "../_bukti";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* Upload bukti dilakukan di /api/buat-reservasi (bersamaan dengan penyimpanan reservasi).
   Endpoint ini khusus admin: signed URL sementara untuk melihat bukti transfer. */
export async function GET(req: NextRequest) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Token tidak ada" }, { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("AdminProfile")
    .select("role, aktif, outlet").eq("id", userData.user.id).maybeSingle();
  if (!profile || !profile.aktif) return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 });

  const path = req.nextUrl.searchParams.get("path") || "";
  if (!path || path.includes("..")) return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });

  // Admin outlet hanya boleh melihat bukti milik outletnya sendiri.
  if (profile.role !== "superadmin") {
    const { data: res } = await supabaseAdmin.from("Reservation").select("outlet").eq("bukti_transfer", path).limit(1).maybeSingle();
    if (!res || res.outlet !== profile.outlet) {
      return NextResponse.json({ error: "Tidak punya akses ke bukti ini" }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: "Bukti transfer tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ url: data.signedUrl });
}
