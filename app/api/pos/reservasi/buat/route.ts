import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  DATE_RE,
  OUTLETS,
  TIME_RE,
  addMinutes,
  findKonflik,
  keyValid,
  logActivity,
  nowMinutesJakarta,
  normalizeWhatsapp,
  sendWhatsapp,
  supabaseAdmin,
  toMinutes,
  todayJakarta,
} from "../../_shared";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "https://www.yassalamresto.co.id";

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Data tidak terbaca" }, { status: 400 });

  const outlet = String(body.outlet || "");
  const tanggal = String(body.tanggal || "");
  const jam = String(body.jam || "").slice(0, 5);
  const namaTamu = String(body.nama_tamu || "").trim();
  const noWa = String(body.no_whatsapp || "").replace(/[^0-9]/g, "");
  const jumlahTamu = Number(body.jumlah_tamu);
  const catatan = body.catatan ? String(body.catatan).trim() : null;
  const mejaIds: number[] = Array.isArray(body.meja_ids) ? body.meja_ids.map(Number) : [];
  const gabunganNama = body.gabungan_nama ? String(body.gabungan_nama) : "Gabungan";
  const dp = Number(body.dp_amount) || 0;
  const dibuatOleh = String(body.dibuat_oleh || "").trim();
  const force = body.force === true;

  if (!OUTLETS.includes(outlet)) return NextResponse.json({ error: "Outlet tidak valid" }, { status: 400 });
  if (!DATE_RE.test(tanggal) || !TIME_RE.test(jam)) {
    return NextResponse.json({ error: "Tanggal atau jam tidak valid" }, { status: 400 });
  }
  if (namaTamu.length < 2) return NextResponse.json({ error: "Isi nama tamu" }, { status: 400 });
  if (noWa.length < 10 || noWa.length > 15) {
    return NextResponse.json({ error: "Nomor WhatsApp harus 10-15 digit" }, { status: 400 });
  }
  if (!Number.isInteger(jumlahTamu) || jumlahTamu < 1 || jumlahTamu > 200) {
    return NextResponse.json({ error: "Jumlah tamu tidak valid" }, { status: 400 });
  }
  if (mejaIds.length < 1 || mejaIds.length > 6 || !mejaIds.every((n) => Number.isInteger(n))) {
    return NextResponse.json({ error: "Pilih 1 sampai 6 meja" }, { status: 400 });
  }
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });
  if (dp < 0 || dp > 100000000) return NextResponse.json({ error: "Jumlah DP tidak valid" }, { status: 400 });

  const today = todayJakarta();
  if (tanggal < today) return NextResponse.json({ error: "Tanggal sudah lewat" }, { status: 400 });
  if (tanggal === today && toMinutes(jam) < nowMinutesJakarta()) {
    return NextResponse.json({ error: "Jam mulai sudah lewat untuk hari ini" }, { status: 400 });
  }

  const jsParam = body.jam_selesai ? String(body.jam_selesai) : "";
  const jamSelesai = TIME_RE.test(jsParam) ? jsParam.slice(0, 5) : addMinutes(jam, 120);

  // Pastikan semua meja memang milik outlet ini
  const { data: mejaRows } = await supabaseAdmin
    .from("Tables")
    .select("Id, nomor_meja, nama_meja")
    .in("Id", mejaIds)
    .eq("outlet", outlet);
  const mejaList = (mejaRows || []) as { Id: number; nomor_meja: number; nama_meja: string | null }[];
  if (mejaList.length !== new Set(mejaIds).size) {
    return NextResponse.json({ error: "Ada meja yang bukan milik outlet ini" }, { status: 400 });
  }

  const konflik = await findKonflik(mejaIds, tanggal, jam, jamSelesai);
  if (konflik.length > 0 && !force) {
    return NextResponse.json({ error: "Bentrok dengan booking lain", konflik }, { status: 409 });
  }

  const token = randomUUID();
  const status = dp > 0 ? "Confirmed" : "Pending";

  const base = {
    nama_tamu: namaTamu,
    no_whatsapp: noWa,
    outlet,
    tanggal,
    jam,
    jam_selesai: jamSelesai,
    jumlah_tamu: jumlahTamu,
    status,
    share_token: token,
    menu_finalized: false,
  };

  const { data: primary, error: primaryError } = await supabaseAdmin
    .from("Reservation")
    .insert({
      ...base,
      catatan,
      meja_id: mejaIds[0],
      dp_amount: dp > 0 ? dp : null,
      ...(dp > 0 ? { dp_status: "sudah_bayar" } : {}),
    })
    .select("Id")
    .single();

  if (primaryError || !primary) {
    return NextResponse.json({ error: "Gagal menyimpan reservasi" }, { status: 500 });
  }

  const ids: number[] = [primary.Id];

  if (mejaIds.length > 1) {
    const { data: extras, error: extraError } = await supabaseAdmin
      .from("Reservation")
      .insert(
        mejaIds.slice(1).map((mid) => ({
          ...base,
          catatan: `[Gabungan: ${gabunganNama}]`,
          meja_id: mid,
          dp_amount: 0,
        }))
      )
      .select("Id");
    if (extraError || !extras) {
      await supabaseAdmin.from("Reservation").delete().eq("Id", primary.Id);
      return NextResponse.json({ error: "Gagal menyimpan meja gabungan" }, { status: 500 });
    }
    extras.forEach((e: { Id: number }) => ids.push(e.Id));
  }

  await logActivity(
    `${dibuatOleh} (POS)`,
    "Tambah reservasi manual (POS)",
    `${namaTamu} · ${tanggal} ${jam}${konflik.length > 0 ? " · bentrok dilewati" : ""}`
  );

  const mejaLabel = mejaIds
    .map((id) => mejaList.find((m) => m.Id === id))
    .map((m) => (m ? m.nama_meja || `Meja ${m.nomor_meja}` : ""))
    .filter(Boolean)
    .join(" + ");
  const outletLabel = outlet === "jogja" ? "Yogyakarta" : "Solo";

  const pesan =
    `Halo ${namaTamu}, reservasi Anda di Yassalam Arabian Resto ${outletLabel} sudah kami catat ✅\n\n` +
    `Tanggal: ${tanggal.split("-").reverse().join("/")}\n` +
    `Jam: ${jam} – ${jamSelesai}\n` +
    `Jumlah tamu: ${jumlahTamu} orang\n` +
    `Meja: ${mejaLabel}\n` +
    (dp > 0
      ? `Uang muka: ${rupiah(dp)}\n`
      : `Status: menunggu konfirmasi uang muka\n`) +
    `\nPilih menu untuk reservasi Anda di sini:\n${SITE_URL}/pesan/${token}\n` +
    `\nUnduh tiket reservasi (masukkan nomor WhatsApp Anda):\n${SITE_URL}/cek-reservasi\n` +
    `\nTerima kasih 🙏`;

  const waSent = await sendWhatsapp(normalizeWhatsapp(noWa), pesan);

  return NextResponse.json({ success: true, token, ids, status, wa_sent: waSent });
}