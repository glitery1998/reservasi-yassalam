"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../supabase";
import type { Session } from "@supabase/supabase-js";

type Reservation = {
  Id: number; created_at: string; nama_tamu: string; no_whatsapp: string;
  outlet: string; tanggal: string; jam: string; jam_selesai: string; jumlah_tamu: number;
  catatan: string | null; status: string; meja_id: number | null;
  menu_paket_id: number | null; dp_amount: number | null;
  share_token: string | null; menu_finalized: boolean | null;
  checked_in_at: string | null;
};
type ReservationMenuItemT = {
  Id: number; reservation_id: number; menu_id: number; varian_id: number | null; addon_ids: number[];
  jumlah_porsi: number; harga_satuan: number; subtotal: number; catatan: string | null; nama_pemesan: string | null;
};
type Area = {
  Id: number; outlet: string; nama: string; slug: string;
  deskripsi: string | null; kapasitas_max: number; foto_url: string | null; urutan: number;
};
type TableData = {
  Id: number; outlet: string; nomor_meja: number; nama_meja: string | null;
  kapasitas: number; posisi: string; status: string;
  foto_url: string | null; dp_minimum: number | null;
  kapasitas_minimum: number | null; minimum_transaksi: number | null;
  deskripsi: string | null;
};
type BookingHold = {
  Id: number; created_at: string; meja_id: number; tanggal: string;
  jam: string; jam_selesai: string; session_id: string;
  expires_at: string; status: string;
};
type MejaGabungan = {
  Id: number; created_at: string; outlet: string; nama: string;
  deskripsi: string | null; meja_ids: number[]; kapasitas_total: number;
  kapasitas_minimum: number | null; dp_minimum: number | null;
  minimum_transaksi: number | null; foto_url: string | null; aktif: boolean;
};
type MenuKategori = {
  Id: number; outlet: string; nama: string; urutan: number; aktif: boolean;
};
type MenuItem = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
  kategori_id: number | null; foto_url: string | null; urutan: number;
  aktif: boolean; punya_varian: boolean;
};
type MenuVarian = {
  Id: number; menu_id: number; nama: string; harga_tambahan: number;
  urutan: number; aktif: boolean;
};
type MenuAddon = {
  Id: number; menu_id: number; nama: string; harga_tambahan: number;
  urutan: number; aktif: boolean;
};
type ActivityLogT = {
  Id: number; created_at: string; admin_email: string | null; admin_nama: string | null;
  action: string; detail: string | null;
};
type AdminUser = {
  id: string; email: string; nama: string | null;
  role: string; outlet: string | null; aktif: boolean; created_at: string;
};
type LiburOutlet = {
  Id: number; created_at: string; outlet: string;
  tanggal_mulai: string; tanggal_selesai: string; alasan: string | null;
};

function AreaCardImage({ area, tables }: { area: Area; tables: TableData[] }) {
  const photos = tables.filter((t) => t.outlet === area.outlet && t.posisi === area.slug && t.foto_url).map((t) => t.foto_url as string);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);
  if (photos.length === 0) return (
    <div className="w-full h-full bg-gradient-to-br from-[#E5DDD4] to-[#D4C4A8] flex flex-col items-center justify-center gap-2">
      <span className="text-3xl text-[#5C1420]/30">📷</span>
      <span className="text-xs text-[#9A8B7A]">Belum ada foto</span>
    </div>
  );
  return <>
    {photos.map((url, i) => (
      <Image key={url} src={url} alt={area.nama} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
    {photos.length > 1 && (
      <div className="absolute bottom-3 right-3 flex gap-1 z-10">
        {photos.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />)}
      </div>
    )}
  </>;
}

function GabunganCardImage({ gabungan, tables }: { gabungan: MejaGabungan; tables: TableData[] }) {
  const photos = (gabungan.meja_ids || [])
    .map((id) => tables.find((t) => t.Id === id)?.foto_url)
    .filter((url): url is string => !!url);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);
  if (photos.length === 0) return (
    <div className="w-full h-full bg-gradient-to-br from-[#E5DDD4] to-[#D4C4A8] flex flex-col items-center justify-center gap-1">
      <span className="text-2xl text-[#5C1420]/30">📷</span>
      <span className="text-[10px] text-[#9A8B7A]">Belum ada foto meja</span>
    </div>
  );
  return <>
    {photos.map((url, i) => (
      <Image key={url} src={url} alt={gabungan.nama} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
    {photos.length > 1 && (
      <div className="absolute bottom-2 right-2 flex gap-1 z-10">
        {photos.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />)}
      </div>
    )}
  </>;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas tidak didukung")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error("Gagal")); }, "image/jpeg", quality);
    };
    img.onerror = reject; img.src = url;
  });
}

