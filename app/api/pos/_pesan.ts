import { supabaseAdmin } from "./_shared";

const SITE_URL = process.env.SITE_URL || "https://www.yassalamresto.co.id";

type Row = {
  Id: number;
  nama_tamu: string;
  no_whatsapp: string | null;
  outlet: string;
  tanggal: string;
  jam: string;
  jam_selesai: string | null;
  jumlah_tamu: number;
  status: string;
  meja_id: number | null;
  dp_amount: number | null;
  share_token: string | null;
  checked_in_at: string | null;
};

export type Grup = {
  ids: number[];
  primaryId: number;
  nama_tamu: string;
  no_whatsapp: string | null;
  outlet: string;
  tanggal: string;
  jam: string;
  jam_selesai: string | null;
  jumlah_tamu: number;
  status: string;
  dp_amount: number;
  share_token: string | null;
  meja_label: string;
  checked_in: boolean;
};

export function parseIds(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) return null;
  const ids = raw.map(Number);
  return ids.every((n) => Number.isInteger(n) && n > 0) ? ids : null;
}

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function tglLabel(t: string) {
  return t.split("-").reverse().join("/");
}

function outletLabel(o: string) {
  return o === "jogja" ? "Yogyakarta" : "Solo";
}

// Ambil satu reservasi (semua baris mejanya). null kalau tidak lengkap atau bukan satu reservasi yang sama.
export async function loadGrup(ids: number[]): Promise<Grup | null> {
  const { data } = await supabaseAdmin
    .from("Reservation")
    .select(
      "Id, nama_tamu, no_whatsapp, outlet, tanggal, jam, jam_selesai, jumlah_tamu, status, meja_id, dp_amount, share_token, checked_in_at"
    )
    .in("Id", ids);
  const rows = ((data || []) as Row[]).sort((a, b) => a.Id - b.Id);
  if (rows.length === 0 || rows.length !== new Set(ids).size) return null;

  const keys = new Set(rows.map((r) => r.share_token ?? `id-${r.Id}`));
  if (keys.size !== 1) return null;

  const mejaIds = rows.map((r) => r.meja_id).filter((x): x is number => x != null);
  const names = new Map<number, string>();
  if (mejaIds.length > 0) {
    const { data: t } = await supabaseAdmin.from("Tables").select("Id, nomor_meja, nama_meja").in("Id", mejaIds);
    (t || []).forEach((x: { Id: number; nomor_meja: number; nama_meja: string | null }) => {
      names.set(x.Id, x.nama_meja || `Meja ${x.nomor_meja}`);
    });
  }

  const primary = rows[0];
  return {
    ids: rows.map((r) => r.Id),
    primaryId: primary.Id,
    nama_tamu: primary.nama_tamu,
    no_whatsapp: primary.no_whatsapp,
    outlet: primary.outlet,
    tanggal: primary.tanggal,
    jam: primary.jam,
    jam_selesai: primary.jam_selesai,
    jumlah_tamu: primary.jumlah_tamu,
    status: primary.status,
    dp_amount: rows.reduce((s, r) => s + (r.dp_amount || 0), 0),
    share_token: primary.share_token,
    meja_label: rows
      .map((r) => (r.meja_id != null ? names.get(r.meja_id) : null))
      .filter(Boolean)
      .join(" + "),
    checked_in: rows.some((r) => !!r.checked_in_at),
  };
}

function detailBlok(g: Grup, dp: number) {
  return (
    `Tanggal: ${tglLabel(g.tanggal)}\n` +
    `Jam: ${g.jam.slice(0, 5)}${g.jam_selesai ? ` – ${g.jam_selesai.slice(0, 5)}` : ""}\n` +
    `Jumlah tamu: ${g.jumlah_tamu} orang\n` +
    `Meja: ${g.meja_label}\n` +
    (dp > 0 ? `Uang muka: ${rupiah(dp)}\n` : "")
  );
}

function linkMenu(g: Grup) {
  return g.share_token
    ? `\nPilih atau ubah menu untuk reservasi Anda di sini:\n${SITE_URL}/pesan/${g.share_token}\n`
    : "";
}

const LINK_TIKET = `\nUnduh tiket reservasi (masukkan nomor WhatsApp Anda):\n${SITE_URL}/cek-reservasi\n`;

export function pesanKonfirmasi(g: Grup, dp: number) {
  return (
    `Halo ${g.nama_tamu}, reservasi Anda di Yassalam Arabian Resto ${outletLabel(g.outlet)} sudah *TERKONFIRMASI* ✅\n\n` +
    detailBlok(g, dp) +
    linkMenu(g) +
    LINK_TIKET +
    `\nSampai jumpa di Yassalam 🙏`
  );
}

export function pesanLink(g: Grup) {
  return (
    `Halo ${g.nama_tamu}, berikut link untuk reservasi Anda di Yassalam Arabian Resto ${outletLabel(g.outlet)}:\n\n` +
    detailBlok(g, g.dp_amount) +
    (g.status === "Pending" ? `Status: menunggu konfirmasi uang muka\n` : "") +
    linkMenu(g) +
    LINK_TIKET +
    `\nTerima kasih 🙏`
  );
}

export function pesanBatal(g: Grup) {
  return (
    `Halo ${g.nama_tamu}, reservasi Anda pada ${tglLabel(g.tanggal)} jam ${g.jam.slice(0, 5)} di Yassalam Arabian Resto ${outletLabel(g.outlet)} telah dibatalkan.\n\n` +
    `Jika ini tidak sesuai atau Anda ingin menjadwalkan ulang, silakan hubungi kami.\n\nTerima kasih 🙏`
  );
}