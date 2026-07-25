import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client dengan hak penuh — HANYA dipakai di server, tidak pernah dikirim ke browser
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Pastikan pemanggil benar-benar superadmin.
 * Tanpa ini, siapa pun bisa memanggil endpoint dan membuat akun admin.
 */
async function requireSuperadmin(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { ok: false as const, error: "Token tidak ada", status: 401 };

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { ok: false as const, error: "Sesi tidak valid", status: 401 };
  }

  const { data: profile } = await admin
    .from("AdminProfile")
    .select("role, aktif")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile || !profile.aktif || profile.role !== "superadmin") {
    return { ok: false as const, error: "Hanya superadmin yang boleh mengelola admin", status: 403 };
  }

  return { ok: true as const, userId: userData.user.id };
}

/* ========== GET: daftar semua admin ========== */
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await admin
    .from("AdminProfile")
    .select("id, email, nama, role, outlet, aktif, created_at")
    .order("role")
    .order("outlet", { nullsFirst: true })
    .order("nama");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

/* ========== POST: buat admin baru ========== */
export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { email, password, nama, role, outlet } = body;

  if (!email || !password || !nama) {
    return NextResponse.json({ error: "Email, password, dan nama wajib diisi" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (role === "admin_outlet" && !outlet) {
    return NextResponse.json({ error: "Admin outlet wajib punya outlet" }, { status: 400 });
  }

  // 1. Buat akun login
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

  // 2. Daftarkan profilnya
  const { error: profileErr } = await admin.from("AdminProfile").insert({
    id: created.user.id,
    email,
    nama,
    role: role || "admin_outlet",
    outlet: role === "superadmin" ? null : outlet,
    aktif: true,
  });

  // Kalau profil gagal dibuat, hapus lagi akunnya biar tidak jadi akun yatim
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}

/* ========== PATCH: ubah admin ========== */
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, nama, role, outlet, aktif, password } = body;
  if (!id) return NextResponse.json({ error: "ID tidak ada" }, { status: 400 });

  // Cegah superadmin menonaktifkan dirinya sendiri
  if (id === auth.userId && aktif === false) {
    return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri" }, { status: 400 });
  }
  if (id === auth.userId && role && role !== "superadmin") {
    return NextResponse.json({ error: "Tidak bisa menurunkan role akun sendiri" }, { status: 400 });
  }

  // Ganti password kalau diminta
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  // Update profil
  const patch: Record<string, unknown> = {};
  if (nama !== undefined) patch.nama = nama;
  if (aktif !== undefined) patch.aktif = aktif;
  if (role !== undefined) {
    patch.role = role;
    patch.outlet = role === "superadmin" ? null : outlet;
  } else if (outlet !== undefined) {
    patch.outlet = outlet;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("AdminProfile").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/* ========== DELETE: hapus admin ========== */
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID tidak ada" }, { status: 400 });

  if (id === auth.userId) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  // Hapus akun login — baris AdminProfile ikut terhapus (ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}