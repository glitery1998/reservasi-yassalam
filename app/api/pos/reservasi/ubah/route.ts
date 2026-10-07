import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  TIME_RE,
  DATE_RE,
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
import { loadGrup, parseIds } from "../../_pesan";
import type { Grup } from "../../_pesan";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "https://www.yassalamresto.co.id";

type RowDb = {
  Id: number;
  meja_id: number | null;
  catatan: string | null;
  menu_finalized: boolean | null;
};

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function tglLabel(t: string) {
  return t.split("-").reverse().join("/");
}

function outletLabel(o: string) {
  return o === "jogja" ? "Yogyakarta" : "Solo";
}

// Lama reservasi (menit), dipertahankan saat jam diubah
function durasiMenit(jam: string, selesai: string | null) {
  if (!selesai) return 120;
  let d = toMinutes(selesai) - toMinutes(jam);
  if (d <= 0) d += 24 * 60;
  return d;
}

function sameSet(a: number[], b: number[]) {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function pesanUbah(g: Grup) {
  const linkMenu = g.share_token
    ? `\nPilih atau ubah menu untuk reservasi Anda di sini:\n${SITE_URL}/pesan/${g.share_token}\n`
    : "";
  return (
    `Halo ${g.nama_tamu}, reservasi Anda di Yassalam Arabian Resto ${outletLabel(g.outlet)} telah *DIPERBARUI* ✏️\n\n` +
    `Tanggal: ${tglLabel(g.tanggal)}\n` +
    `Jam: ${g.jam.slice(0, 5)}${g.jam_selesai ? ` – ${g.jam_selesai.slice(0, 5)}` : ""}\n` +
    `Jumlah tamu: ${g.jumlah_tamu} orang\n` +
    `Meja: ${g.meja_label}\n` +
    (g.dp_amount > 0 ? `Uang muka: ${rupiah(g.dp_amount)}\n` : "") +
    linkMenu +
    `\nUnduh tiket reservasi (masukkan nomor WhatsApp Anda):\n${SITE_URL}/cek-reservasi\n` +
    `\nJika ada yang tidak sesuai, silakan hubungi kami.\n\nTerima kasih 🙏`
  );
}

export async function POST(request: Request) {
  if (!keyValid(request.headers.get("x-pos-key"))) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Data tidak terbaca" }, { status: 400 });

  const ids = parseIds(body.ids);
  const dibuatOleh = String(body.dibuat_oleh || "").trim();
  const force = body.force === true;
  const kirimWa = body.kirim_wa === true;

  if (!ids) return NextResponse.json({ error: "Daftar reservasi tidak valid" }, { status: 400 });
  if (!dibuatOleh) return NextResponse.json({ error: "Nama petugas wajib diisi" }, { status: 400 });

  const grup = await loadGrup(ids, false);
  if (!grup) return NextResponse.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (!["Pending", "Confirmed"].includes(grup.status)) {
    return NextResponse.json({ error: `Reservasi berstatus ${grup.status}, tidak bisa diubah` }, { status: 400 });
  }
  if (grup.checked_in) {
    return NextResponse.json(
      { error: "Tamu sudah ditandai hadir. Ubah lewat Orderan Berjalan." },
      { status: 400 }
    );
  }

  // ---- Nilai baru (yang tidak dikirim memakai nilai lama)
  const namaTamu = body.nama_tamu != null ? String(body.nama_tamu).trim() : grup.nama_tamu;
  const waInput = body.no_whatsapp != null ? String(body.no_whatsapp).replace(/[^0-9]/g, "") : null;
  const noWa = waInput != null ? waInput : grup.no_whatsapp;
  const jumlahTamu = body.jumlah_tamu != null ? Number(body.jumlah_tamu) : grup.jumlah_tamu;
  const tanggal = body.tanggal != null ? String(body.tanggal) : grup.tanggal;
  const jam = body.jam != null ? String(body.jam).slice(0, 5) : grup.jam.slice(0, 5);

  if (namaTamu.length < 2) return NextResponse.json({ error: "Isi nama tamu" }, { status: 400 });
  if (waInput != null && (waInput.length < 10 || waInput.length > 15)) {
    return NextResponse.json({ error: "Nomor WhatsApp harus 10-15 digit" }, { status: 400 });
  }
  if (!Number.isInteger(jumlahTamu) || jumlahTamu < 1 || jumlahTamu > 200) {
    return NextResponse.json({ error: "Jumlah tamu tidak valid" }, { status: 400 });
  }
  if (!DATE_RE.test(tanggal) || !TIME_RE.test(jam)) {
    return NextResponse.json({ error: "Tanggal atau jam tidak valid" }, { status: 400 });
  }

  // ---- Baris reservasi (satu baris per meja)
  const { data: rowData, error: rowError } = await supabaseAdmin
    .from("Reservation")
    .select("Id, meja_id, catatan, menu_finalized")
    .in("Id", grup.ids)
    .order("Id", { ascending: true });
  if (rowError || !rowData || rowData.length === 0) {
    return NextResponse.json({ error: "Gagal membaca data reservasi" }, { status: 500 });
  }
  const rows = rowData as RowDb[];
  const mejaLama = rows.map((r) => r.meja_id).filter((x): x is number => x != null);

  // ---- Meja
  let mejaBaru = mejaLama;
  if (body.meja_ids != null) {
    if (!Array.isArray(body.meja_ids)) {
      return NextResponse.json({ error: "Daftar meja tidak valid" }, { status: 400 });
    }
    const list: number[] = Array.from(new Set<number>(body.meja_ids.map(Number)));
    if (list.length < 1 || list.length > 6 || !list.every((n) => Number.isInteger(n))) {
      return NextResponse.json({ error: "Pilih 1 sampai 6 meja" }, { status: 400 });
    }
    mejaBaru = list;
  }
  if (mejaBaru.length === 0) {
    return NextResponse.json({ error: "Reservasi harus punya minimal satu meja" }, { status: 400 });
  }
  const mejaDiganti = !sameSet(mejaBaru, mejaLama);

  if (mejaDiganti) {
    const { data: mejaRows } = await supabaseAdmin
      .from("Tables")
      .select("Id")
      .in("Id", mejaBaru)
      .eq("outlet", grup.outlet);
    if ((mejaRows || []).length !== mejaBaru.length) {
      return NextResponse.json({ error: "Ada meja yang bukan milik outlet ini" }, { status: 400 });
    }
  }

  // ---- Waktu
  const waktuDiganti = tanggal !== grup.tanggal || jam !== grup.jam.slice(0, 5);
  if (waktuDiganti) {
    const today = todayJakarta();
    if (tanggal < today) return NextResponse.json({ error: "Tanggal sudah lewat" }, { status: 400 });
    if (tanggal === today && toMinutes(jam) < nowMinutesJakarta()) {
      return NextResponse.json({ error: "Jam mulai sudah lewat untuk hari ini" }, { status: 400 });
    }
  }
  const durasi = durasiMenit(grup.jam, grup.jam_selesai);
  const jamSelesaiBaru = waktuDiganti ? addMinutes(jam, durasi) : null;
  const jamSelesaiFinal = jamSelesaiBaru ?? (grup.jam_selesai ? grup.jam_selesai.slice(0, 5) : null);

  // ---- Bentrok (booking milik reservasi ini sendiri diabaikan)
  let konflikDilewati = false;
  if (waktuDiganti || mejaDiganti) {
    const konflik = await findKonflik(
      mejaBaru,
      tanggal,
      jam,
      jamSelesaiFinal ?? addMinutes(jam, 120),
      grup.ids
    );
    if (konflik.length > 0) {
      if (!force) {
        return NextResponse.json({ error: "Bentrok dengan booking lain", konflik }, { status: 409 });
      }
      konflikDilewati = true;
    }
  }

  // ---- Ringkasan perubahan
  const ringkasan: string[] = [];
  if (namaTamu !== grup.nama_tamu) ringkasan.push(`nama ${grup.nama_tamu} → ${namaTamu}`);
  if (noWa !== grup.no_whatsapp) ringkasan.push("nomor WA diubah");
  if (jumlahTamu !== grup.jumlah_tamu) ringkasan.push(`tamu ${grup.jumlah_tamu} → ${jumlahTamu}`);
  if (tanggal !== grup.tanggal) ringkasan.push(`tanggal ${grup.tanggal} → ${tanggal}`);
  if (jam !== grup.jam.slice(0, 5)) ringkasan.push(`jam ${grup.jam.slice(0, 5)} → ${jam}`);
  if (mejaDiganti) ringkasan.push("meja diubah");

  if (ringkasan.length === 0) {
    return NextResponse.json({ success: true, ids: grup.ids, wa_sent: null, tidak_ada_perubahan: true });
  }

  const shared: Record<string, unknown> = {
    nama_tamu: namaTamu,
    no_whatsapp: noWa,
    jumlah_tamu: jumlahTamu,
    tanggal,
    jam,
    ...(jamSelesaiBaru ? { jam_selesai: jamSelesaiBaru } : {}),
  };

  const nLama = rows.length;
  const nBaru = mejaBaru.length;
  const perluTambah = mejaDiganti && nBaru > nLama;
  const gabunganNama = body.gabungan_nama ? String(body.gabungan_nama).slice(0, 100) : "Gabungan";

  // Reservasi lama dari admin bisa belum punya token; beri supaya baris tambahan tetap satu kelompok
  let token = grup.share_token;
  if (perluTambah && !token) {
    token = randomUUID();
    const { error } = await supabaseAdmin.from("Reservation").update({ share_token: token }).in("Id", grup.ids);
    if (error) return NextResponse.json({ error: "Gagal menyiapkan data meja" }, { status: 500 });
  }

  // 1. Baris tambahan kalau mejanya bertambah
  const tambahanIds: number[] = [];
  if (perluTambah) {
    const base = {
      outlet: grup.outlet,
      status: grup.status,
      share_token: token,
      menu_finalized: rows[0].menu_finalized ?? false,
      ...shared,
      jam_selesai: jamSelesaiFinal ?? addMinutes(jam, 120),
    };
    const extras = mejaBaru.slice(nLama).map((mid) => ({
      ...base,
      catatan: `[Gabungan: ${gabunganNama}]`,
      meja_id: mid,
      dp_amount: 0,
    }));
    const { data: inserted, error } = await supabaseAdmin.from("Reservation").insert(extras).select("Id");
    if (error || !inserted) {
      return NextResponse.json({ error: "Gagal menambah meja" }, { status: 500 });
    }
    (inserted as { Id: number }[]).forEach((e) => tambahanIds.push(e.Id));
  }

  // 2. Perbarui baris yang sudah ada (data bersama + meja)
  for (let i = 0; i < nLama && i < nBaru; i++) {
    const row = rows[i];
    const patch: Record<string, unknown> = { ...shared };
    if (mejaDiganti) patch.meja_id = mejaBaru[i];
    if (mejaDiganti && i >= 1 && (row.catatan == null || /^\[Gabungan:/.test(row.catatan))) {
      patch.catatan = `[Gabungan: ${gabunganNama}]`;
    }
    const { error } = await supabaseAdmin.from("Reservation").update(patch).eq("Id", row.Id);
    if (error) {
      if (tambahanIds.length > 0) {
        await supabaseAdmin.from("Reservation").delete().in("Id", tambahanIds);
      }
      return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
    }
  }

  // 3. Hapus baris meja yang tidak dipakai lagi (menu yang menempel dipindah ke baris utama)
  const hapusIds = nBaru < nLama ? rows.slice(nBaru).map((r) => r.Id) : [];
  if (hapusIds.length > 0) {
    await supabaseAdmin
      .from("ReservationMenuItem")
      .update({ reservation_id: grup.primaryId })
      .in("reservation_id", hapusIds);
    const { error } = await supabaseAdmin.from("Reservation").delete().in("Id", hapusIds);
    if (error) {
      return NextResponse.json(
        { error: "Perubahan tersimpan, tetapi baris meja lama gagal dihapus. Cek reservasi di daftar." },
        { status: 500 }
      );
    }
  }

  const finalIds = rows
    .slice(0, nBaru)
    .map((r) => r.Id)
    .concat(tambahanIds);

  await logActivity(
    `${dibuatOleh} (POS)`,
    "Ubah reservasi (POS)",
    `${grup.nama_tamu} (${grup.tanggal} ${grup.jam.slice(0, 5)}) · ${ringkasan.join("; ")}${
      konflikDilewati ? " · bentrok dilewati" : ""
    }`
  );

  let waSent: boolean | null = null;
  if (kirimWa && noWa) {
    const baru = await loadGrup(finalIds);
    waSent = baru ? await sendWhatsapp(normalizeWhatsapp(noWa), pesanUbah(baru)) : false;
  }

  return NextResponse.json({ success: true, ids: finalIds, wa_sent: waSent });
}
