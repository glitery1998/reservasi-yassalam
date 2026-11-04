import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { expirePendingTransfer } from "../_expire-transfer";
import { hapusBukti, simpanBukti } from "../_bukti";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; };
const fail = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

/**
 * Simpan reservasi dari website. Semua data penting (meja, jam, outlet, DP, status)
 * ditentukan SERVER dari hold yang sah — bukan dari kiriman browser.
 */
export async function POST(req: NextRequest) {
  await expirePendingTransfer();

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Data tidak valid", 400);

  const holdId = Number(form.get("holdId"));
  const namaTamu = String(form.get("namaTamu") || "").trim();
  const noWhatsapp = String(form.get("noWhatsapp") || "").trim();
  const jumlahTamu = Number(form.get("jumlahTamu"));
  const catatan = String(form.get("catatan") || "").trim().slice(0, 500) || null;
  const gabunganId = form.get("gabunganId") ? Number(form.get("gabunganId")) : null;
  const file = form.get("file");

  if (!Number.isInteger(holdId) || holdId <= 0) return fail("Sesi pemesanan tidak valid. Silakan mulai ulang.", 400);
  if (namaTamu.length < 2 || namaTamu.length > 100) return fail("Nama tamu tidak valid", 400);
  if (!/^[0-9]{10,15}$/.test(noWhatsapp)) return fail("No. WhatsApp harus 10-15 digit angka", 400);
  if (!Number.isInteger(jumlahTamu) || jumlahTamu < 1 || jumlahTamu > 200) return fail("Jumlah tamu tidak valid", 400);

  /* ---- 1. Hold harus masih sah (belum lewat 15 menit) ---- */
  const { data: holdRow } = await supabaseAdmin.from("BookingHold").select("session_id").eq("Id", holdId).maybeSingle();
  if (!holdRow?.session_id) return fail("Waktu pembayaran habis. Silakan mulai ulang reservasi.", 410);
  const { data: holds } = await supabaseAdmin.from("BookingHold")
    .select("meja_id, tanggal, jam, jam_selesai")
    .eq("session_id", holdRow.session_id).eq("status", "active").gt("expires_at", new Date().toISOString());
  if (!holds || holds.length === 0) return fail("Waktu pembayaran 15 menit sudah lewat dan meja dibuka kembali. Silakan mulai ulang reservasi.", 410);

  const { tanggal, jam, jam_selesai: jamSelesai } = holds[0];
  const mejaIds = holds.map((h) => h.meja_id as number).sort((a, b) => a - b);

  /* ---- 2. Meja / gabungan, outlet, kapasitas, DP — dari database ---- */
  const { data: tables } = await supabaseAdmin.from("Tables")
    .select("Id, outlet, kapasitas, kapasitas_minimum, dp_minimum").in("Id", mejaIds);
  if (!tables || tables.length !== mejaIds.length) return fail("Meja tidak ditemukan", 400);
  const outlet = tables[0].outlet as string;
  if (tables.some((t) => t.outlet !== outlet)) return fail("Meja tidak valid", 400);

  let dpAmount = 0;
  let gabunganNama: string | null = null;
  let kapMax: number; let kapMin: number | null;
  if (gabunganId) {
    const { data: g } = await supabaseAdmin.from("MejaGabungan")
      .select("outlet, nama, meja_ids, kapasitas_total, kapasitas_minimum, dp_minimum, aktif").eq("Id", gabunganId).maybeSingle();
    const sama = g && g.aktif && g.outlet === outlet && Array.isArray(g.meja_ids)
      && [...g.meja_ids].map(Number).sort((a, b) => a - b).join(",") === mejaIds.join(",");
    if (!g || !sama) return fail("Meja gabungan tidak valid", 400);
    dpAmount = g.dp_minimum || 0; gabunganNama = g.nama; kapMax = g.kapasitas_total; kapMin = g.kapasitas_minimum;
  } else {
    if (mejaIds.length !== 1) return fail("Meja tidak valid", 400);
    dpAmount = tables[0].dp_minimum || 0; kapMax = tables[0].kapasitas; kapMin = tables[0].kapasitas_minimum;
  }
  if (jumlahTamu > kapMax || (kapMin && jumlahTamu < kapMin)) return fail("Jumlah tamu tidak sesuai kapasitas meja yang dipilih", 400);

  /* ---- 3. Aturan booking: libur, minimal jam, maksimal hari ---- */
  const { data: libur } = await supabaseAdmin.from("LiburOutlet")
    .select("tanggal_mulai, tanggal_selesai, alasan").eq("outlet", outlet).lte("tanggal_mulai", tanggal).gte("tanggal_selesai", tanggal).limit(1);
  if (libur && libur.length > 0) return fail(`Outlet libur pada tanggal ini${libur[0].alasan ? ": " + libur[0].alasan : ""}`, 400);

  const { data: setRows } = await supabaseAdmin.from("AppSettings").select("key, value").in("key", ["booking_min_hours", "booking_max_days"]);
  const set = Object.fromEntries((setRows || []).map((r) => [r.key, Number(r.value)]));
  const minJam = Number.isFinite(set.booking_min_hours) ? set.booking_min_hours : 2;
  const maxHari = Number.isFinite(set.booking_max_days) ? set.booking_max_days : 30;
  const waktu = new Date(`${tanggal}T${String(jam).slice(0, 5)}:00+07:00`).getTime(); // WIB
  if (waktu < Date.now() + minJam * 3600 * 1000) return fail(`Reservasi minimal ${minJam} jam sebelum jam kunjungan`, 400);
  if (waktu > Date.now() + (maxHari + 1) * 24 * 3600 * 1000) return fail(`Reservasi maksimal ${maxHari} hari ke depan`, 400);

  /* ---- 4. Tidak boleh bentrok dengan reservasi lain (Pending/Confirmed) ---- */
  const start = toMin(jam);
  let end = toMin(jamSelesai || jam) ; if (end <= start) end += 24 * 60;
  const { data: bentrok } = await supabaseAdmin.from("Reservation")
    .select("jam, jam_selesai").in("meja_id", mejaIds).eq("tanggal", tanggal).in("status", ["Pending", "Confirmed"]);
  const adaBentrok = (bentrok || []).some((r) => {
    const s = toMin(r.jam); let e = r.jam_selesai ? toMin(r.jam_selesai) : s + 120; if (e <= s) e += 24 * 60;
    return start < e && end > s;
  });
  if (adaBentrok) return fail("Meja baru saja dipesan orang lain. Silakan pilih meja lain.", 409);

  /* ---- 5. Bukti transfer (wajib kalau ada DP) ---- */
  const perluVerifikasi = dpAmount > 0;
  let buktiPath: string | null = null;
  if (perluVerifikasi) {
    if (!(file instanceof File)) return fail("Upload bukti transfer terlebih dahulu", 400);
    const hasil = await simpanBukti(file);
    if ("error" in hasil) return fail(hasil.error, 400);
    buktiPath = hasil.path;
  }

  /* ---- 6. Simpan semua baris sekaligus (satu perintah = berhasil semua atau gagal semua) ---- */
  const status = perluVerifikasi ? "Pending" : "Confirmed";
  const dpStatus = perluVerifikasi ? "menunggu_verifikasi" : "sudah_bayar";
  const shareToken = randomUUID();
  const rows = mejaIds.map((mejaId, i) => ({
    nama_tamu: namaTamu, no_whatsapp: noWhatsapp, outlet, tanggal, jam, jam_selesai: jamSelesai,
    jumlah_tamu: jumlahTamu,
    catatan: i === 0 ? catatan : `[Gabungan: ${gabunganNama}]`,
    meja_id: mejaId, menu_paket_id: null, share_token: shareToken,
    dp_amount: i === 0 ? dpAmount : 0, dp_status: dpStatus, status,
    bukti_transfer: i === 0 ? buktiPath : null,
  }));
  const { error: insErr } = await supabaseAdmin.from("Reservation").insert(rows);
  if (insErr) {
    if (buktiPath) await hapusBukti(buktiPath);
    return fail("Gagal menyimpan reservasi. Silakan coba lagi.", 500);
  }

  // Tutup hold milik sesi ini saja (tidak menyentuh hold customer lain)
  await supabaseAdmin.from("BookingHold").update({ status: "completed" }).eq("session_id", holdRow.session_id).eq("status", "active");

  return NextResponse.json({ success: true, shareToken, status, menungguVerifikasi: perluVerifikasi, dpAmount });
}
