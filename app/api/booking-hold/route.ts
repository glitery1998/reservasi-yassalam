import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/* ===== POST: buat hold baru (dengan cek konflik di server) ===== */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { mejaIds, tanggal, jam, jamSelesai, holdMinutes, releaseHoldId } = body || {};

  if (!Array.isArray(mejaIds) || mejaIds.length === 0 || !tanggal || !jam || !jamSelesai) {
    return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
  }
  const minutes = Number(holdMinutes) || 15;

  // Lepas hold lama dari session sebelumnya (kalau customer kembali & pilih meja lain)
  if (releaseHoldId) {
    const { data: oldHold } = await supabaseAdmin.from("BookingHold").select("session_id").eq("Id", releaseHoldId).maybeSingle();
    if (oldHold?.session_id) {
      await supabaseAdmin.from("BookingHold").update({ status: "released" }).eq("session_id", oldHold.session_id).eq("status", "active");
    } else {
      await supabaseAdmin.from("BookingHold").update({ status: "released" }).eq("Id", releaseHoldId);
    }
  }

  // Bersihkan hold yang sudah expired
  await supabaseAdmin.from("BookingHold").delete().lt("expires_at", new Date().toISOString());

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  // Cek konflik untuk semua meja yang diminta
  for (const mejaId of mejaIds) {
    const { data: existingHolds } = await supabaseAdmin.from("BookingHold").select("jam, jam_selesai")
      .eq("meja_id", mejaId).eq("tanggal", tanggal).eq("status", "active").gt("expires_at", new Date().toISOString());
    if (existingHolds && existingHolds.some((h) => isTimeOverlap(jam, jamSelesai, h.jam, h.jam_selesai))) {
      return NextResponse.json({ success: false, error: "Salah satu meja baru saja di-hold orang lain. Silakan pilih ulang." }, { status: 409 });
    }
  }

  const holdInserts = mejaIds.map((mejaId: number) => ({
    meja_id: mejaId, tanggal, jam, jam_selesai: jamSelesai,
    session_id: sessionId, expires_at: expiresAt, status: "active",
  }));

  const { data, error } = await supabaseAdmin.from("BookingHold").insert(holdInserts).select();
  if (error || !data || data.length === 0) {
    return NextResponse.json({ success: false, error: "Gagal mengunci meja" }, { status: 500 });
  }

  return NextResponse.json({ success: true, holdId: data[0].Id, expiresAt });
}

/* ===== DELETE: lepas hold ===== */
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const holdId = body?.holdId;

  if (!holdId) {
    return NextResponse.json({ success: false, error: "holdId tidak ada" }, { status: 400 });
  }

  const { data: holdRow } = await supabaseAdmin.from("BookingHold").select("session_id").eq("Id", holdId).maybeSingle();
  if (holdRow?.session_id) {
    await supabaseAdmin.from("BookingHold").update({ status: "released" }).eq("session_id", holdRow.session_id).eq("status", "active");
  } else {
    await supabaseAdmin.from("BookingHold").update({ status: "released" }).eq("Id", holdId);
  }

  return NextResponse.json({ success: true });
}