/* ========== LOGIN SCREEN ========== */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onLogin();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotSending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setForgotSending(false);
    if (err) { setForgotError(err.message); return; }
    setForgotSent(true);
  }

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Panel kiri — branding */}
        <div className="md:flex-1 bg-[#3D0D14] flex flex-col items-center justify-center text-center px-8 py-12 md:py-0">
          <Image src="/logo.PNG" alt="Yassalam" width={72} height={72} className="mb-5" />
          <p className="font-serif text-2xl text-[#F5EBD8] tracking-[0.2em]">YASSALAM</p>
          <p className="text-[10px] text-[#C8973E] tracking-[0.3em] uppercase mt-1.5">Arabian Resto &amp; Catering</p>
          <div className="w-8 h-px bg-[#C8973E] my-6" />
          <p className="text-sm text-[#B89A85] max-w-[220px] leading-relaxed">Kelola reservasi dan operasional resto dari satu tempat.</p>
        </div>

        {/* Panel kanan — form login */}
        <div className="md:flex-1 bg-white flex flex-col justify-center px-8 py-10 sm:px-12">
          <h1 className="font-serif text-2xl text-[#3D2E1E] mb-1">Admin Login</h1>
          <p className="text-sm text-[#9A8B7A] mb-7">Masuk untuk mengelola reservasi Yassalam.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-[#9A8B7A] tracking-[0.1em] uppercase mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@yassalam.com"
                className="w-full h-11 px-4 rounded-lg border border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9A8B7A] tracking-[0.1em] uppercase mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full h-11 px-4 rounded-lg border border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-[#5C1420] text-[#F5EBD8] text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]">
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>

          <button onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); setForgotError(""); }}
            className="text-center text-[#9A8B7A] text-xs mt-4 hover:text-[#5C1420] underline underline-offset-2 w-full">
            Lupa password?
          </button>

          <p className="text-center text-[#C4B9AB] text-xs mt-8">© 2026 Yassalam Arabian Resto &amp; Catering</p>
        </div>
      </div>

      {showForgot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowForgot(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {forgotSent ? (
              <div className="text-center">
                <p className="text-3xl mb-3">📧</p>
                <h3 className="text-lg font-bold text-[#3D2E1E] font-serif">Email Terkirim</h3>
                <p className="text-sm text-[#9A8B7A] mt-2 leading-relaxed">Cek inbox <span className="font-semibold text-[#5C1420]">{forgotEmail}</span> untuk link reset password. Jangan lupa cek folder spam kalau tidak muncul.</p>
                <button onClick={() => setShowForgot(false)} className="w-full h-11 rounded-lg bg-[#5C1420] text-white text-sm font-semibold mt-6">Tutup</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h3 className="text-lg font-bold text-[#3D2E1E] font-serif">Reset Password</h3>
                <p className="text-sm text-[#9A8B7A] mt-1 mb-4">Masukkan email akun admin kamu, kami kirim link reset password.</p>
                {forgotError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center mb-3">{forgotError}</div>}
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder="admin@yassalam.com"
                  className="w-full h-11 px-4 rounded-lg border border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] transition-all" />
                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={() => setShowForgot(false)} className="flex-1 h-11 rounded-lg border border-[#E5DDD4] text-[#9A8B7A] text-sm font-semibold">Batal</button>
                  <button type="submit" disabled={forgotSending} className="flex-1 h-11 rounded-lg bg-[#5C1420] text-white text-sm font-semibold disabled:opacity-50">{forgotSending ? "Mengirim..." : "Kirim Link"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== SCAN TIKET (QR check-in) ========== */
type ScanFoundRow = {
  Id: number; nama_tamu: string; outlet: string; tanggal: string; jam: string; jam_selesai: string;
  jumlah_tamu: number; status: string; meja_id: number | null; checked_in_at: string | null;
};
function ScanTiketPanel({
  lockedOutlet, formatJam, getMejaLabel, tandaiHadirByToken,
}: {
  lockedOutlet: string | null;
  formatJam: (j: string) => string;
  getMejaLabel: (id: number) => string;
  tandaiHadirByToken: (token: string, namaTamu: string, tanggal: string, jam: string) => Promise<void>;
}) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [looking, setLooking] = useState(false);
  const [resultPopup, setResultPopup] = useState<{
    kind: "success" | "already" | "blocked" | "notfound" | "wrongoutlet";
    namaTamu?: string; jam?: string; jamSelesai?: string; mejaLabel?: string; status?: string;
  } | null>(null);
  const scannerRef = useRef<{ pause: (a?: boolean) => void; resume: () => void; stop: () => Promise<void>; clear: () => void } | null>(null);
  const busyRef = useRef(false);

  async function handleDecoded(decodedText: string) {
    const m = decodedText.match(/^YSL-CHECKIN:(.+)$/);
    const token = m ? m[1] : decodedText.trim();
    setLooking(true);
    const { data } = await supabase.from("Reservation")
      .select("Id, nama_tamu, outlet, tanggal, jam, jam_selesai, jumlah_tamu, status, meja_id, checked_in_at")
      .eq("share_token", token);
    setLooking(false);

    if (!data || data.length === 0) { setResultPopup({ kind: "notfound" }); return; }
    const rows = data as ScanFoundRow[];
    const r = rows[0];

    if (lockedOutlet && r.outlet !== lockedOutlet) { setResultPopup({ kind: "wrongoutlet", namaTamu: r.nama_tamu }); return; }

    const mejaLabel = rows.map((rr) => (rr.meja_id ? getMejaLabel(rr.meja_id) : "—")).join(" + ");
    const base = { namaTamu: r.nama_tamu, jam: r.jam, jamSelesai: r.jam_selesai, mejaLabel };

    if (r.checked_in_at) { setResultPopup({ kind: "already", ...base }); return; }
    if (r.status !== "Confirmed") { setResultPopup({ kind: "blocked", ...base, status: r.status }); return; }

    // Langsung konfirmasi hadir otomatis, gak perlu klik tombol lagi
    await tandaiHadirByToken(token, r.nama_tamu, r.tanggal, r.jam);
    setResultPopup({ kind: "success", ...base });
  }

  useEffect(() => {
    if (!cameraStarted) return;
    let cancelled = false;
    let didStart = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("scan-tiket-region");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText: string) => {
            if (busyRef.current) return;
            busyRef.current = true;
            try { scannerRef.current?.pause(true); } catch { /* noop */ }
            await handleDecoded(decodedText);
            busyRef.current = false;
          },
          () => { /* frame tanpa QR, biarkan */ }
        );
        didStart = true;
        setCameraError(null);
      } catch (e) {
        setCameraError(e instanceof Error ? e.message : "Gagal mengakses kamera. Pastikan izin kamera diaktifkan di browser lalu muat ulang halaman.");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (!s) return;
      if (didStart) {
        // Kamera sempat jalan → aman untuk di-stop
        s.stop().catch(() => {}).finally(() => { try { s.clear(); } catch { /* noop */ } });
      } else {
        // Kamera gak pernah berhasil jalan (izin ditolak dll) → stop() akan error, cukup clear
        try { s.clear(); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, cameraStarted]);

  function scanLagi() {
    setResultPopup(null);
    try { scannerRef.current?.resume(); } catch { /* noop */ }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Scan Tiket Reservasi</h2>
        <p className="text-[#9A8B7A] text-sm mt-1">Arahkan kamera ke QR code di tiket customer untuk menandai kehadiran otomatis</p>
      </div>

      <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-4 overflow-hidden">
        {!cameraStarted ? (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#F9F6F2] border-2 border-[#5C1420]/15 flex items-center justify-center mb-4">
              <span className="text-3xl">📷</span>
            </div>
            <p className="text-[#9A8B7A] text-sm mb-4 max-w-xs">Kamera belum aktif. Klik tombol di bawah untuk mulai scan tiket customer.</p>
            <button onClick={() => setCameraStarted(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20">
              Buka Kamera
            </button>
          </div>
        ) : (
          <>
            <div id="scan-tiket-region" className="rounded-xl overflow-hidden" />
            {cameraError && (
              <div className="text-center mt-3">
                <p className="text-red-500 text-sm">⚠ {cameraError}</p>
                <button onClick={() => setRetryKey((k) => k + 1)} className="mt-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Coba Lagi</button>
              </div>
            )}
          </>
        )}
      </div>

      {looking && <p className="text-center text-[#9A8B7A] text-sm mt-4">Memverifikasi tiket...</p>}

      {resultPopup && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={scanLagi}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`px-6 py-7 text-center bg-gradient-to-r ${
              resultPopup.kind === "success" ? "from-emerald-500 to-emerald-600"
              : resultPopup.kind === "already" ? "from-[#C8973E] to-[#A67B2E]"
              : resultPopup.kind === "blocked" ? "from-amber-500 to-amber-600"
              : resultPopup.kind === "wrongoutlet" ? "from-amber-500 to-amber-600"
              : "from-red-500 to-red-600"
            }`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">
                  {resultPopup.kind === "success" ? "✓" : resultPopup.kind === "already" ? "ℹ" : resultPopup.kind === "notfound" ? "✕" : "⚠"}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg font-serif">
                {resultPopup.kind === "success" ? "Kehadiran Dikonfirmasi"
                  : resultPopup.kind === "already" ? "Sudah Pernah Discan"
                  : resultPopup.kind === "blocked" ? "Belum Bisa Dikonfirmasi"
                  : resultPopup.kind === "wrongoutlet" ? "Reservasi Outlet Lain"
                  : "QR Tidak Dikenali"}
              </h3>
            </div>
            <div className="p-6 text-center">
              {resultPopup.kind === "notfound" && (
                <p className="text-[#8B7355] text-sm">Reservasi dengan kode ini tidak ditemukan di sistem.</p>
              )}
              {resultPopup.kind === "wrongoutlet" && (
                <p className="text-[#8B7355] text-sm">Tiket atas nama <span className="font-bold text-[#3D2E1E]">{resultPopup.namaTamu}</span> ini bukan untuk outlet Anda.</p>
              )}
              {resultPopup.kind === "blocked" && (
                <p className="text-[#8B7355] text-sm">Status reservasi <span className="font-bold text-[#3D2E1E]">{resultPopup.status}</span>, bukan &quot;Confirmed&quot;, jadi belum bisa dikonfirmasi hadir.</p>
              )}
              {(resultPopup.kind === "success" || resultPopup.kind === "already" || resultPopup.kind === "blocked") && resultPopup.namaTamu && (
                <div className="bg-[#F9F6F2] border border-[#E5DDD4] rounded-2xl p-4 mt-4 text-left space-y-1.5">
                  <p className="font-bold text-[#3D2E1E] text-base font-serif">{resultPopup.namaTamu}</p>
                  <p className="text-[#9A8B7A] text-sm">🪑 Meja {resultPopup.mejaLabel} &nbsp;·&nbsp; 🕐 {formatJam(resultPopup.jam || "")}–{formatJam(resultPopup.jamSelesai || "")}</p>
                  {resultPopup.kind === "success" && <p className="text-emerald-600 text-sm font-semibold pt-1">✓ Tercatat hadir barusan</p>}
                  {resultPopup.kind === "already" && <p className="text-[#C8973E] text-sm font-semibold pt-1">Sudah ditandai hadir sebelumnya</p>}
                </div>
              )}
              <button onClick={scanLagi}
                className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold text-sm transition-all active:scale-[0.98]">
                Scan Tiket Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  /* ========== AUTH STATE ========== */
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myOutlet, setMyOutlet] = useState<string | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (!showWelcome) return;
    const t = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(t);
  }, [showWelcome]);

  
  const isSuper = myRole === "superadmin";
  const isManajer = myRole === "manajer_outlet";
  const isElevated = isSuper || isManajer;
  const lockedOutlet = isSuper ? null : myOutlet;

  const [myNama, setMyNama] = useState<string | null>(null);

  useEffect(() => {
    if (!showWelcome) { hasSpokenRef.current = false; return; }
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    const audio = new Audio("/ucapan.mp3");
    audio.volume = 0.8;
    audio.play().catch(() => {});
  }, [showWelcome]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("AdminProfile")
      .select("role, outlet, aktif, nama").eq("id", userId).maybeSingle();
    if (error) { console.error("Gagal memuat AdminProfile:", error.message); }
    if (!data || !data.aktif) { setProfileError(true); setMyRole(null); setMyOutlet(null); return; }
    setProfileError(false); setMyRole(data.role); setMyOutlet(data.outlet); setMyNama(data.nama);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setMyRole(null); setMyOutlet(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);
function validatePasswordStrength(password: string): string | null {
    if (password.length < 10) return "Password minimal 10 karakter";
    if (!/[A-Z]/.test(password)) return "Password harus mengandung minimal 1 huruf besar";
    if (!/[0-9]/.test(password)) return "Password harus mengandung minimal 1 angka";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password harus mengandung minimal 1 simbol";
    return null;
  }

  async function changeMyPassword() {
    setChangePasswordError("");
    const pwErr0 = validatePasswordStrength(newPassword);
    if (pwErr0) { setChangePasswordError(pwErr0); return; }
    if (newPassword !== confirmPassword) { setChangePasswordError("Konfirmasi password baru tidak cocok"); return; }
    setChangingPassword(true);
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: session!.user.email!, password: oldPassword });
    if (verifyErr) { setChangingPassword(false); setChangePasswordError("Password lama salah"); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (updateErr) { setChangePasswordError(updateErr.message); return; }
    logActivity("Ubah password sendiri");
    setShowChangePassword(false);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  const [tab, setTab] = useState<"reservasi" | "scan" | "kalender" | "area" | "gabungan" | "menu" | "laporan" | "admin" | "log" | "pengaturan">("reservasi");
  const [openGroup, setOpenGroup] = useState<string>("operasional");
  function toggleGroup(key: string) {
    setOpenGroup((prev) => (prev === key ? "" : key));
  }
  const [kalSubTab, setKalSubTab] = useState<"harian" | "cari">("harian");
  const [drillArea, setDrillArea] = useState<Area | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [gabunganList, setGabunganList] = useState<MejaGabungan[]>([]);
  const [filterOutlet, setFilterOutlet] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showReservasiForm, setShowReservasiForm] = useState(false);
  const [editingReservasiId, setEditingReservasiId] = useState<number | null>(null);
  const [editingOriginalShareToken, setEditingOriginalShareToken] = useState<string | null>(null);
  const [rNama, setRNama] = useState("");
  const [rWhatsapp, setRWhatsapp] = useState("");
  const [rOutlet, setROutlet] = useState("solo");
  const [rTanggal, setRTanggal] = useState("");
  const [rJam, setRJam] = useState("");
  const [rJamSelesai, setRJamSelesai] = useState("");
  const [rJumlahTamu, setRJumlahTamu] = useState("2");
  const [rMejaId, setRMejaId] = useState("");
  const [rCatatan, setRCatatan] = useState("");
  const [rDpAmount, setRDpAmount] = useState("");
  const [rStatus, setRStatus] = useState("Confirmed");
  const [rAktifkanMenu, setRAktifkanMenu] = useState(false);
  const [savingReservasi, setSavingReservasi] = useState(false);
  const [cutoffSetting, setCutoffSetting] = useState("4");
  const [savingCutoff, setSavingCutoff] = useState(false);
  const [holdMinutes, setHoldMinutes] = useState("10");
  const [minBookingHours, setMinBookingHours] = useState("2");
  const [maxBookingDays, setMaxBookingDays] = useState("30");
  const [savingReservasiPolicy, setSavingReservasiPolicy] = useState(false);
  const [thresholdLama, setThresholdLama] = useState("2");
  const [thresholdNoShow, setThresholdNoShow] = useState("1");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [jamBukaSolo, setJamBukaSolo] = useState("10:00");
  const [jamTutupSolo, setJamTutupSolo] = useState("22:00");
  const [jamBukaJogja, setJamBukaJogja] = useState("10:00");
  const [jamTutupJogja, setJamTutupJogja] = useState("22:00");
  const [savingJamOperasional, setSavingJamOperasional] = useState(false);
  const [notifSuaraAktif, setNotifSuaraAktif] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("yassalam_notif_suara") !== "off";
  });
  const [liburList, setLiburList] = useState<LiburOutlet[]>([]);
  const [loadingLibur, setLoadingLibur] = useState(false);
  const [showLiburForm, setShowLiburForm] = useState(false);
  const [editLibur, setEditLibur] = useState<LiburOutlet | null>(null);
  const [lOutlet, setLOutlet] = useState("solo");
  const [lMulai, setLMulai] = useState("");
  const [lSelesai, setLSelesai] = useState("");
  const [lAlasan, setLAlasan] = useState("");
  const [savingLibur, setSavingLibur] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [loadingOrderKeys, setLoadingOrderKeys] = useState<Set<string>>(new Set());
  const [ordersCache, setOrdersCache] = useState<Record<string, ReservationMenuItemT[]>>({});
  const reservationsRef = useRef<Reservation[]>([]);
  reservationsRef.current = reservations;
  const expandedKeysRef = useRef<Set<string>>(new Set());
  expandedKeysRef.current = expandedKeys;
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [allVarianAdmin, setAllVarianAdmin] = useState<MenuVarian[]>([]);
  const [allAddonAdmin, setAllAddonAdmin] = useState<MenuAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [showTableForm, setShowTableForm] = useState(false);
  const [uploadingTable, setUploadingTable] = useState(false);
  const [showGabunganForm, setShowGabunganForm] = useState(false);
  const [editGabungan, setEditGabungan] = useState<MejaGabungan | null>(null);
  const [gOutlet, setGOutlet] = useState("solo");
  const [gNama, setGNama] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gMejaIds, setGMejaIds] = useState<number[]>([]);
  const [gKapMin, setGKapMin] = useState("");
  const [gDp, setGDp] = useState("");
  const [gMinTrx, setGMinTrx] = useState("");
  const [aOutlet, setAOutlet] = useState("solo");
  const [aNama, setANama] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aUrutan, setAUrutan] = useState("0");
  const [tNomor, setTNomor] = useState("");
  const [tNama, setTNama] = useState("");
  const [tKap, setTKap] = useState("4");
  const [tKapMin, setTKapMin] = useState("");
  const [tDp, setTDp] = useState("");
  const [tMinTrx, setTMinTrx] = useState("");
  const [tDesc, setTDesc] = useState("");

  // ===== MENU =====
  const [menuKategoriList, setMenuKategoriList] = useState<MenuKategori[]>([]);
  const [menuItemList, setMenuItemList] = useState<MenuItem[]>([]);
  const [drillKategori, setDrillKategori] = useState<MenuKategori | null>(null);
  const [showKategoriForm, setShowKategoriForm] = useState(false);
  const [editKategori, setEditKategori] = useState<MenuKategori | null>(null);
  const [kOutlet, setKOutlet] = useState("solo");
  const [kNama, setKNama] = useState("");
  const [kUrutan, setKUrutan] = useState("0");

  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [editMenuItem, setEditMenuItem] = useState<MenuItem | null>(null);
  const [miNama, setMiNama] = useState("");
  const [miDesc, setMiDesc] = useState("");
  const [miHarga, setMiHarga] = useState("");
  const [miPunyaVarian, setMiPunyaVarian] = useState(false);
  const [uploadingMenuItem, setUploadingMenuItem] = useState(false);

  // ===== KELOLA ADMIN =====
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [auNama, setAuNama] = useState("");
  const [auEmail, setAuEmail] = useState("");
  const [auPassword, setAuPassword] = useState("");
  const [auRole, setAuRole] = useState("admin_outlet");
  const [auOutlet, setAuOutlet] = useState("solo");
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [manageMenuItem, setManageMenuItem] = useState<MenuItem | null>(null);
  const [menuVarianList, setMenuVarianList] = useState<MenuVarian[]>([]);
  const [menuAddonList, setMenuAddonList] = useState<MenuAddon[]>([]);
  const [vNama, setVNama] = useState("");
  const [vHarga, setVHarga] = useState("");
  const [adNama, setAdNama] = useState("");
  const [adHarga, setAdHarga] = useState("");

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setCurrentPage(1);
  }, [filterOutlet, filterStatus, filterDate, searchQuery]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("Reservation").select("*")
      .order("tanggal", { ascending: true })
      .order("jam", { ascending: true });
    if (filterOutlet) q = q.eq("outlet", filterOutlet);
    if (filterStatus) q = q.eq("status", filterStatus);
    if (filterDate) q = q.eq("tanggal", filterDate);
    const { data } = await q; setReservations(data || []); setLoading(false);
  }, [filterOutlet, filterStatus, filterDate]);
  const fetchAreas = useCallback(async () => { const { data } = await supabase.from("Areas").select("*").order("outlet").order("urutan"); setAreas(data || []); }, []);
  const fetchTables = useCallback(async () => { const { data } = await supabase.from("Tables").select("*").order("outlet").order("nomor_meja"); setTables(data || []); }, []);

  // ===== KALENDER KETERSEDIAAN MEJA =====
  const [kalTanggal, setKalTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [kalOutlet, setKalOutlet] = useState("solo");
  const [kalReservations, setKalReservations] = useState<Reservation[]>([]);
  const [kalHolds, setKalHolds] = useState<BookingHold[]>([]);
  const [loadingKalender, setLoadingKalender] = useState(false);
  const [cariJumlahTamu, setCariJumlahTamu] = useState("2");
  const [cariJamMulai, setCariJamMulai] = useState("");
  const [cariDariTanggal, setCariDariTanggal] = useState(() => new Date().toISOString().split("T")[0]);
  const [cariSampaiTanggal, setCariSampaiTanggal] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 13);
    return d.toISOString().split("T")[0];
  });
  const [cariMatriks, setCariMatriks] = useState<{
    dates: string[];
    mejaRows: { table: TableData; avail: boolean[] }[];
    gabunganRows: { gabungan: MejaGabungan; avail: boolean[] }[];
  } | null>(null);
  const [loadingCariMulti, setLoadingCariMulti] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchKalenderData = useCallback(async () => {
    setLoadingKalender(true);
    const outletAktif = lockedOutlet || kalOutlet;
    const { data } = await supabase.from("Reservation").select("*")
      .eq("tanggal", kalTanggal).eq("outlet", outletAktif)
      .in("status", ["Pending", "Confirmed"]);
    setKalReservations(data || []);

    const { data: holdData } = await supabase.from("BookingHold").select("*")
      .eq("tanggal", kalTanggal)
      .not("status", "in", "(completed,cancelled,expired,released)")
      .gt("expires_at", new Date().toISOString());
    setKalHolds(holdData || []);

    setLoadingKalender(false);
  }, [kalTanggal, kalOutlet, lockedOutlet]);

  function timeToMinutes(t: string) {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return h * 60 + m;
  }

  const fetchGabungan = useCallback(async () => { const { data } = await supabase.from("MejaGabungan").select("*").order("outlet").order("nama"); setGabunganList(data || []); }, []);

  async function cariMejaMultiTanggal() {
    if (!cariJamMulai) { alert("Isi jam mulai"); return; }
    if (cariDariTanggal > cariSampaiTanggal) { alert("Tanggal \"Sampai\" harus setelah \"Dari\""); return; }
    setLoadingCariMulti(true);
    const outletAktif = lockedOutlet || kalOutlet;
    const tamu = Number(cariJumlahTamu) || 1;
    const [jh, jm] = cariJamMulai.split(":").map(Number);
    const startMin = jh * 60 + jm;
    const endMin = startMin + 120;

    const { data: resData } = await supabase.from("Reservation").select("meja_id, tanggal, jam, jam_selesai")
      .eq("outlet", outletAktif).gte("tanggal", cariDariTanggal).lte("tanggal", cariSampaiTanggal)
      .in("status", ["Pending", "Confirmed"]);
    const { data: holdData } = await supabase.from("BookingHold").select("meja_id, tanggal, jam, jam_selesai")
      .gte("tanggal", cariDariTanggal).lte("tanggal", cariSampaiTanggal)
      .not("status", "in", "(completed,cancelled,expired,released)");

    const resRows = (resData || []) as { meja_id: number | null; tanggal: string; jam: string; jam_selesai: string }[];
    const holdRows = (holdData || []) as { meja_id: number; tanggal: string; jam: string; jam_selesai: string }[];

    const dates: string[] = [];
    const dari = new Date(cariDariTanggal + "T00:00:00");
    const sampai = new Date(cariSampaiTanggal + "T00:00:00");
    for (let d = new Date(dari); d <= sampai; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }

    const bookedByDate: Record<string, Set<number>> = {};
    dates.forEach((tgl) => { bookedByDate[tgl] = new Set<number>(); });
    resRows.forEach((r) => {
      if (r.meja_id == null || !bookedByDate[r.tanggal]) return;
      const rStart = timeToMinutes(r.jam);
      const rEnd = r.jam_selesai ? timeToMinutes(r.jam_selesai) : rStart + 120;
      if (startMin < rEnd && endMin > rStart) bookedByDate[r.tanggal].add(r.meja_id);
    });
    holdRows.forEach((h) => {
      if (!bookedByDate[h.tanggal]) return;
      const hStart = timeToMinutes(h.jam);
      const hEnd = h.jam_selesai ? timeToMinutes(h.jam_selesai) : hStart + 120;
      if (startMin < hEnd && endMin > hStart) bookedByDate[h.tanggal].add(h.meja_id);
    });

    const outletTables = tables.filter((t) => t.outlet === outletAktif && t.kapasitas >= tamu && (!t.kapasitas_minimum || tamu >= t.kapasitas_minimum));
    const outletGabungan = gabunganList.filter((g) => g.outlet === outletAktif && g.aktif && g.kapasitas_total >= tamu && (!g.kapasitas_minimum || tamu >= g.kapasitas_minimum));

    const mejaRows = outletTables.map((t) => ({ table: t, avail: dates.map((tgl) => !bookedByDate[tgl].has(t.Id)) }));
    const gabunganRows = outletGabungan.map((g) => ({ gabungan: g, avail: dates.map((tgl) => g.meja_ids.every((id) => !bookedByDate[tgl].has(id))) }));

    setCariMatriks({ dates, mejaRows, gabunganRows });
    setLoadingCariMulti(false);
  }
  const fetchMenuKategori = useCallback(async () => { const { data } = await supabase.from("MenuKategori").select("*").order("outlet").order("urutan"); setMenuKategoriList(data || []); }, []);
  const fetchMenuItems = useCallback(async () => { const { data } = await supabase.from("MenuPaket").select("*").order("outlet").order("urutan"); setMenuItemList(data || []); }, []);
  const fetchVarian = useCallback(async (menuId: number) => { const { data } = await supabase.from("MenuVarian").select("*").eq("menu_id", menuId).order("urutan"); setMenuVarianList(data || []); }, []);
  const fetchAddon = useCallback(async (menuId: number) => { const { data } = await supabase.from("MenuAddon").select("*").eq("menu_id", menuId).order("urutan"); setMenuAddonList(data || []); }, []);

  // ===== LAPORAN =====
  const [lapDari, setLapDari] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [lapSampai, setLapSampai] = useState(() => new Date().toISOString().split("T")[0]);
  const [lapOutlet, setLapOutlet] = useState("");
  const [lapReservasi, setLapReservasi] = useState<Reservation[]>([]);
  const [lapOrders, setLapOrders] = useState<ReservationMenuItemT[]>([]);
  const [loadingLaporan, setLoadingLaporan] = useState(false);

  const fetchLaporan = useCallback(async () => {
    setLoadingLaporan(true);
    const outletAktif = lockedOutlet || lapOutlet;
    let q = supabase.from("Reservation").select("*").gte("tanggal", lapDari).lte("tanggal", lapSampai);
    if (outletAktif) q = q.eq("outlet", outletAktif);
    const { data: resData } = await q;
    setLapReservasi(resData || []);

    const resIds = (resData || []).map((r) => r.Id);
    if (resIds.length > 0) {
      const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds);
      setLapOrders(orderData || []);
    } else {
      setLapOrders([]);
    }
    setLoadingLaporan(false);
  }, [lapDari, lapSampai, lapOutlet, lockedOutlet]);

  const [activityLog, setActivityLog] = useState<ActivityLogT[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const fetchActivityLog = useCallback(async () => {
    setLoadingLog(true);
    const { data } = await supabase.from("ActivityLog").select("*").order("created_at", { ascending: false }).limit(200);
    setActivityLog(data || []);
    setLoadingLog(false);
  }, []);

  const fetchAdminList = useCallback(async () => {
    setLoadingAdmin(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin-users", { headers: { Authorization: `Bearer ${s?.access_token}` } });
      const text = await res.text();
      let json: { data?: AdminUser[]; error?: string };
      try { json = JSON.parse(text); }
      catch { throw new Error(`Server mengembalikan respons tidak valid (status ${res.status}). Cek log Vercel / env var Supabase.`); }
      if (!res.ok) { alert("Gagal memuat: " + (json.error || `status ${res.status}`)); return; }
      setAdminList(json.data || []);
    } catch (err) {
      alert("Gagal memuat data admin: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  const fetchCutoffSetting = useCallback(async () => {
    const keys = ["menu_cutoff_hours", "booking_hold_minutes", "booking_min_hours", "booking_max_days", "threshold_pelanggan_lama", "threshold_no_show", "jam_buka_solo", "jam_tutup_solo", "jam_buka_jogja", "jam_tutup_jogja"];
    const { data } = await supabase.from("AppSettings").select("key, value").in("key", keys);
    const map = Object.fromEntries((data || []).map((d: { key: string; value: string }) => [d.key, d.value]));
    if (map.menu_cutoff_hours) setCutoffSetting(map.menu_cutoff_hours);
    if (map.booking_hold_minutes) setHoldMinutes(map.booking_hold_minutes);
    if (map.booking_min_hours) setMinBookingHours(map.booking_min_hours);
    if (map.booking_max_days) setMaxBookingDays(map.booking_max_days);
    if (map.threshold_pelanggan_lama) setThresholdLama(map.threshold_pelanggan_lama);
    if (map.threshold_no_show) setThresholdNoShow(map.threshold_no_show);
    if (map.jam_buka_solo) setJamBukaSolo(map.jam_buka_solo);
    if (map.jam_tutup_solo) setJamTutupSolo(map.jam_tutup_solo);
    if (map.jam_buka_jogja) setJamBukaJogja(map.jam_buka_jogja);
    if (map.jam_tutup_jogja) setJamTutupJogja(map.jam_tutup_jogja);
  }, []);
  async function saveCutoffSetting() {
    setSavingCutoff(true);
    const { error } = await supabase.from("AppSettings").upsert({ key: "menu_cutoff_hours", value: cutoffSetting }, { onConflict: "key" });
    setSavingCutoff(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    alert("Pengaturan disimpan.");
  }
  async function saveReservasiPolicy() {
    setSavingReservasiPolicy(true);
    const { error } = await supabase.from("AppSettings").upsert([
      { key: "booking_hold_minutes", value: holdMinutes },
      { key: "booking_min_hours", value: minBookingHours },
      { key: "booking_max_days", value: maxBookingDays },
    ], { onConflict: "key" });
    setSavingReservasiPolicy(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    alert("Pengaturan disimpan.");
  }
  async function saveThreshold() {
    setSavingThreshold(true);
    const { error } = await supabase.from("AppSettings").upsert([
      { key: "threshold_pelanggan_lama", value: thresholdLama },
      { key: "threshold_no_show", value: thresholdNoShow },
    ], { onConflict: "key" });
    setSavingThreshold(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    alert("Pengaturan disimpan.");
  }
  async function saveJamOperasional() {
    setSavingJamOperasional(true);
    const { error } = await supabase.from("AppSettings").upsert([
      { key: "jam_buka_solo", value: jamBukaSolo },
      { key: "jam_tutup_solo", value: jamTutupSolo },
      { key: "jam_buka_jogja", value: jamBukaJogja },
      { key: "jam_tutup_jogja", value: jamTutupJogja },
    ], { onConflict: "key" });
    setSavingJamOperasional(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    alert("Pengaturan disimpan.");
  }
  function toggleNotifSuara() {
    const next = !notifSuaraAktif;
    setNotifSuaraAktif(next);
    localStorage.setItem("yassalam_notif_suara", next ? "on" : "off");
  }
  const fetchLibur = useCallback(async () => {
    setLoadingLibur(true);
    const { data } = await supabase.from("LiburOutlet").select("*").order("tanggal_mulai", { ascending: false });
    setLiburList(data || []);
    setLoadingLibur(false);
  }, []);
  function openLiburForm(l?: LiburOutlet) {
    if (l) { setEditLibur(l); setLOutlet(l.outlet); setLMulai(l.tanggal_mulai); setLSelesai(l.tanggal_selesai); setLAlasan(l.alasan || ""); }
    else { setEditLibur(null); setLOutlet(isSuper ? "solo" : (myOutlet || "solo")); setLMulai(""); setLSelesai(""); setLAlasan(""); }
    setShowLiburForm(true);
  }
  async function saveLibur() {
    if (!lMulai || !lSelesai) { alert("Isi tanggal mulai dan tanggal selesai"); return; }
    if (lMulai > lSelesai) { alert("Tanggal mulai tidak boleh lebih besar dari tanggal selesai"); return; }
    setSavingLibur(true);
    const payload = { outlet: lOutlet, tanggal_mulai: lMulai, tanggal_selesai: lSelesai, alasan: lAlasan.trim() || null };
    const { error } = editLibur
      ? await supabase.from("LiburOutlet").update(payload).eq("Id", editLibur.Id)
      : await supabase.from("LiburOutlet").insert(payload);
    setSavingLibur(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowLiburForm(false);
    fetchLibur();
  }
  async function deleteLibur(l: LiburOutlet) {
    if (!confirm(`Hapus jadwal libur ${l.outlet === "solo" ? "Solo" : "Yogyakarta"} (${l.tanggal_mulai} – ${l.tanggal_selesai})?`)) return;
    const { error } = await supabase.from("LiburOutlet").delete().eq("Id", l.Id);
    if (error) { alert("Gagal hapus: " + error.message); return; }
    fetchLibur();
  }

  const [customerHistoryMap, setCustomerHistoryMap] = useState<Record<string, { total: number; noShow: number; completed: number }>>({});
  const fetchCustomerHistory = useCallback(async () => {
    const { data } = await supabase.from("Reservation").select("no_whatsapp, status");
    const map: Record<string, { total: number; noShow: number; completed: number }> = {};
    (data || []).forEach((r: { no_whatsapp: string; status: string }) => {
      const key = normalizeWhatsapp(r.no_whatsapp);
      if (!map[key]) map[key] = { total: 0, noShow: 0, completed: 0 };
      map[key].total += 1;
      if (r.status === "No-Show") map[key].noShow += 1;
      if (r.status === "Completed") map[key].completed += 1;
    });
    setCustomerHistoryMap(map);
  }, []);

  const fetchAllMenuLookups = useCallback(async () => {
    const { data: mi } = await supabase.from("MenuPaket").select("*");
    setAllMenuItems(mi || []);
    const { data: mv } = await supabase.from("MenuVarian").select("*");
    setAllVarianAdmin(mv || []);
    const { data: ma } = await supabase.from("MenuAddon").select("*");
    setAllAddonAdmin(ma || []);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (tab === "reservasi") { void fetchReservations(); void fetchAllMenuLookups(); void fetchTables(); void fetchCustomerHistory(); }
    if (tab === "kalender") { void fetchKalenderData(); void fetchTables(); void fetchAreas(); void fetchGabungan(); }
    if (tab === "area") { void fetchAreas(); void fetchTables(); }
    if (tab === "gabungan") { void fetchGabungan(); void fetchTables(); }
    if (tab === "menu") { void fetchMenuKategori(); void fetchMenuItems(); }
    if (tab === "laporan") { void fetchLaporan(); }
    if (tab === "admin") { void fetchAdminList(); }
    if (tab === "log") { void fetchActivityLog(); }
    if (tab === "pengaturan") { void fetchCutoffSetting(); void fetchLibur(); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab, fetchReservations, fetchKalenderData, fetchAreas, fetchTables, fetchGabungan, fetchMenuKategori, fetchMenuItems, fetchAllMenuLookups, fetchCutoffSetting, fetchAdminList, fetchLaporan, fetchActivityLog, fetchCustomerHistory, fetchLibur]);

  // ===== REALTIME: reservasi baru otomatis muncul + notifikasi =====
  const notifAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickBufferRef = useRef<AudioBuffer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    notifAudioRef.current = new Audio("/notif.mp3");
    notifAudioRef.current.volume = 0.7;
    // Preload click sound ke memory pakai Web Audio API — zero delay
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    fetch("/click.mp3")
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => { clickBufferRef.current = decoded; })
      .catch(() => {});
    return () => { ctx.close(); };
  }, []);

  function playClick() {
    const ctx = audioCtxRef.current;
    const buffer = clickBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === "suspended") ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
  }

  function playWelcomeChime() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  // ===== SOUND: klik otomatis di SEMUA tombol & elemen interaktif dashboard =====
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      const el = e.target as HTMLElement;
      const clickable = el?.closest('button, [role="button"], input[type="date"], input[type="time"], select, summary') as (HTMLButtonElement | HTMLInputElement | HTMLSelectElement | null);
      if (!clickable) return;
      if ("disabled" in clickable && clickable.disabled) return;
      playClick();
    }
    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, []);

  useEffect(() => {
    if (tab !== "reservasi") return;
    const resCh = supabase
      .channel("admin-reservation-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Reservation" },
        (payload) => {
          const newRes = payload.new as { nama_tamu?: string; outlet?: string; tanggal?: string; jam?: string };
          fetchReservations();
          // Bunyikan suara
          if (notifSuaraAktif) notifAudioRef.current?.play().catch(() => {});
          // Tampilkan notifikasi browser (kalau diizinkan)
          if (notifSuaraAktif && Notification.permission === "granted") {
            new Notification("Reservasi Baru!", {
              body: `${newRes.nama_tamu || "Tamu"} — ${newRes.outlet || ""} ${newRes.tanggal || ""} ${newRes.jam || ""}`,
              icon: "/logo.PNG",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Reservation" },
        () => { fetchReservations(); }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "Reservation" },
        () => { fetchReservations(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(resCh); };
  }, [tab, fetchReservations, notifSuaraAktif]);

  // ===== AUTO-COMPLETE: reservasi Confirmed otomatis jadi Completed atau No-Show setelah lewat jam selesai =====
  useEffect(() => {
    if (tab !== "reservasi") return;
    const interval = setInterval(async () => {
      const nowT = new Date();
      const kandidat = reservationsRef.current.filter((r) => {
        if (r.status !== "Confirmed") return false;
        const end = new Date(`${r.tanggal}T${(r.jam_selesai || "23:59:00").slice(0, 8)}`);
        return nowT >= end;
      });
      if (kandidat.length === 0) return;

      await Promise.all(kandidat.map(async (r) => {
        let sudahHadir = !!r.checked_in_at;
        if (!sudahHadir) {
          const { data: pesanan } = await supabase.from("ReservationMenuItem").select("Id").eq("reservation_id", r.Id).limit(1);
          sudahHadir = (pesanan || []).length > 0;
        }
        await supabase.from("Reservation").update({ status: sudahHadir ? "Completed" : "No-Show" }).eq("Id", r.Id);
      }));
      fetchReservations();
    }, 30000);
    return () => clearInterval(interval);
  }, [tab, fetchReservations]);

// ===== REALTIME: kalender ketersediaan meja =====
  useEffect(() => {
    if (tab !== "kalender") return;
    const kalCh = supabase
      .channel("admin-kalender-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "Reservation" }, () => { fetchKalenderData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "BookingHold" }, () => { fetchKalenderData(); })
      .subscribe();
    return () => { supabase.removeChannel(kalCh); };
  }, [tab, fetchKalenderData]);
  // Minta izin notifikasi browser saat pertama kali
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ===== REALTIME: update pesanan menu otomatis tanpa refresh =====
  useEffect(() => {
    if (tab !== "reservasi") return;
    const channel = supabase
      .channel("admin-order-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ReservationMenuItem" },
        async (payload) => {
          const newRow = payload.new as { reservation_id?: number } | null;
          const oldRow = payload.old as { reservation_id?: number } | null;
          const resId = newRow?.reservation_id ?? oldRow?.reservation_id;
          if (!resId) return;
          const r = reservationsRef.current.find((res) => res.Id === resId);
          if (!r) return;
          const key = orderKey(r);
          if (!expandedKeysRef.current.has(key)) return;
          let resIds = [r.Id];
          if (r.share_token) {
            const { data: groupRes } = await supabase.from("Reservation").select("Id").eq("share_token", r.share_token);
            resIds = (groupRes || []).map((x: { Id: number }) => x.Id);
          }
          const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds).order("created_at");
          setOrdersCache((prev) => ({ ...prev, [key]: orderData || [] }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  async function logActivity(action: string, detail?: string) {
    await supabase.from("ActivityLog").insert({
      admin_email: session?.user?.email || null,
      admin_nama: myNama,
      action,
      detail: detail || null,
    });
  }

  async function updateStatus(id: number, s: string) {
    const r = reservationsRef.current.find((x) => x.Id === id);
    await supabase.from("Reservation").update({ status: s }).eq("Id", id);
    if (r) logActivity("Ubah status reservasi", `${r.nama_tamu} (${r.tanggal} ${formatJam(r.jam)}) → ${s}`);
    fetchReservations();
  }
  async function tandaiHadir(id: number) {
    const r = reservationsRef.current.find((x) => x.Id === id);
    await supabase.from("Reservation").update({ checked_in_at: new Date().toISOString() }).eq("Id", id);
    if (r) logActivity("Tandai hadir", `${r.nama_tamu} (${r.tanggal} ${formatJam(r.jam)})`);
    fetchReservations();
  }
  async function tandaiHadirByToken(token: string, namaTamu: string, tanggal: string, jam: string) {
    await supabase.from("Reservation").update({ checked_in_at: new Date().toISOString() }).eq("share_token", token);
    logActivity("Tandai hadir (scan QR)", `${namaTamu} (${tanggal} ${formatJam(jam)})`);
    fetchReservations();
  }

  function openReservasiForm(existing?: Reservation) {
    if (existing) {
      setEditingReservasiId(existing.Id);
      setEditingOriginalShareToken(existing.share_token);
      setRNama(existing.nama_tamu); setRWhatsapp(existing.no_whatsapp); setROutlet(existing.outlet);
      setRTanggal(existing.tanggal); setRJam(formatJam(existing.jam)); setRJamSelesai(formatJam(existing.jam_selesai));
      setRJumlahTamu(String(existing.jumlah_tamu)); setRMejaId(existing.meja_id ? String(existing.meja_id) : "");
      setRCatatan(existing.catatan || ""); setRDpAmount(existing.dp_amount ? String(existing.dp_amount) : "");
      setRStatus(existing.status); setRAktifkanMenu(!!existing.share_token);
    } else {
      setEditingReservasiId(null);
      setEditingOriginalShareToken(null);
      setRNama(""); setRWhatsapp(""); setROutlet(lockedOutlet || "solo");
      setRTanggal(filterDate || new Date().toISOString().split("T")[0]);
      setRJam(""); setRJamSelesai(""); setRJumlahTamu("2"); setRMejaId("");
      setRCatatan(""); setRDpAmount(""); setRStatus("Confirmed"); setRAktifkanMenu(false);
    }
    setShowReservasiForm(true);
  } 

  async function saveReservasiManual() {
    if (!rNama.trim()) { alert("Isi nama tamu"); return; }
    if (!rWhatsapp.trim()) { alert("Isi nomor WhatsApp"); return; }
    if (!rTanggal) { alert("Isi tanggal"); return; }
    if (!rJam) { alert("Isi jam mulai"); return; }

    const todayStr = new Date().toISOString().split("T")[0];
    if (rTanggal === todayStr) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const [jh, jm] = rJam.split(":").map(Number);
      if (jh * 60 + jm < nowMin) {
        alert("Jam mulai sudah lewat untuk hari ini. Pilih jam yang belum lewat.");
        return;
      }
    }

    const jamSelesaiFinal = rJamSelesai || (() => {
      const [h, m] = rJam.split(":").map(Number);
      const totalMin = h * 60 + m + 120;
      const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
      const mm = String(totalMin % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    })();

    const mejaTerpilih = tables.find((t) => t.Id === Number(rMejaId));
    if (mejaTerpilih && Number(rJumlahTamu) > mejaTerpilih.kapasitas) {
      if (!confirm(`Jumlah tamu (${rJumlahTamu}) melebihi kapasitas ${mejaTerpilih.nama_meja || `Meja ${mejaTerpilih.nomor_meja}`} (maks ${mejaTerpilih.kapasitas} orang). Tetap lanjutkan?`)) return;
    }

    if (rMejaId) {
      const { data: existing } = await supabase.from("Reservation").select("Id, jam, jam_selesai, nama_tamu")
        .eq("meja_id", Number(rMejaId)).eq("tanggal", rTanggal).in("status", ["Pending", "Confirmed"]);
      const startMin = timeToMinutes(rJam);
      const endMin = timeToMinutes(jamSelesaiFinal);
      const bentrok = (existing || []).filter((e) => e.Id !== editingReservasiId).find((e) => {
        const eStart = timeToMinutes(e.jam);
        const eEnd = e.jam_selesai ? timeToMinutes(e.jam_selesai) : eStart + 120;
        return startMin < eEnd && endMin > eStart;
      });
      if (bentrok) {
        if (!confirm(`Meja ini sudah dibooking oleh "${bentrok.nama_tamu}" pada jam yang bentrok. Tetap lanjutkan?`)) return;
      }
    }

    setSavingReservasi(true);
    const shareTokenFinal = rAktifkanMenu ? (editingOriginalShareToken || crypto.randomUUID()) : null;
    const p = {
      nama_tamu: rNama, no_whatsapp: rWhatsapp, outlet: rOutlet, tanggal: rTanggal,
      jam: rJam, jam_selesai: jamSelesaiFinal, jumlah_tamu: Number(rJumlahTamu) || 1,
      catatan: rCatatan || null, status: rStatus, meja_id: rMejaId ? Number(rMejaId) : null,
      dp_amount: rDpAmount ? Number(rDpAmount) : null,
      share_token: shareTokenFinal,
    };
    const { error } = editingReservasiId
      ? await supabase.from("Reservation").update(p).eq("Id", editingReservasiId)
      : await supabase.from("Reservation").insert({ ...p, menu_finalized: false });
    setSavingReservasi(false);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    logActivity(editingReservasiId ? "Edit reservasi" : "Tambah reservasi manual", `${rNama} · ${rTanggal} ${rJam}`);
    setShowReservasiForm(false);
    setEditingReservasiId(null);
    fetchReservations();
  }
  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function formatJam(jam: string) { return (jam || "").slice(0, 5); }
  function getWaktuInfo(r: Reservation): { label: string; tone: "upcoming" | "active" | "overdue" } {
    const nowT = new Date();
    const start = new Date(`${r.tanggal}T${(r.jam || "00:00:00").slice(0, 8)}`);
    const end = new Date(`${r.tanggal}T${(r.jam_selesai || "23:59:00").slice(0, 8)}`);
    if (nowT < start) {
      const diffMin = Math.round((start.getTime() - nowT.getTime()) / 60000);
      if (diffMin < 60) return { label: `${diffMin} menit lagi`, tone: "upcoming" };
      const diffHour = Math.floor(diffMin / 60);
      const sisaMin = diffMin % 60;
      return { label: `${diffHour} jam${sisaMin > 0 ? ` ${sisaMin} menit` : ""} lagi`, tone: "upcoming" };
    }
    if (nowT >= start && nowT < end) return { label: "Sedang berlangsung", tone: "active" };
    return { label: "Waktu terlewat", tone: "overdue" };
  }
  function normalizeWhatsapp(nomor: string) {
    let n = (nomor || "").replace(/[^0-9]/g, "");
    if (n.startsWith("0")) n = "62" + n.slice(1);
    else if (n.startsWith("620")) n = "62" + n.slice(3);
    else if (!n.startsWith("62")) n = "62" + n;
    return n;
  }
  function sendMenuLinkWA(r: Reservation) {
    if (!r.share_token) { alert("Reservasi ini belum punya link menu."); return; }
    const link = `${window.location.origin}/pesan/${r.share_token}`;
    const msg = `Halo ${r.nama_tamu}, ini link untuk pesan menu reservasi Anda di Yassalam:\n${link}\n\nBisa dibagikan ke teman/rombongan Anda juga ya 🙏`;
    window.open(`https://wa.me/${normalizeWhatsapp(r.no_whatsapp)}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  function totalKapasitas(a: Area) { return tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).reduce((sum, t) => sum + t.kapasitas, 0); }

  function openAreaForm(area?: Area) {
    if (area) { setEditArea(area); setAOutlet(area.outlet); setANama(area.nama); setASlug(area.slug); setADesc(area.deskripsi || ""); setAUrutan(String(area.urutan)); }
    else { setEditArea(null); setAOutlet(lockedOutlet || "solo"); setANama(""); setASlug(""); setADesc(""); setAUrutan("0"); }
    setShowAreaForm(true);
  }
  async function saveArea() {
    const p = { outlet: aOutlet, nama: aNama, slug: aSlug, deskripsi: aDesc, urutan: Number(aUrutan) };
    const { error } = editArea ? await supabase.from("Areas").update(p).eq("Id", editArea.Id) : await supabase.from("Areas").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowAreaForm(false); fetchAreas();
  }
  async function deleteArea(id: number) { if (!confirm("Hapus area ini?")) return; await supabase.from("Areas").delete().eq("Id", id); fetchAreas(); }

  function openTableForm(t?: TableData) {
    if (t) { setEditTable(t); setTNomor(String(t.nomor_meja)); setTNama(t.nama_meja || ""); setTKap(String(t.kapasitas)); setTKapMin(t.kapasitas_minimum ? String(t.kapasitas_minimum) : ""); setTDp(t.dp_minimum ? String(t.dp_minimum) : ""); setTMinTrx(t.minimum_transaksi ? String(t.minimum_transaksi) : ""); setTDesc(t.deskripsi || ""); }
    else { setEditTable(null); setTNomor(""); setTNama(""); setTKap("4"); setTKapMin(""); setTDp(""); setTMinTrx(""); setTDesc(""); }
    setShowTableForm(true);
  }
  async function saveTable() {
    if (!drillArea) return;
    const p = { outlet: drillArea.outlet, posisi: drillArea.slug, nomor_meja: Number(tNomor), nama_meja: tNama || null, kapasitas: Number(tKap), kapasitas_minimum: tKapMin ? Number(tKapMin) : null, dp_minimum: tDp ? Number(tDp) : null, minimum_transaksi: tMinTrx ? Number(tMinTrx) : null, deskripsi: tDesc || null };
    const { error } = editTable ? await supabase.from("Tables").update(p).eq("Id", editTable.Id) : await supabase.from("Tables").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowTableForm(false); fetchTables();
  }
  async function deleteTable(id: number) { if (!confirm("Hapus meja ini?")) return; await supabase.from("Tables").delete().eq("Id", id); fetchTables(); }
  async function uploadTablePhoto(tableId: number, file: File) {
    setUploadingTable(true);
    try { const compressed = await compressImage(file); const path = `tables/${tableId}-${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" }); if (error) { alert("Upload gagal: " + error.message); setUploadingTable(false); return; } const { data: u } = supabase.storage.from("photos").getPublicUrl(path); await supabase.from("Tables").update({ foto_url: u.publicUrl }).eq("Id", tableId); } catch { alert("Gagal memproses gambar."); }
    setUploadingTable(false); fetchTables();
  }

  function openGabunganForm(g?: MejaGabungan) {
    if (g) { setEditGabungan(g); setGOutlet(g.outlet); setGNama(g.nama); setGDesc(g.deskripsi || ""); setGMejaIds(g.meja_ids || []); setGKapMin(g.kapasitas_minimum ? String(g.kapasitas_minimum) : ""); setGDp(g.dp_minimum ? String(g.dp_minimum) : ""); setGMinTrx(g.minimum_transaksi ? String(g.minimum_transaksi) : ""); }
    else { setEditGabungan(null); setGOutlet(lockedOutlet || "solo"); setGNama(""); setGDesc(""); setGMejaIds([]); setGKapMin(""); setGDp(""); setGMinTrx(""); }
    setShowGabunganForm(true);
  }
  function toggleMejaInGabungan(id: number) { setGMejaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); }
  function gabunganKapTotal() { return tables.filter((t) => gMejaIds.includes(t.Id)).reduce((s, t) => s + t.kapasitas, 0); }
  async function saveGabungan() {
    if (gMejaIds.length < 2) { alert("Pilih minimal 2 meja"); return; }
    if (!gNama.trim()) { alert("Isi nama gabungan"); return; }
    const p = { outlet: gOutlet, nama: gNama, deskripsi: gDesc || null, meja_ids: gMejaIds, kapasitas_total: gabunganKapTotal(), kapasitas_minimum: gKapMin ? Number(gKapMin) : null, dp_minimum: gDp ? Number(gDp) : null, minimum_transaksi: gMinTrx ? Number(gMinTrx) : null, aktif: true };
    const { error } = editGabungan ? await supabase.from("MejaGabungan").update(p).eq("Id", editGabungan.Id) : await supabase.from("MejaGabungan").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowGabunganForm(false); fetchGabungan();
  }
  async function deleteGabungan(id: number) { if (!confirm("Hapus gabungan ini?")) return; await supabase.from("MejaGabungan").delete().eq("Id", id); fetchGabungan(); }
  async function toggleGabunganAktif(g: MejaGabungan) { await supabase.from("MejaGabungan").update({ aktif: !g.aktif }).eq("Id", g.Id); fetchGabungan(); }
  function getMejaLabel(id: number) { const t = tables.find((t) => t.Id === id); return t ? (t.nama_meja || `Meja ${t.nomor_meja}`) : `#${id}`; }

  function orderKey(r: Reservation) { return r.share_token || `id-${r.Id}`; }
  function getOrderMenuName(id: number) { return allMenuItems.find((m) => m.Id === id)?.nama_paket || "Menu"; }
  function getOrderVarianName(id: number | null) { if (!id) return null; return allVarianAdmin.find((v) => v.Id === id)?.nama || null; }
  function getOrderAddonNames(ids: number[]) { return (ids || []).map((id) => allAddonAdmin.find((a) => a.Id === id)?.nama).filter(Boolean).join(", "); }

  async function toggleExpandOrders(r: Reservation) {
    const key = orderKey(r);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (!ordersCache[key]) {
      setLoadingOrderKeys((prev) => new Set(prev).add(key));
      let resIds = [r.Id];
      if (r.share_token) {
        const { data: groupRes } = await supabase.from("Reservation").select("Id").eq("share_token", r.share_token);
        resIds = (groupRes || []).map((x: { Id: number }) => x.Id);
      }
      const { data: orderData } = await supabase.from("ReservationMenuItem").select("*").in("reservation_id", resIds).order("created_at");
      setOrdersCache((prev) => ({ ...prev, [key]: orderData || [] }));
      setLoadingOrderKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  // ===== MENU KATEGORI =====
  function openKategoriForm(k?: MenuKategori) {
    if (k) { setEditKategori(k); setKOutlet(k.outlet); setKNama(k.nama); setKUrutan(String(k.urutan)); }
    else { setEditKategori(null); setKOutlet(lockedOutlet || "solo"); setKNama(""); setKUrutan("0"); }
    setShowKategoriForm(true);
  }
  async function saveKategori() {
    if (!kNama.trim()) { alert("Isi nama kategori"); return; }
    const p = { outlet: kOutlet, nama: kNama, urutan: Number(kUrutan), aktif: true };
    const { error } = editKategori ? await supabase.from("MenuKategori").update(p).eq("Id", editKategori.Id) : await supabase.from("MenuKategori").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowKategoriForm(false); fetchMenuKategori();
  }
  async function deleteKategori(id: number) { if (!confirm("Hapus kategori ini? Menu di dalamnya tidak ikut terhapus.")) return; await supabase.from("MenuKategori").delete().eq("Id", id); fetchMenuKategori(); }
  async function toggleKategoriAktif(k: MenuKategori) { await supabase.from("MenuKategori").update({ aktif: !k.aktif }).eq("Id", k.Id); fetchMenuKategori(); }

  // ===== MENU ITEM =====
  function openMenuItemForm(m?: MenuItem) {
    if (m) { setEditMenuItem(m); setMiNama(m.nama_paket); setMiDesc(m.deskripsi || ""); setMiHarga(String(m.harga)); setMiPunyaVarian(m.punya_varian); }
    else { setEditMenuItem(null); setMiNama(""); setMiDesc(""); setMiHarga(""); setMiPunyaVarian(false); }
    setShowMenuItemForm(true);
  }
  async function saveMenuItem() {
    if (!drillKategori) return;
    if (!miNama.trim()) { alert("Isi nama menu"); return; }
    const p = { nama_paket: miNama, deskripsi: miDesc, harga: Number(miHarga) || 0, outlet: drillKategori.outlet, kategori_id: drillKategori.Id, punya_varian: miPunyaVarian, aktif: true };
    const { error } = editMenuItem ? await supabase.from("MenuPaket").update(p).eq("Id", editMenuItem.Id) : await supabase.from("MenuPaket").insert(p);
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setShowMenuItemForm(false); fetchMenuItems();
  }
  async function deleteMenuItem(id: number) { if (!confirm("Hapus menu ini?")) return; await supabase.from("MenuPaket").delete().eq("Id", id); fetchMenuItems(); }
  async function toggleMenuItemAktif(m: MenuItem) { await supabase.from("MenuPaket").update({ aktif: !m.aktif }).eq("Id", m.Id); fetchMenuItems(); }
  async function uploadMenuItemPhoto(menuId: number, file: File) {
    setUploadingMenuItem(true);
    try {
      const compressed = await compressImage(file);
      const path = `menu/${menuId}-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" });
      if (error) { alert("Upload gagal: " + error.message); setUploadingMenuItem(false); return; }
      const { data: u } = supabase.storage.from("photos").getPublicUrl(path);
      await supabase.from("MenuPaket").update({ foto_url: u.publicUrl }).eq("Id", menuId);
    } catch { alert("Gagal memproses gambar."); }
    setUploadingMenuItem(false); fetchMenuItems();
  }

  // ===== VARIAN & ADDON =====
  function openManageMenuItem(m: MenuItem) {
    setManageMenuItem(m); fetchVarian(m.Id); fetchAddon(m.Id);
    setVNama(""); setVHarga(""); setAdNama(""); setAdHarga("");
  }
  async function addVarian() {
    if (!manageMenuItem || !vNama.trim()) { alert("Isi nama varian"); return; }
    const { error } = await supabase.from("MenuVarian").insert({ menu_id: manageMenuItem.Id, nama: vNama, harga_tambahan: Number(vHarga) || 0, urutan: menuVarianList.length, aktif: true });
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setVNama(""); setVHarga(""); fetchVarian(manageMenuItem.Id);
  }
  async function deleteVarian(id: number) { if (!manageMenuItem) return; await supabase.from("MenuVarian").delete().eq("Id", id); fetchVarian(manageMenuItem.Id); }
  async function addAddon() {
    if (!manageMenuItem || !adNama.trim()) { alert("Isi nama add-on"); return; }
    const { error } = await supabase.from("MenuAddon").insert({ menu_id: manageMenuItem.Id, nama: adNama, harga_tambahan: Number(adHarga) || 0, urutan: menuAddonList.length, aktif: true });
    if (error) { alert("Gagal simpan: " + error.message); return; }
    setAdNama(""); setAdHarga(""); fetchAddon(manageMenuItem.Id);
  }
  async function deleteAddon(id: number) { if (!manageMenuItem) return; await supabase.from("MenuAddon").delete().eq("Id", id); fetchAddon(manageMenuItem.Id); }

  // ===== FUNGSI KELOLA ADMIN =====
  async function authFetch(url: string, init?: RequestInit) {
    const { data: { session: s } } = await supabase.auth.getSession();
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers || {}), "Content-Type": "application/json", Authorization: `Bearer ${s?.access_token}` },
    });
  }

  function openAdminForm(a?: AdminUser) {
    if (a) { setEditAdmin(a); setAuNama(a.nama || ""); setAuEmail(a.email); setAuRole(a.role); setAuOutlet(a.outlet || "solo"); }
    else { setEditAdmin(null); setAuNama(""); setAuEmail(""); setAuRole("admin_outlet"); setAuOutlet(isSuper ? "solo" : (myOutlet || "solo")); }
    setAuPassword("");
    setShowAdminForm(true);
  }

  async function saveAdmin() {
    if (!auNama.trim()) { alert("Isi nama"); return; }
    if (!editAdmin && (!auEmail.trim() || !auPassword)) { alert("Isi email dan password"); return; }
    setSavingAdmin(true);
    const body = editAdmin
      ? { id: editAdmin.id, nama: auNama, role: auRole, outlet: auOutlet, ...(auPassword ? { password: auPassword } : {}) }
      : { nama: auNama, email: auEmail, password: auPassword, role: auRole, outlet: auOutlet };
    const res = await authFetch("/api/admin-users", { method: editAdmin ? "PATCH" : "POST", body: JSON.stringify(body) });
    const json = await res.json();
    setSavingAdmin(false);
    if (!res.ok) { alert("Gagal: " + json.error); return; }
    logActivity(editAdmin ? "Edit admin" : "Tambah admin", `${auNama} (${auEmail}) · role: ${auRole}`);
    setShowAdminForm(false); fetchAdminList();
  }

  async function toggleAdminAktif(a: AdminUser) {
    const res = await authFetch("/api/admin-users", { method: "PATCH", body: JSON.stringify({ id: a.id, aktif: !a.aktif }) });
    const json = await res.json();
    if (!res.ok) { alert("Gagal: " + json.error); return; }
    logActivity(a.aktif ? "Nonaktifkan admin" : "Aktifkan admin", a.nama || a.email);
    fetchAdminList();
  }

  async function deleteAdmin(a: AdminUser) {
    if (!confirm(`Hapus admin ${a.nama || a.email}? Akun loginnya akan ikut terhapus permanen.`)) return;
    const res = await authFetch(`/api/admin-users?id=${a.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { alert("Gagal: " + json.error); return; }
    logActivity("Hapus admin", a.nama || a.email);
    fetchAdminList();
  }
  const stats = { total: reservations.length, pending: reservations.filter((r) => r.status === "Pending").length, confirmed: reservations.filter((r) => r.status === "Confirmed").length, completed: reservations.filter((r) => r.status === "Completed").length, noshow: reservations.filter((r) => r.status === "No-Show").length, cancelled: reservations.filter((r) => r.status === "Cancelled").length };
  const visibleAdminList = isSuper ? adminList : adminList.filter((a) => a.outlet === myOutlet);
  const statusStyle: Record<string, string> = { Pending: "bg-amber-50 text-amber-700 border-amber-200", Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200", Completed: "bg-blue-50 text-blue-700 border-blue-200", Cancelled: "bg-red-50 text-red-600 border-red-200", "No-Show": "bg-orange-50 text-orange-700 border-orange-300" };

  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-[#E5DDD4] focus:border-[#5C1420] bg-[#FEFCF8] outline-none text-[#3D2E1E] text-sm placeholder-[#C4B9AB] transition-all";
  const labelClass = "block text-[10px] font-bold text-[#5C1420] mb-2 tracking-[0.2em] uppercase";
  const filterClass = "px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-[#FEFCF8] text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420]";

  /* ========== AUTH GATE ========== */
  if (authLoading) return (
    <div className="min-h-screen bg-[#5C1420] flex items-center justify-center">
      <div className="text-center">
        <Image src="/logo.PNG" alt="Yassalam" width={60} height={60} className="mx-auto animate-pulse" />
        <p className="text-[#5C1420]/50 text-sm mt-4">Memuat...</p>
      </div>
    </div>
  );
  if (!session) return <LoginScreen onLogin={() => {
    setShowWelcome(true);
    playWelcomeChime();
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }} />;
  if (profileError) return (
    <div className="min-h-screen bg-[#5C1420] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-white font-serif">Akses Ditolak</h1>
        <p className="text-[#5C1420]/60 text-sm mt-3">Akun <span className="text-[#5C1420]">{session.user.email}</span> belum terdaftar sebagai admin, atau sudah dinonaktifkan.</p>
        <button onClick={handleLogout} className="mt-6 px-6 py-3 rounded-xl border border-[#5C1420]/40 text-[#5C1420] text-sm font-semibold hover:bg-[#5C1420]/10">Logout</button>
      </div>
    </div>
  );

  const sidebarGroups = [
    {
      key: "operasional", label: "Operasional",
      items: [
        { key: "reservasi", label: "Reservasi", icon: "📋" },
        { key: "scan", label: "Scan Tiket", icon: "📷" },
        { key: "kalender", label: "Kalender", icon: "📅" },
      ],
    },
    {
      key: "konten", label: "Konten & Katalog",
      items: [
        { key: "area", label: "Area & Meja", icon: "🏛" },
        { key: "gabungan", label: "Gabungan", icon: "🔗" },
        { key: "menu", label: "Menu", icon: "🍽" },
      ],
    },
    {
      key: "manajemen", label: "Manajemen",
      items: [
        { key: "laporan", label: "Laporan", icon: "📈" },
        ...(isElevated ? [
          { key: "admin", label: "Kelola Admin", icon: "👤" },
          { key: "log", label: "Log Aktivitas", icon: "🕘" },
          { key: "pengaturan", label: "Pengaturan", icon: "🔧" },
        ] : []),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F2] md:flex">
      {showWelcome && (() => {
        const jam = new Date().getHours();
        const sapaan = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam";
        const namaTampil = myNama || session.user.email?.split("@")[0] || "Admin";
        return (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
              <div className="bg-[#3D0D14] px-8 py-8 text-center">
                <Image src="/logo.PNG" alt="Yassalam" width={56} height={56} className="mx-auto mb-3" />
                <div className="w-8 h-px bg-[#C8973E] mx-auto" />
              </div>
              <div className="px-8 py-7 text-center">
                <p className="text-sm text-[#9A8B7A] mb-1">{sapaan},</p>
                <h2 className="font-serif text-2xl text-[#3D2E1E] mb-2 capitalize">{namaTampil}</h2>
                <p className="text-sm text-[#9A8B7A] mb-6">
                  {isSuper ? "Selamat bekerja, Super Admin." : isManajer ? `Selamat bekerja, Manajer Outlet ${myOutlet === "solo" ? "Solo" : "Yogyakarta"}.` : `Selamat bekerja, Admin ${myOutlet === "solo" ? "Solo" : "Yogyakarta"}.`}
                </p>
                <button onClick={() => setShowWelcome(false)}
                  className="w-full h-11 rounded-lg bg-[#5C1420] text-[#F5EBD8] text-sm font-semibold active:scale-[0.98] transition-all">
                  Mulai Kerja
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* SIDEBAR — desktop: fixed left column, mobile: top bar with scrollable nav */}
      <aside className="md:w-[220px] md:shrink-0 bg-[#5C1420] md:h-screen md:sticky md:top-0 md:flex md:flex-col md:overflow-y-auto">
        {/* Logo bar */}
        <div className="flex items-center justify-between px-4 py-3.5 md:py-5 md:px-5">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.PNG" alt="Yassalam" width={32} height={32} className="rounded-md" />
            <div className="hidden md:block">
              <p className="text-white text-xs font-bold tracking-wide">YASSALAM</p>
              <p className="text-white/60 text-[10px]">Dashboard Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="md:hidden text-white/60 hover:text-white text-xs border border-white/20 rounded-lg px-3 py-1.5">Logout</button>
        </div>

        {/* Nav items — horizontal scroll on mobile, vertical on desktop */}
        {/* Nav mobile — tetap flat, scroll horizontal seperti sebelumnya */}
        <nav className="flex md:hidden gap-1 px-3 pb-3 overflow-x-auto scrollbar-none">
          {sidebarGroups.flatMap((g) => g.items).map((item) => (
            <button key={item.key} onClick={() => { playClick(); setTab(item.key as typeof tab); setDrillArea(null); setDrillKategori(null); }}
              className={`shrink-0 flex items-center gap-2.5 whitespace-nowrap px-3.5 py-2.5 rounded-lg text-sm transition-all ${tab === item.key ? "bg-white/15 text-white font-bold shadow-sm" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"}`}>
              <span>{item.icon}</span> {item.label}
              {item.key === "reservasi" && stats.total > 0 && (
                <span className="ml-auto text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">{stats.total}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Nav desktop — dikelompokkan per section, bisa dilipat */}
        <nav className="hidden md:flex md:flex-col gap-1 px-3 md:flex-1 md:overflow-y-auto">
          {sidebarGroups.map((group) => {
            const isOpen = openGroup === group.key;
            return (
              <div key={group.key} className="mb-1">
                <button onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold text-white/55 tracking-wide uppercase hover:text-white/80 transition-colors">
                  {group.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1 pb-1.5">
                    {group.items.map((item) => (
                      <button key={item.key} onClick={() => { playClick(); setTab(item.key as typeof tab); setDrillArea(null); setDrillKategori(null); }}
                        className={`flex items-center gap-2.5 whitespace-nowrap px-3.5 py-2.5 rounded-lg text-sm transition-all ${tab === item.key ? "bg-white/15 text-white font-bold shadow-sm" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"}`}>
                        <span>{item.icon}</span> {item.label}
                        {item.key === "reservasi" && stats.total > 0 && (
                          <span className="ml-auto text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">{stats.total}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom section — desktop only */}
        <div className="hidden md:block p-4 mt-auto border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(session.user.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[11px] font-medium truncate">{session.user.email}</p>
              <p className="text-white/60 text-[10px]">{isSuper ? "★ Super Admin" : isManajer ? `★ Manajer ${myOutlet === "solo" ? "Solo" : "Yogyakarta"}` : `Admin ${myOutlet === "solo" ? "Solo" : "Yogyakarta"}`}</p>
            </div>
          </div>
          <button onClick={() => setShowChangePassword(true)} className="w-full mb-2 py-2 rounded-lg border border-white/25 text-white/80 text-xs font-semibold hover:bg-white/5 transition-all">🔒 Ubah Password</button>
          <div className="flex gap-2">
            <Link href="/" className="flex-1 text-center py-2 rounded-lg border border-white/25 text-white/80 text-xs font-semibold hover:bg-white/5 transition-all">← Website</Link>
            <button onClick={handleLogout} className="flex-1 py-2 rounded-lg border border-white/25 text-white/80 text-xs font-semibold hover:bg-white/5 transition-all">Logout</button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">

        {/* ========== TAB RESERVASI ========== */}
        {tab === "reservasi" && (<>
          <div className="flex justify-end mb-4">
            <button onClick={() => openReservasiForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20 active:scale-[0.98] transition-all">+ Reservasi Baru</button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, color: "text-[#3D2E1E]", icon: "📊" },
              { label: "Pending", value: stats.pending, color: "text-amber-600", icon: "⏳" },
              { label: "Confirmed", value: stats.confirmed, color: "text-emerald-600", icon: "✅" },
              { label: "Completed", value: stats.completed, color: "text-blue-600", icon: "🎉" },
              { label: "No-Show", value: stats.noshow, color: "text-orange-600", icon: "👻" },
              { label: "Cancelled", value: stats.cancelled, color: "text-red-500", icon: "✕" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-[#E5DDD4] rounded-xl p-3 sm:p-4">
                <span className="text-sm">{s.icon}</span>
                <p className={`text-xl sm:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-[#9A8B7A] tracking-wider uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#E5DDD4] rounded-xl p-4 mb-4 space-y-2.5">
            <span className="text-[#5C1420] text-xs font-bold tracking-wider uppercase">Filter</span>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Cari nama / no. HP..." className={filterClass + " col-span-2 sm:w-56"} />
            {isSuper ? (
              <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)} className={filterClass}>
                <option value="">Semua Outlet</option><option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
              </select>
            ) : (
              <span className="px-3 py-2 rounded-xl bg-[#5C1420]/10 border border-[#5C1420]/20 text-sm font-bold text-[#5C1420] capitalize">
                📍 {myOutlet === "solo" ? "Solo" : "Yogyakarta"}
              </span>
            )}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterClass}>
              <option value="">Semua Status</option><option value="Pending">Pending</option><option value="Confirmed">Confirmed</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
            </select>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={filterClass} />
            <button onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-2 rounded-xl border border-[#5C1420]/30 text-[#5C1420] text-sm font-bold hover:bg-[#5C1420]/5">📅 Hari Ini</button>
            {(filterOutlet || filterStatus || filterDate || searchQuery) && <button onClick={() => { setFilterOutlet(""); setFilterStatus(""); setFilterDate(""); setSearchQuery(""); }} className="text-sm text-[#5C1420] hover:underline col-span-2 sm:col-span-1">✕ Reset</button>}
            </div>
          </div>

          {showReservasiForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editingReservasiId ? "Edit Reservasi" : "Reservasi Baru"}</h3><p className="text-[#9A8B7A] text-xs mt-1">{editingReservasiId ? "Ubah detail reservasi yang sudah ada" : "Untuk tamu walk-in atau yang telepon langsung"}</p><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>

                <div><label className={labelClass}>Outlet</label>
                  <select value={rOutlet} onChange={(e) => { setROutlet(e.target.value); setRMejaId(""); }} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}>
                    <option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                  </select>
                </div>
                <div><label className={labelClass}>Nama Tamu</label><input value={rNama} onChange={(e) => setRNama(e.target.value)} placeholder="Nama tamu" className={inputClass} /></div>
                <div><label className={labelClass}>No. WhatsApp</label><input value={rWhatsapp} onChange={(e) => setRWhatsapp(e.target.value)} placeholder="08123456789" className={inputClass} /></div>
                <div><label className={labelClass}>Tanggal</label><input type="date" value={rTanggal} onChange={(e) => setRTanggal(e.target.value)} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Jam Mulai</label>
                    <div className="flex gap-2">
                      {(() => {
                        const isToday = rTanggal === new Date().toISOString().split("T")[0];
                        const nowH = new Date().getHours();
                        const nowM = new Date().getMinutes();
                        const selectedH = Number(rJam.split(":")[0] || -1);
                        return (<>
                          <select value={rJam.split(":")[0] || ""} onChange={(e) => {
                            const hh = e.target.value;
                            const mm = rJam.split(":")[1] || "00";
                            const val = hh ? `${hh}:${mm}` : "";
                            setRJam(val);
                            if (val) {
                              const totalMin = Number(hh) * 60 + Number(mm) + 120;
                              const eh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
                              const em = String(totalMin % 60).padStart(2, "0");
                              setRJamSelesai(`${eh}:${em}`);
                            }
                          }} className={inputClass + " !w-auto flex-1"}>
                            <option value="">Jam</option>
                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h, i) => (
                              <option key={h} value={h} disabled={isToday && i < nowH}>{h}</option>
                            ))}
                          </select>
                          <select value={rJam.split(":")[1] || ""} onChange={(e) => {
                            const mm = e.target.value;
                            const hh = rJam.split(":")[0] || "00";
                            const val = mm ? `${hh}:${mm}` : "";
                            setRJam(val);
                            if (val) {
                              const totalMin = Number(hh) * 60 + Number(mm) + 120;
                              const eh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
                              const em = String(totalMin % 60).padStart(2, "0");
                              setRJamSelesai(`${eh}:${em}`);
                            }
                          }} className={inputClass + " !w-auto flex-1"}>
                            <option value="">Menit</option>
                            {["00", "15", "30", "45"].map((m) => (
                              <option key={m} value={m} disabled={isToday && selectedH === nowH && Number(m) < nowM}>{m}</option>
                            ))}
                          </select>
                        </>);
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Jam Selesai</label>
                    <div className="flex gap-2">
                      <select value={rJamSelesai.split(":")[0] || ""} onChange={(e) => {
                        const hh = e.target.value;
                        const mm = rJamSelesai.split(":")[1] || "00";
                        setRJamSelesai(hh ? `${hh}:${mm}` : "");
                      }} className={inputClass + " !w-auto flex-1"}>
                        <option value="">Jam</option>
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select value={rJamSelesai.split(":")[1] || ""} onChange={(e) => {
                        const mm = e.target.value;
                        const hh = rJamSelesai.split(":")[0] || "00";
                        setRJamSelesai(mm ? `${hh}:${mm}` : "");
                      }} className={inputClass + " !w-auto flex-1"}>
                        <option value="">Menit</option>
                        {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#B5A999] -mt-3">Otomatis terisi 2 jam dari jam mulai — bisa diubah manual kalau perlu.</p>
                <div><label className={labelClass}>Jumlah Tamu</label><input type="number" min="1" value={rJumlahTamu} onChange={(e) => { setRJumlahTamu(e.target.value); setRMejaId(""); }} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Pilih Meja <span className="normal-case font-normal text-[#B5A999]">(opsional)</span></label>
                  {(() => {
                    const jumlahNum = Number(rJumlahTamu) || 1;
                    const mejaOutlet = tables.filter((t) => t.outlet === rOutlet);
                    const mejaCocok = mejaOutlet.filter((t) => t.kapasitas >= jumlahNum);
                    const daftarMeja = mejaCocok.length > 0 ? mejaCocok : mejaOutlet;
                    return (
                      <>
                        <select value={rMejaId} onChange={(e) => setRMejaId(e.target.value)} className={inputClass}>
                          <option value="">Belum ditentukan</option>
                          {daftarMeja.map((t) => (
                            <option key={t.Id} value={t.Id}>{t.nama_meja || `Meja ${t.nomor_meja}`} · {t.kapasitas} orang{t.kapasitas < jumlahNum ? " (kurang muat)" : ""}</option>
                          ))}
                        </select>
                        {mejaCocok.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1.5">Tidak ada meja dengan kapasitas cukup untuk {jumlahNum} orang. Semua meja ditampilkan, pertimbangkan meja gabungan.</p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div><label className={labelClass}>Status</label>
                  <select value={rStatus} onChange={(e) => setRStatus(e.target.value)} className={inputClass}>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div><label className={labelClass}>DP (Rp) <span className="normal-case font-normal text-[#B5A999]">(opsional)</span></label><input type="number" value={rDpAmount} onChange={(e) => setRDpAmount(e.target.value)} placeholder="0" className={inputClass} /></div>
                <div><label className={labelClass}>Catatan <span className="normal-case font-normal text-[#B5A999]">(opsional)</span></label><textarea value={rCatatan} onChange={(e) => setRCatatan(e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={rAktifkanMenu} onChange={(e) => setRAktifkanMenu(e.target.checked)} className="w-4 h-4 accent-[#5C1420]" />
                  <span className="text-sm text-[#3D2E1E]">Aktifkan link pesan menu untuk reservasi ini</span>
                </label>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => { setShowReservasiForm(false); setEditingReservasiId(null); }} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveReservasiManual} disabled={savingReservasi} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold disabled:opacity-50">{savingReservasi ? "Menyimpan..." : "Simpan"}</button>
                </div>
              </div>
            </div>
          )}

          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const filteredReservations = q
              ? reservations.filter((r) => r.nama_tamu.toLowerCase().includes(q) || r.no_whatsapp.includes(q))
              : reservations;
            const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
            const pageSafe = Math.min(currentPage, totalPages);
            const paginatedReservations = filteredReservations.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
            return loading ? <p className="text-center text-[#B5A999] py-16">Memuat data...</p> : filteredReservations.length === 0 ? (
              <p className="text-center text-[#B5A999] py-16">{q ? `Tidak ada reservasi dengan kata kunci "${searchQuery}"` : "Tidak ada reservasi"}</p>
            ) : (
            <>
            <div className="space-y-4">
              {paginatedReservations.map((r) => (
                <div key={r.Id} className="bg-white border border-[#E5DDD4] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#5C1420]/5 transition-all">
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#3D2E1E] text-xl font-serif">{r.nama_tamu}</h3>
                            {r.share_token && reservations.filter((x) => x.share_token === r.share_token).length > 1 && (
                              <span className="bg-[#5C1420]/10 text-[#5C1420] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#5C1420]/20">Gabungan {reservations.filter((x) => x.share_token === r.share_token).length} meja</span>
                            )}
                            {(() => {
                              const hist = customerHistoryMap[normalizeWhatsapp(r.no_whatsapp)];
                              if (!hist || hist.total < Number(thresholdLama)) return null;
                              return (
                                <>
                                  <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-200">👤 Pelanggan Lama · {hist.total}x</span>
                                  {hist.noShow >= Number(thresholdNoShow) && (
                                    <span className="bg-orange-50 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-orange-200">⚠ {hist.noShow}x No-Show</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-[#9A8B7A] tracking-wide uppercase mt-1 capitalize">{r.outlet} · {r.tanggal}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] px-3 py-1 rounded-full border-2 font-bold tracking-wider uppercase ${statusStyle[r.status] || ""}`}>{r.status}</span>
                          {r.status === "Confirmed" && (() => {
                            const info = getWaktuInfo(r);
                            const toneClass = info.tone === "active" ? "text-emerald-600" : info.tone === "overdue" ? "text-[#B5A999]" : "text-[#5C1420]";
                            return <span className={`text-[10px] font-bold ${toneClass}`}>{info.label}</span>;
                          })()}
                          {r.status === "Confirmed" && r.checked_in_at && (
                            <span className="text-[10px] font-bold text-emerald-600">✓ Sudah Hadir</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-4 mt-4 border-y border-[#F0EAE0]">
                        <div>
                          <p className="text-[9px] text-[#B5A999] font-bold uppercase tracking-wider mb-0.5">Jam</p>
                          <p className="text-sm font-semibold text-[#3D2E1E]">{formatJam(r.jam)} – {formatJam(r.jam_selesai)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#B5A999] font-bold uppercase tracking-wider mb-0.5">Tamu</p>
                          <p className="text-sm font-semibold text-[#3D2E1E]">{r.jumlah_tamu} orang</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#B5A999] font-bold uppercase tracking-wider mb-0.5">Meja</p>
                          <p className="text-sm font-semibold text-[#5C1420]">{r.meja_id ? getMejaLabel(r.meja_id) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#B5A999] font-bold uppercase tracking-wider mb-0.5">DP</p>
                          <p className="text-sm font-semibold text-[#3D2E1E]">{r.dp_amount ? formatRupiah(r.dp_amount) : "Belum bayar"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm mt-3">
                        <span className="text-[#9A8B7A]">Kontak</span>
                        <span className="text-[#3D2E1E] font-medium">{r.no_whatsapp}</span>
                      </div>
                      {r.catatan && <p className="text-sm text-[#9A8B7A] italic border-l-2 border-[#5C1420]/30 pl-3 mt-3">&ldquo;{r.catatan}&rdquo;</p>}
                    </div>

                    <div className="lg:w-56 shrink-0 bg-[#FBF8F3] border-t lg:border-t-0 lg:border-l border-[#E5DDD4] p-5 flex flex-row flex-wrap lg:flex-col gap-2">
                      <button onClick={() => openReservasiForm(r)} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-sm font-semibold hover:bg-[#5C1420]/5">Edit</button>
                      {r.status === "Pending" && (<>
                        <button onClick={() => updateStatus(r.Id, "Confirmed")} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 active:scale-[0.98] transition-all">Konfirmasi</button>
                        <button onClick={() => updateStatus(r.Id, "Cancelled")} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50">Tolak</button>
                      </>)}
                      {r.status === "Confirmed" && !r.checked_in_at && (
                        <button onClick={() => tandaiHadir(r.Id)} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold active:scale-[0.98]">✓ Tandai Hadir</button>
                      )}
                      {r.status === "Confirmed" && (
                        <button onClick={() => { if (confirm(`Batalkan reservasi ${r.nama_tamu}?`)) updateStatus(r.Id, "Cancelled"); }} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50">Batalkan</button>
                      )}
                      {r.status === "No-Show" && (
                        <button onClick={() => updateStatus(r.Id, "Confirmed")} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-sm font-semibold hover:bg-[#5C1420]/5">Kembalikan</button>
                      )}
                      {r.status === "Cancelled" && <button onClick={() => updateStatus(r.Id, "Pending")} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-sm font-semibold hover:bg-[#5C1420]/5">Kembalikan</button>}
                      {r.share_token && (
                        <button onClick={() => sendMenuLinkWA(r)} className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border-2 border-[#25D366] text-[#1DA851] text-sm font-bold hover:bg-[#25D366]/10">
                          Kirim Link Menu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TOMBOL & PANEL PESANAN MENU */}
                  <div className="px-6 pb-5 pt-3 border-t border-[#E5DDD4]">
                    <button onClick={() => toggleExpandOrders(r)}
                      className="flex items-center gap-2 text-sm font-bold text-[#5C1420] hover:text-[#3D0D14] transition-colors">
                      <span>{expandedKeys.has(orderKey(r)) ? "▼" : "▶"}</span>
                      🍽 Pesanan Menu
                      {r.menu_finalized ? (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Terkirim</span>
                      ) : (
                        <span className="bg-[#F9F6F2] text-[#B5A999] border border-[#E5DDD4] text-[10px] px-2 py-0.5 rounded-full font-bold">Belum Dikirim</span>
                      )}
                    </button>

                    {expandedKeys.has(orderKey(r)) && (
                      <div className="mt-3">
                        {loadingOrderKeys.has(orderKey(r)) ? (
                          <p className="text-sm text-[#B5A999]">Memuat pesanan...</p>
                        ) : (ordersCache[orderKey(r)] || []).length === 0 ? (
                          <p className="text-sm text-[#B5A999] bg-[#F9F6F2] rounded-xl p-3">Belum ada pesanan menu.</p>
                        ) : (
                          <div className="bg-[#F9F6F2] border border-[#E5DDD4] rounded-xl divide-y divide-[#E5DDD4] overflow-hidden">
                            {(ordersCache[orderKey(r)] || []).map((o) => (
                              <div key={o.Id} className="p-3 flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#3D2E1E] text-sm">{o.jumlah_porsi}× {getOrderMenuName(o.menu_id)}</p>
                                  {getOrderVarianName(o.varian_id) && <p className="text-xs text-[#9A8B7A]">Varian: {getOrderVarianName(o.varian_id)}</p>}
                                  {o.addon_ids?.length > 0 && <p className="text-xs text-[#9A8B7A]">Add-on: {getOrderAddonNames(o.addon_ids)}</p>}
                                  {o.nama_pemesan && <p className="text-xs text-[#5C1420] font-semibold">Pemesan: {o.nama_pemesan}</p>}
                                  {o.catatan && <p className="text-xs text-[#9A8B7A] italic">📝 {o.catatan}</p>}
                                </div>
                                <p className="font-bold text-[#5C1420] text-sm shrink-0">{formatRupiah(o.subtotal)}</p>
                              </div>
                            ))}
                            {(() => {
                              const items = ordersCache[orderKey(r)] || [];
                              const subtotal = items.reduce((s, o) => s + o.subtotal, 0);
                              const pajak = Math.round(subtotal * 0.1);
                              return (
                                <div className="p-3 bg-white space-y-1">
                                  <div className="flex justify-between text-xs"><span className="text-[#9A8B7A]">Subtotal</span><span className="text-[#3D2E1E]">{formatRupiah(subtotal)}</span></div>
                                  <div className="flex justify-between text-xs"><span className="text-[#9A8B7A]">Pajak (10%)</span><span className="text-[#3D2E1E]">{formatRupiah(pajak)}</span></div>
                                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#E5DDD4]"><span className="text-[#3D2E1E]">Total</span><span className="text-[#5C1420]">{formatRupiah(subtotal + pajak)}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}
                  className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] text-[#5C1420] text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F9F6F2]">← Sebelumnya</button>
                <span className="text-sm text-[#9A8B7A] px-3">
                  Halaman <span className="font-bold text-[#3D2E1E]">{pageSafe}</span> dari <span className="font-bold text-[#3D2E1E]">{totalPages}</span>
                  <span className="hidden sm:inline"> · {filteredReservations.length} total reservasi</span>
                </span>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}
                  className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] text-[#5C1420] text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F9F6F2]">Selanjutnya →</button>
              </div>
            )}
            </>
            );
          })()}
        </>)}
{/* ========== TAB SCAN TIKET ========== */}
        {tab === "scan" && (
          <ScanTiketPanel
            lockedOutlet={lockedOutlet}
            formatJam={formatJam}
            getMejaLabel={getMejaLabel}
            tandaiHadirByToken={tandaiHadirByToken}
          />
        )}
{/* ========== TAB KALENDER ========== */}
        {tab === "kalender" && (<>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#3D2E1E]">Kalender Ketersediaan Meja</h2>
            <p className="text-[#9A8B7A] text-sm mt-1">Lihat jadwal booking meja per tanggal, atau cari ketersediaan lintas tanggal.</p>
          </div>

          <div className="flex gap-2 mb-5 border-b border-[#E5DDD4]">
            <button onClick={() => setKalSubTab("harian")} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${kalSubTab === "harian" ? "border-[#5C1420] text-[#5C1420]" : "border-transparent text-[#9A8B7A] hover:text-[#5C1420]"}`}>📅 Kalender Harian</button>
            <button onClick={() => setKalSubTab("cari")} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${kalSubTab === "cari" ? "border-[#5C1420] text-[#5C1420]" : "border-transparent text-[#9A8B7A] hover:text-[#5C1420]"}`}>🔍 Cari Meja</button>
          </div>

          {kalSubTab === "cari" && (
            <div className="bg-white border border-[#E5DDD4] rounded-xl p-6">
              <h3 className="text-lg font-bold text-[#3D2E1E] font-serif mb-1">Cari Meja Tersedia</h3>
              <p className="text-[#9A8B7A] text-sm mb-5">Cari tanggal mana saja yang punya meja kosong sesuai kapasitas & jam, tanpa perlu geser tanggal satu-satu.</p>

              <div className="flex flex-wrap gap-3 items-end mb-2">
                {isSuper && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Outlet</label>
                    <select value={kalOutlet} onChange={(e) => setKalOutlet(e.target.value)} className={filterClass}>
                      <option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Jumlah Tamu</label>
                  <input type="number" min="1" value={cariJumlahTamu} onChange={(e) => setCariJumlahTamu(e.target.value)} className={filterClass + " w-28"} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Jam Mulai</label>
                  <div className="flex gap-1.5">
                    <select value={cariJamMulai.split(":")[0] || ""} onChange={(e) => {
                      const hh = e.target.value; const mm = cariJamMulai.split(":")[1] || "00";
                      setCariJamMulai(hh ? `${hh}:${mm}` : "");
                    }} className={filterClass + " !w-auto"}>
                      <option value="">Jam</option>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select value={cariJamMulai.split(":")[1] || ""} onChange={(e) => {
                      const mm = e.target.value; const hh = cariJamMulai.split(":")[0] || "00";
                      setCariJamMulai(mm ? `${hh}:${mm}` : "");
                    }} className={filterClass + " !w-auto"}>
                      <option value="">Menit</option>
                      {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Dari Tanggal</label>
                  <input type="date" value={cariDariTanggal} onChange={(e) => setCariDariTanggal(e.target.value)} className={filterClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Sampai Tanggal</label>
                  <input type="date" value={cariSampaiTanggal} onChange={(e) => setCariSampaiTanggal(e.target.value)} className={filterClass} />
                </div>
                <button onClick={cariMejaMultiTanggal} disabled={loadingCariMulti} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 disabled:opacity-50">
                  {loadingCariMulti ? "Mencari..." : "Cari"}
                </button>
              </div>
{cariMatriks && (
                <div className="mt-6 overflow-x-auto">
                  <table className="border-collapse text-sm" style={{ minWidth: `${160 + cariMatriks.dates.length * 70}px` }}>
                    <thead>
                      <tr className="bg-[#F9F6F2]">
                        <th className="text-left px-3 py-2 text-[10px] text-[#9A8B7A] font-bold uppercase border-b border-[#E5DDD4]" style={{ width: "160px", minWidth: "160px" }}>Meja / Gabungan</th>
                        {cariMatriks.dates.map((tgl) => {
                          const d = new Date(tgl + "T00:00:00");
                          const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
                          return <th key={tgl} className="text-center px-2 py-2 text-[10px] text-[#9A8B7A] font-semibold border-l border-b border-[#E5DDD4]" style={{ minWidth: "60px" }}>{label}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {cariMatriks.mejaRows.length === 0 && cariMatriks.gabunganRows.length === 0 && (
                        <tr><td colSpan={cariMatriks.dates.length + 1} className="text-center text-sm text-[#B5A999] py-6">Tidak ada meja/gabungan dengan kapasitas cukup untuk {cariJumlahTamu} orang.</td></tr>
                      )}
                      {cariMatriks.mejaRows.map((row) => (
                        <tr key={`m${row.table.Id}`} className="hover:bg-[#FEFCF8]">
                          <td className="px-3 py-2 border-b border-[#E5DDD4]">
                            <p className="font-semibold text-[#3D2E1E]">{row.table.nama_meja || `Meja ${row.table.nomor_meja}`}</p>
                            <p className="text-[10px] text-[#9A8B7A]">{row.table.kapasitas} orang</p>
                          </td>
                          {row.avail.map((ok, i) => (
                            <td key={i} className="text-center border-l border-b border-[#E5DDD4]">
                              {ok ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-[#D8CFC2]">✕</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {cariMatriks.gabunganRows.map((row) => (
                        <tr key={`g${row.gabungan.Id}`} className="hover:bg-[#FEFCF8] bg-sky-50/40">
                          <td className="px-3 py-2 border-b border-[#E5DDD4]">
                            <p className="font-semibold text-[#3D2E1E]">{row.gabungan.nama} <span className="text-[9px] text-sky-700 font-bold">GABUNGAN</span></p>
                            <p className="text-[10px] text-[#9A8B7A]">{row.gabungan.kapasitas_total} orang</p>
                          </td>
                          {row.avail.map((ok, i) => (
                            <td key={i} className="text-center border-l border-b border-[#E5DDD4]">
                              {ok ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-[#D8CFC2]">✕</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {kalSubTab === "harian" && (<>

          <div className="bg-white border border-[#E5DDD4] rounded-xl p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(kalTanggal); d.setDate(d.getDate() - 1); setKalTanggal(d.toISOString().split("T")[0]); }}
                  className="w-8 h-8 rounded-lg border border-[#E5DDD4] flex items-center justify-center text-[#3D2E1E] hover:bg-[#F9F6F2]">←</button>
                <input type="date" value={kalTanggal} onChange={(e) => setKalTanggal(e.target.value)} className={filterClass} />
                <button onClick={() => { const d = new Date(kalTanggal); d.setDate(d.getDate() + 1); setKalTanggal(d.toISOString().split("T")[0]); }}
                  className="w-8 h-8 rounded-lg border border-[#E5DDD4] flex items-center justify-center text-[#3D2E1E] hover:bg-[#F9F6F2]">→</button>
              </div>
              <button onClick={() => setKalTanggal(new Date().toISOString().split("T")[0])}
                className="px-3 py-2 rounded-xl border border-[#5C1420]/30 text-[#5C1420] text-sm font-bold hover:bg-[#5C1420]/5">📅 Hari Ini</button>
              {isSuper && (
                <select value={kalOutlet} onChange={(e) => setKalOutlet(e.target.value)} className={filterClass}>
                  <option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                </select>
              )}
              <div className="ml-auto flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#5C1420] inline-block" /> Confirmed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-400 inline-block" /> Di-Hold</span>
              </div>
            </div>
            {!loadingKalender && (() => {
              const outletTables = tables.filter((t) => t.outlet === (lockedOutlet || kalOutlet));
              const bookedIds = new Set(kalReservations.map((r) => r.meja_id));
              const totalMeja = outletTables.length;
              const terpakai = outletTables.filter((t) => bookedIds.has(t.Id)).length;
              return (
                <div className="flex gap-6 mt-3 pt-3 border-t border-[#E5DDD4]">
                  <div><p className="text-lg font-bold text-[#3D2E1E]">{totalMeja}</p><p className="text-[10px] text-[#9A8B7A] uppercase">Total Meja</p></div>
                  <div><p className="text-lg font-bold text-[#5C1420]">{terpakai}</p><p className="text-[10px] text-[#9A8B7A] uppercase">Terpakai</p></div>
                  <div><p className="text-lg font-bold text-emerald-600">{totalMeja - terpakai}</p><p className="text-[10px] text-[#9A8B7A] uppercase">Tersedia</p></div>
                  <div><p className="text-lg font-bold text-amber-600">{kalReservations.length}</p><p className="text-[10px] text-[#9A8B7A] uppercase">Booking</p></div>
                </div>
              );
            })()}
          </div>

          {loadingKalender ? (
            <p className="text-center text-[#B5A999] py-16">Memuat data...</p>
          ) : (() => {
            const outletTables = tables.filter((t) => t.outlet === (lockedOutlet || kalOutlet));
            const outletAreas = areas.filter((a) => a.outlet === (lockedOutlet || kalOutlet));
            const jamSlots = ["07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"];

            if (outletTables.length === 0) return <p className="text-center text-[#B5A999] py-10">Belum ada meja terdaftar.</p>;

            const grouped: { areaName: string; tables: TableData[] }[] = [];
            if (outletAreas.length > 0) {
              for (const a of outletAreas) {
                const at = outletTables.filter((t) => t.posisi === a.slug);
                if (at.length > 0) grouped.push({ areaName: a.nama, tables: at });
              }
              const ung = outletTables.filter((t) => !outletAreas.some((a) => a.slug === t.posisi));
              if (ung.length > 0) grouped.push({ areaName: "Lainnya", tables: ung });
            } else {
              grouped.push({ areaName: "Semua Meja", tables: outletTables });
            }

            return (
              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.areaName} className="bg-white border border-[#E5DDD4] rounded-xl overflow-hidden">
                    <div className="bg-[#F9F6F2] px-4 py-2.5 border-b border-[#E5DDD4]">
                      <p className="text-sm font-bold text-[#3D2E1E]">{group.areaName} <span className="text-[#9A8B7A] font-normal">· {group.tables.length} meja</span></p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse table-fixed" style={{ minWidth: "1000px" }}>
                        <thead>
                          <tr className="bg-[#F9F6F2]">
                            <th className="text-left px-4 py-2 text-[10px] text-[#9A8B7A] font-bold uppercase border-b border-[#E5DDD4]" style={{ width: "160px", minWidth: "160px" }}>Meja</th>
                            {jamSlots.map((j) => (
                              <th key={j} className="text-center px-0 py-2 text-[10px] text-[#9A8B7A] font-semibold border-l border-b border-[#E5DDD4]">
                                {j}:00
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.tables.map((t) => {
                            const bookings = kalReservations.filter((r) => r.meja_id === t.Id);

                            return (
                              <tr key={t.Id} className="hover:bg-[#FEFCF8] transition-colors">
                                <td className="px-4 py-3 border-b border-[#E5DDD4] align-middle" style={{ width: "160px", minWidth: "160px" }}>
                                  <p className="text-sm font-bold text-[#3D2E1E] truncate">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                                  <p className="text-[10px] text-[#9A8B7A]">{t.kapasitas} orang</p>
                                </td>
                                {jamSlots.map((j) => {
                                  const jamNum = Number(j);
                                  const cellStart = jamNum * 60;
                                  const cellEnd = (jamNum + 1) * 60;

                                  const booking = bookings.find((r) => {
                                    const bStart = timeToMinutes(r.jam);
                                    const bParsedEnd = r.jam_selesai ? timeToMinutes(r.jam_selesai) : 0;
                                    const bEnd = bParsedEnd > bStart ? bParsedEnd : bStart + 120;
                                    return bStart < cellEnd && bEnd >= cellStart;
                                  });

                                  const hold = !booking ? kalHolds.find((h) => {
                                    if (h.meja_id !== t.Id) return false;
                                    const hStart = timeToMinutes(h.jam);
                                    const hParsedEnd = h.jam_selesai ? timeToMinutes(h.jam_selesai) : 0;
                                    const hEnd = hParsedEnd > hStart ? hParsedEnd : hStart + 120;
                                    return hStart < cellEnd && hEnd >= cellStart;
                                  }) : null;

                                  if (hold) {
                                    const hStart = timeToMinutes(hold.jam);
                                    const isFirst = hStart >= cellStart && hStart < cellEnd;
                                    const sisaMs = new Date(hold.expires_at).getTime() - now.getTime();
                                    const sisaMenit = Math.max(0, Math.floor(sisaMs / 60000));
                                    const sisaDetik = Math.max(0, Math.floor((sisaMs % 60000) / 1000));
                                    return (
                                      <td key={j} className={`border-b border-[#E5DDD4] bg-sky-400 ${isFirst ? "border-l" : ""}`} style={{ padding: "8px 0" }}>
                                        {isFirst && (
                                          <div className="px-3">
                                            <p className="text-white text-sm font-bold whitespace-nowrap">🔒 Di-Hold</p>
                                            <p className="text-white/80 text-xs whitespace-nowrap">
                                              {formatJam(hold.jam)} – {formatJam(hold.jam_selesai)} · sisa {sisaMenit}:{String(sisaDetik).padStart(2, "0")}
                                            </p>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  }

                                  if (!booking) {
                                    return (
                                      <td key={j} className="border-l border-b border-[#E5DDD4] text-center">
                                        <span className="text-[9px] text-[#D8CFC2]">Kosong</span>
                                      </td>
                                    );
                                  }

                                  const bStart = timeToMinutes(booking.jam);
                                  const isFirst = bStart >= cellStart && bStart < cellEnd;
                                  const isPending = booking.status === "Pending";
                                  const bgColor = isPending ? "bg-amber-400" : "bg-[#5C1420]";

                                  return (
                                    <td key={j}
                                      title={`${booking.nama_tamu}\n${formatJam(booking.jam)} – ${formatJam(booking.jam_selesai)}\n${booking.jumlah_tamu} orang · ${booking.status}\n📱 ${booking.no_whatsapp}`}
                                      className={`border-b border-[#E5DDD4] ${bgColor} cursor-pointer ${isFirst ? "border-l" : ""}`}
                                      style={{ padding: "8px 0" }}>
                                      {isFirst && (
                                        <div className="px-3">
                                          <p className="text-white text-sm font-bold whitespace-nowrap">{booking.nama_tamu}</p>
                                          <p className="text-white/80 text-xs whitespace-nowrap">{formatJam(booking.jam)} – {formatJam(booking.jam_selesai)} · {booking.jumlah_tamu} org</p>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          </>)}
        </>)}
        {tab === "area" && !drillArea && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Area &amp; Ruangan</h2><p className="text-[#9A8B7A] text-sm mt-1">Klik area untuk kelola meja</p></div>
            <button onClick={() => openAreaForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20 active:scale-[0.98]">+ Tambah Area</button>
          </div>
          {showAreaForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editArea ? "Edit Area" : "Area Baru"}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={aOutlet} onChange={(e) => setAOutlet(e.target.value)} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Area</label><input value={aNama} onChange={(e) => setANama(e.target.value)} placeholder="Contoh: VIP Room" className={inputClass} /></div>
                <div><label className={labelClass}>Slug</label><input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="Contoh: vip" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi</label><textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Urutan</label><input type="number" value={aUrutan} onChange={(e) => setAUrutan(e.target.value)} className={inputClass} /></div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowAreaForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveArea} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((a) => {
              const jumlahMeja = tables.filter((t) => t.outlet === a.outlet && t.posisi === a.slug).length;
              return (
                <div key={a.Id} className="group bg-white rounded-2xl overflow-hidden border-2 border-[#E5DDD4] shadow-md hover:shadow-xl hover:shadow-[#5C1420]/10 hover:border-[#5C1420]/30 transition-all hover:-translate-y-1">
                  <button onClick={() => setDrillArea(a)} className="w-full h-44 relative overflow-hidden block text-left">
                    <AreaCardImage area={a} tables={tables} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <span className="bg-[#5C1420] text-white text-[10px] px-3 py-1 rounded-full font-bold">Max {totalKapasitas(a)} orang</span>
                      <span className="bg-white/90 text-[#3D2E1E] text-[10px] px-3 py-1 rounded-full capitalize font-semibold">{a.outlet}</span>
                    </div>
                  </button>
                  <div className="p-5 space-y-3">
                    <button onClick={() => setDrillArea(a)} className="text-left w-full">
                      <h3 className="font-bold text-[#3D2E1E] text-lg font-serif group-hover:text-[#5C1420] transition-colors">{a.nama} →</h3>
                      <p className="text-[#9A8B7A] text-sm mt-1 line-clamp-2">{a.deskripsi}</p>
                      <p className="text-[#5C1420] text-xs mt-2 font-semibold">{jumlahMeja} meja terdaftar</p>
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); openAreaForm(a); }} className="flex-1 py-2.5 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-sm font-bold hover:bg-[#5C1420]/5">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteArea(a.Id); }} className="py-2.5 px-4 rounded-xl border-2 border-red-200 text-red-400 text-sm hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ========== DRILL-DOWN MEJA ========== */}
        {tab === "area" && drillArea && (<>
          <div className="flex justify-between items-center mb-8">
            <div>
              <button onClick={() => setDrillArea(null)} className="text-sm text-[#5C1420] hover:underline mb-2">← Kembali ke Area</button>
              <h2 className="text-xl font-bold text-[#3D2E1E] font-serif">{drillArea.nama} <span className="text-[#9A8B7A] text-base capitalize">· {drillArea.outlet}</span></h2>
              <p className="text-[#9A8B7A] text-sm mt-1">Total kapasitas: <span className="text-[#5C1420] font-semibold">{totalKapasitas(drillArea)} orang</span></p>
            </div>
            <button onClick={() => openTableForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20">+ Tambah Meja</button>
          </div>
          {showTableForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editTable ? "Edit Meja" : "Meja Baru"}</h3>
                  <p className="text-[#9A8B7A] text-xs mt-1">{drillArea.nama} · <span className="capitalize">{drillArea.outlet}</span></p><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Nomor Meja</label><input type="number" value={tNomor} onChange={(e) => setTNomor(e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Nama Meja <span className="normal-case font-normal text-[#B5A999]">(opsional)</span></label><input value={tNama} onChange={(e) => setTNama(e.target.value)} placeholder="Contoh: Meja Sultan" className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Kapasitas Max</label><input type="number" value={tKap} onChange={(e) => setTKap(e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Kapasitas Min</label><input type="number" value={tKapMin} onChange={(e) => setTKapMin(e.target.value)} placeholder="Opsional" className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Uang Muka (Rp)</label><input type="number" value={tDp} onChange={(e) => setTDp(e.target.value)} placeholder="50000" className={inputClass} /></div>
                  <div><label className={labelClass}>Min. Transaksi (Rp)</label><input type="number" value={tMinTrx} onChange={(e) => setTMinTrx(e.target.value)} placeholder="300000" className={inputClass} /></div>
                </div>
                <p className="text-xs text-[#B5A999]">Kapasitas min = minimal tamu. Min. transaksi = minimal belanja customer.</p>
                <div><label className={labelClass}>Deskripsi Meja <span className="normal-case font-normal text-[#B5A999]">(opsional, tampil ke customer)</span></label><textarea value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={3} placeholder="Meja lesehan luas dengan pemandangan taman, cocok untuk acara keluarga" className={inputClass + " resize-none"} /></div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowTableForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveTable} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).map((t) => (
              <div key={t.Id} className="bg-white border-2 border-[#E5DDD4] rounded-2xl overflow-hidden group hover:border-[#5C1420]/30 hover:shadow-xl hover:shadow-[#5C1420]/5 transition-all">
                <div className="h-40 bg-[#F9F6F2] relative overflow-hidden">
                  {t.foto_url ? (
                    <Image src={t.foto_url} alt={t.nama_meja || `Meja ${t.nomor_meja}`} fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2"><span className="text-3xl text-[#5C1420]/20">📷</span><span className="text-xs text-[#9A8B7A]">Belum ada foto</span></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 bg-[#5C1420] text-white text-[10px] px-3 py-1 rounded-full font-bold">
                    {t.kapasitas_minimum ? `${t.kapasitas_minimum}–${t.kapasitas}` : t.kapasitas} orang
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <p className="font-bold text-[#3D2E1E] text-lg font-serif">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                  {t.nama_meja && <p className="text-[#9A8B7A] text-xs">No. {t.nomor_meja}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-[#5C1420] font-semibold">{t.dp_minimum ? `DP ${formatRupiah(t.dp_minimum)}` : "Tanpa DP"}</span>
                    {t.minimum_transaksi && <span className="text-[#9A8B7A]">Min. trx {formatRupiah(t.minimum_transaksi)}</span>}
                  </div>
                  <label className="inline-block cursor-pointer pt-1">
                    <span className="text-xs text-[#5C1420] font-semibold hover:text-[#3D0D14]">{uploadingTable ? "⏳ Mengupload..." : t.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTablePhoto(t.Id, f); }} />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openTableForm(t)} className="flex-1 py-2 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-xs font-bold hover:bg-[#5C1420]/5">Edit</button>
                    <button onClick={() => deleteTable(t.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {tables.filter((t) => t.outlet === drillArea.outlet && t.posisi === drillArea.slug).length === 0 && (
              <p className="text-[#9A8B7A] col-span-full text-center py-10">Belum ada meja. Klik &quot;+ Tambah Meja&quot;.</p>
            )}
          </div>
        </>)}

        {/* ========== TAB MEJA GABUNGAN ========== */}
        {tab === "gabungan" && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Meja Gabungan</h2><p className="text-[#9A8B7A] text-sm mt-1">Kombinasi 2+ meja untuk rombongan besar. Semua meja otomatis terkunci saat dibooking.</p></div>
            <button onClick={() => openGabunganForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20">+ Buat Gabungan</button>
          </div>
          {showGabunganForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editGabungan ? "Edit Gabungan" : "Gabungan Baru"}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={gOutlet} onChange={(e) => { setGOutlet(e.target.value); setGMejaIds([]); }} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Gabungan</label><input value={gNama} onChange={(e) => setGNama(e.target.value)} placeholder="Contoh: Gabungan Meja 1 + 2" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi <span className="normal-case font-normal text-[#B5A999]">(opsional)</span></label><textarea value={gDesc} onChange={(e) => setGDesc(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Cocok untuk acara keluarga" /></div>
                <div>
                  <label className={labelClass}>Pilih Meja (min 2)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {tables.filter((t) => t.outlet === gOutlet && areas.some((a) => a.slug === t.posisi && a.outlet === t.outlet)).map((t) => (
                      <button key={t.Id} onClick={() => toggleMejaInGabungan(t.Id)}
                        className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${gMejaIds.includes(t.Id) ? "border-[#5C1420] bg-[#F9F6F2]" : "border-[#E5DDD4] hover:border-[#5C1420]/50"}`}>
                        <p className={`font-bold ${gMejaIds.includes(t.Id) ? "text-[#5C1420]" : "text-[#3D2E1E]"}`}>{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
<p className="text-[#9A8B7A] text-xs">{t.kapasitas} orang · {areas.find((a) => a.slug === t.posisi && a.outlet === t.outlet)?.nama || t.posisi}</p>
                      </button>
                    ))}
                  </div>
                  {gMejaIds.length > 0 && <p className="text-sm text-[#5C1420] mt-2 font-semibold">{gMejaIds.length} meja · Total: {gabunganKapTotal()} orang</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelClass}>Kap. Min</label><input type="number" value={gKapMin} onChange={(e) => setGKapMin(e.target.value)} placeholder="6" className={inputClass} /></div>
                  <div><label className={labelClass}>DP (Rp)</label><input type="number" value={gDp} onChange={(e) => setGDp(e.target.value)} placeholder="200000" className={inputClass} /></div>
                  <div><label className={labelClass}>Min. Trx</label><input type="number" value={gMinTrx} onChange={(e) => setGMinTrx(e.target.value)} placeholder="500000" className={inputClass} /></div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowGabunganForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveGabungan} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          {gabunganList.length === 0 ? <p className="text-center text-[#B5A999] py-16">Belum ada meja gabungan.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gabunganList.map((g) => (
                <div key={g.Id} className={`bg-white border rounded-xl overflow-hidden transition-all ${g.aktif ? "border-[#E5DDD4] hover:border-[#5C1420]/30 hover:shadow-md hover:shadow-[#5C1420]/5" : "border-gray-200 opacity-60"}`}>
                  <div className="relative w-full h-28">
                    <GabunganCardImage gabungan={g} tables={tables} />
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-[#3D2E1E] text-sm font-serif">{g.nama}</h3>
                      <span className="bg-[#F9F6F2] text-[#9A8B7A] text-[9px] px-1.5 py-0.5 rounded-full capitalize border border-[#E5DDD4]">{g.outlet}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${g.aktif ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>{g.aktif ? "Aktif" : "Nonaktif"}</span>
                    </div>
                    {g.deskripsi && <p className="text-[#9A8B7A] text-xs">{g.deskripsi}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(g.meja_ids || []).map((id) => (
                        <span key={id} className="bg-[#F9F6F2] text-[#5C1420] text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-[#5C1420]/20">{getMejaLabel(id)}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-[#9A8B7A]">👥 <span className="text-[#3D2E1E]">{g.kapasitas_minimum ? `${g.kapasitas_minimum}–` : ""}{g.kapasitas_total} orang</span></span>
                      {g.dp_minimum && <span className="text-[#5C1420] font-semibold">DP {formatRupiah(g.dp_minimum)}</span>}
                    </div>
                    {g.minimum_transaksi && <p className="text-[11px] text-[#9A8B7A]">Min. trx {formatRupiah(g.minimum_transaksi)}</p>}
                    <div className="flex gap-1.5 pt-1.5">
                      <button onClick={() => toggleGabunganAktif(g)} className={`flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${g.aktif ? "border-[#E5DDD4] text-[#9A8B7A] hover:bg-[#F9F6F2]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{g.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => openGabunganForm(g)} className="flex-1 px-2 py-1.5 rounded-lg border border-[#5C1420]/30 text-[#5C1420] text-[11px] font-semibold hover:bg-[#5C1420]/5">Edit</button>
                      <button onClick={() => deleteGabungan(g.Id)} className="px-2 py-1.5 rounded-lg border border-red-200 text-red-400 text-[11px] hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ========== TAB MENU: LIST KATEGORI ========== */}
        {tab === "menu" && !drillKategori && (<>
          <div className="flex justify-between items-center mb-8">
            <div><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Kategori Menu</h2><p className="text-[#9A8B7A] text-sm mt-1">Klik kategori untuk kelola menu di dalamnya</p></div>
            <button onClick={() => openKategoriForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20 active:scale-[0.98]">+ Tambah Kategori</button>
          </div>
          {showKategoriForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editKategori ? "Edit Kategori" : "Kategori Baru"}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Outlet</label><select value={kOutlet} onChange={(e) => setKOutlet(e.target.value)} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}><option value="solo">Solo</option><option value="jogja">Yogyakarta</option></select></div>
                <div><label className={labelClass}>Nama Kategori</label><input value={kNama} onChange={(e) => setKNama(e.target.value)} placeholder="Contoh: Makanan Utama" className={inputClass} /></div>
                <div><label className={labelClass}>Urutan</label><input type="number" value={kUrutan} onChange={(e) => setKUrutan(e.target.value)} className={inputClass} /></div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowKategoriForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveKategori} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}
          {menuKategoriList.length === 0 ? <p className="text-center text-[#B5A999] py-16">Belum ada kategori. Klik &quot;+ Tambah Kategori&quot;.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuKategoriList.map((k) => {
                const jumlahMenu = menuItemList.filter((m) => m.kategori_id === k.Id).length;
                return (
                  <div key={k.Id} className={`bg-white rounded-2xl border-2 p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all ${k.aktif ? "border-[#E5DDD4] hover:border-[#5C1420]/30" : "border-gray-200 opacity-60"}`}>
                    <button onClick={() => setDrillKategori(k)} className="text-left w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#3D2E1E] text-lg font-serif">{k.nama} →</h3>
                        <span className="bg-[#F9F6F2] text-[#9A8B7A] text-[10px] px-2.5 py-0.5 rounded-full capitalize border border-[#E5DDD4]">{k.outlet}</span>
                        {!k.aktif && <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 font-bold">Nonaktif</span>}
                      </div>
                      <p className="text-[#5C1420] text-xs mt-2 font-semibold">{jumlahMenu} menu terdaftar</p>
                    </button>
                    <div className="flex gap-2 pt-3">
                      <button onClick={() => toggleKategoriAktif(k)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${k.aktif ? "border-[#E5DDD4] text-[#9A8B7A] hover:bg-[#F9F6F2]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{k.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => openKategoriForm(k)} className="flex-1 py-2 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-xs font-bold hover:bg-[#5C1420]/5">Edit</button>
                      <button onClick={() => deleteKategori(k.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>)}

        {/* ========== DRILL-DOWN MENU ITEM ========== */}
        {tab === "menu" && drillKategori && (<>
          <div className="flex justify-between items-center mb-8">
            <div>
              <button onClick={() => setDrillKategori(null)} className="text-sm text-[#5C1420] hover:underline mb-2">← Kembali ke Kategori</button>
              <h2 className="text-xl font-bold text-[#3D2E1E] font-serif">{drillKategori.nama} <span className="text-[#9A8B7A] text-base capitalize">· {drillKategori.outlet}</span></h2>
            </div>
            <button onClick={() => openMenuItemForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20">+ Tambah Menu</button>
          </div>
          {showMenuItemForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editMenuItem ? "Edit Menu" : "Menu Baru"}</h3>
                  <p className="text-[#9A8B7A] text-xs mt-1">{drillKategori.nama} · <span className="capitalize">{drillKategori.outlet}</span></p><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Nama Menu</label><input value={miNama} onChange={(e) => setMiNama(e.target.value)} placeholder="Contoh: Nasi Mandhi" className={inputClass} /></div>
                <div><label className={labelClass}>Deskripsi</label><textarea value={miDesc} onChange={(e) => setMiDesc(e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Nasi mandhi dengan daging kambing empuk" /></div>
                <div><label className={labelClass}>Harga Dasar (Rp)</label><input type="number" value={miHarga} onChange={(e) => setMiHarga(e.target.value)} placeholder="45000" className={inputClass} /></div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={miPunyaVarian} onChange={(e) => setMiPunyaVarian(e.target.checked)} className="w-4 h-4 accent-[#5C1420]" />
                  <span className="text-sm text-[#3D2E1E]">Menu ini punya varian (misal: ukuran/porsi)</span>
                </label>
                <p className="text-xs text-[#B5A999]">Varian &amp; Add-on diatur lewat tombol &quot;Kelola&quot; setelah menu disimpan.</p>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowMenuItemForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveMenuItem} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold">Simpan</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Kelola Varian & Add-on */}
          {manageMenuItem && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">Kelola {manageMenuItem.nama_paket}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                  <button onClick={() => setManageMenuItem(null)} className="text-[#9A8B7A] hover:text-[#3D2E1E] text-xl">✕</button>
                </div>

                {/* VARIAN */}
                <div>
                  <p className="text-xs font-bold text-[#5C1420] mb-3 tracking-[0.15em] uppercase">Varian (pilih 1, wajib bila diaktifkan)</p>
                  {!manageMenuItem.punya_varian && <p className="text-xs text-[#B5A999] mb-2 italic">Menu ini belum diaktifkan untuk varian. Aktifkan lewat Edit Menu.</p>}
                  <div className="space-y-2 mb-3">
                    {menuVarianList.map((v) => (
                      <div key={v.Id} className="flex items-center justify-between bg-[#F9F6F2] border border-[#E5DDD4] rounded-xl px-4 py-2.5">
                        <div><p className="font-semibold text-[#3D2E1E] text-sm">{v.nama}</p><p className="text-xs text-[#9A8B7A]">{v.harga_tambahan > 0 ? `+${formatRupiah(v.harga_tambahan)}` : "Tanpa tambahan biaya"}</p></div>
                        <button onClick={() => deleteVarian(v.Id)} className="text-red-400 hover:text-red-600 text-sm">🗑</button>
                      </div>
                    ))}
                    {menuVarianList.length === 0 && <p className="text-xs text-[#B5A999]">Belum ada varian.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input value={vNama} onChange={(e) => setVNama(e.target.value)} placeholder="Nama varian (mis. Jumbo)" className={inputClass + " flex-1 min-w-0 !w-auto"} />
                    <input type="number" value={vHarga} onChange={(e) => setVHarga(e.target.value)} placeholder="+Rp" className={inputClass + " w-24 shrink-0 !w-24"} />
                    <button onClick={addVarian} className="px-4 py-3 rounded-xl bg-[#5C1420] text-white text-sm font-bold shrink-0">+ Tambah</button>
                  </div>
                </div>

                <div className="border-t border-[#E5DDD4]" />

                {/* ADD-ON */}
                <div>
                  <p className="text-xs font-bold text-[#5C1420] mb-3 tracking-[0.15em] uppercase">Add-on (opsional, boleh pilih lebih dari satu)</p>
                  <div className="space-y-2 mb-3">
                    {menuAddonList.map((a) => (
                      <div key={a.Id} className="flex items-center justify-between bg-[#F9F6F2] border border-[#E5DDD4] rounded-xl px-4 py-2.5">
                        <div><p className="font-semibold text-[#3D2E1E] text-sm">{a.nama}</p><p className="text-xs text-[#9A8B7A]">{a.harga_tambahan > 0 ? `+${formatRupiah(a.harga_tambahan)}` : "Gratis"}</p></div>
                        <button onClick={() => deleteAddon(a.Id)} className="text-red-400 hover:text-red-600 text-sm">🗑</button>
                      </div>
                    ))}
                    {menuAddonList.length === 0 && <p className="text-xs text-[#B5A999]">Belum ada add-on.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input value={adNama} onChange={(e) => setAdNama(e.target.value)} placeholder="Nama add-on (mis. Tambah Keju)" className={inputClass + " flex-1 min-w-0 !w-auto"} />
                    <input type="number" value={adHarga} onChange={(e) => setAdHarga(e.target.value)} placeholder="+Rp" className={inputClass + " w-24 shrink-0 !w-24"} />
                    <button onClick={addAddon} className="px-4 py-3 rounded-xl bg-[#5C1420] text-white text-sm font-bold shrink-0">+ Tambah</button>
                  </div>
                </div>

                <button onClick={() => setManageMenuItem(null)} className="w-full py-3 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Tutup</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItemList.filter((m) => m.kategori_id === drillKategori.Id).map((m) => (
              <div key={m.Id} className={`bg-white border-2 rounded-2xl overflow-hidden group transition-all ${m.aktif ? "border-[#E5DDD4] hover:border-[#5C1420]/30 hover:shadow-xl hover:shadow-[#5C1420]/5" : "border-gray-200 opacity-60"}`}>
                <div className="h-40 bg-[#F9F6F2] relative overflow-hidden">
                  {m.foto_url ? (
                    <Image src={m.foto_url} alt={m.nama_paket} fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2"><span className="text-3xl text-[#5C1420]/20">🍽</span><span className="text-xs text-[#9A8B7A]">Belum ada foto</span></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {m.punya_varian && <span className="absolute bottom-3 left-3 bg-[#5C1420] text-white text-[10px] px-3 py-1 rounded-full font-bold">Ada Varian</span>}
                  {!m.aktif && <span className="absolute top-3 right-3 bg-gray-800/80 text-white text-[10px] px-3 py-1 rounded-full font-bold">Nonaktif</span>}
                </div>
                <div className="p-5 space-y-2">
                  <p className="font-bold text-[#3D2E1E] text-lg font-serif">{m.nama_paket}</p>
                  {m.deskripsi && <p className="text-[#9A8B7A] text-xs line-clamp-2">{m.deskripsi}</p>}
                  <p className="text-[#5C1420] font-bold text-sm">{formatRupiah(m.harga)}</p>
                  <label className="inline-block cursor-pointer pt-1">
                    <span className="text-xs text-[#5C1420] font-semibold hover:text-[#3D0D14]">{uploadingMenuItem ? "⏳ Mengupload..." : m.foto_url ? "📷 Ganti Foto" : "📷 Upload Foto"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMenuItemPhoto(m.Id, f); }} />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openManageMenuItem(m)} className="flex-1 py-2 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-xs font-bold hover:bg-[#5C1420]/5">Kelola Varian/Add-on</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleMenuItemAktif(m)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${m.aktif ? "border-[#E5DDD4] text-[#9A8B7A] hover:bg-[#F9F6F2]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{m.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                    <button onClick={() => openMenuItemForm(m)} className="flex-1 py-2 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-xs font-bold hover:bg-[#5C1420]/5">Edit</button>
                    <button onClick={() => deleteMenuItem(m.Id)} className="py-2 px-3 rounded-xl border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {menuItemList.filter((m) => m.kategori_id === drillKategori.Id).length === 0 && (
              <p className="text-[#9A8B7A] col-span-full text-center py-10">Belum ada menu. Klik &quot;+ Tambah Menu&quot;.</p>
            )}
          </div>
        </>)}

        {/* ========== TAB LAPORAN ========== */}
        {tab === "laporan" && (() => {
          const totalBooking = lapReservasi.length;
          const totalCompleted = lapReservasi.filter((r) => r.status === "Completed").length;
          const totalNoShow = lapReservasi.filter((r) => r.status === "No-Show").length;
          const totalCancelled = lapReservasi.filter((r) => r.status === "Cancelled").length;
          const totalDp = lapReservasi.reduce((s, r) => s + (r.dp_amount || 0), 0);
          const totalMenu = lapOrders.reduce((s, o) => s + o.subtotal, 0);
          const totalOmset = totalDp + totalMenu;
          const completionRate = totalBooking > 0 ? Math.round((totalCompleted / totalBooking) * 100) : 0;
          const noShowRate = totalBooking > 0 ? Math.round((totalNoShow / totalBooking) * 100) : 0;

          const perJam: Record<string, number> = {};
          lapReservasi.forEach((r) => {
            const jamAwal = formatJam(r.jam).slice(0, 2);
            perJam[jamAwal] = (perJam[jamAwal] || 0) + 1;
          });
          const jamTeratas = Object.entries(perJam).sort((a, b) => b[1] - a[1]).slice(0, 6);
          const maxJamCount = Math.max(...jamTeratas.map(([, c]) => c), 1);

          const perOutlet: Record<string, number> = {};
          lapReservasi.forEach((r) => { perOutlet[r.outlet] = (perOutlet[r.outlet] || 0) + 1; });

          type Kecurigaan = { phone: string; nama: string; type: "duplicate" | "burst"; items: Reservation[] };
          const suspicious: Kecurigaan[] = [];
          const phoneGroups: Record<string, Reservation[]> = {};
          lapReservasi.forEach((r) => {
            const key = normalizeWhatsapp(r.no_whatsapp);
            if (!phoneGroups[key]) phoneGroups[key] = [];
            phoneGroups[key].push(r);
          });
          Object.entries(phoneGroups).forEach(([phone, items]) => {
            if (items.length < 2) return;

            const dupMap: Record<string, Reservation[]> = {};
            items.forEach((r) => {
              const k = `${r.tanggal}_${r.jam}`;
              if (!dupMap[k]) dupMap[k] = [];
              dupMap[k].push(r);
            });
            Object.values(dupMap).forEach((grp) => {
              if (grp.length > 1) suspicious.push({ phone, nama: grp[0].nama_tamu, type: "duplicate", items: grp });
            });

            const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            let burst: Reservation[] = [sorted[0]];
            for (let i = 1; i < sorted.length; i++) {
              const diffMin = (new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / 60000;
              if (diffMin <= 10) {
                burst.push(sorted[i]);
              } else {
                if (burst.length >= 3) suspicious.push({ phone, nama: burst[0].nama_tamu, type: "burst", items: burst });
                burst = [sorted[i]];
              }
            }
            if (burst.length >= 3) suspicious.push({ phone, nama: burst[0].nama_tamu, type: "burst", items: burst });
          });

          return (
            <>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Laporan &amp; Analitik</h2><p className="text-[#9A8B7A] text-sm mt-1">Ringkasan performa reservasi pada periode yang dipilih</p></div>
              </div>

              <div className="bg-white border border-[#E5DDD4] rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Dari</label>
                  <input type="date" value={lapDari} onChange={(e) => setLapDari(e.target.value)} className={filterClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Sampai</label>
                  <input type="date" value={lapSampai} onChange={(e) => setLapSampai(e.target.value)} className={filterClass} />
                </div>
                {isSuper && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#5C1420] mb-1 tracking-[0.2em] uppercase">Outlet</label>
                    <select value={lapOutlet} onChange={(e) => setLapOutlet(e.target.value)} className={filterClass}>
                      <option value="">Semua Outlet</option><option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                    </select>
                  </div>
                )}
                <button onClick={fetchLaporan} className="self-end px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20">Terapkan</button>
              </div>

              {loadingLaporan ? <p className="text-center text-[#B5A999] py-16">Memuat laporan...</p> : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-4">
                      <p className="text-2xl font-bold text-[#3D2E1E]">{totalBooking}</p>
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider mt-0.5">Total Booking</p>
                    </div>
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-4">
                      <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider mt-0.5">Completion Rate</p>
                    </div>
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-4">
                      <p className="text-2xl font-bold text-orange-600">{noShowRate}%</p>
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider mt-0.5">No-Show Rate</p>
                    </div>
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-4">
                      <p className="text-2xl font-bold text-red-500">{totalCancelled}</p>
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider mt-0.5">Dibatalkan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-white border-2 border-[#5C1420]/20 rounded-xl p-5">
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider font-bold">Total Omset</p>
                      <p className="text-2xl font-bold text-[#5C1420] mt-1">{formatRupiah(totalOmset)}</p>
                    </div>
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-5">
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider font-bold">Dari DP</p>
                      <p className="text-xl font-bold text-[#3D2E1E] mt-1">{formatRupiah(totalDp)}</p>
                    </div>
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-5">
                      <p className="text-[10px] text-[#9A8B7A] uppercase tracking-wider font-bold">Dari Pesanan Menu</p>
                      <p className="text-xl font-bold text-[#3D2E1E] mt-1">{formatRupiah(totalMenu)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-5">
                      <p className="text-sm font-bold text-[#3D2E1E] mb-4">Jam Favorit</p>
                      {jamTeratas.length === 0 ? <p className="text-sm text-[#B5A999]">Belum ada data.</p> : (
                        <div className="space-y-2.5">
                          {jamTeratas.map(([jam, count]) => (
                            <div key={jam} className="flex items-center gap-3">
                              <span className="text-xs text-[#9A8B7A] w-10 shrink-0">{jam}:00</span>
                              <div className="flex-1 bg-[#F9F6F2] rounded-full h-5 overflow-hidden">
                                <div className="bg-[#5C1420] h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${(count / maxJamCount) * 100}%` }}>
                                  <span className="text-white text-[10px] font-bold">{count}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-[#E5DDD4] rounded-xl p-5">
                      <p className="text-sm font-bold text-[#3D2E1E] mb-4">Booking per Outlet</p>
                      {Object.keys(perOutlet).length === 0 ? <p className="text-sm text-[#B5A999]">Belum ada data.</p> : (
                        <div className="space-y-2.5">
                          {Object.entries(perOutlet).map(([outlet, count]) => (
                            <div key={outlet} className="flex items-center gap-3">
                              <span className="text-xs text-[#9A8B7A] w-16 shrink-0 capitalize">{outlet}</span>
                              <div className="flex-1 bg-[#F9F6F2] rounded-full h-5 overflow-hidden">
                                <div className="bg-[#5C1420] h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${(count / totalBooking) * 100}%` }}>
                                  <span className="text-white text-[10px] font-bold">{count}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#E5DDD4] rounded-xl p-5 mt-4">
                    <p className="text-sm font-bold text-[#3D2E1E] mb-1">⚠ Deteksi Nomor WA Duplikat / Spam</p>
                    <p className="text-xs text-[#9A8B7A] mb-4">Nomor yang booking di jam sama berkali-kali, atau bikin banyak reservasi dalam waktu singkat</p>
                    {suspicious.length === 0 ? (
                      <p className="text-sm text-emerald-600">✓ Tidak ada pola mencurigakan pada periode ini.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {suspicious.map((s, idx) => (
                          <div key={idx} className={`rounded-xl border p-3 ${s.type === "duplicate" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="text-sm font-bold text-[#3D2E1E]">
                                {s.type === "duplicate" ? "🔁 Duplikat" : "⚡ Burst"} · {s.nama} <span className="text-[#9A8B7A] font-normal">({s.phone})</span>
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.type === "duplicate" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.items.length}x</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {s.items.map((it) => (
                                <span key={it.Id} className="text-[10px] bg-white border border-[#E5DDD4] px-2 py-1 rounded-full text-[#5C1420]">
                                  {it.tanggal} {formatJam(it.jam)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          );
        })()}

        {/* ========== TAB KELOLA ADMIN ========== */}
        {tab === "admin" && isElevated && (<>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Kelola Admin</h2>
              <p className="text-[#9A8B7A] text-sm mt-1">Setiap staf punya akun sendiri. Beberapa orang boleh pegang outlet yang sama.</p>
            </div>
            <button onClick={() => openAdminForm()} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-lg shadow-[#5C1420]/20 active:scale-[0.98]">+ Tambah Admin</button>
          </div>

          {showAdminForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
              <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editAdmin ? "Edit Admin" : "Admin Baru"}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                <div><label className={labelClass}>Nama Lengkap</label><input value={auNama} onChange={(e) => setAuNama(e.target.value)} placeholder="Contoh: Budi Santoso" className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={auEmail} onChange={(e) => setAuEmail(e.target.value)} disabled={!!editAdmin} placeholder="budi@yassalam.com" className={inputClass + (editAdmin ? " opacity-60 cursor-not-allowed" : "")} />
                  {editAdmin && <p className="text-[10px] text-[#B5A999] mt-1.5">Email tidak bisa diubah</p>}
                </div>
                <div>
                  <label className={labelClass}>{editAdmin ? "Password Baru (opsional)" : "Password"}</label>
                  <input type="text" value={auPassword} onChange={(e) => setAuPassword(e.target.value)} placeholder={editAdmin ? "Kosongkan jika tidak diubah" : "Minimal 10 karakter, huruf besar, angka, simbol"} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <select value={auRole} onChange={(e) => setAuRole(e.target.value)} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}>
                    <option value="admin_outlet">Admin Outlet</option>
                    {isSuper && <option value="manajer_outlet">Manajer Outlet</option>}
                    {isSuper && <option value="superadmin">Super Admin</option>}
                  </select>
                  {!isSuper && <p className="text-[10px] text-[#B5A999] mt-1.5">Hanya Super Admin yang bisa mengatur role</p>}
                </div>
                {auRole !== "superadmin" && (
                  <div>
                    <label className={labelClass}>Outlet</label>
                    <select value={auOutlet} onChange={(e) => setAuOutlet(e.target.value)} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}>
                      <option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                    </select>
                  </div>
                )}
                <p className="text-xs text-[#B5A999]">Super Admin bisa mengakses semua outlet dan mengelola admin lain. Manajer Outlet setara Super Admin tapi hanya untuk outlet-nya sendiri.</p>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowAdminForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                  <button onClick={saveAdmin} disabled={savingAdmin} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold disabled:opacity-50">{savingAdmin ? "Menyimpan..." : "Simpan"}</button>
                </div>
              </div>
            </div>
          )}

          {loadingAdmin ? <p className="text-center text-[#B5A999] py-16">Memuat data admin...</p> : visibleAdminList.length === 0 ? <p className="text-center text-[#B5A999] py-16">Belum ada admin terdaftar.</p> : (
            <div className="space-y-3">
              {visibleAdminList.map((a) => (
                <div key={a.id} className={`bg-white border-2 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${a.aktif ? "border-[#E5DDD4] hover:border-[#5C1420]/30" : "border-gray-200 opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#3D2E1E] text-lg font-serif">{a.nama || "(tanpa nama)"}</h3>
                      {a.role === "superadmin" ? (
                        <span className="bg-[#5C1420]/15 text-[#5C1420] border-2 border-[#5C1420]/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase">★ Super Admin</span>
                      ) : a.role === "manajer_outlet" ? (
                        <span className="bg-[#5C1420]/10 text-[#5C1420] border-2 border-[#5C1420]/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase">★ Manajer {a.outlet === "solo" ? "Solo" : "Yogyakarta"}</span>
                      ) : (
                        <span className="bg-[#F9F6F2] text-[#9A8B7A] border-2 border-[#E5DDD4] text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase">{a.outlet === "solo" ? "Solo" : "Yogyakarta"}</span>
                      )}
                      {!a.aktif && <span className="bg-gray-50 text-gray-400 border-2 border-gray-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">Nonaktif</span>}
                      {a.id === session.user.id && <span className="text-[10px] text-[#5C1420] font-bold">(Anda)</span>}
                    </div>
                    <p className="text-sm text-[#9A8B7A] mt-1 truncate">📧 {a.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openAdminForm(a)} className="px-4 py-2 rounded-xl border-2 border-[#5C1420]/30 text-[#5C1420] text-sm font-bold hover:bg-[#5C1420]/5">Edit</button>
                    {a.id !== session.user.id && (<>
                      <button onClick={() => toggleAdminAktif(a)} className={`px-4 py-2 rounded-xl border-2 text-sm font-bold ${a.aktif ? "border-[#E5DDD4] text-[#9A8B7A] hover:bg-[#F9F6F2]" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{a.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => deleteAdmin(a)} className="px-3 py-2 rounded-xl border-2 border-red-200 text-red-400 text-sm hover:bg-red-50">🗑</button>
                    </>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ========== TAB LOG AKTIVITAS ========== */}
        {tab === "log" && isElevated && (
          <>
            <div className="mb-6"><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Log Aktivitas Admin</h2><p className="text-[#9A8B7A] text-sm mt-1">Riwayat 200 aksi terakhir yang dilakukan admin di dashboard</p></div>
            {loadingLog ? <p className="text-center text-[#B5A999] py-16">Memuat log...</p> : activityLog.length === 0 ? <p className="text-center text-[#B5A999] py-16">Belum ada aktivitas tercatat.</p> : (
              <div className="bg-white border border-[#E5DDD4] rounded-xl divide-y divide-[#E5DDD4] overflow-hidden">
                {activityLog.map((log) => (
                  <div key={log.Id} className="p-4 flex items-start justify-between gap-4 hover:bg-[#FEFCF8]">
                    <div>
                      <p className="text-sm font-bold text-[#3D2E1E]">{log.action}</p>
                      {log.detail && <p className="text-xs text-[#9A8B7A] mt-0.5">{log.detail}</p>}
                      <p className="text-[10px] text-[#B5A999] mt-1">oleh {log.admin_nama || log.admin_email || "Unknown"}</p>
                    </div>
                    <p className="text-[10px] text-[#B5A999] whitespace-nowrap">{new Date(log.created_at).toLocaleString("id-ID")}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== TAB PENGATURAN ========== */}
        {tab === "pengaturan" && isElevated && (
          <>
            <div className="mb-6"><h2 className="text-xl font-bold text-[#3D2E1E] font-serif">Pengaturan</h2><p className="text-[#9A8B7A] text-sm mt-1">Pengaturan umum untuk sistem reservasi</p></div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 flex flex-wrap items-center gap-3">
              <span className="text-[#5C1420] text-xs font-bold tracking-wider uppercase">🔧 Batas Waktu Pesan Menu:</span>
              <input type="number" min="0" value={cutoffSetting} onChange={(e) => setCutoffSetting(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
              <span className="text-sm text-[#9A8B7A]">jam sebelum jam reservasi</span>
              <button onClick={saveCutoffSetting} disabled={savingCutoff}
                className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 disabled:opacity-50">
                {savingCutoff ? "Menyimpan..." : "Simpan"}
              </button>
            </div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 mt-4">
              <p className="text-[#5C1420] text-xs font-bold tracking-wider uppercase mb-3">⏱ Kebijakan Reservasi</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm text-[#3D2E1E] w-56">Durasi hold slot meja</span>
                <input type="number" min="1" value={holdMinutes} onChange={(e) => setHoldMinutes(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
                <span className="text-sm text-[#9A8B7A]">menit</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm text-[#3D2E1E] w-56">Minimal booking sebelum jam reservasi</span>
                <input type="number" min="0" value={minBookingHours} onChange={(e) => setMinBookingHours(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
                <span className="text-sm text-[#9A8B7A]">jam</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#3D2E1E] w-56">Maksimal booking ke depan</span>
                <input type="number" min="1" value={maxBookingDays} onChange={(e) => setMaxBookingDays(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
                <span className="text-sm text-[#9A8B7A]">hari</span>
                <button onClick={saveReservasiPolicy} disabled={savingReservasiPolicy}
                  className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 disabled:opacity-50">
                  {savingReservasiPolicy ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 mt-4">
              <p className="text-[#5C1420] text-xs font-bold tracking-wider uppercase mb-3">👤 Ambang Batas Badge Pelanggan</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm text-[#3D2E1E] w-56">Tampilkan &quot;Pelanggan Lama&quot; mulai dari</span>
                <input type="number" min="1" value={thresholdLama} onChange={(e) => setThresholdLama(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
                <span className="text-sm text-[#9A8B7A]">x booking</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#3D2E1E] w-56">Tampilkan peringatan &quot;No-Show&quot; mulai dari</span>
                <input type="number" min="1" value={thresholdNoShow} onChange={(e) => setThresholdNoShow(e.target.value)} className="w-20 px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] text-center" />
                <span className="text-sm text-[#9A8B7A]">x no-show</span>
                <button onClick={saveThreshold} disabled={savingThreshold}
                  className="ml-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 disabled:opacity-50">
                  {savingThreshold ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 mt-4">
              <p className="text-[#5C1420] text-xs font-bold tracking-wider uppercase mb-3">🕐 Jam Operasional Outlet</p>
              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                {(isSuper || myOutlet === "solo") && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#3D2E1E] w-16">Solo</span>
                    <input type="time" value={jamBukaSolo} onChange={(e) => setJamBukaSolo(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420]" />
                    <span className="text-[#9A8B7A] text-sm">–</span>
                    <input type="time" value={jamTutupSolo} onChange={(e) => setJamTutupSolo(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420]" />
                  </div>
                )}
                {(isSuper || myOutlet === "jogja") && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#3D2E1E] w-16">Yogyakarta</span>
                    <input type="time" value={jamBukaJogja} onChange={(e) => setJamBukaJogja(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420]" />
                    <span className="text-[#9A8B7A] text-sm">–</span>
                    <input type="time" value={jamTutupJogja} onChange={(e) => setJamTutupJogja(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420]" />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={saveJamOperasional} disabled={savingJamOperasional}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20 disabled:opacity-50">
                  {savingJamOperasional ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 mt-4 flex items-center justify-between">
              <div>
                <p className="text-[#5C1420] text-xs font-bold tracking-wider uppercase">🔔 Notifikasi Suara &amp; Browser</p>
                <p className="text-xs text-[#9A8B7A] mt-1">Bunyi &amp; popup saat ada reservasi baru masuk (khusus perangkat ini)</p>
              </div>
              <button onClick={toggleNotifSuara}
                className={`shrink-0 w-14 h-8 rounded-full relative transition-all ${notifSuaraAktif ? "bg-[#5C1420]" : "bg-[#E5DDD4]"}`}>
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${notifSuaraAktif ? "left-7" : "left-1"}`} />
              </button>
            </div>

            <div className="bg-white border-2 border-[#5C1420]/15 rounded-2xl p-5 mt-4">
              <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
                <div>
                  <p className="text-[#5C1420] text-xs font-bold tracking-wider uppercase">🚫 Libur Outlet</p>
                  <p className="text-xs text-[#9A8B7A] mt-1">Customer tidak bisa booking di tanggal yang ditandai libur</p>
                </div>
                <button onClick={() => openLiburForm()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white text-sm font-bold shadow-md shadow-[#5C1420]/20">+ Tambah Libur</button>
              </div>

              {(() => {
                const visibleLiburList = isSuper ? liburList : liburList.filter((l) => l.outlet === myOutlet);
                return loadingLibur ? <p className="text-center text-[#B5A999] py-8 text-sm">Memuat...</p> : visibleLiburList.length === 0 ? <p className="text-center text-[#B5A999] py-8 text-sm">Belum ada jadwal libur.</p> : (
                <div className="space-y-2">
                  {visibleLiburList.map((l) => (
                    <div key={l.Id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#E5DDD4] rounded-xl p-3.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-[#F9F6F2] text-[#9A8B7A] border-2 border-[#E5DDD4] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">{l.outlet === "solo" ? "Solo" : "Yogyakarta"}</span>
                          <span className="text-sm font-bold text-[#3D2E1E]">
                            {l.tanggal_mulai === l.tanggal_selesai ? l.tanggal_mulai : `${l.tanggal_mulai} – ${l.tanggal_selesai}`}
                          </span>
                        </div>
                        {l.alasan && <p className="text-xs text-[#9A8B7A] mt-1">{l.alasan}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openLiburForm(l)} className="px-3 py-1.5 rounded-lg border-2 border-[#5C1420]/30 text-[#5C1420] text-xs font-bold hover:bg-[#5C1420]/5">Edit</button>
                        <button onClick={() => deleteLibur(l)} className="px-3 py-1.5 rounded-lg border-2 border-red-200 text-red-400 text-xs hover:bg-red-50">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()}
            </div>

            {showLiburForm && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">{editLibur ? "Edit Libur" : "Tambah Libur Outlet"}</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
                  <div>
                    <label className={labelClass}>Outlet</label>
                    <select value={lOutlet} onChange={(e) => setLOutlet(e.target.value)} disabled={!isSuper} className={inputClass + (!isSuper ? " opacity-60 cursor-not-allowed" : "")}>
                      <option value="solo">Solo</option><option value="jogja">Yogyakarta</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>Tanggal Mulai</label><input type="date" value={lMulai} onChange={(e) => setLMulai(e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Tanggal Selesai</label><input type="date" value={lSelesai} onChange={(e) => setLSelesai(e.target.value)} className={inputClass} /></div>
                  </div>
                  <div><label className={labelClass}>Alasan <span className="normal-case font-normal text-[#B5A999]">(opsional, tampil ke customer)</span></label><textarea value={lAlasan} onChange={(e) => setLAlasan(e.target.value)} rows={3} placeholder="Contoh: Libur Hari Raya Idul Fitri" className={inputClass + " resize-none"} /></div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setShowLiburForm(false)} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
                    <button onClick={saveLibur} disabled={savingLibur} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold disabled:opacity-50">{savingLibur ? "Menyimpan..." : "Simpan"}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white border-2 border-[#5C1420]/20 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div><h3 className="text-xl font-bold text-[#3D2E1E] font-serif">Ubah Password</h3><div className="w-12 h-0.5 bg-[#5C1420] mt-2" /></div>
            <div><label className={labelClass}>Password Lama</label><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Password Baru</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} /><p className="text-xs text-[#B5A999] mt-1.5">Minimal 10 karakter, mengandung huruf besar, angka, dan simbol</p></div>
            <div><label className={labelClass}>Konfirmasi Password Baru</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} /></div>
            {changePasswordError && <p className="text-red-500 text-sm">{changePasswordError}</p>}
            <div className="flex gap-3 pt-3">
              <button onClick={() => { setShowChangePassword(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setChangePasswordError(""); }} className="flex-1 py-3.5 rounded-xl border-2 border-[#E5DDD4] text-[#9A8B7A] font-semibold hover:bg-[#F9F6F2]">Batal</button>
              <button onClick={changeMyPassword} disabled={changingPassword} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#5C1420] to-[#3D0D14] text-white font-bold disabled:opacity-50">{changingPassword ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#E5DDD4] mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-[#9A8B7A]/40 text-xs">━━ ✦ ━━</p>
          <p className="text-[#B5A999] text-xs mt-2">© 2026 Yassalam Arabian Resto &amp; Catering</p>
        </div>
      </div>
      </main>
    </div>
  );
}