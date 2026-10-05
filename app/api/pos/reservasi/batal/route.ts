import { NextResponse } from "next/server";
import { keyValid, logActivity, normalizeWhatsapp, sendWhatsapp, supabaseAdmin } from "../../_shared";
import { loadGrup, parseIds, pesanBatal } from "../../_pesan";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = parseIds(body?.ids);
  const dibuatOleh = String(body?.dibuat_oleh || "").trim();
  const kirimWa = body?.kirim_wa === true;

  if (!ids) return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });

  const grup = await loadGrup(ids);
  if (!grup) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (!["Pending", "Confirmed"].includes(grup.status)) {
    return NextResponse.json({ error: `Reservasi sudah berstatus ${grup.status}` }, { status: 400 });
  }
  if (grup.checked_in) {
    return NextResponse.json({ error: "Tamu sudah ditandai hadir, tidak bisa dibatalkan" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("Reservation").update({ status: "Cancelled" }).in("Id", grup.ids);
  if (error) return NextResponse.json({ error: "Gagal membatalkan reservasi" }, { status: 500 });

  await logActivity(
    `${dibuatOleh} (POS)`,
    "Batalkan reservasi (POS)",
    `${grup.nama_tamu} (${grup.tanggal} ${grup.jam.slice(0, 5)})${grup.dp_amount > 0 ? ` · DP Rp ${grup.dp_amount.toLocaleString("id-ID")} perlu diurus manual` : ""}`
  );

  let waSent: boolean | null = null;
  if (kirimWa && grup.no_whatsapp) {
    waSent = await sendWhatsapp(normalizeWhatsapp(grup.no_whatsapp), pesanBatal(grup));
  }

  return NextResponse.json({ success: true, wa_sent: waSent });
}