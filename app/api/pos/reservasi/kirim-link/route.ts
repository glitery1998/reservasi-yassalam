import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { keyValid, logActivity, normalizeWhatsapp, sendWhatsapp, supabaseAdmin } from "../../_shared";
import { loadGrup, parseIds, pesanLink } from "../../_pesan";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = parseIds(body?.ids);
  const dibuatOleh = String(body?.dibuat_oleh || "").trim();

  if (!ids) return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });

  const grup = await loadGrup(ids);
  if (!grup) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (!["Pending", "Confirmed"].includes(grup.status)) {
    return NextResponse.json({ error: `Reservasi berstatus ${grup.status}` }, { status: 400 });
  }
  if (!grup.no_whatsapp) {
    return NextResponse.json({ error: "Reservasi ini tidak punya nomor WhatsApp" }, { status: 400 });
  }

  // Reservasi lama dari admin bisa belum punya token menu; buatkan supaya link menunya ada
  let token = grup.share_token;
  if (!token) {
    token = randomUUID();
    const { error } = await supabaseAdmin.from("Reservation").update({ share_token: token }).in("Id", grup.ids);
    if (error) return NextResponse.json({ error: "Gagal menyiapkan link menu" }, { status: 500 });
  }

  const waSent = await sendWhatsapp(
    normalizeWhatsapp(grup.no_whatsapp),
    pesanLink({ ...grup, share_token: token })
  );

  await logActivity(
    `${dibuatOleh} (POS)`,
    "Kirim ulang link reservasi (POS)",
    `${grup.nama_tamu} (${grup.tanggal} ${grup.jam.slice(0, 5)})${waSent ? "" : " · WA gagal"}`
  );

  return NextResponse.json({ success: true, wa_sent: waSent });
}