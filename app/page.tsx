"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "./supabase";
import dynamic from "next/dynamic";

const MenuFlipbook = dynamic(() => import("./MenuFlipbook"), { ssr: false });

type Table = {
  Id: number; outlet: string; nomor_meja: number; nama_meja?: string | null;
  kapasitas: number; posisi: string; status: string;
  foto_url?: string | null; dp_minimum?: number | null;
  kapasitas_minimum?: number | null; minimum_transaksi?: number | null;
};
type AreaData = {
  Id: number; outlet: string; nama: string; slug: string;
  deskripsi: string | null; urutan: number;
};
type MejaGabungan = {
  Id: number; outlet: string; nama: string; deskripsi: string | null;
  meja_ids: number[]; kapasitas_total: number; kapasitas_minimum: number | null;
  dp_minimum: number | null; minimum_transaksi: number | null; foto_url: string | null; aktif: boolean;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type BookingSlot = {
  Id: number; meja_id: number; tanggal: string; jam: string; jam_selesai: string;
  status: string; type: "reservation" | "hold";
};
type MenuPaket = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
};
const areaVisuals = [
  { gradient: "from-amber-800 to-yellow-900", icon: "✦" },
  { gradient: "from-stone-700 to-stone-900", icon: "◈" },
  { gradient: "from-amber-900 to-orange-950", icon: "◆" },
  { gradient: "from-emerald-900 to-emerald-950", icon: "❋" },
  { gradient: "from-yellow-800 to-amber-950", icon: "★" },
];

function hitungJamSelesai(jam: string): string {
  if (!jam) return "";
  const [h, m] = jam.split(":").map(Number);
  const totalMenit = (h * 60 + m + 120) % (24 * 60);
  return `${String(Math.floor(totalMenit / 60)).padStart(2, "0")}:${String(totalMenit % 60).padStart(2, "0")}`;
}

function isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}


/* ========== KOMPONEN KECIL ========== */

