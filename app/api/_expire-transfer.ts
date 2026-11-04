import { createClient } from "@supabase/supabase-js";

/** Batas waktu admin memverifikasi bukti transfer; lewat ini reservasi dibatalkan otomatis. */
export const BATAS_VERIFIKASI_MENIT = 15;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Batalkan reservasi website yang menunggu verifikasi transfer > 15 menit.
 * Hanya menyentuh dp_status "menunggu_verifikasi" — reservasi POS/admin tidak ikut.
 * Bukti transfer sengaja TIDAK dihapus (tetap tersimpan sebagai arsip), dan dp_status
 * diganti "kedaluwarsa" supaya tidak terbatalkan ulang kalau admin mengembalikannya.
 * Dipanggil "malas" (lazy) dari route yang sering diakses, karena proyek ini tidak punya cron.
 */
export async function expirePendingTransfer(): Promise<number> {
  const cutoff = new Date(Date.now() - BATAS_VERIFIKASI_MENIT * 60 * 1000).toISOString();
  try {
    const { data } = await supabaseAdmin.from("Reservation").select("Id, share_token")
      .eq("status", "Pending").eq("dp_status", "menunggu_verifikasi").lt("created_at", cutoff);
    if (!data || data.length === 0) return 0;

    const patch = { status: "Cancelled", dp_status: "kedaluwarsa" };
    const tokens = Array.from(new Set(data.map((r) => r.share_token).filter((t): t is string => !!t)));
    // Meja gabungan: baris saudara (share_token sama) dibatalkan bersama.
    if (tokens.length > 0) {
      await supabaseAdmin.from("Reservation").update(patch).in("share_token", tokens).eq("dp_status", "menunggu_verifikasi");
    }
    const tanpaToken = data.filter((r) => !r.share_token).map((r) => r.Id);
    if (tanpaToken.length > 0) {
      await supabaseAdmin.from("Reservation").update(patch).in("Id", tanpaToken);
    }
    return data.length;
  } catch {
    return 0; // best effort — jangan sampai menggagalkan request utama
  }
}
