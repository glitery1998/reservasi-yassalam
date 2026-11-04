import { NextResponse } from "next/server";
import { expirePendingTransfer } from "../_expire-transfer";

export const dynamic = "force-dynamic";

/** Idempoten & aman dipanggil siapa saja: hanya membatalkan reservasi yang memang sudah lewat batas. */
export async function POST() {
  const expired = await expirePendingTransfer();
  return NextResponse.json({ expired });
}
