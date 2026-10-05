import { NextResponse } from "next/server";
import { keyValid, logActivity, normalizeWhatsapp, sendWhatsapp, supabaseAdmin } from "../../_shared";
import { loadGrup, parseIds, pesanKonfirmasi } from "../../_pesan";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = parseIds(body?.ids);
  const dp = Number(body?.dp_amount) || 0;
  const dibuatOleh = String(body?.dibuat_oleh || "").trim();

  if (!ids) return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });
  if (dp < 0 || dp > 100000000) return NextResponse.json({ error: "Jumlah DP tidak valid" }, { status: 400 });

  const grup = await loadGrup(ids);
  if (!grup) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (!["Pending", "Confirmed"].includes(grup.status)) {
    return NextResponse.json({ error: `Reservasi berstatus ${grup.status}, tidak bisa dikonfirmasi` }, { status: 400 });
  }
  if (grup.checked_in) {
    return NextResponse.json({ error: "Tamu sudah ditandai hadir" }, { status: 400 });
  }

  const wasPending = grup.status === "Pending";
  if (!wasPending && dp <= 0) {
    return NextResponse.json({ error: "Reservasi sudah terkonfirmasi. Isi jumlah DP untuk mencatatnya." }, { status: 400 });
  }
  if (dp > 0 && grup.dp_amount > 0) {
    return NextResponse.json(
      { error: `DP sudah tercatat (Rp ${grup.dp_amount.toLocaleString("id-ID")}). Ubah lewat admin website.` },
      { status: 400 }
    );
  }

  if (dp > 0) {
    const { error } = await supabaseAdmin
      .from("Reservation")
      .update({ dp_amount: dp, dp_status: "sudah_bayar" })
      .eq("Id", grup.primaryId);
    if (error) return NextResponse.json({ error: "Gagal menyimpan DP" }, { status: 500 });
  }

  if (wasPending) {
    const { error } = await supabaseAdmin
      .from("Reservation")
      .update({ status: "Confirmed" })
      .in("Id", grup.ids)
      .eq("status", "Pending");
    if (error) return NextResponse.json({ error: "Gagal mengonfirmasi reservasi" }, { status: 500 });
  }

  await logActivity(
    `${dibuatOleh} (POS)`,
    wasPending ? "Konfirmasi reservasi (POS)" : "Catat DP (POS)",
    `${grup.nama_tamu} (${grup.tanggal} ${grup.jam.slice(0, 5)})${dp > 0 ? ` · DP Rp ${dp.toLocaleString("id-ID")}` : " · tanpa DP"}`
  );

  let waSent: boolean | null = null;
  if (wasPending && grup.no_whatsapp) {
    waSent = await sendWhatsapp(normalizeWhatsapp(grup.no_whatsapp), pesanKonfirmasi(grup, dp));
  }

  return NextResponse.json({ success: true, wa_sent: waSent });
}