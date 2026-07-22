"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "./supabase";

type Table = {
  Id: number; outlet: string; nomor_meja: number; nama_meja?: string | null;
  kapasitas: number; posisi: string; status: string;
  foto_url?: string | null; dp_minimum?: number | null;
};
type MenuPaket = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
};
type AreaData = {
  Id: number; outlet: string; nama: string; slug: string;
  deskripsi: string | null; urutan: number;
};

const areaVisuals = [
  { gradient: "from-amber-800 to-yellow-900", icon: "✦" },
  { gradient: "from-stone-700 to-stone-900", icon: "◈" },
  { gradient: "from-amber-900 to-orange-950", icon: "◆" },
  { gradient: "from-emerald-900 to-emerald-950", icon: "❋" },
  { gradient: "from-yellow-800 to-amber-950", icon: "★" },
];

function AreaCardPhotos({ photos, icon, gradient }: { photos: string[]; icon: string; gradient: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <div className="text-center">
          <span className="text-5xl opacity-30">{icon}</span>
          <p className="text-white/40 text-xs mt-2 tracking-widest uppercase">Foto segera hadir</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out" style={{ opacity: i === idx ? 1 : 0 }} />
      ))}
    </>
  );
}
function WelcomeSplash({
  slides, slideIndex, setSlideIndex, onReservasi,
}: {
  slides: string[]; slideIndex: number; setSlideIndex: (i: number) => void; onReservasi: (outlet: string) => void;
}) {
  const [pendingAction, setPendingAction] = useState<"reservasi" | "aqiqah" | "preorder" | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((slideIndex + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slideIndex, slides.length, setSlideIndex]);

  function handleOutletPicked(outletValue: string) {
    const outletLabel = outletValue === "solo" ? "Solo" : "Yogyakarta";
    if (pendingAction === "reservasi") {
      onReservasi(outletValue);
    } else if (pendingAction === "aqiqah") {
      window.open(`https://wa.me/62xxxxxxxxxx?text=Halo%20Yassalam%2C%20saya%20ingin%20order%20Aqiqah%20untuk%20outlet%20${outletLabel}`, "_blank");
    } else if (pendingAction === "preorder") {
      window.open(`https://wa.me/62xxxxxxxxxx?text=Halo%20Yassalam%2C%20saya%20ingin%20Pre%20Order%20untuk%20outlet%20${outletLabel}`, "_blank");
    }
    setPendingAction(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-[#1a0f07]">
      {/* Slideshow layers */}
      {slides.map((grad, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-br ${grad} transition-opacity duration-[2000ms] ease-in-out will-change-transform`}
          style={{
            opacity: i === slideIndex ? 1 : 0,
            animation: i === slideIndex ? "kenburns 8s ease-out forwards" : "none",
          }}
        />
      ))}

      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
      {/* Vignette so text stays readable over the moving background */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07] via-[#1a0f07]/40 to-[#1a0f07]/70" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />

      {/* Slide dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-6 bg-[#C8973E]" : "w-1.5 bg-[#C8973E]/30"}`} />
        ))}
      </div>

      <div className="relative text-center max-w-md w-full z-10">
        <Image src="/logo.PNG" alt="Yassalam" width={110} height={110} className="mx-auto drop-shadow-2xl animate-fadeInUp" />
        <p className="text-[#C8973E]/40 mt-6 text-sm tracking-[0.5em] animate-fadeInUp" style={{ animationDelay: "0.1s" }}>━━━ ✦ ━━━</p>
        <h1 className="italic text-[#C8973E] mt-5 text-3xl font-serif animate-fadeInUp" style={{ animationDelay: "0.2s" }}>Marhaba Yassalam!</h1>

        {!pendingAction ? (
          <>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              Selamat datang di Yassalam Arabian Resto & Catering. Silakan pilih layanan yang Anda butuhkan.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={() => setPendingAction("reservasi")}
                className="py-4 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide"
              >
                Reservasi
              </button>
              <button
                onClick={() => setPendingAction("aqiqah")}
                className="py-4 px-2 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold text-sm sm:text-base hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] tracking-wide"
              >
                Aqiqah
              </button>
              <button
                onClick={() => setPendingAction("preorder")}
                className="py-4 px-2 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold text-sm sm:text-base hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] tracking-wide"
              >
                Pre Order
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed animate-fadeInUp">
              Pilih outlet untuk {pendingAction === "reservasi" ? "reservasi" : pendingAction === "aqiqah" ? "Aqiqah" : "Pre Order"} Anda
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 animate-fadeInUp">
              <button
                onClick={() => handleOutletPicked("solo")}
                className="py-5 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide"
              >
                Solo
              </button>
              <button
                onClick={() => handleOutletPicked("jogja")}
                className="py-5 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide"
              >
                Yogyakarta
              </button>
            </div>

            <button
              onClick={() => setPendingAction(null)}
              className="mt-5 text-sm text-[#C8973E]/60 hover:text-[#C8973E] transition-colors"
            >
              ← Kembali
            </button>
          </>
        )}

        <p className="text-[#C8973E]/30 mt-10 text-xs tracking-widest animate-fadeInUp" style={{ animationDelay: "0.5s" }}>Solo · Yogyakarta</p>
      </div>
    </div>
  );
}
function AreaModal({
  area, tables, gradient, icon, onClose, onSelectTable,
}: {
  area: AreaData;
  tables: Table[];
  gradient: string;
  icon: string;
  onClose: () => void;
  onSelectTable: (table: Table) => void;
}) {
  const photos = tables.filter((t) => t.foto_url).map((t) => t.foto_url as string);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pickedTable, setPickedTable] = useState<Table | null>(null);

  useEffect(() => {
    if (pickedTable) return; // stop auto-slide kalau lagi lihat foto meja tertentu
    if (photos.length < 2) return;
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % photos.length), 3500);
    return () => clearInterval(t);
  }, [photos.length, pickedTable]);

  const displayedPhoto = pickedTable?.foto_url || photos[slideIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl animate-fadeInUp max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Foto — slideshow area, atau foto meja spesifik kalau sedang dipilih */}
        <div className={`relative h-56 shrink-0 bg-gradient-to-br ${gradient} overflow-hidden`}>
          {displayedPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayedPhoto} alt={pickedTable ? (pickedTable.nama_meja || `Meja ${pickedTable.nomor_meja}`) : area.nama}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30 text-white">{icon}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all">✕</button>

          {pickedTable ? (
            <span className="absolute bottom-4 left-4 bg-[#C8973E] text-white text-xs px-3 py-1 rounded-full font-semibold">
              📍 {pickedTable.nama_meja || `Meja ${pickedTable.nomor_meja}`}
            </span>
          ) : photos.length > 1 ? (
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {photos.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <h3 className="font-bold text-2xl text-[#5C3D1A] font-serif">{area.nama}</h3>
          {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}

          <div className="mt-6">
            <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Pilih Meja</p>
            {tables.length === 0 ? (
              <p className="text-sm text-[#B8A88A]">Belum ada meja tersedia di area ini.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tables.map((t) => (
                  <button key={t.Id} onClick={() => setPickedTable(t)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${pickedTable?.Id === t.Id ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50"}`}>
                    <p className="font-bold text-[#5C3D1A]">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                    <p className="text-sm text-[#8B7355] mt-1">{t.kapasitas} orang</p>
                    {t.dp_minimum ? <p className="text-xs text-[#C8973E] mt-1 font-semibold">DP min. Rp {t.dp_minimum.toLocaleString("id-ID")}</p> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {pickedTable && (
            <button onClick={() => onSelectTable(pickedTable)}
              className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20">
              Reservasi {pickedTable.nama_meja || `Meja ${pickedTable.nomor_meja}`} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [outlet, setOutlet] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [jumlahTamu, setJumlahTamu] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuPaket | null>(null);
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [namaTamu, setNamaTamu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [preselectedArea, setPreselectedArea] = useState("");
  const [selectedAreaModal, setSelectedAreaModal] = useState<AreaData | null>(null);

  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuPaket[]>([]);
  const [areasData, setAreasData] = useState<AreaData[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!outlet) return;
    supabase.from("Tables").select("*").eq("outlet", outlet).order("nomor_meja")
      .then(({ data }) => setTables(data || []));
    supabase.from("MenuPaket").select("*").eq("outlet", outlet).eq("aktif", true)
      .then(({ data }) => setMenus(data || []));
    supabase.from("Areas").select("*").eq("outlet", outlet).order("urutan")
      .then(({ data }) => setAreasData(data || []));
  }, [outlet]);

  useEffect(() => {
    if (!jam) { setJamSelesai(""); return; }
    const [h, m] = jam.split(":").map(Number);
    const totalMenit = (h * 60 + m + 120) % (24 * 60);
    const eh = Math.floor(totalMenit / 60);
    const em = totalMenit % 60;
    setJamSelesai(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
  }, [jam]);

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
      if (jam) { const h = parseInt(jam.split(":")[0]); if (h < 7 || h >= 20) errs.push("Jam reservasi hanya 07:00 - 20:00"); }
      if (!jumlahTamu || Number(jumlahTamu) < 1) errs.push("Jumlah tamu minimal 1 orang");
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Nama tamu minimal 2 karakter");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    }
    if (s === 2 && !selectedTable) errs.push("Pilih meja terlebih dahulu");
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
      nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
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

  // ==================== WELCOME SPLASH ====================
  const slides = [
    "from-[#2a1a0e] via-[#3a2415] to-[#1a0f07]",
    "from-[#3a2a12] via-[#4a3018] to-[#241608]",
    "from-[#241a10] via-[#3a2818] to-[#150c05]",
  ];
  const [slideIndex, setSlideIndex] = useState(0);

  if (showWelcome) {
    return (
      <WelcomeSplash
        slides={slides}
        slideIndex={slideIndex}
        setSlideIndex={setSlideIndex}
        onReservasi={(outletPilihan) => {
          setOutlet(outletPilihan);
          setShowWelcome(false);
        }}
      />
    );
  }

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
            <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span></div>
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
      <div className="min-h-screen bg-white animate-fadeInUp" style={{ animationDuration: "0.6s" }}>
        {/* Sticky header — matches Home hero identity */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <button onClick={backToHome} className="flex items-center gap-1.5 text-sm font-medium text-[#C8973E]/70 hover:text-[#C8973E] transition-colors">
              <span aria-hidden>←</span> <span className="hidden sm:inline">Beranda</span>
            </button>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.PNG" alt="Yassalam" width={30} height={30} />
              <span className="text-sm font-bold text-white tracking-[0.15em]">YASSALAM</span>
            </div>
            <span className="text-xs font-bold text-[#C8973E] tracking-[0.15em] uppercase">Reservasi Meja</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mb-2">
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-[#E5D9C3]" />
              <div
                className="absolute top-4 left-0 h-[2px] bg-[#C8973E] transition-all duration-300"
                style={{ width: `${(Math.max(step - 1, 0) / (stepLabels.length - 1)) * 100}%` }}
              />
              {stepLabels.map((label, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step > s ? "bg-[#C8973E] border-[#C8973E] text-white" : step === s ? "bg-white border-[#C8973E] text-[#C8973E] shadow-md shadow-[#C8973E]/20" : "bg-white border-[#E5D9C3] text-[#C8B89A]"}`}>
                      {step > s ? "✓" : s}
                    </div>
                    <span className={`text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap ${step >= s ? "text-[#C8973E]" : "text-[#C8B89A]"}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-center text-[#C8973E]/40 text-sm mb-8 sm:mb-10">━━ ✦ ━━</p>

          {errors.length > 0 && (
            <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              {errors.map((err, i) => <p key={i} className="text-red-500 text-sm py-1">⚠ {err}</p>)}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 bg-white border border-[#C8973E]/12 rounded-3xl p-6 sm:p-8 shadow-lg shadow-[#C8973E]/5">

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
                      <div className="flex gap-2">
                        <select
                          value={jam.split(":")[0] || ""}
                          onChange={(e) => setJam(`${e.target.value}:${jam.split(":")[1] || "00"}`)}
                          className={inputClass}
                        >
                          <option value="">Jam</option>
                          {Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => (
                            <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
                          ))}
                        </select>
                        <select
                          value={jam.split(":")[1] || ""}
                          onChange={(e) => setJam(`${jam.split(":")[0] || "07"}:${e.target.value}`)}
                          className={inputClass}
                        >
                          <option value="">Menit</option>
                          {Array.from({ length: 60 }, (_, m) => m)
                            .filter((m) => !(jam.split(":")[0] === "20" && m !== 0))
                            .map((m) => (
                              <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                            ))}
                        </select>
                      </div>
                      {jamSelesai && (
                        <p className="text-xs text-[#8B7355] mt-2">
                          Reservasi berlangsung <span className="font-semibold text-[#C8973E]">2 jam</span>, selesai sekitar <span className="font-semibold text-[#C8973E]">{jamSelesai}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Jumlah Tamu</label>
                    <input type="number" placeholder="Berapa orang?" min="1" max="100" value={jumlahTamu} onChange={(e) => setJumlahTamu(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nama Tamu</label>
                    <input type="text" placeholder="Masukkan nama lengkap" value={namaTamu} onChange={(e) => setNamaTamu(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No. WhatsApp</label>
                    <input type="tel" placeholder="081234567890" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={inputClass} />
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
                    <p className="text-[#8B7355] text-sm mt-1">Periksa kembali pesanan Anda sebelum mengirim</p>
                  </div>
                  <div><label className={labelClass}>Catatan <span className="text-[#B8A88A] normal-case tracking-normal font-normal">(opsional)</span></label><textarea placeholder="Contoh: kursi bayi, alergi, dll." rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass + " resize-none"} /></div>

                  <div className="border-2 border-[#C8973E]/15 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3">
                      <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Ringkasan</h3>
                    </div>
                    <div className="p-5 space-y-2 text-sm bg-[#FEFCF8]">
                      <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span></div>
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

            {/* Live order summary sidebar */}
            <div className="lg:sticky lg:top-20 bg-white border border-[#C8973E]/12 rounded-3xl overflow-hidden shadow-lg shadow-[#C8973E]/5">
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3.5">
                <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Ringkasan Pesanan</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet || "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal || "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam ? `${jam} - ${jamSelesai}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#8B7355]">Tamu</span><span className="font-semibold text-[#5C3D1A]">{jumlahTamu ? `${jumlahTamu} orang` : "—"}</span></div>

                <div className="pt-3 border-t border-[#EFE6D6] flex justify-between">
                  <span className="text-[#8B7355]">Meja</span>
                  <span className={`font-semibold text-right ${selectedTable ? "text-[#C8973E]" : "text-[#C8B89A]"}`}>
                    {selectedTable ? `No. ${selectedTable.nomor_meja} · ${getPosisiLabel(selectedTable.posisi)}` : "Belum dipilih"}
                  </span>
                </div>

                {selectedMenu ? (
                  <>
                    <div className="pt-3 border-t border-[#EFE6D6] flex justify-between">
                      <span className="text-[#8B7355]">Menu</span>
                      <span className="font-semibold text-[#5C3D1A] text-right">{selectedMenu.nama_paket} × {jumlahPorsi || 0}</span>
                    </div>
                    <div className="pt-3 border-t border-[#EFE6D6] flex justify-between items-center">
                      <span className="text-[#8B7355] font-semibold">Total</span>
                      <span className="font-bold text-[#C8973E] text-lg">{formatRupiah(selectedMenu.harga * Number(jumlahPorsi || 0))}</span>
                    </div>
                  </>
                ) : (
                  <p className="pt-3 border-t border-[#EFE6D6] text-xs text-[#B8A88A] leading-relaxed">Menu bisa dipesan langsung saat tiba di outlet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-[#C8973E]/30 text-sm">━━ ✦ ━━</p>
            <p className="text-[#C8973E]/40 text-xs mt-2">© 2026 Yassalam Arabian Resto & Catering</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LANDING PAGE ====================
  return (
    <div className="min-h-screen bg-[#FDF6EC]">

      {/* ===== HERO SECTION ===== */}
      <div className="relative h-[90vh] min-h-[560px] bg-[#1a0f07] flex items-center justify-center overflow-hidden">
        {/* Slideshow layers — sama seperti splash screen */}
        {slides.map((grad, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-gradient-to-br ${grad} transition-opacity duration-[2000ms] ease-in-out will-change-transform`}
            style={{
              opacity: i === slideIndex ? 1 : 0,
              animation: i === slideIndex ? "kenburns 8s ease-out forwards" : "none",
            }}
          />
        ))}

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        {/* Gold accent top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        {/* Vignette so text stays readable over the moving background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07]/80 via-transparent to-[#1a0f07]/30" />

        {/* Back to splash button */}
        <button
          onClick={() => setShowWelcome(true)}
          className="absolute top-6 left-4 sm:left-6 z-20 flex items-center gap-1.5 text-sm font-medium text-[#C8973E] bg-[#1a0f07] hover:bg-[#241608] border border-[#C8973E]/40 hover:border-[#C8973E] rounded-full px-4 py-2 transition-colors active:scale-[0.97]"
        >
          <span aria-hidden>←</span> <span className="hidden sm:inline">Beranda</span>
        </button>

        {/* Slide dots */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-6 bg-[#C8973E]" : "w-1.5 bg-[#C8973E]/30"}`} />
          ))}
        </div>

        <div className="relative text-center px-6 max-w-2xl z-10">
          <p className="text-[#C8973E]/70 text-xs tracking-[0.5em] uppercase mb-4 animate-fadeInUp">Solo · Yogyakarta</p>
          <Image src="/logo.PNG" alt="Yassalam" width={150} height={150} className="mx-auto drop-shadow-2xl animate-fadeInUp" style={{ animationDelay: "0.1s" }} />
          <p className="text-[#C8973E]/40 mt-5 text-sm tracking-[0.5em] animate-fadeInUp" style={{ animationDelay: "0.2s" }}>━━━ ✦ ━━━</p>
          <p className="italic text-[#C8973E] mt-5 text-3xl font-serif animate-fadeInUp" style={{ animationDelay: "0.3s" }}>Selamat Datang di Yassalam</p>
          <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Nikmati cita rasa autentik Timur Tengah dalam suasana yang elegan. Reservasi meja Anda sekarang untuk pengalaman tak terlupakan.
          </p>

          <button onClick={() => startReservation()}
            className="mt-9 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide animate-fadeInUp"
            style={{ animationDelay: "0.5s" }}>
            Reservasi Sekarang
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 border-2 border-[#C8973E]/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#C8973E]/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* ===== SECTION: AREA KAMI (data real dari Supabase) ===== */}
      <div className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Pilihan Area</p>
            <h2 className="text-3xl font-bold text-[#5C3D1A] font-serif mt-2">Temukan Tempat Favorit Anda</h2>
            <p className="text-[#C8973E]/40 mt-2">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 max-w-lg mx-auto text-sm">Klik salah satu area untuk melihat suasananya lebih dekat sebelum reservasi</p>
          </div>

          {areasData.length === 0 ? (
            <p className="text-center text-[#B8A88A] text-sm">Belum ada area terdaftar untuk outlet ini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {areasData.map((area, i) => {
                const visual = areaVisuals[i % areaVisuals.length];
                const areaTables = tables.filter((t) => t.posisi === area.slug);
                const photos = areaTables.filter((t) => t.foto_url).map((t) => t.foto_url as string);
                const totalKap = areaTables.reduce((sum, t) => sum + t.kapasitas, 0);
                return (
                  <div key={area.Id} className="group bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-md hover:shadow-xl hover:shadow-[#C8973E]/10 transition-all duration-300 hover:-translate-y-1">
                    <button onClick={() => setSelectedAreaModal(area)}
                      className="w-full h-48 relative overflow-hidden block text-left">
                      <AreaCardPhotos photos={photos} icon={visual.icon} gradient={visual.gradient} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold tracking-widest uppercase border border-white/60 rounded-full px-4 py-1.5">
                          Lihat Detail
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <span className="bg-[#C8973E] text-white text-xs px-3 py-1 rounded-full font-semibold">
                          Max {totalKap} orang
                        </span>
                      </div>
                    </button>

                    <div className="p-5">
                      <h3 className="font-bold text-lg text-[#5C3D1A] font-serif">{area.nama}</h3>
                      {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}
                      <button onClick={() => setSelectedAreaModal(area)}
                        className="mt-4 w-full py-3 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] text-sm">
                        Lihat & Reservasi →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

     {/* ===== SECTION: DISCOVER / OUR STORY ===== */}
      <div className="py-20 px-4 bg-[#FDF6EC]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Kisah Kami</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#5C3D1A] font-serif mt-3 leading-snug">
              Warisan Rasa Yang Disajikan Dengan Sepenuh Hati
            </h2>
            <p className="text-[#C8973E]/40 mt-4 mb-5">━━ ✦ ━━</p>
            <p className="text-[#8B7355] leading-relaxed text-[15px]">
              Di balik setiap hidangan Yassalam, tersimpan sepenggal kisah keluarga yang diwariskan dengan penuh cinta dari generasi ke generasi. Resep yang tersaji hari ini bukan sekadar bumbu dan rempah, melainkan warisan rasa dari Keluarga — dijaga keasliannya, dirawat dengan kesungguhan, dan disempurnakan dengan ketulusan yang sama seperti pertama kali diciptakan.
            </p>
            <p className="text-[#8B7355] leading-relaxed text-[15px] mt-4">
              Tiga hidangan istimewa Yassalam — Nasi Mandhi, Kabsah, dan Kabuli — hadir sebagai bukti nyata dedikasi tersebut. Setiap suapan mengajak Anda menyelami kehangatan cita rasa Timur Tengah yang otentik, tersaji dengan sepenuh hati di dua kota tercinta: Solo dan Yogyakarta.
            </p>
            <button onClick={() => startReservation()}
              className="mt-7 inline-flex items-center gap-2 text-[#C8973E] font-bold text-sm tracking-wide uppercase hover:gap-3 transition-all">
              Reservasi Sekarang <span>→</span>
            </button>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-[2rem] bg-gradient-to-br from-amber-800 via-stone-800 to-[#1a0f07] shadow-2xl shadow-[#C8973E]/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15L45 15L37 22L40 32L30 26L20 32L23 22L15 15L25 15Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />
              <span className="text-6xl opacity-25 text-white">✦</span>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 border border-[#C8973E]/15">
              <p className="text-3xl font-bold text-[#C8973E] font-serif">8+</p>
              <p className="text-xs text-[#8B7355] mt-1 tracking-wide">Tahun Pengalaman</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION: JAM OPERASIONAL & OUTLET (digabung side-by-side) ===== */}
      <div className="py-20 px-4 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-start">

          {/* Kolom kiri: Jam Operasional */}
          <div className="text-center md:text-left">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Jam Operasional</p>
            <h2 className="text-3xl font-bold text-white font-serif mt-2">Kunjungi Kami Setiap Hari</h2>
            <p className="text-[#C8973E]/40 mt-3">━━ ✦ ━━</p>

            <div className="mt-8 border border-[#C8973E]/25 rounded-2xl px-8 py-8 inline-flex flex-col items-center md:items-start gap-6 w-full md:w-auto">
              <div className="text-center md:text-left">
                <p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Senin – Kamis</p>
                <p className="text-4xl font-bold text-white font-serif mt-3">09:00 – 21:00</p>
              </div>
              <div className="w-16 h-[1px] bg-[#C8973E]/25" />
              <div className="text-center md:text-left">
                <p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Jumat – Minggu</p>
                <p className="text-4xl font-bold text-white font-serif mt-3">09:00 – 22:00</p>
              </div>
              <p className="text-gray-400 text-sm max-w-xs">Untuk grup besar atau acara spesial, disarankan reservasi minimal 1 hari sebelumnya.</p>
            </div>

            {/* Kontak cepat & sosial media */}
            <div className="mt-6 border-t border-[#C8973E]/15 pt-6 w-full flex flex-col items-center md:items-start gap-4">
              <div className="flex flex-col gap-3">
                <a href="https://instagram.com/yassalamcatering" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">
                  <span className="w-8 h-8 rounded-full border border-[#C8973E]/30 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </span>
                  <span>@yassalamcatering</span>
                </a>

                <a href="https://tiktok.com/@yassalamresto" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">
                  <span className="w-8 h-8 rounded-full border border-[#C8973E]/30 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/>
                    </svg>
                  </span>
                  <span>@yassalamresto</span>
                </a>
              </div>
            </div>
          </div>

          {/* Kolom kanan: Outlet Kami */}
          <div>
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold text-center md:text-left">Lokasi</p>
            <h2 className="text-3xl font-bold text-white font-serif mt-2 text-center md:text-left">Outlet Kami</h2>
            <p className="text-[#C8973E]/40 mt-3 text-center md:text-left">━━ ✦ ━━</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 mt-8">
              {[
                { city: "Solo", outletValue: "solo", address: "Jl. Kapten Mulyadi No. 193, Pasar Kliwon, Surakarta", wa: "6281222666068", waLabel: "0812-2266-6068", active: true },
                { city: "Yogyakarta", outletValue: "jogja", address: "Jl. Timoho No. 56, Muja Muju, Umbulharjo, DIY", wa: "6281222666030", waLabel: "0812-2266-6030", active: true },
                { city: "Surabaya", outletValue: "surabaya", address: "Coming Soon", wa: "", waLabel: "", active: false },
                { city: "Semarang", outletValue: "semarang", address: "Coming Soon", wa: "", waLabel: "", active: false },
              ].map((o) => (
                <div key={o.city} className={`border rounded-2xl p-6 text-center md:text-left transition-all ${o.active ? "border-[#C8973E]/20 hover:border-[#C8973E]/40" : "border-[#C8973E]/10 opacity-60"}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto md:mx-0 text-white text-lg ${o.active ? "bg-gradient-to-br from-[#C8973E] to-[#A67B2E]" : "bg-gray-700"}`}>◈</div>
                  <h3 className="font-bold text-lg text-white font-serif mt-3">{o.city}</h3>
                  <p className="text-gray-400 text-sm mt-1">{o.address}</p>

                  {o.active ? (
                    <>
                      <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Yassalam Arabian Resto & Catering " + o.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#C8973E] hover:text-[#D4A44A] mt-3 font-semibold transition-colors"><span className="text-base">📍</span> Lihat di Google Maps</a>
                      <a href={`https://wa.me/${o.wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C8973E] mt-1.5 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/>
                        </svg>
                        WA {o.waLabel}
                      </a>
                      <button onClick={() => { setOutlet(o.outletValue); startReservation(); }}
                        className="mt-4 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:from-[#D4A44A] hover:to-[#B8892E] transition-all active:scale-[0.98] w-full">
                        Reservasi di {o.city}
                      </button>
                    </>
                  ) : (
                    <button disabled className="mt-4 border border-gray-700 text-gray-500 px-6 py-2.5 rounded-xl font-semibold text-sm w-full cursor-not-allowed">
                      Segera Hadir
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="bg-[#1a0f07] py-8 px-4">
        <div className="text-center">
          <p className="text-[#C8973E]/30 text-sm">━━ ✦ ━━</p>
          <p className="text-[#C8973E]/40 text-xs mt-3">© 2026 Yassalam Arabian Resto & Catering. All rights reserved.</p>
        </div>
      </div>

      {/* ===== AREA DETAIL MODAL ===== */}
      {selectedAreaModal && (() => {
        const areaAktif = selectedAreaModal;
        const visualIdx = areasData.findIndex((a) => a.Id === areaAktif.Id) % areaVisuals.length;
        const visual = areaVisuals[visualIdx >= 0 ? visualIdx : 0];
        return (
          <AreaModal
            area={areaAktif}
            tables={tables.filter((t) => t.posisi === areaAktif.slug)}
            gradient={visual.gradient}
            icon={visual.icon}
            onClose={() => setSelectedAreaModal(null)}
            onSelectTable={(table) => {
              setSelectedTable(table);
              setSelectedAreaModal(null);
              startReservation(areaAktif.slug);
            }}
          />
        );
      })()}
    </div>
  );
}