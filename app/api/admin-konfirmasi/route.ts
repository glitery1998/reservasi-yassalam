import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { findKonflik, normalizeWhatsapp, sendWhatsapp, supabaseAdmin } from "../pos/_shared";
import { loadGrup, pesanKonfirmasiBot } from "../pos/_pesan";

export const dynamic = "force-dynamic";

/**
 * Admin backoffice mengonfirmasi reservasi (verifikasi bukti transfer atau konfirmasi biasa).
 * Mengubah status → Confirmed lalu mengirim WhatsApp ke customer (dari nomor BOT) berisi link menu.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Token tidak ada" }, { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("AdminProfile")
    .select("role, aktif, outlet, nama").eq("id", userData.user.id).maybeSingle();
  if (!profile || !profile.aktif) return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID reservasi tidak valid" }, { status: 400 });

  const { data: row } = await supabaseAdmin.from("Reservation")
    .select("Id, outlet, share_token, status, bukti_transfer, dp_status, tanggal, jam, jam_selesai").eq("Id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (profile.role !== "superadmin" && row.outlet !== profile.outlet) {
    return NextResponse.json({ error: "Reservasi ini bukan milik outlet Anda" }, { status: 403 });
  }

  // Ambil semua baris reservasi yang sama (meja gabungan berbagi share_token)
  const { data: siblings } = row.share_token
    ? await supabaseAdmin.from("Reservation").select("Id, meja_id").eq("share_token", row.share_token)
    : { data: [{ Id: row.Id, meja_id: null }] };
  const ids = (siblings || [{ Id: row.Id }]).map((s) => s.Id);
  const wasConfirmed = row.status === "Confirmed";

  // Meja bisa sudah terbuka & diambil orang lain (mis. reservasi kedaluwarsa lalu dikembalikan) — jangan sampai dobel
  if (!wasConfirmed) {
    const mejaIds = (siblings || []).map((s) => (s as { meja_id: number | null }).meja_id).filter((m): m is number => m != null);
    const konflik = await findKonflik(mejaIds, row.tanggal, row.jam, row.jam_selesai || row.jam, ids);
    if (konflik.length > 0) {
      return NextResponse.json({
        error: `Meja sudah terpakai oleh ${konflik[0].nama_tamu} pada jam yang beririsan. Reservasi tidak bisa dikonfirmasi.`,
      }, { status: 409 });
    }
  }

  const patch: Record<string, string> = { status: "Confirmed" };
  if (row.bukti_transfer || row.dp_status === "menunggu_verifikasi" || row.dp_status === "kedaluwarsa") patch.dp_status = "sudah_bayar";
  // Reservasi lama bisa belum punya token menu
  let shareToken = row.share_token;
  if (!shareToken) { shareToken = randomUUID(); patch.share_token = shareToken; }

  const { error } = await supabaseAdmin.from("Reservation").update(patch).in("Id", ids);
  if (error) return NextResponse.json({ error: "Gagal mengonfirmasi reservasi" }, { status: 500 });

  // WA hanya dikirim sekali — saat berpindah dari status lain ke Confirmed
  let waSent: boolean | null = null;
  if (!wasConfirmed) {
    const grup = await loadGrup(ids);
    if (grup?.no_whatsapp) {
      waSent = await sendWhatsapp(normalizeWhatsapp(grup.no_whatsapp), pesanKonfirmasiBot({ ...grup, share_token: shareToken }));
    }
  }

  await supabaseAdmin.from("ActivityLog").insert({
    admin_email: userData.user.email ?? null,
    admin_nama: profile.nama ?? null,
    action: "Konfirmasi reservasi",
    detail: `${row.tanggal} ${String(row.jam).slice(0, 5)}${waSent === false ? " · WA ke customer gagal" : waSent ? " · WA terkirim" : ""}`,
  });

  return NextResponse.json({ success: true, wa_sent: waSent });
}
