import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatJamSingkat(j?: string) {
  return (j || "").slice(0, 5);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const {
    namaTamu, noWhatsapp, outlet, tanggal, jam, jamSelesai,
    jumlahTamu, mejaLabel,
  } = body || {};

  if (!namaTamu || !outlet || !tanggal || !jam) {
    return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
  }

  // Nomor admin diambil dari AppSettings, diatur lewat tab Pengaturan di dashboard admin.
  const settingKey = outlet === "jogja" ? "admin_notif_wa_jogja" : "admin_notif_wa_solo";
  const { data: settingRow } = await supabaseAdmin
    .from("AppSettings")
    .select("value")
    .eq("key", settingKey)
    .maybeSingle();

  const nomorAdmin: string[] = (settingRow?.value || "")
    .split(",")
    .map((n: string) => n.trim())
    .filter(Boolean);

  if (nomorAdmin.length === 0) {
    // Bukan error fatal — cuma berarti admin belum set nomor WA untuk outlet ini.
    return NextResponse.json({ success: true, skipped: true, reason: "Belum ada nomor admin diset untuk outlet ini" });
  }

  const outletLabel = outlet === "jogja" ? "Yogyakarta" : "Solo";
  const pesan =
    `🔔 *Reservasi Baru Masuk!*\n\n` +
    `Nama: ${namaTamu}\n` +
    `Outlet: ${outletLabel}\n` +
    `Tanggal: ${tanggal}\n` +
    `Jam: ${formatJamSingkat(jam)}${jamSelesai ? ` – ${formatJamSingkat(jamSelesai)}` : ""}\n` +
    `Jumlah Tamu: ${jumlahTamu || "-"} orang\n` +
    `Meja: ${mejaLabel || "Belum ditentukan"}\n` +
    (noWhatsapp ? `No. WA Tamu: ${noWhatsapp}\n` : "") +
    `\nCek detail lengkap di Dashboard Admin.`;

  const results = await Promise.all(
    nomorAdmin.map(async (target) => {
      try {
        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            Authorization: process.env.FONNTE_TOKEN!,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ target, message: pesan }),
        });
        const json = await res.json().catch(() => null);
        return { target, ok: res.ok, response: json };
      } catch (err) {
        return { target, ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  return NextResponse.json({ success: true, results });
}