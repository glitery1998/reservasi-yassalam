import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeWhatsapp(nomor: string) {
  let n = (nomor || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("620")) n = "62" + n.slice(3);
  else if (!n.startsWith("62")) n = "62" + n;
  return n;
}

function formatJam(jam: string) {
  return (jam || "").slice(0, 5);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REMINDER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const target = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const windowStart = new Date(target.getTime() - 10 * 60 * 1000);
  const windowEnd = new Date(target.getTime() + 10 * 60 * 1000);

  const tanggalCandidates = Array.from(
    new Set([
      windowStart.toISOString().split("T")[0],
      windowEnd.toISOString().split("T")[0],
    ])
  );

  const { data: reservations, error } = await supabaseAdmin
    .from("Reservation")
    .select("*")
    .in("tanggal", tanggalCandidates)
    .eq("status", "Confirmed")
    .or("reminder_sent.is.null,reminder_sent.eq.false");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const r of reservations || []) {
    const [h, m] = (r.jam || "00:00").split(":").map(Number);
    const jadwal = new Date(`${r.tanggal}T00:00:00`);
    jadwal.setHours(h, m, 0, 0);

    if (jadwal >= windowStart && jadwal <= windowEnd) {
      const pesan =
        `Halo ${r.nama_tamu}, ini pengingat reservasi Anda di Yassalam Arabian Resto:\n` +
        `📅 ${r.tanggal}\n` +
        `🕐 ${formatJam(r.jam)}\n` +
        `👥 ${r.jumlah_tamu} orang\n\n` +
        `Ditunggu kedatangannya ya! 🙏`;

      try {
        const form = new FormData();
        form.append("target", normalizeWhatsapp(r.no_whatsapp));
        form.append("message", pesan);

        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: process.env.FONNTE_TOKEN! },
          body: form,
        });

        if (res.ok) {
          await supabaseAdmin.from("Reservation").update({ reminder_sent: true }).eq("Id", r.Id);
          sentCount++;
        } else {
          errors.push(`Gagal kirim ke ${r.nama_tamu}: ${res.status}`);
        }
      } catch (e) {
        errors.push(`Error ${r.nama_tamu}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  }

  return NextResponse.json({
    checked: reservations?.length || 0,
    sent: sentCount,
    errors,
  });
}