function AreaCardPhotos({ photos, icon, gradient }: { photos: string[]; icon: string; gradient: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);
  if (photos.length === 0) return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-5xl opacity-30">{icon}</span>
    </div>
  );
  return <>
    {photos.map((url, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={url} src={url} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
  </>;
}

function FloatingWA({ outlet }: { outlet: string }) {
  const wa = outlet === "solo" ? "6281222666068" : "6281222666030";
  return (
    <a href={`https://wa.me/${wa}?text=Halo%20Yassalam%2C%20saya%20butuh%20bantuan%20reservasi`}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1DA851] rounded-full flex items-center justify-center shadow-xl shadow-black/20 transition-all active:scale-95"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/>
      </svg>
    </a>
  );
}

/* ========== WELCOME SPLASH ========== */

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
    const waNumber = outletValue === "solo" ? "6281222666068" : "6281222666030";
    if (pendingAction === "reservasi") { onReservasi(outletValue); }
    else if (pendingAction === "aqiqah") { window.open(`https://wa.me/${waNumber}?text=Halo%20Yassalam%2C%20saya%20ingin%20order%20Aqiqah%20untuk%20outlet%20${outletLabel}`, "_blank"); }
    else if (pendingAction === "preorder") { window.open(`https://wa.me/${waNumber}?text=Halo%20Yassalam%2C%20saya%20ingin%20Pre%20Order%20untuk%20outlet%20${outletLabel}`, "_blank"); }
    setPendingAction(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-[#1a0f07]">
      {slides.map((grad, i) => (
        <div key={i} className={`absolute inset-0 bg-gradient-to-br ${grad} transition-opacity duration-[2000ms] will-change-transform`}
          style={{ opacity: i === slideIndex ? 1 : 0, animation: i === slideIndex ? "kenburns 8s ease-out forwards" : "none" }} />
      ))}
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07] via-[#1a0f07]/40 to-[#1a0f07]/70" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-6 bg-[#C8973E]" : "w-1.5 bg-[#C8973E]/30"}`} />)}
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
              <button onClick={() => setPendingAction("reservasi")} className="py-4 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide">Reservasi</button>
              <button onClick={() => setPendingAction("aqiqah")} className="py-4 px-2 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold text-sm sm:text-base hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] tracking-wide">Aqiqah</button>
              <button onClick={() => setPendingAction("preorder")} className="py-4 px-2 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold text-sm sm:text-base hover:bg-[#C8973E] hover:text-white transition-all active:scale-[0.98] tracking-wide">Pre Order</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed animate-fadeInUp">
              Pilih outlet untuk {pendingAction === "reservasi" ? "reservasi" : pendingAction === "aqiqah" ? "Aqiqah" : "Pre Order"} Anda
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 animate-fadeInUp">
              <button onClick={() => handleOutletPicked("solo")} className="py-5 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide">Solo</button>
              <button onClick={() => handleOutletPicked("jogja")} className="py-5 px-2 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide">Yogyakarta</button>
            </div>
            <button onClick={() => setPendingAction(null)} className="mt-5 text-sm text-[#C8973E]/60 hover:text-[#C8973E] transition-colors">← Kembali</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== AREA GALLERY MODAL (hanya untuk lihat-lihat, bukan pilih meja) ========== */

function AreaGalleryModal({ area, tables, gradient, icon, onClose }: {
  area: AreaData; tables: Table[]; gradient: string; icon: string; onClose: () => void;
}) {
  const photos = tables.filter((t) => t.foto_url);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTable = photos[activeIdx] || null;

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl animate-fadeInUp max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Foto besar */}
        <div className={`relative w-full aspect-[4/3] bg-gradient-to-br ${gradient} overflow-hidden`}>
          {activeTable?.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeTable.foto_url} alt={activeTable.nama_meja || `Meja ${activeTable.nomor_meja}`}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30 text-white">{icon}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all z-10">✕</button>

          {/* Nama meja di atas foto */}
          {activeTable && (
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-lg drop-shadow-lg">{activeTable.nama_meja || `Meja ${activeTable.nomor_meja}`}</p>
              <p className="text-white/70 text-sm">Muat {activeTable.kapasitas} orang</p>
            </div>
          )}

          {/* Dot indicator */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeIdx ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Info area */}
        <div className="p-6">
          <h3 className="font-bold text-2xl text-[#5C3D1A] font-serif">{area.nama}</h3>
          {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}
          <div className="mt-3 flex items-center gap-4 text-sm text-[#8B7355]">
            <span>🪑 {tables.length} meja</span>
            <span>👥 Muat hingga {Math.max(...tables.map((t) => t.kapasitas), 0)} orang</span>
          </div>

          {/* Thumbnail grid semua meja */}
          {photos.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Meja di area ini</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((t, i) => (
                  <button key={t.Id} onClick={() => setActiveIdx(i)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${i === activeIdx ? "border-[#C8973E] shadow-md" : "border-transparent hover:border-[#C8973E]/30"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.foto_url!} alt="" className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 bg-black/40 flex items-end p-1.5 ${i === activeIdx ? "bg-black/20" : ""}`}>
                      <p className="text-white text-[10px] font-bold leading-tight drop-shadow">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GabunganSlideshow({ photos }: { photos: { url: string; label: string }[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden mb-3">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p.url} src={p.url} alt={p.label}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }} />
      ))}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
        {photos[idx]?.label}
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {photos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
/* ========== HOME ========== */

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
  const [jumlahTamu, setJumlahTamu] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuPaket | null>(null);
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [namaTamu, setNamaTamu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [selectedAreaModal, setSelectedAreaModal] = useState<AreaData | null>(null);
  const [holdId, setHoldId] = useState<number | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuPaket[]>([]);
  const [areasData, setAreasData] = useState<AreaData[]>([]);

  // Meja yang tersedia untuk step 2
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [availableGabungan, setAvailableGabungan] = useState<MejaGabungan[]>([]);
  const [selectedGabungan, setSelectedGabungan] = useState<MejaGabungan | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; nama: string } | null>(null);

  const jamSelesai = hitungJamSelesai(jam);
  const today = new Date().toISOString().split("T")[0];

  const backToHome = useCallback(() => {
    if (holdId) {
      supabase.from("BookingHold").update({ status: "released" }).eq("Id", holdId);
    }
    setHoldId(null);
    setHoldExpiry(null);
    setReservationId(null);
    setShowForm(false);
    setSukses(false);
    setStep(1);
    setTanggal("");
    setJam("");
    setJumlahTamu("");
    setSelectedTable(null);
    setSelectedMenu(null);
    setNamaTamu("");
    setNoWa("");
    setCatatan("");
    setAvailableTables([]);
    setAvailableGabungan([]);
    setSelectedGabungan(null);
  }, [holdId]);

  // Countdown hold timer
  useEffect(() => {
    if (!holdExpiry) { queueMicrotask(() => setCountdown("")); return; }
    const tick = () => {
      const diff = holdExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        setHoldId(null);
        setHoldExpiry(null);
        alert("Waktu hold meja telah habis. Silakan mulai ulang.");
        backToHome();
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry, backToHome]);

  // Handle back button HP
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (selectedAreaModal) setSelectedAreaModal(null);
      else if (showForm && sukses) backToHome();
      else if (showForm && step > 1) setStep((s) => s - 1);
      else if (showForm) backToHome();
      else if (!showWelcome) setShowWelcome(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedAreaModal, showForm, sukses, step, showWelcome, backToHome]);

  useEffect(() => { window.history.pushState({ overlay: true }, ""); }, [showForm, selectedAreaModal, showWelcome]);
  useEffect(() => { if (showForm && step > 1) window.history.pushState({ overlay: true }, ""); }, [step, showForm]);

  // Fetch data outlet
  useEffect(() => {
    if (!outlet) return;
    supabase.from("Tables").select("*").eq("outlet", outlet).order("nomor_meja").then(({ data }) => setTables(data || []));
    supabase.from("MenuPaket").select("*").eq("outlet", outlet).eq("aktif", true).then(({ data }) => setMenus(data || []));
    supabase.from("Areas").select("*").eq("outlet", outlet).order("urutan").then(({ data }) => setAreasData(data || []));
  }, [outlet]);

  // Fetch meja tersedia saat masuk step 2
  async function fetchAvailableTables() {
    if (!outlet || !tanggal || !jam || !jumlahTamu) return;
    setLoadingTables(true);
    setSelectedGabungan(null);
    const computedEnd = hitungJamSelesai(jam);

    const { data: resData } = await supabase
      .from("Reservation").select("meja_id, jam, jam_selesai")
      .eq("tanggal", tanggal).in("status", ["Confirmed", "Pending"]);

    const { data: holdData } = await supabase
      .from("BookingHold").select("meja_id, jam, jam_selesai")
      .eq("tanggal", tanggal).eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    const bookedMejaIds = new Set<number>();
    [...(resData || []), ...(holdData || [])].forEach((slot) => {
      if (isTimeOverlap(jam, computedEnd, slot.jam, slot.jam_selesai)) {
        bookedMejaIds.add(slot.meja_id);
      }
    });

    const tamu = Number(jumlahTamu) || 1;

    // Filter meja tunggal: tersedia + kapasitas cukup + kapasitas minimum terpenuhi
    const available = tables.filter((t) =>
      !bookedMejaIds.has(t.Id) &&
      t.kapasitas >= tamu &&
      (!t.kapasitas_minimum || tamu >= t.kapasitas_minimum)
    );
    setAvailableTables(available);

    // Fetch meja gabungan yang aktif
    const { data: gabData } = await supabase
      .from("MejaGabungan").select("*")
      .eq("outlet", outlet).eq("aktif", true);

    const availGab = (gabData || []).filter((g: MejaGabungan) => {
      // Semua meja dalam gabungan harus tersedia
      const allAvailable = g.meja_ids.every((id: number) => !bookedMejaIds.has(id));
      // Kapasitas total cukup
      const kapCukup = g.kapasitas_total >= tamu;
      // Kapasitas minimum terpenuhi
      const minOk = !g.kapasitas_minimum || tamu >= g.kapasitas_minimum;
      return allAvailable && kapCukup && minOk;
    });
    setAvailableGabungan(availGab);

    setLoadingTables(false);
  }

  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function getPosisiLabel(p: string) {
    const map: Record<string, string> = { "indoor-jendela": "Dekat Jendela", "indoor-tengah": "Indoor Tengah", "indoor-pojok": "Indoor Pojok", "outdoor": "Outdoor Garden", "vip": "VIP Room" };
    return map[p] || p;
  }

  function validateStep(s: number): string[] {
    const errs: string[] = [];
    if (s === 1) {
      if (!tanggal) errs.push("Pilih tanggal kunjungan");
      if (tanggal && tanggal < today) errs.push("Tanggal tidak boleh hari yang sudah lewat");
      if (!jam) errs.push("Pilih jam kunjungan");
      if (jam) { const h = parseInt(jam.split(":")[0]); if (h < 7 || h >= 20) errs.push("Jam reservasi antara 07:00 - 20:00"); }
      if (!jumlahTamu || Number(jumlahTamu) < 1) errs.push("Isi jumlah tamu");
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Isi nama lengkap Anda");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    }
    if (s === 2) {
      if (!selectedTable && !selectedGabungan) errs.push("Pilih salah satu meja yang tersedia");
    }
    if (s === 3) {
      if (!selectedTable) errs.push("Meja belum dipilih");
    }
    return errs;
  }

  async function nextStep() {
    const errs = validateStep(step);
    setErrors(errs);
    if (errs.length > 0) return;

    if (step === 1) {
      // Masuk step 2: cari meja tersedia
      await fetchAvailableTables();
      setStep(2);
    } else if (step === 2) {
      // Masuk step 3: create hold agar meja terkunci selama proses bayar
      const success = await createBookingHold();
      if (!success) return;
      setStep(3);
    }
  }

  async function createBookingHold() {
    const mejaIds: number[] = selectedGabungan
      ? selectedGabungan.meja_ids
      : selectedTable ? [selectedTable.Id] : [];
    if (mejaIds.length === 0 || !tanggal || !jam) return false;

    const computedEnd = hitungJamSelesai(jam);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from("BookingHold").delete().lt("expires_at", new Date().toISOString());

    // Cek conflict untuk semua meja
    for (const mejaId of mejaIds) {
      const { data: existingHolds } = await supabase.from("BookingHold").select("*")
        .eq("meja_id", mejaId).eq("tanggal", tanggal).eq("status", "active").gt("expires_at", new Date().toISOString());
      if (existingHolds && existingHolds.some((h) => isTimeOverlap(jam, computedEnd, h.jam, h.jam_selesai))) {
        alert("Salah satu meja baru saja di-hold orang lain. Silakan pilih ulang.");
        return false;
      }
    }

    // Insert hold untuk semua meja
    const holdInserts = mejaIds.map((mejaId) => ({
      meja_id: mejaId, tanggal, jam, jam_selesai: computedEnd,
      session_id: sessionId, expires_at: expiresAt, status: "active",
    }));

    const { data, error } = await supabase.from("BookingHold").insert(holdInserts).select();
    if (error) { alert("Gagal hold meja: " + error.message); return false; }
    setHoldId(data[0].Id);
    setHoldExpiry(new Date(expiresAt));
    return true;
  }

  async function releaseHold() {
    if (holdId) {
      await supabase.from("BookingHold").update({ status: "released" }).eq("Id", holdId);
      setHoldId(null);
      setHoldExpiry(null);
    }
  }

  // Step 3: Konfirmasi bayar → insert reservation
  async function handleConfirmPayment() {
    const errs = validateStep(3);
    setErrors(errs);
    if (errs.length > 0) return;
    setLoading(true);

    const dpAmount = selectedGabungan?.dp_minimum || selectedTable?.dp_minimum || 0;
    const mejaId = selectedGabungan ? selectedGabungan.meja_ids[0] : selectedTable?.Id;

    const { data, error } = await supabase.from("Reservation").insert({
      nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
      jumlah_tamu: Number(jumlahTamu), catatan: catatan || null,
      meja_id: mejaId, menu_paket_id: null,
      dp_amount: dpAmount, dp_status: "sudah_bayar", status: "Confirmed",
    }).select().single();

    // Kalau gabungan, hold/book semua meja component
    if (selectedGabungan && data) {
      const extraMejaIds = selectedGabungan.meja_ids.slice(1);
      for (const mid of extraMejaIds) {
        await supabase.from("Reservation").insert({
          nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
          jumlah_tamu: Number(jumlahTamu), catatan: `[Gabungan: ${selectedGabungan.nama}]`,
          meja_id: mid, menu_paket_id: null,
          dp_amount: 0, dp_status: "sudah_bayar", status: "Confirmed",
        });
      }
    }

    if (holdId) {
      // Release semua holds dari session ini
      await supabase.from("BookingHold").update({ status: "completed" }).eq("tanggal", tanggal).eq("jam", jam).eq("status", "active");
      setHoldId(null); setHoldExpiry(null);
    }

    setLoading(false);
    if (error) alert("Gagal: " + error.message);
    else { setReservationId(data.Id); setSukses(true); }
  }

  // Simpan menu opsional ke reservation
  async function handleSaveMenu() {
    if (selectedMenu) {
      if (!jumlahPorsi || Number(jumlahPorsi) < 1) {
        setErrors(["Isi jumlah porsi"]); return;
      }
    }
    if (selectedMenu && reservationId) {
      await supabase.from("Reservation").update({ menu_paket_id: selectedMenu.Id }).eq("Id", reservationId);
    }
    // Navigate away atau tampilkan tiket
    setErrors([]);
  }

  function startReservation() {
    setShowForm(true);
    setStep(1);
    setSukses(false);
    setErrors([]);
    setSelectedTable(null);
    setAvailableTables([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stepLabels = ["Data Diri", "Pilih Meja", "Bayar Uang Muka"];
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] placeholder-[#C8B89A] transition-all text-[15px]";
  const labelClass = "block text-xs font-bold text-[#C8973E] mb-2 tracking-[0.15em] uppercase";

  const slides = [
    "from-[#2a1a0e] via-[#3a2415] to-[#1a0f07]",
    "from-[#3a2a12] via-[#4a3018] to-[#241608]",
    "from-[#241a10] via-[#3a2818] to-[#150c05]",
  ];
  const [slideIndex, setSlideIndex] = useState(0);

  /* ===== WELCOME ===== */
  if (showWelcome) {
    return <WelcomeSplash slides={slides} slideIndex={slideIndex} setSlideIndex={setSlideIndex}
      onReservasi={(o) => { setOutlet(o); setShowWelcome(false); }} />;
  }

  /* ===== SUKSES ===== */
  if (showForm && sukses) {
    async function downloadTiket() {
      const jsPDF = (await import("jspdf")).default;
      const logoImg = await new Promise<string>((resolve) => {
        const img = new window.Image(); img.crossOrigin = "anonymous";
        img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d")!.drawImage(img, 0, 0); resolve(c.toDataURL("image/png")); };
        img.src = "/logo.PNG";
      });
      const pdf = new jsPDF("p", "mm", [120, 220]);
      const w = 120, h = 220, cx = w / 2;
      pdf.setFillColor(255, 252, 245); pdf.rect(0, 0, w, h, "F");
      pdf.setFillColor(200, 151, 62); pdf.rect(0, 0, w, 3, "F"); pdf.rect(0, h - 3, w, 3, "F");
      pdf.setDrawColor(200, 151, 62); pdf.setLineWidth(0.3); pdf.roundedRect(5, 7, w - 10, h - 14, 3, 3, "S");
      pdf.setFillColor(200, 151, 62); pdf.circle(9, 11, 0.8, "F"); pdf.circle(w - 9, 11, 0.8, "F"); pdf.circle(9, h - 11, 0.8, "F"); pdf.circle(w - 9, h - 11, 0.8, "F");
      pdf.addImage(logoImg, "PNG", cx - 14, 14, 28, 28);
      pdf.setDrawColor(200, 151, 62); pdf.setLineWidth(0.3); pdf.line(25, 48, cx - 4, 48); pdf.line(cx + 4, 48, w - 25, 48);
      pdf.setFillColor(200, 151, 62); pdf.triangle(cx, 46, cx - 2, 48, cx, 50, "F"); pdf.triangle(cx, 46, cx + 2, 48, cx, 50, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(200, 151, 62);
      pdf.text("TIKET RESERVASI", cx, 57, { align: "center" });
      pdf.setDrawColor(200, 151, 62); pdf.setLineWidth(0.3); pdf.line(20, 60, w - 20, 60);
      pdf.setFillColor(253, 246, 236); pdf.roundedRect(12, 65, w - 24, 78, 3, 3, "F");
      pdf.setDrawColor(220, 195, 150); pdf.setLineWidth(0.2); pdf.roundedRect(12, 65, w - 24, 78, 3, 3, "S");
      let y = 76; const lx = 18, vx = w - 18, rh = 10;
      function infoRow(lbl: string, val: string, gold?: boolean) {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(160, 140, 115); pdf.text(lbl, lx, y);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(gold ? 200 : 72, gold ? 151 : 51, gold ? 62 : 26);
        pdf.text(val, vx, y, { align: "right" }); pdf.setDrawColor(230, 220, 200); pdf.setLineWidth(0.1); pdf.line(lx, y + 3, vx, y + 3); y += rh;
      }
      infoRow("NAMA TAMU", namaTamu); infoRow("OUTLET", outlet.charAt(0).toUpperCase() + outlet.slice(1));
      infoRow("TANGGAL", tanggal); infoRow("JAM", `${jam} - ${jamSelesai}`);
      infoRow("JUMLAH TAMU", `${jumlahTamu} orang`);
      infoRow("MEJA", `No. ${selectedTable?.nomor_meja} - ${getPosisiLabel(selectedTable?.posisi || "")}`, true);
      if (selectedTable?.dp_minimum) { pdf.setDrawColor(200, 151, 62); pdf.setLineWidth(0.15); pdf.line(lx, y - 4, vx, y - 4); infoRow("UANG MUKA", formatRupiah(selectedTable.dp_minimum), true); }
      const tearY = 150;
      pdf.setFillColor(255, 252, 245); pdf.circle(5, tearY, 4, "F"); pdf.circle(w - 5, tearY, 4, "F");
      pdf.setDrawColor(200, 151, 62); pdf.setLineDashPattern([1.5, 1.5], 0); pdf.setLineWidth(0.2); pdf.line(10, tearY, w - 10, tearY); pdf.setLineDashPattern([], 0);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.setTextColor(200, 151, 62); pdf.text("MEJA", cx, 159, { align: "center" });
      pdf.setFontSize(36); pdf.text(`${selectedTable?.nomor_meja || "-"}`, cx, 174, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(160, 140, 115);
      pdf.text(`${outlet.charAt(0).toUpperCase() + outlet.slice(1)} - ${tanggal} - ${jam}`, cx, 181, { align: "center" });
      const barcodeY = 186, barH = 10;
      const pattern = [1.2,0.6,1.2,0.6,1.8,0.6,1.2,0.6,0.6,1.8,1.2,0.6,1.2,0.6,1.8,0.6,0.6,1.2,1.8,0.6,1.2,0.6,1.2,0.6,1.8,0.6,1.2,0.6,0.6,1.8,1.2,0.6,1.2,0.6,1.8,0.6,0.6,1.2,1.8,0.6];
      const totalW2 = pattern.reduce((a, b) => a + b, 0) + (pattern.length - 1) * 0.8;
      let bx = cx - totalW2 / 2;
      pdf.setFillColor(200, 151, 62);
      for (let i = 0; i < pattern.length; i++) { pdf.rect(bx, barcodeY, pattern[i], barH, "F"); bx += pattern[i] + 0.8; }
      const barcodeNum = `YSL-${outlet.toUpperCase().slice(0, 3)}-${tanggal.replace(/-/g, "")}-M${selectedTable?.nomor_meja || "0"}`;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(5); pdf.setTextColor(160, 140, 115); pdf.text(barcodeNum, cx, 200, { align: "center" });
      pdf.setFontSize(4.5); pdf.setTextColor(180, 165, 140);
      pdf.text("Tunjukkan tiket ini kepada staff saat tiba di outlet", cx, 207, { align: "center" });
      pdf.text("Reservasi berlaku selama 2 jam", cx, 211, { align: "center" });
      pdf.save(`Tiket-Reservasi-Yassalam-${tanggal}.pdf`);
    }

    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center px-4 py-8">
        <FloatingWA outlet={outlet} />
        <div className="max-w-md w-full">
          <div className="bg-white border border-[#C8973E]/20 rounded-3xl p-10 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C8973E]/20 via-[#C8973E] to-[#C8973E]/20" />
            <div className="w-20 h-20 bg-gradient-to-br from-[#C8973E] to-[#A67B2E] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#C8973E]/20">
              <span className="text-white text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-[#5C3D1A] font-serif mt-5">Reservasi Berhasil!</h1>
            <p className="text-[#C8973E]/50 mt-1 text-sm">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 text-sm">Meja Anda sudah terkonfirmasi. Simpan tiket sebagai bukti reservasi.</p>
            <div className="bg-[#FDF6EC] border border-[#C8973E]/15 rounded-2xl p-5 mt-6 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">No. {selectedTable?.nomor_meja} · {getPosisiLabel(selectedTable?.posisi || "")}</span></div>
              {selectedTable?.dp_minimum ? (
                <div className="flex justify-between border-t border-[#C8973E]/15 pt-2"><span className="text-[#8B7355]">Uang Muka</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedTable.dp_minimum)}</span></div>
              ) : null}
            </div>

            {/* Menu opsional */}
            <div className="mt-6 bg-[#FEFCF8] border border-[#E8DCC8] rounded-2xl p-5 text-left">
              <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Mau pesan menu sekarang? (opsional)</p>
              <div className="space-y-2">
                <button onClick={() => { setSelectedMenu(null); setJumlahPorsi(""); }}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${!selectedMenu ? "border-[#C8973E] bg-[#FDF6EC]" : "border-[#E8DCC8]"}`}>
                  <p className="font-semibold text-[#5C3D1A]">Pesan di tempat nanti</p>
                </button>
                {menus.map((m) => (
                  <button key={m.Id} onClick={() => { setSelectedMenu(m); setJumlahPorsi(jumlahTamu); }}
                    className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${selectedMenu?.Id === m.Id ? "border-[#C8973E] bg-[#FDF6EC]" : "border-[#E8DCC8]"}`}>
                    <div className="flex justify-between">
                      <div><p className="font-bold text-[#5C3D1A]">{m.nama_paket}</p><p className="text-xs text-[#B8A88A] mt-0.5">{m.deskripsi}</p></div>
                      <p className="font-bold text-[#C8973E] shrink-0">{formatRupiah(m.harga)}<span className="text-[10px] text-[#B8A88A]">/porsi</span></p>
                    </div>
                  </button>
                ))}
              </div>
              {selectedMenu && (
                <div className="mt-3 flex items-center gap-3">
                  <input type="number" min="1" value={jumlahPorsi} onChange={(e) => setJumlahPorsi(e.target.value)} placeholder="Porsi" className="w-24 px-3 py-2 rounded-lg border-2 border-[#E8DCC8] text-sm text-center text-[#5C3D1A] outline-none focus:border-[#C8973E]" />
                  <span className="text-sm text-[#8B7355]">× {formatRupiah(selectedMenu.harga)} = <span className="font-bold text-[#C8973E]">{formatRupiah(selectedMenu.harga * (Number(jumlahPorsi) || 0))}</span></span>
                </div>
              )}
              {selectedMenu && (
                <button onClick={handleSaveMenu} className="mt-3 w-full py-2.5 rounded-xl bg-[#C8973E] text-white font-semibold text-sm transition-all active:scale-[0.98]">
                  Simpan Pilihan Menu
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button onClick={downloadTiket} className="w-full bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20 flex items-center justify-center gap-2">
                <span>📄</span> Download Tiket Reservasi
              </button>
              <button onClick={backToHome} className="w-full border-2 border-[#E8DCC8] text-[#8B7355] px-8 py-3 rounded-xl font-semibold hover:bg-[#FDF6EC] transition-all">
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== FORM RESERVASI (3 Step) ===== */
  if (showForm) {
    return (
      <div className="min-h-screen bg-white">
        <FloatingWA outlet={outlet} />

        {/* Lightbox foto meja */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm" onClick={() => setLightboxPhoto(null)}>
            <div className="relative max-w-3xl w-full animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLightboxPhoto(null)}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-[#5C3D1A] font-bold text-lg z-10 hover:bg-gray-100 transition-all">✕</button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxPhoto.url} alt={lightboxPhoto.nama}
                className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-black" />
              <p className="text-center text-white font-bold mt-3 text-lg drop-shadow">{lightboxPhoto.nama}</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
          <div className="relative max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <button onClick={() => { if (step > 1) { if (step === 3) releaseHold(); setStep(step - 1); } else backToHome(); }}
              className="flex items-center gap-2 text-sm font-bold text-[#C8973E] bg-[#1a0f07]/60 border border-[#C8973E]/40 rounded-full px-4 py-2 transition-all active:scale-[0.97]">
              <span>←</span> <span>{step > 1 ? "Kembali" : "Beranda"}</span>
            </button>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.PNG" alt="Yassalam" width={28} height={28} />
              <span className="text-sm font-bold text-white tracking-[0.15em]">YASSALAM</span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-[#E5D9C3]" />
              <div className="absolute top-4 left-0 h-[2px] bg-[#C8973E] transition-all duration-300" style={{ width: `${(Math.max(step - 1, 0) / (stepLabels.length - 1)) * 100}%` }} />
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

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              {errors.map((err, i) => <p key={i} className="text-red-500 text-sm py-1">⚠ {err}</p>)}
            </div>
          )}

          <div className="bg-white border border-[#C8973E]/12 rounded-3xl p-6 sm:p-8 shadow-lg shadow-[#C8973E]/5">

            {/* ── STEP 1: Data Diri ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Kapan Anda ingin datang?</h2>
                  <p className="text-[#8B7355] text-sm mt-1">Isi informasi kunjungan Anda</p>
                </div>
                <div className="bg-[#FDF6EC] border border-[#C8973E]/20 rounded-2xl p-4 flex items-center justify-between">
                  <div><p className="text-xs text-[#8B7355]">Outlet</p><p className="font-bold text-[#5C3D1A] capitalize">{outlet}</p></div>
                  <span className="text-[#C8973E]">◈</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tanggal</label>
                    <input type="date" min={today} value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Jam</label>
                    <div className="flex gap-2">
                      <select value={jam.split(":")[0] || ""} onChange={(e) => setJam(`${e.target.value}:${jam.split(":")[1] || "00"}`)} className={inputClass}>
                        <option value="">Jam</option>
                        {Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>)}
                      </select>
                      <select value={jam.split(":")[1] || ""} onChange={(e) => setJam(`${jam.split(":")[0] || "07"}:${e.target.value}`)} className={inputClass}>
                        <option value="">Mnt</option>
                        {[0, 15, 30, 45].map((m) => <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>)}
                      </select>
                    </div>
                    {jamSelesai && <p className="text-xs text-[#8B7355] mt-2">Selesai sekitar <span className="font-semibold text-[#C8973E]">{jamSelesai}</span> (2 jam)</p>}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Jumlah Tamu</label>
                  <input type="number" placeholder="Berapa orang?" min="1" value={jumlahTamu} onChange={(e) => setJumlahTamu(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama Anda" value={namaTamu} onChange={(e) => setNamaTamu(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>No. WhatsApp</label>
                  <input type="tel" placeholder="081234567890" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Catatan <span className="text-[#B8A88A] normal-case tracking-normal font-normal">(opsional)</span></label>
                  <textarea placeholder="Contoh: perlu kursi bayi, alergi kacang, dll." rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass + " resize-none"} />
                </div>
                <button onClick={nextStep} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/25">
                  Cari Meja Tersedia →
                </button>
              </div>
            )}

            {/* ── STEP 2: Pilih Meja ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pilih Meja</h2>
                  <p className="text-[#8B7355] text-sm mt-1">
                    Meja yang tersedia untuk <span className="font-semibold text-[#5C3D1A]">{jumlahTamu} orang</span> pada <span className="font-semibold text-[#5C3D1A]">{tanggal}</span> pukul <span className="font-semibold text-[#5C3D1A]">{jam}–{jamSelesai}</span>
                  </p>
                </div>

                {loadingTables ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 border-3 border-[#C8973E] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-[#8B7355] mt-4">Mencari meja tersedia...</p>
                  </div>
                ) : availableTables.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-5xl mb-4">😔</p>
                    <p className="font-bold text-[#5C3D1A] text-lg">Tidak ada meja tersedia</p>
                    <p className="text-sm text-[#8B7355] mt-2 max-w-sm mx-auto">
                      Semua meja untuk {jumlahTamu} orang sudah terisi pada waktu tersebut. Coba ubah tanggal, jam, atau jumlah tamu.
                    </p>
                    <button onClick={() => setStep(1)} className="mt-6 px-8 py-3 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold hover:bg-[#C8973E] hover:text-white transition-all">
                      ← Ubah Pencarian
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Group by area */}
                    {areasData.map((area) => {
                      const areaMeja = availableTables.filter((t) => t.posisi === area.slug);
                      if (areaMeja.length === 0) return null;
                      return (
                        <div key={area.Id}>
                          <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">{area.nama}</p>
                          <div className="grid grid-cols-2 gap-3">
                            {areaMeja.map((t) => (
                              <div key={t.Id} onClick={() => { setSelectedTable(t); setSelectedGabungan(null); }}
  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${selectedTable?.Id === t.Id ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50"}`}>
                                {t.foto_url && (
  <div className="relative mb-3 group/photo">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={t.foto_url} alt="" className="w-full h-40 object-cover rounded-xl" />
    <button
      onClick={(e) => { e.stopPropagation(); setLightboxPhoto({ url: t.foto_url!, nama: t.nama_meja || `Meja ${t.nomor_meja}` }); }}
      className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/30 rounded-xl flex items-center justify-center transition-all">
      <span className="opacity-0 group-hover/photo:opacity-100 transition-opacity text-white text-xs font-bold border border-white/60 rounded-full px-3 py-1">🔍 Perbesar</span>
    </button>
  </div>
)}
                                <p className="font-bold text-[#5C3D1A]">{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                                <p className="text-sm text-[#8B7355] mt-1">Muat {t.kapasitas} orang</p>
                                {t.dp_minimum ? <p className="text-xs text-[#C8973E] mt-1 font-semibold">Uang muka {formatRupiah(t.dp_minimum)}</p> : null}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedTable(t); setSelectedGabungan(null); nextStep(); }}
                                  className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold transition-all active:scale-[0.98] shadow-md shadow-[#C8973E]/20">
                                  Lanjut Booking →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    

                    {/* Meja Gabungan */}
                    {availableGabungan.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Meja Gabungan (untuk rombongan)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableGabungan.map((g) => (
                            <div key={`gab-${g.Id}`} onClick={() => { setSelectedGabungan(g); setSelectedTable(null); }}
                              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${selectedGabungan?.Id === g.Id ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50"}`}>
                              {(() => {
                                const gabPhotos = [
                                  ...(g.foto_url ? [{ url: g.foto_url, label: g.nama }] : []),
                                  ...g.meja_ids.map((id) => {
                                    const t = tables.find((t) => t.Id === id);
                                    return t?.foto_url ? { url: t.foto_url, label: t.nama_meja || `Meja ${t.nomor_meja}` } : null;
                                  }).filter(Boolean) as { url: string; label: string }[],
                                ];
                                if (gabPhotos.length === 0) return null;
                                return <GabunganSlideshow photos={gabPhotos} />;
                              })()}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#C8973E]/10 text-[#C8973E] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#C8973E]/20">GABUNGAN</span>
                              </div>
                              <p className="font-bold text-[#5C3D1A]">{g.nama}</p>
                              {g.deskripsi && <p className="text-xs text-[#8B7355] mt-1">{g.deskripsi}</p>}
                              <p className="text-sm text-[#8B7355] mt-1">Muat {g.kapasitas_total} orang</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {g.meja_ids.map((id) => {
                                  const t = tables.find((t) => t.Id === id);
                                  return <span key={id} className="text-[10px] bg-[#FDF6EC] text-[#8B7355] px-2 py-0.5 rounded-full border border-[#E8DCC8]">{t?.nama_meja || `Meja ${t?.nomor_meja}`}</span>;
                                })}
                              </div>
                              {g.dp_minimum ? <p className="text-xs text-[#C8973E] mt-2 font-semibold">Uang muka {formatRupiah(g.dp_minimum)}</p> : null}
                              {g.minimum_transaksi ? <p className="text-xs text-[#8B7355] mt-0.5">Min. transaksi {formatRupiah(g.minimum_transaksi)}</p> : null}
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedGabungan(g); setSelectedTable(null); nextStep(); }}
                                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold transition-all active:scale-[0.98] shadow-md shadow-[#C8973E]/20">
                                Lanjut Booking →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    
                  </>
                )}
              </div>
            )}

            {/* ── STEP 3: Bayar Uang Muka ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Bayar Uang Muka</h2>
                  <p className="text-[#8B7355] text-sm mt-1">Selesaikan pembayaran untuk mengunci meja Anda</p>
                </div>

                {/* Timer */}
                {countdown && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${countdown === "00:00" ? "border-red-300 bg-red-50" : "border-[#C8973E]/30 bg-[#FDF6EC]"}`}>
                    <div className="w-10 h-10 rounded-full bg-[#C8973E] flex items-center justify-center shrink-0">
                      <span className="text-white text-lg">⏱</span>
                    </div>
                    <div>
                      <p className="text-xs text-[#8B7355]">Waktu tersisa untuk pembayaran</p>
                      <p className={`text-2xl font-bold font-mono ${countdown === "00:00" ? "text-red-500" : "text-[#C8973E]"}`}>{countdown}</p>
                    </div>
                  </div>
                )}

                {/* Ringkasan */}
                <div className="border-2 border-[#C8973E]/15 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3">
                    <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Ringkasan Reservasi</h3>
                  </div>
                  <div className="p-5 space-y-2.5 text-sm bg-[#FEFCF8]">
                    <div className="flex justify-between"><span className="text-[#8B7355]">Nama</span><span className="font-semibold text-[#5C3D1A]">{namaTamu}</span></div>
                    <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
                    <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
                    <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} – {jamSelesai}</span></div>
                    <div className="flex justify-between"><span className="text-[#8B7355]">Tamu</span><span className="font-semibold text-[#5C3D1A]">{jumlahTamu} orang</span></div>
                    <div className="border-t border-[#E8DCC8] pt-2 flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">{selectedGabungan ? selectedGabungan.nama : (selectedTable?.nama_meja || `No. ${selectedTable?.nomor_meja}`) + " · " + getPosisiLabel(selectedTable?.posisi || "")}</span></div>
                    <div className="border-t border-[#E8DCC8] pt-2 flex justify-between items-center">
                      <span className="text-[#8B7355] font-semibold">Uang Muka</span>
                      <span className="text-xl font-bold text-[#C8973E]">{formatRupiah(selectedGabungan?.dp_minimum || selectedTable?.dp_minimum || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Instruksi pembayaran */}
                <div className="bg-[#FDF6EC] border-2 border-[#C8973E]/20 rounded-2xl p-5">
                  <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Transfer ke rekening berikut</p>
                  <div className="bg-white rounded-xl p-4 border border-[#E8DCC8]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#003D79] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">BCA</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#5C3D1A]">Bank BCA</p>
                        <p className="text-xs text-[#8B7355]">a.n. Yassalam Catering</p>
                      </div>
                    </div>
                    <div className="bg-[#FDF6EC] rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className="font-mono font-bold text-lg text-[#5C3D1A] tracking-wider">1234567890</span>
                      <button onClick={() => { navigator.clipboard.writeText("1234567890"); alert("Nomor rekening disalin!"); }}
                        className="text-xs font-bold text-[#C8973E] bg-white border border-[#C8973E]/30 rounded-lg px-3 py-1.5 hover:bg-[#C8973E] hover:text-white transition-all">
                        Salin
                      </button>
                    </div>
                    <div className="mt-3 bg-[#FDF6EC] rounded-lg px-4 py-3">
                      <p className="text-xs text-[#8B7355]">Jumlah transfer</p>
                      <p className="font-bold text-lg text-[#C8973E]">{formatRupiah(selectedTable?.dp_minimum || 0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#8B7355] mt-3 leading-relaxed">
                    Setelah transfer, tekan tombol di bawah untuk mengonfirmasi. Meja akan langsung terkunci untuk Anda.
                  </p>
                </div>

                <button onClick={handleConfirmPayment} disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${loading ? "bg-[#E8DCC8] text-[#B8A88A] cursor-not-allowed" : "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white active:scale-[0.98] shadow-lg shadow-[#C8973E]/25"}`}>
                  {loading ? "Memproses..." : "Saya Sudah Transfer ✦"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ===== LANDING PAGE ===== */
  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <FloatingWA outlet={outlet} />

      {/* HERO */}
      <div className="relative h-[90vh] min-h-[560px] bg-[#1a0f07] flex items-center justify-center overflow-hidden">
        {slides.map((grad, i) => (
          <div key={i} className={`absolute inset-0 bg-gradient-to-br ${grad} transition-opacity duration-[2000ms] will-change-transform`}
            style={{ opacity: i === slideIndex ? 1 : 0, animation: i === slideIndex ? "kenburns 8s ease-out forwards" : "none" }} />
        ))}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07]/80 via-transparent to-[#1a0f07]/30" />
        <button onClick={() => setShowWelcome(true)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 text-sm font-bold text-[#C8973E] bg-[#1a0f07] border border-[#C8973E]/50 rounded-full px-5 py-3 sm:px-4 sm:py-2 transition-colors active:scale-[0.97] shadow-lg">
          <span>←</span> <span>Beranda</span>
        </button>
        <div className="relative text-center px-6 max-w-2xl z-10">
          <Image src="/logo.PNG" alt="Yassalam" width={150} height={150} className="mx-auto drop-shadow-2xl animate-fadeInUp" />
          <p className="text-[#C8973E]/40 mt-5 text-sm tracking-[0.5em] animate-fadeInUp" style={{ animationDelay: "0.2s" }}>━━━ ✦ ━━━</p>
          <p className="italic text-[#C8973E] mt-5 text-3xl font-serif animate-fadeInUp" style={{ animationDelay: "0.3s" }}>Selamat Datang di Yassalam</p>
          <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Nikmati cita rasa autentik Timur Tengah dalam suasana yang elegan. Reservasi meja Anda sekarang.
          </p>
          <button onClick={startReservation}
            className="mt-9 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide animate-fadeInUp"
            style={{ animationDelay: "0.5s" }}>
            Reservasi Sekarang
          </button>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 border-2 border-[#C8973E]/30 rounded-full flex justify-center pt-2"><div className="w-1.5 h-3 bg-[#C8973E]/50 rounded-full" /></div>
        </div>
      </div>

      {/* AREA KAMI */}
      <div className="py-10 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Area Kami</p>
            <h2 className="text-3xl font-bold text-[#5C3D1A] font-serif mt-2">Lihat Suasana Kami</h2>
            <p className="text-[#C8973E]/40 mt-2">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 max-w-lg mx-auto text-sm">Klik area untuk melihat foto-foto suasananya</p>
          </div>
          {areasData.length === 0 ? (
            <p className="text-center text-[#B8A88A] text-sm">Belum ada area terdaftar untuk outlet ini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {areasData.map((area, i) => {
                const visual = areaVisuals[i % areaVisuals.length];
                const areaTables = tables.filter((t) => t.posisi === area.slug);
                const photos = areaTables.filter((t) => t.foto_url).map((t) => t.foto_url as string);
                return (
                  <div key={area.Id} className="group bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-md hover:shadow-xl hover:shadow-[#C8973E]/10 transition-all duration-300 hover:-translate-y-1">
                    <button onClick={() => setSelectedAreaModal(area)} className="w-full h-48 relative overflow-hidden block text-left">
                      <AreaCardPhotos photos={photos} icon={visual.icon} gradient={visual.gradient} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold tracking-widest uppercase border border-white/60 rounded-full px-4 py-1.5">Lihat Foto</span>
                      </div>
                    </button>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-[#5C3D1A] font-serif">{area.nama}</h3>
                      {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}
                      <div className="mt-3 flex gap-3 text-xs text-[#8B7355]">
                        <span>🪑 {areaTables.length} meja</span>
                        <span>👥 {areaTables.reduce((s, t) => s + t.kapasitas, 0)} kursi</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-center mt-10">
            <button onClick={startReservation} className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20">
              Reservasi Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* OUR STORY */}
      <div className="pt-4 pb-10 md:py-20 px-4 bg-[#FDF6EC]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Kisah Kami</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#5C3D1A] font-serif mt-3 leading-snug">Warisan Rasa Yang Disajikan Dengan Sepenuh Hati</h2>
            <p className="text-[#C8973E]/40 mt-4 mb-5">━━ ✦ ━━</p>
            <p className="text-[#8B7355] leading-relaxed text-[15px]">Di balik setiap hidangan Yassalam, tersimpan sepenggal kisah keluarga yang diwariskan dengan penuh cinta dari generasi ke generasi.</p>
            <p className="text-[#8B7355] leading-relaxed text-[15px] mt-4">Tiga hidangan istimewa Yassalam — Nasi Mandhi, Kabsah, dan Kabuli — hadir sebagai bukti nyata dedikasi tersebut, tersaji di Solo dan Yogyakarta.</p>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-3"><p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">8+</p><p className="text-xs text-[#8B7355] leading-tight">Tahun<br/>Pengalaman</p></div>
              <div className="h-10 w-px bg-[#C8973E]/20" />
              <div className="flex items-center gap-3"><p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">100%</p><p className="text-xs text-[#8B7355] leading-tight">Resep<br/>Autentik</p></div>
            </div>
          </div>
          <div className="overflow-hidden order-1 md:order-2 bg-[#FDF6EC]"><MenuFlipbook /></div>
        </div>
      </div>

      {/* JAM OPERASIONAL & OUTLET */}
      <div className="py-20 px-4 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-start">
          <div className="text-center md:text-left">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Jam Operasional</p>
            <h2 className="text-3xl font-bold text-white font-serif mt-2">Kunjungi Kami Setiap Hari</h2>
            <p className="text-[#C8973E]/40 mt-3">━━ ✦ ━━</p>
            <div className="mt-8 border border-[#C8973E]/25 rounded-2xl px-8 py-8 inline-flex flex-col items-center md:items-start gap-6 w-full md:w-auto">
              <div className="text-center md:text-left"><p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Senin – Kamis</p><p className="text-4xl font-bold text-white font-serif mt-3">09:00 – 21:00</p></div>
              <div className="w-16 h-[1px] bg-[#C8973E]/25" />
              <div className="text-center md:text-left"><p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Jumat – Minggu</p><p className="text-4xl font-bold text-white font-serif mt-3">09:00 – 22:00</p></div>
            </div>
            <div className="mt-6 border-t border-[#C8973E]/15 pt-6 flex flex-col items-center md:items-start gap-3">
              <a href="https://instagram.com/yassalamcatering" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">📷 @yassalamcatering</a>
              <a href="https://tiktok.com/@yassalamresto" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">🎵 @yassalamresto</a>
            </div>
          </div>
          <div>
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold text-center md:text-left">Lokasi</p>
            <h2 className="text-3xl font-bold text-white font-serif mt-2 text-center md:text-left">Outlet Kami</h2>
            <p className="text-[#C8973E]/40 mt-3 text-center md:text-left">━━ ✦ ━━</p>
            <div className="grid gap-4 mt-8">
              {[
                { city: "Solo", ov: "solo", address: "Jl. Kapten Mulyadi No. 193, Pasar Kliwon, Surakarta", wa: "6281222666068", waLabel: "0812-2266-6068", active: true },
                { city: "Yogyakarta", ov: "jogja", address: "Jl. Timoho No. 56, Muja Muju, Umbulharjo, DIY", wa: "6281222666030", waLabel: "0812-2266-6030", active: true },
                { city: "Surabaya", ov: "surabaya", address: "Coming Soon", wa: "", waLabel: "", active: false },
                { city: "Semarang", ov: "semarang", address: "Coming Soon", wa: "", waLabel: "", active: false },
              ].map((o) => (
                <div key={o.city} className={`border rounded-2xl p-6 transition-all ${o.active ? "border-[#C8973E]/20 hover:border-[#C8973E]/40" : "border-[#C8973E]/10 opacity-60"}`}>
                  <h3 className="font-bold text-lg text-white font-serif">{o.city}</h3>
                  <p className="text-gray-400 text-sm mt-1">{o.address}</p>
                  {o.active ? (
                    <>
                      <a href={`https://wa.me/${o.wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C8973E] mt-2 transition-colors">📱 WA {o.waLabel}</a>
                      <button onClick={() => { setOutlet(o.ov); startReservation(); }}
                        className="mt-3 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] w-full">
                        Reservasi di {o.city}
                      </button>
                    </>
                  ) : (
                    <button disabled className="mt-3 border border-gray-700 text-gray-500 px-6 py-2.5 rounded-xl font-semibold text-sm w-full cursor-not-allowed">Segera Hadir</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-[#1a0f07] py-8 px-4 text-center">
        <p className="text-[#C8973E]/30 text-sm">━━ ✦ ━━</p>
        <p className="text-[#C8973E]/40 text-xs mt-3">© 2026 Yassalam Arabian Resto & Catering. All rights reserved.</p>
      </div>

      {/* AREA GALLERY MODAL */}
      {selectedAreaModal && (() => {
        const idx = areasData.findIndex((a) => a.Id === selectedAreaModal.Id) % areaVisuals.length;
        const visual = areaVisuals[idx >= 0 ? idx : 0];
        return <AreaGalleryModal area={selectedAreaModal} tables={tables.filter((t) => t.posisi === selectedAreaModal.slug)}
          gradient={visual.gradient} icon={visual.icon} onClose={() => setSelectedAreaModal(null)} />;
      })()}
    </div>
  );
}