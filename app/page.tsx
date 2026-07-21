"use client";
import { useState } from "react";
import { supabase } from "./supabase";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const today = new Date().toISOString().split("T")[0];

  function validate(form: FormData): string[] {
    const errs: string[] = [];
    const nama = form.get("nama_tamu") as string;
    const wa = form.get("no_whatsapp") as string;
    const outlet = form.get("outlet") as string;
    const tanggal = form.get("tanggal") as string;
    const jam = form.get("jam") as string;
    const jumlah = Number(form.get("jumlah_tamu"));

    if (!nama || nama.trim().length < 2) errs.push("Nama tamu minimal 2 karakter");
    if (!wa || !/^[0-9]{10,15}$/.test(wa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    if (!outlet) errs.push("Pilih outlet terlebih dahulu");
    if (!tanggal) errs.push("Pilih tanggal reservasi");
    if (tanggal && tanggal < today) errs.push("Tanggal tidak boleh hari yang sudah lewat");
    if (!jam) errs.push("Pilih jam reservasi");
    if (jam) {
      const hour = parseInt(jam.split(":")[0]);
      if (hour < 10 || hour >= 22) errs.push("Jam reservasi hanya antara 10:00 - 22:00");
    }
    if (!jumlah || jumlah < 1) errs.push("Jumlah tamu minimal 1 orang");
    if (jumlah > 100) errs.push("Jumlah tamu maksimal 100 orang");
    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const errs = validate(form);
    setErrors(errs);
    if (errs.length > 0) return;
    setLoading(true);

    const { error } = await supabase.from("Reservation").insert({
      nama_tamu: form.get("nama_tamu"),
      no_whatsapp: form.get("no_whatsapp"),
      outlet: form.get("outlet"),
      tanggal: form.get("tanggal"),
      jam: form.get("jam"),
      jumlah_tamu: Number(form.get("jumlah_tamu")),
      catatan: form.get("catatan") || null,
    });

    setLoading(false);
    if (error) {
      alert("Gagal mengirim reservasi: " + error.message);
    } else {
      setSukses(true);
    }
  }

  if (sukses) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800">Reservasi Berhasil!</h1>
          <p className="text-gray-500 mt-3">Terima kasih, reservasi Anda sedang kami proses. Kami akan menghubungi Anda via WhatsApp.</p>
          <button
            onClick={() => setSukses(false)}
            className="mt-8 bg-amber-700 hover:bg-amber-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Buat Reservasi Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🕌</div>
          <h1 className="text-3xl font-bold text-amber-900">Yassalam</h1>
          <p className="text-amber-700 text-lg">Arabian Resto &amp; Catering</p>
          <div className="w-24 h-1 bg-amber-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-gray-500 mt-4 text-sm">Reservasi meja untuk pengalaman kuliner Arabian terbaik</p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            {errors.map((err, i) => (
              <p key={i} className="text-red-600 text-sm py-1">⚠️ {err}</p>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tamu</label>
              <input
                name="nama_tamu"
                type="text"
                placeholder="Masukkan nama lengkap"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">No. WhatsApp</label>
              <input
                name="no_whatsapp"
                type="tel"
                placeholder="081234567890"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800"
              />
            </div>

            {/* Outlet */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Outlet</label>
              <select
                name="outlet"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800 bg-white"
              >
                <option value="">-- Pilih Outlet --</option>
                <option value="solo">🏬 Solo</option>
                <option value="jogja">🏬 Yogyakarta</option>
              </select>
            </div>

            {/* Tanggal & Jam */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                <input
                  name="tanggal"
                  type="date"
                  min={today}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam</label>
                <input
                  name="jam"
                  type="time"
                  min="10:00"
                  max="22:00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800"
                />
              </div>
            </div>

            {/* Jumlah Tamu */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Tamu</label>
              <input
                name="jumlah_tamu"
                type="number"
                placeholder="Berapa orang?"
                min="1"
                max="100"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800"
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
              <textarea
                name="catatan"
                placeholder="Contoh: meja dekat jendela, ada kursi bayi, dll."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-gray-800 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${
                loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-amber-700 hover:bg-amber-800 active:scale-[0.98] shadow-lg shadow-amber-200"
              }`}
            >
              {loading ? "Mengirim..." : "Kirim Reservasi"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © 2026 Yassalam Arabian Resto &amp; Catering
        </p>
      </div>
    </div>
  );
}