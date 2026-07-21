"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "./supabase";

type Table = {
  Id: number; outlet: string; nomor_meja: number; kapasitas: number; posisi: string; status: string;
};
type MenuPaket = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
};

const areas = [
  { id: "indoor-jendela", title: "Dekat Jendela", desc: "Nikmati suasana dengan pemandangan luar, cocok untuk pasangan atau obrolan santai.", kapasitas: "2 orang", gradient: "from-amber-800 to-yellow-900", icon: "✦" },
  { id: "indoor-tengah", title: "Indoor Tengah", desc: "Area utama dengan suasana ramai dan hangat, cocok untuk keluarga kecil.", kapasitas: "4 orang", gradient: "from-stone-700 to-stone-900", icon: "◈" },
  { id: "indoor-pojok", title: "Indoor Pojok", desc: "Lebih privat dan tenang, ideal untuk diskusi bisnis atau kumpul teman.", kapasitas: "6 orang", gradient: "from-amber-900 to-orange-950", icon: "◆" },
  { id: "outdoor", title: "Outdoor Garden", desc: "Area terbuka dengan udara segar dan dekorasi Arabian garden.", kapasitas: "8 orang", gradient: "from-emerald-900 to-emerald-950", icon: "❋" },
  { id: "vip", title: "VIP Room", desc: "Ruangan eksklusif dengan pelayanan premium, sempurna untuk acara spesial.", kapasitas: "12 orang", gradient: "from-yellow-800 to-amber-950", icon: "★" },
];

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [outlet, setOutlet] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [jumlahTamu, setJumlahTamu] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuPaket | null>(null);
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [namaTamu, setNamaTamu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [preselectedArea, setPreselectedArea] = useState("");

  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuPaket[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!outlet) return;
    supabase.from("Tables").select("*").eq("outlet", outlet).order("nomor_meja")
      .then(({ data }) => setTables(data || []));
    supabase.from("MenuPaket").select("*").eq("outlet", outlet).eq("aktif", true)
      .then(({ data }) => setMenus(data || []));
  }, [outlet]);

  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function getPosisiLabel(p: string) {
    const map: Record<string, string> = { "indoor-jendela": "Dekat Jendela", "indoor-tengah": "Indoor Tengah", "indoor-pojok": "Indoor Pojok", "outdoor": "Outdoor Garden", "vip": "VIP Room" };
    return map[p] || p;
  }
  function getPosisiIcon(p: string) {
    const map: Record<string, string> = { "indoor-jendela": "✦", "indoor-tengah": "◈", "indoor-pojok": "◆", "outdoor": "❋", "vip": "★" };
    return map[p] || "◈";
  }

  function validateStep(s: number): string[] {
    const errs: string[] = [];
    if (s === 1) {
      if (!outlet) errs.push("Pilih outlet terlebih dahulu");
      if (!tanggal) errs.push("Pilih tanggal reservasi");
      if (tanggal && tanggal < today) errs.push("Tanggal tidak boleh hari yang sudah lewat");
      if (!jam) errs.push("Pilih jam reservasi");
      if (jam) { const h = parseInt(jam.split(":")[0]); if (h < 10 || h >= 22) errs.push("Jam reservasi hanya 10:00 - 22:00"); }
      if (!jumlahTamu || Number(jumlahTamu) < 1) errs.push("Jumlah tamu minimal 1 orang");
    }
    if (s === 2 && !selectedTable) errs.push("Pilih meja terlebih dahulu");
    if (s === 4) {
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Nama tamu minimal 2 karakter");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    }
    return errs;
  }

  function nextStep() {
    const errs = validateStep(step);
    setErrors(errs);
    if (errs.length > 0) return;
    setStep(step + 1);
  }

  async function handleSubmit() {
    const errs = validateStep(4);
    setErrors(errs);
    if (errs.length > 0) return;
    setLoading(true);
    const { error } = await supabase.from("Reservation").insert({
      nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam,
      jumlah_tamu: Number(jumlahTamu), catatan: catatan || null,
      meja_id: selectedTable?.Id, menu_paket_id: selectedMenu?.Id || null,
      dp_amount: selectedMenu ? Number(jumlahPorsi || jumlahTamu) * selectedMenu.harga : 0,
    });
    setLoading(false);
    if (error) alert("Gagal: " + error.message);
    else setSukses(true);
  }

  function startReservation(area?: string) {
    setShowForm(true);
    setPreselectedArea(area || "");
    setStep(1);
    setSukses(false);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToHome() {
    setShowForm(false);
    setSukses(false);
    setStep(1);
    setOutlet("");
    setTanggal("");
    setJam("");
    setJumlahTamu("");
    setSelectedTable(null);
    setSelectedMenu(null);
    setNamaTamu("");
    setNoWa("");
    setCatatan("");
  }

  const stepLabels = ["Waktu", "Meja", "Menu", "Konfirmasi"];
  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] placeholder-[#C8B89A] transition-all";
  const labelClass = "block text-xs font-bold text-[#C8973E] mb-2 tracking-[0.15em] uppercase";

  // ==================== SUKSES ====================
  if (showForm && sukses) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center px-4">
        <div className="bg-white border border-[#C8973E]/20 rounded-3xl p-10 text-center max-w-md w-full shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C8973E]/20 via-[#C8973E] to-[#C8973E]/20" />
          <div className="w-20 h-20 bg-gradient-to-br from-[#C8973E] to-[#A67B2E] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#C8973E]/20">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#5C3D1A] font-serif mt-5">Reservasi Berhasil</h1>
          <p className="text-[#C8973E]/50 mt-1 text-sm">━━ ✦ ━━</p>
          <p className="text-[#8B7355] mt-3 text-sm">Terima kasih telah memilih Yassalam. Kami akan menghubungi Anda via WhatsApp.</p>
          <div className="bg-[#FDF6EC] border border-[#C8973E]/15 rounded-2xl p-5 mt-6 text-left text-sm space-y-2">
            <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
            <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
            <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam}</span></div>
            <div className="flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">No. {selectedTable?.nomor_meja} · {getPosisiLabel(selectedTable?.posisi || "")}</span></div>
            {selectedMenu && (
              <div className="flex justify-between border-t border-[#C8973E]/15 pt-2"><span className="text-[#8B7355]">Total</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedMenu.harga * Number(jumlahPorsi || 0))}</span></div>
            )}
          </div>
          <button onClick={backToHome} className="mt-8 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // ==================== FORM RESERVASI ====================
  if (showForm) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] relative">
        <div className="h-2 bg-gradient-to-r from-[#C8973E]/20 via-[#C8973E] to-[#C8973E]/20" />
        <div className="relative py-6 px-4">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <button onClick={backToHome} className="text-[#C8973E] text-sm hover:underline mb-3 inline-block">← Kembali ke Beranda</button>
              <Image src="/logo.png" alt="Yassalam" width={100} height={100} className="mx-auto drop-shadow-md" />
              <p className="text-[#C8973E]/40 mt-1 text-sm">━━ ✦ ━━</p>
              <p className="text-[#C8973E] mt-1 text-sm tracking-[0.2em] uppercase font-semibold">Reservasi Meja</p>
            </div>

            {/* Steps */}
            <div className="flex items-center justify-center gap-1 mb-8">
              {stepLabels.map((label, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= s ? "bg-[#C8973E] border-[#C8973E] text-white" : "bg-white border-[#C8973E]/25 text-[#C8973E]/30"}`}>
                        {step > s ? "✓" : s}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${step >= s ? "text-[#C8973E]" : "text-[#C8973E]/30"}`}>{label}</span>
                    </div>
                    {s < 4 && <div className={`w-8 h-[2px] mb-4 rounded ${step > s ? "bg-[#C8973E]" : "bg-[#C8973E]/15"}`} />}
                  </div>
                );
              })}
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                {errors.map((err, i) => <p key={i} className="text-red-500 text-sm py-1">⚠ {err}</p>)}
              </div>
            )}

            <div className="bg-white border border-[#C8973E]/12 rounded-3xl p-6 sm:p-8 shadow-lg shadow-[#C8973E]/5">

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pilih Outlet & Waktu</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Tentukan lokasi dan waktu kunjungan Anda</p>
                  </div>
                  <div>
                    <label className={labelClass}>Outlet</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ value: "solo", label: "Solo", alamat: "Jl. Slamet Riyadi" }, { value: "jogja", label: "Yogyakarta", alamat: "Jl. Kaliurang" }].map((o) => (
                        <button key={o.value} type="button"
                          onClick={() => { setOutlet(o.value); setSelectedTable(null); setSelectedMenu(null); }}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${outlet === o.value ? "border-[#C8973E] bg-[#FDF6EC] shadow-md shadow-[#C8973E]/10" : "border-[#E8DCC8] hover:border-[#C8973E]/50 bg-white"}`}>
                          <span className={`text-lg ${outlet === o.value ? "text-[#C8973E]" : "text-[#E8DCC8]"}`}>◈</span>
                          <p className={`font-bold mt-1 ${outlet === o.value ? "text-[#5C3D1A]" : "text-[#8B7355]"}`}>{o.label}</p>
                          <p className={`text-xs mt-0.5 ${outlet === o.value ? "text-[#C8973E]" : "text-[#B8A88A]"}`}>{o.alamat}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tanggal</label>
                      <input type="date" min={today} value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Jam</label>
                      <input type="time" min="10:00" max="22:00" value={jam} onChange={(e) => setJam(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Jumlah Tamu</label>
                    <input type="number" placeholder="Berapa orang?" min="1" max="100" value={jumlahTamu} onChange={(e) => setJumlahTamu(e.target.value)} className={inputClass} />
                  </div>
                  <button onClick={nextStep} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/25">
                    Lanjut Pilih Meja →
                  </button>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pilih Meja</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Outlet <span className="capitalize font-semibold text-[#C8973E]">{outlet}</span> · {jumlahTamu} tamu</p>
                  </div>
                  {["indoor-jendela", "indoor-tengah", "indoor-pojok", "outdoor", "vip"].map((posisi) => {
                    const filtered = tables.filter((t) => t.posisi === posisi);
                    if (filtered.length === 0) return null;
                    const isPreselected = preselectedArea === posisi;
                    return (
                      <div key={posisi} className={`${isPreselected ? "ring-2 ring-[#C8973E] ring-offset-2 rounded-2xl p-3 -m-3" : ""}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[#C8973E]">{getPosisiIcon(posisi)}</span>
                          <span className="text-xs font-bold text-[#C8973E] tracking-[0.15em] uppercase">{getPosisiLabel(posisi)}</span>
                          {isPreselected && <span className="text-[10px] bg-[#C8973E] text-white px-2 py-0.5 rounded-full">Rekomendasi</span>}
                          <div className="flex-1 h-[1px] bg-[#E8DCC8]" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {filtered.map((t) => {
                            const tooSmall = Number(jumlahTamu) > t.kapasitas;
                            const isSelected = selectedTable?.Id === t.Id;
                            return (
                              <button key={t.Id} type="button" disabled={tooSmall} onClick={() => setSelectedTable(t)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${tooSmall ? "border-[#E8DCC8]/50 opacity-40 cursor-not-allowed" : isSelected ? "border-[#C8973E] bg-[#FDF6EC] shadow-md shadow-[#C8973E]/10" : "border-[#E8DCC8] hover:border-[#C8973E]/50 bg-white"}`}>
                                {isSelected && <div className="absolute top-2 right-2 w-6 h-6 bg-[#C8973E] rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>}
                                <p className={`font-bold text-lg ${isSelected ? "text-[#5C3D1A]" : tooSmall ? "text-[#C8B89A]" : "text-[#5C3D1A]"}`}>Meja {t.nomor_meja}</p>
                                <p className={`text-sm mt-1 ${isSelected ? "text-[#C8973E]" : "text-[#8B7355]"}`}>{t.kapasitas} orang</p>
                                {tooSmall && <p className="text-xs text-red-400 mt-1">Kapasitas kurang</p>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">← Kembali</button>
                    <button onClick={nextStep} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/25">Lanjut →</button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pilih Menu Paket</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Opsional — bisa pesan langsung di outlet</p>
                  </div>
                  <div className="space-y-3">
                    <button type="button" onClick={() => { setSelectedMenu(null); setJumlahPorsi(""); }}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedMenu === null ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50 bg-white"}`}>
                      <p className={`font-semibold ${selectedMenu === null ? "text-[#5C3D1A]" : "text-[#8B7355]"}`}>Pesan menu di tempat</p>
                      <p className="text-xs text-[#B8A88A] mt-0.5">Pilih menu saat datang ke outlet</p>
                    </button>
                    {menus.map((m) => (
                      <button key={m.Id} type="button" onClick={() => { setSelectedMenu(m); setJumlahPorsi(jumlahTamu); }}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedMenu?.Id === m.Id ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50 bg-white"}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-[#5C3D1A]">{m.nama_paket}</p>
                            <p className="text-xs text-[#B8A88A] mt-1">{m.deskripsi}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${selectedMenu?.Id === m.Id ? "text-[#C8973E]" : "text-[#5C3D1A]"}`}>{formatRupiah(m.harga)}</p>
                            <p className="text-[10px] text-[#B8A88A]">/porsi</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedMenu && (
                    <div className="bg-[#FDF6EC] border border-[#C8973E]/20 rounded-2xl p-4 space-y-3">
                      <div>
                        <label className={labelClass}>Jumlah Porsi</label>
                        <input type="number" min="1" value={jumlahPorsi} onChange={(e) => setJumlahPorsi(e.target.value)} className={inputClass} />
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#C8973E]/15">
                        <span className="text-sm text-[#8B7355]">Total estimasi</span>
                        <span className="text-xl font-bold text-[#C8973E]">{formatRupiah(selectedMenu.harga * Number(jumlahPorsi || 0))}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">← Kembali</button>
                    <button onClick={() => { setErrors([]); setStep(4); }} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/25">Lanjut →</button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Konfirmasi Reservasi</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Lengkapi data diri dan periksa pesanan Anda</p>
                  </div>
                  <div><label className={labelClass}>Nama Tamu</label><input type="text" placeholder="Masukkan nama lengkap" value={namaTamu} onChange={(e) => setNamaTamu(e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>No. WhatsApp</label><input type="tel" placeholder="081234567890" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Catatan <span className="text-[#B8A88A] normal-case tracking-normal font-normal">(opsional)</span></label><textarea placeholder="Contoh: kursi bayi, alergi, dll." rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass + " resize-none"} /></div>

                  <div className="border-2 border-[#C8973E]/15 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3">
                      <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Ringkasan</h3>
                    </div>
                    <div className="p-5 space-y-2 text-sm bg-[#FEFCF8]">
                      <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Tamu</span><span className="font-semibold text-[#5C3D1A]">{jumlahTamu} orang</span></div>
                      <div className="border-t border-[#E8DCC8] pt-2 flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">No. {selectedTable?.nomor_meja} · {getPosisiLabel(selectedTable?.posisi || "")}</span></div>
                      {selectedMenu && (
                        <>
                          <div className="border-t border-[#E8DCC8] pt-2 flex justify-between"><span className="text-[#8B7355]">Menu</span><span className="font-semibold text-[#5C3D1A]">{selectedMenu.nama_paket} × {jumlahPorsi}</span></div>
                          <div className="flex justify-between"><span className="text-[#8B7355]">Total</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedMenu.harga * Number(jumlahPorsi || 0))}</span></div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">← Kembali</button>
                    <button onClick={handleSubmit} disabled={loading}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${loading ? "bg-[#E8DCC8] text-[#B8A88A] cursor-not-allowed" : "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white active:scale-[0.98] shadow-lg shadow-[#C8973E]/25"}`}>
                      {loading ? "Mengirim..." : "Kirim Reservasi ✦"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-8">
              <p className="text-[#C8973E]/30 text-sm">━━ ✦ ━━</p>
              <p className="text-[#C8973E]/40 text-xs mt-2">© 2026 Yassalam Arabian Resto & Catering</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LANDING PAGE ====================
  return (
    <div className="min-h-screen bg-[#FDF6EC]">

      {/* ===== HERO SECTION ===== */}
      <div className="relative h-[85vh] min-h-[500px] bg-gradient-to-b from-[#2a1a0e] via-[#3a2415] to-[#1a0f07] flex items-center justify-center overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        {/* Gold accent top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />

        <div className="relative text-center px-6 max-w-2xl">
          <Image src="/logo.png" alt="Yassalam" width={160} height={160} className="mx-auto drop-shadow-2xl" />
          <p className="text-[#C8973E]/40 mt-3 text-sm tracking-[0.5em]">━━━ ✦ ━━━</p>
          <p className="text-[#C8973E]/80 mt-4 text-lg tracking-widest uppercase font-light">Pengalaman Kuliner Arabian Terbaik</p>
          <p className="text-gray-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
            Nikmati cita rasa autentik Timur Tengah dalam suasana yang elegan. Reservasi meja Anda sekarang untuk pengalaman tak terlupakan.
          </p>

          <button onClick={() => startReservation()}
            className="mt-8 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide">
            Reservasi Sekarang
          </button>

          <div className="flex justify-center gap-8 mt-10 text-center">
            <div><p className="text-2xl font-bold text-[#C8973E]">2</p><p className="text-xs text-gray-500 mt-1">Outlet</p></div>
            <div className="w-[1px] bg-[#C8973E]/20" />
            <div><p className="text-2xl font-bold text-[#C8973E]">10:00</p><p className="text-xs text-gray-500 mt-1">Buka</p></div>
            <div className="w-[1px] bg-[#C8973E]/20" />
            <div><p className="text-2xl font-bold text-[#C8973E]">22:00</p><p className="text-xs text-gray-500 mt-1">Tutup</p></div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#C8973E]/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#C8973E]/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* ===== SECTION: AREA KAMI ===== */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Pilihan Area</p>
            <h2 className="text-3xl font-bold text-[#5C3D1A] font-serif mt-2">Temukan Tempat Favorit Anda</h2>
            <p className="text-[#C8973E]/40 mt-2">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 max-w-lg mx-auto text-sm">Setiap area dirancang untuk memberikan kenyamanan dan pengalaman berbeda</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((area) => (
              <div key={area.id} className="group bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-md hover:shadow-xl hover:shadow-[#C8973E]/10 transition-all duration-300 hover:-translate-y-1">
                {/* Image placeholder */}
                <div className={`h-48 bg-gradient-to-br ${area.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-5xl opacity-30">{area.icon}</span>
                      <p className="text-white/40 text-xs mt-2 tracking-widest uppercase">Foto segera hadir</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="bg-[#C8973E] text-white text-xs px-3 py-1 rounded-full font-semibold">
                      Max {area.kapasitas}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-[#5C3D1A] font-serif">{area.title}</h3>
                  <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.desc}</p>
                  <button onClick={() => startReservation(area.id)}
                    className="mt-4 w-full py-3 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] text-sm">
                    Reservasi Area Ini →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SECTION: OUTLET ===== */}
      <div className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Lokasi</p>
            <h2 className="text-3xl font-bold text-[#5C3D1A] font-serif mt-2">Outlet Kami</h2>
            <p className="text-[#C8973E]/40 mt-2">━━ ✦ ━━</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              { city: "Solo", address: "Jl. Slamet Riyadi No. XX", hours: "10:00 - 22:00" },
              { city: "Yogyakarta", address: "Jl. Kaliurang No. XX", hours: "10:00 - 22:00" },
            ].map((o) => (
              <div key={o.city} className="bg-[#FDF6EC] border border-[#E8DCC8] rounded-2xl p-6 text-center hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-[#C8973E] to-[#A67B2E] rounded-full flex items-center justify-center mx-auto text-white text-xl">◈</div>
                <h3 className="font-bold text-xl text-[#5C3D1A] font-serif mt-4">{o.city}</h3>
                <p className="text-[#8B7355] text-sm mt-2">{o.address}</p>
                <p className="text-[#C8973E] text-sm mt-1 font-semibold">{o.hours}</p>
                <button onClick={() => { setOutlet(o.city.toLowerCase()); startReservation(); }}
                  className="mt-4 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:from-[#D4A44A] hover:to-[#B8892E] transition-all active:scale-[0.98]">
                  Reservasi di {o.city}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CTA SECTION ===== */}
      <div className="py-16 px-4 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15L45 15L37 22L40 32L30 26L20 32L23 22L15 15L25 15Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
        <div className="relative text-center max-w-lg mx-auto">
          <Image src="/logo.png" alt="Yassalam" width={80} height={80} className="mx-auto opacity-80" />
          <h2 className="text-2xl font-bold text-[#C8973E] font-serif mt-4">Siap untuk Pengalaman Arabian?</h2>
          <p className="text-gray-500 mt-3 text-sm">Reservasi meja Anda sekarang dan nikmati hidangan terbaik kami</p>
          <button onClick={() => startReservation()}
            className="mt-6 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20">
            Reservasi Sekarang
          </button>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="bg-[#1a0f07] py-8 px-4">
        <div className="text-center">
          <p className="text-[#C8973E]/30 text-sm">━━ ✦ ━━</p>
          <p className="text-[#C8973E]/40 text-xs mt-3">© 2026 Yassalam Arabian Resto & Catering. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}