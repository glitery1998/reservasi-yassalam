import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const BUCKET = "bukti-transfer";
export const MAX_BUKTI_BYTES = 4 * 1024 * 1024;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Deteksi tipe gambar dari byte awal file (bukan dari nama/Content-Type yang bisa dipalsukan). */
function detectImage(buf: Uint8Array): { ext: string; mime: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return { ext: "webp", mime: "image/webp" };
  return null;
}

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (data) return;
  // Private: bukti transfer hanya boleh dibuka admin lewat signed URL.
  await supabaseAdmin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BUKTI_BYTES });
}

/** Validasi + simpan bukti transfer. Mengembalikan path, atau pesan error untuk ditampilkan ke customer. */
export async function simpanBukti(file: File): Promise<{ path: string } | { error: string }> {
  if (file.size === 0 || file.size > MAX_BUKTI_BYTES) return { error: "Ukuran file bukti transfer maksimal 4 MB" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImage(bytes);
  if (!kind) return { error: "Bukti transfer harus berupa gambar JPG, PNG, atau WEBP" };

  await ensureBucket();
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${kind.ext}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (error) return { error: "Gagal mengunggah bukti transfer. Coba lagi." };
  return { path };
}

/** Dipakai hanya untuk membersihkan unggahan yatim kalau penyimpanan reservasi gagal. */
export async function hapusBukti(path: string) {
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}
