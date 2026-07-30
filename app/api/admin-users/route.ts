import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars tidak ditemukan");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Pastikan pemanggil superadmin ATAU manajer outlet.
 * Manajer outlet hanya boleh mengelola admin_outlet di outletnya sendiri —
 * pembatasan itu diterapkan per-handler di bawah, bukan di sini.
 */
async function requireElevated(req: NextRequest) {
  const admin = getAdmin();
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { ok: false as const, error: "Token tidak ada", status: 401 };

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { ok: false as const, error: "Sesi tidak valid", status: 401 };
  }

  const { data: profile } = await admin
    .from("AdminProfile")
    .select("role, aktif, outlet")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile || !profile.aktif || (profile.role !== "superadmin" && profile.role !== "manajer_outlet")) {
    return { ok: false as const, error: "Hanya superadmin atau manajer outlet yang boleh mengelola admin", status: 403 };
  }

  return {
    ok: true as const,
    userId: userData.user.id,
    role: profile.role as string,
    outlet: profile.outlet as string | null,
  };
}

/* ========== GET: daftar admin (manajer outlet hanya lihat outletnya sendiri) ========== */
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const auth = await requireElevated(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let query = admin
    .from("AdminProfile")
    .select("id, email, nama, role, outlet, aktif, created_at")
    .order("role")
    .order("outlet", { nullsFirst: true })
    .order("nama");

  if (auth.role === "manajer_outlet") {
    query = query.eq("outlet", auth.outlet);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

/* ========== POST: buat admin baru ========== */
export async function POST(req: NextRequest) {
  const admin = getAdmin();
  const auth = await requireElevated(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { email, password, nama } = body;
  let { role, outlet } = body;

  if (!email || !password || !nama) {
    return NextResponse.json({ error: "Email, password, dan nama wajib diisi" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  // Manajer outlet: paksa role admin_outlet & outlet miliknya sendiri, apa pun yang dikirim client
  if (auth.role === "manajer_outlet") {
    role = "admin_outlet";
    outlet = auth.outlet;
  }

  if ((role === "admin_outlet" || role === "manajer_outlet") && !outlet) {
    return NextResponse.json({ error: "Role ini wajib punya outlet" }, { status: 400 });
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
  const admin = getAdmin();
  const auth = await requireElevated(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, nama, aktif, password } = body;
  let { role, outlet } = body;
  if (!id) return NextResponse.json({ error: "ID tidak ada" }, { status: 400 });

  // Cegah menonaktifkan akun sendiri
  if (id === auth.userId && aktif === false) {
    return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri" }, { status: 400 });
  }
  // Cegah menurunkan role akun sendiri (berlaku utk superadmin maupun manajer outlet)
  if (id === auth.userId && role && role !== auth.role) {
    return NextResponse.json({ error: "Tidak bisa menurunkan role akun sendiri" }, { status: 400 });
  }

  if (auth.role === "manajer_outlet") {
    // Manajer outlet hanya boleh menyentuh admin_outlet di outletnya sendiri
    const { data: target } = await admin
      .from("AdminProfile")
      .select("role, outlet")
      .eq("id", id)
      .maybeSingle();

    if (!target || target.role !== "admin_outlet" || target.outlet !== auth.outlet) {
      return NextResponse.json({ error: "Tidak berwenang mengubah admin ini" }, { status: 403 });
    }
    // Tidak boleh mengubah role atau memindah outlet admin
    role = undefined;
    outlet = undefined;
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
  const admin = getAdmin();
  const auth = await requireElevated(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID tidak ada" }, { status: 400 });

  if (id === auth.userId) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  if (auth.role === "manajer_outlet") {
    const { data: target } = await admin
      .from("AdminProfile")
      .select("role, outlet")
      .eq("id", id)
      .maybeSingle();

    if (!target || target.role !== "admin_outlet" || target.outlet !== auth.outlet) {
      return NextResponse.json({ error: "Tidak berwenang menghapus admin ini" }, { status: 403 });
    }
  }

  // Hapus akun login — baris AdminProfile ikut terhapus (ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}