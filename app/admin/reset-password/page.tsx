"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../supabase";

function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Password minimal 10 karakter";
  if (!/[A-Z]/.test(password)) return "Password harus mengandung minimal 1 huruf besar";
  if (!/[0-9]/.test(password)) return "Password harus mengandung minimal 1 angka";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password harus mengandung minimal 1 simbol";
  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase otomatis proses token dari URL saat event PASSWORD_RECOVERY terpicu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Fallback: kalau session sudah ada tapi event sudah lewat sebelum listener terpasang
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const t = setTimeout(() => { if (!ready) setInvalidLink(true); }, 4000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pwErr = validatePasswordStrength(newPassword);
    if (pwErr) { setError(pwErr); return; }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok"); return; }

    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.push("/admin"), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FEFCF8] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.PNG" alt="Yassalam" width={56} height={56} className="mx-auto" />
          <p className="text-[10px] text-[#C8973E] tracking-[0.3em] uppercase mt-2 font-semibold">Yassalam Arabian Resto</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5DDD4] p-8 shadow-lg">
          {invalidLink && !ready ? (
            <div className="text-center">
              <p className="text-3xl mb-2">⚠️</p>
              <h1 className="text-lg font-bold text-[#3D2E1E] font-serif">Link Tidak Valid</h1>
              <p className="text-sm text-[#9A8B7A] mt-2">Link reset password ini sudah tidak berlaku atau sudah pernah dipakai. Silakan minta link baru lewat halaman login.</p>
            </div>
          ) : done ? (
            <div className="text-center">
              <p className="text-3xl mb-2">✓</p>
              <h1 className="text-lg font-bold text-[#3D2E1E] font-serif">Password Berhasil Diubah</h1>
              <p className="text-sm text-[#9A8B7A] mt-2">Mengalihkan ke halaman login...</p>
            </div>
          ) : !ready ? (
            <p className="text-center text-sm text-[#9A8B7A]">Memverifikasi link...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="text-lg font-bold text-[#3D2E1E] font-serif mb-1">Buat Password Baru</h1>
              <p className="text-sm text-[#9A8B7A] mb-5">Minimal 10 karakter, ada huruf besar, angka, dan simbol.</p>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center mb-4">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#9A8B7A] tracking-[0.1em] uppercase mb-1.5">Password Baru</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                    className="w-full h-11 px-4 rounded-lg border border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#9A8B7A] tracking-[0.1em] uppercase mb-1.5">Konfirmasi Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    className="w-full h-11 px-4 rounded-lg border border-[#E5DDD4] bg-white text-sm text-[#3D2E1E] outline-none focus:border-[#5C1420] transition-all" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full h-11 rounded-lg bg-[#5C1420] text-[#F5EBD8] text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] mt-6">
                {saving ? "Menyimpan..." : "Simpan Password Baru"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}