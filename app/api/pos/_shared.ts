import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const OUTLETS = ["solo", "jogja"];
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function keyValid(provided: string | null) {
  const expected = process.env.POS_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function toMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(jam: string, minutes: number) {
  const total = (toMinutes(jam) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function todayJakarta() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function nowMinutesJakarta() {
  const t = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  return toMinutes(t);
}

export function normalizeWhatsapp(nomor: string) {
  let n = (nomor || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("620")) n = "62" + n.slice(3);
  else if (!n.startsWith("62")) n = "62" + n;
  return n;
}

export async function sendWhatsapp(target: string, message: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message }),
    });
    const json = await res.json().catch(() => null);
    return res.ok && json?.status !== false;
  } catch {
    return false;
  }
}

export async function logActivity(nama: string, action: string, detail: string) {
  await supabaseAdmin
    .from("ActivityLog")
    .insert({ admin_email: null, admin_nama: nama, action, detail });
}

export type Konflik = { meja_id: number; nama_tamu: string; jam: string; jam_selesai: string | null };

// Booking aktif (Pending/Confirmed) + hold tamu online yang jamnya beririsan
export async function findKonflik(
  mejaIds: number[],
  tanggal: string,
  jam: string,
  jamSelesai: string,
  ignoreIds: number[] = []
): Promise<Konflik[]> {
  if (mejaIds.length === 0) return [];
  const start = toMinutes(jam);
  let end = toMinutes(jamSelesai);
  if (end <= start) end += 24 * 60;

  const overlaps = (j: string, js: string | null) => {
    const s = toMinutes(j);
    let e = js ? toMinutes(js) : s + 120;
    if (e <= s) e += 24 * 60;
    return start < e && end > s;
  };

  const result: Konflik[] = [];

  const { data: resData } = await supabaseAdmin
    .from("Reservation")
    .select("Id, meja_id, nama_tamu, jam, jam_selesai")
    .in("meja_id", mejaIds)
    .eq("tanggal", tanggal)
    .in("status", ["Pending", "Confirmed"]);
  (resData || []).forEach((r: { Id: number; meja_id: number; nama_tamu: string; jam: string; jam_selesai: string | null }) => {
    if (ignoreIds.includes(r.Id)) return;
    if (overlaps(r.jam, r.jam_selesai)) {
      result.push({ meja_id: r.meja_id, nama_tamu: r.nama_tamu, jam: r.jam, jam_selesai: r.jam_selesai });
    }
  });

  const { data: holdData } = await supabaseAdmin
    .from("BookingHold")
    .select("meja_id, jam, jam_selesai")
    .in("meja_id", mejaIds)
    .eq("tanggal", tanggal)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  (holdData || []).forEach((h: { meja_id: number; jam: string; jam_selesai: string | null }) => {
    if (overlaps(h.jam, h.jam_selesai)) {
      result.push({ meja_id: h.meja_id, nama_tamu: "Sedang di-hold tamu online", jam: h.jam, jam_selesai: h.jam_selesai });
    }
  });

  return result;
}