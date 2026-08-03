"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "./supabase";
import dynamic from "next/dynamic";

const MenuFlipbook = dynamic(() => import("./MenuFlipbook"), { ssr: false });

type Table = {
  Id: number; outlet: string; nomor_meja: number; nama_meja?: string | null;
  kapasitas: number; posisi: string; status: string;
  foto_url?: string | null; dp_minimum?: number | null;
  kapasitas_minimum?: number | null; minimum_transaksi?: number | null;
  deskripsi?: string | null;
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
      <Image key={url} src={url} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-opacity duration-1000" style={{ opacity: i === idx ? 1 : 0 }} />
    ))}
  </>;
}

function FloatingWA({ outlet }: { outlet: string }) {
  const wa = outlet === "solo" ? "6281222666068" : "6281222666030";
  return (
    <a href={`https://wa.me/${wa}?text=Halo%20Yassalam%2C%20saya%20butuh%20bantuan%20reservasi`}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 group"
    >
      <span className="bg-white text-[#5C3D1A] text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-black/10 whitespace-nowrap hidden sm:block group-hover:bg-[#FDF6EC] transition-all">
        Butuh bantuan?
      </span>
      <span className="w-14 h-14 shrink-0 bg-[#25D366] hover:bg-[#1DA851] rounded-full flex items-center justify-center shadow-xl shadow-black/20 transition-all active:scale-95">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/>
        </svg>
      </span>
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
      <div className="absolute inset-0 opacity-[0.22]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07]/75 via-[#1a0f07]/10 to-[#1a0f07]/25" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-6 bg-[#C8973E]" : "w-1.5 bg-[#C8973E]/30"}`} />)}
      </div>
      <div className="relative text-center max-w-md w-full z-10">
        <Image src="/logo.PNG" alt="Yassalam" width={110} height={110} priority className="mx-auto drop-shadow-2xl animate-fadeInUp" />
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
function SpotlightTour({ steps, onFinish }: { steps: { targetId: string; text: string }[]; onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(140);
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioPoolRef.current = steps.map((_, i) => {
      const audio = new Audio(`/step${i + 1}.mp3`);
      audio.preload = "auto";
      return audio;
    });
    return () => { audioPoolRef.current.forEach((a) => a.pause()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playStep(i: number, retried?: boolean) {
    currentAudioRef.current?.pause();
    setIsSpeaking(false);
    if (muted) return;
    const audio = audioPoolRef.current[i];
    if (!audio) return;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onpause = () => setIsSpeaking(false);
    audio.onerror = () => {
      if (retried) return;
      const fresh = new Audio(`/step${i + 1}.mp3`);
      audioPoolRef.current[i] = fresh;
      playStep(i, true);
    };

    audio.currentTime = 0;
    currentAudioRef.current = audio;
    audio.play().catch(() => {
      if (retried) return;
      const fresh = new Audio(`/step${i + 1}.mp3`);
      audioPoolRef.current[i] = fresh;
      playStep(i, true);
    });
  }

  useEffect(() => {
    playStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function update() {
      const el = document.getElementById(steps[idx].targetId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    const el = document.getElementById(steps[idx].targetId);
    const isLastStep = idx === steps.length - 1;
    const scrollBlock = steps[idx].targetId === "tour-area-card" ? "start" : "center";
    if (isLastStep && el) {
      const elRect = el.getBoundingClientRect();
      const targetY = window.scrollY + elRect.top - window.innerHeight * 0.35;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    } else {
      el?.scrollIntoView({ behavior: "smooth", block: scrollBlock, inline: "nearest" });
    }
    const t = setTimeout(update, 400);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [idx, steps]);

  useEffect(() => {
    if (tooltipRef.current) setTooltipHeight(tooltipRef.current.offsetHeight);
  }, [idx, rect]);

  if (!rect) return null;
  const isLast = idx === steps.length - 1;
  const pad = 8;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;
  const isMobile = viewportWidth < 640;

  const tooltipWidth = isMobile ? viewportWidth - 32 : (isLast ? 340 : 290);
  const charSize = isLast ? (isMobile ? 160 : 240) : (isMobile ? 110 : 170);
  const overlap = isMobile ? 24 : 30;

  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.top + rect.height, viewportHeight);

  let boxTop = visibleBottom + 16;
  if (boxTop + tooltipHeight + 16 > viewportHeight) {
    boxTop = visibleTop - pad - tooltipHeight - 16;
  }
  boxTop = Math.min(Math.max(boxTop, 16), Math.max(16, viewportHeight - tooltipHeight - 16));
  if (isLast && !isMobile) {
    boxTop = visibleBottom + 16;
  }

  const tooltipLeft = isMobile ? 16 : Math.min(Math.max(rect.left, 16), viewportWidth - tooltipWidth - 16);

  let charLeft: number;
  let charTop: number;
  let shouldMirror = false;

  if (isMobile) {
    const mSpaceRight = viewportWidth - (rect.left + rect.width);
    const mSpaceLeft = rect.left;
    if (mSpaceRight >= charSize) {
      // Ada ruang di kanan target (step 1, 2, 4 biasanya masuk sini)
      charLeft = rect.left + rect.width + 4;
      charTop = Math.min(Math.max(rect.top + rect.height / 2 - charSize / 2, 8), viewportHeight - charSize - 8);
    } else if (mSpaceLeft >= charSize) {
      charLeft = rect.left - charSize - 4;
      charTop = Math.min(Math.max(rect.top + rect.height / 2 - charSize / 2, 8), viewportHeight - charSize - 8);
      shouldMirror = true;
    } else {
      // Tidak muat di samping (step 3 — kartu full-width) -> taruh di atas tooltip
      charLeft = Math.min(Math.max(tooltipLeft + tooltipWidth - charSize + 10, 8), viewportWidth - charSize - 8);
      charTop = Math.max(8, boxTop - charSize + overlap);
    }
  } else {
    const spaceRight = viewportWidth - (rect.left + rect.width);
    const spaceLeft = rect.left;
    const charOnRight = spaceRight >= charSize + 8;
    const charOnLeft = !charOnRight && spaceLeft >= charSize + 8;

    if (charOnRight) {
      charLeft = rect.left + rect.width + 8;
      charTop = Math.min(Math.max(rect.top + rect.height / 2 - charSize / 2, 8), viewportHeight - charSize - 8);
    } else if (charOnLeft) {
      charLeft = rect.left - charSize - 8;
      charTop = Math.min(Math.max(rect.top + rect.height / 2 - charSize / 2, 8), viewportHeight - charSize - 8);
      shouldMirror = true;
    } else {
      charLeft = Math.min(Math.max(rect.left + rect.width / 2 - charSize / 2 + 30, 8), viewportWidth - charSize - 8);
      charTop = Math.max(8, boxTop - charSize + overlap);
    }
  }

  function goNext() {
    if (isLast) { onFinish(); return; }
    const next = idx + 1;
    setIdx(next);
    playStep(next);
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <style>{`
        @keyframes guideTalk {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.02); }
        }
      `}</style>

      <div className="absolute rounded-2xl border-2 border-[#C8973E] transition-all duration-300"
        style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }} />

      <div
        className="absolute transition-all duration-300"
        style={{
          left: charLeft, top: charTop, width: charSize, height: charSize,
          transform: shouldMirror ? "scaleX(-1)" : "none",
          zIndex: 1,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={isLast ? "/guide_celebrate.png" : "/guide_point_v2.png"}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain"
          style={{
            animation: isSpeaking ? "guideTalk 1.6s ease-in-out infinite" : "none",
          }}
        />
      </div>

      <div ref={tooltipRef} className={`absolute bg-[#FDF6EC] pointer-events-auto transition-all duration-300 ${isLast ? "rounded-3xl p-6 shadow-[0_0_0_1px_rgba(200,151,62,0.4),0_20px_50px_-10px_rgba(0,0,0,0.5)] border-2 border-[#C8973E]" : "rounded-2xl p-4 shadow-2xl"}`}
        style={{ left: tooltipLeft, top: boxTop, width: tooltipWidth, zIndex: 2 }}>
        {isLast && (
          <p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-bold mb-2">✦ Selamat ✦</p>
        )}
        <p className={isLast ? "text-base text-[#5C3D1A] leading-relaxed font-medium" : "text-sm text-[#5C3D1A] leading-relaxed"}>{steps[idx].text}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button onClick={onFinish} className="text-xs text-[#8B7355] hover:text-[#5C3D1A]">Lewati</button>
            <button onClick={() => playStep(idx)} aria-label="Putar penjelasan" className="text-[#8B7355] hover:text-[#5C3D1A]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Nyalakan suara" : "Matikan suara"} className="text-[#8B7355] hover:text-[#5C3D1A]">
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#B5A594]">{idx + 1}/{steps.length}</span>
            <button onClick={goNext} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-xs font-semibold">
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
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
  const [autoplay, setAutoplay] = useState(true);
  const activeTable = photos[activeIdx] || null;

  useEffect(() => {
    if (!autoplay || photos.length < 2) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(t);
  }, [photos.length, autoplay]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl animate-fadeInUp max-h-[92vh] md:h-[600px] md:max-h-[85vh] flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>

        {/* Panel kiri: info area + daftar meja */}
        <div className="md:w-[300px] md:shrink-0 md:h-full md:overflow-y-auto bg-[#FDF6EC] md:border-r border-[#C8973E]/15">
          <div className="p-6 pb-3">
            <h3 className="font-bold text-2xl text-[#5C3D1A] font-serif">{area.nama}</h3>
            {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}
            <p className="text-[#C8973E]/40 mt-3 text-sm tracking-widest">━━ ✦ ━━</p>
          </div>

          {activeTable && (
            <div className="mx-6 mb-4 bg-[#C8973E]/10 rounded-2xl px-4 py-3.5">
              <p className="text-base font-bold font-serif text-[#5C3D1A]">
                {activeTable.nama_meja || `Meja ${activeTable.nomor_meja}`} · muat {activeTable.kapasitas} orang
              </p>
              {activeTable.deskripsi && <p className="text-sm text-[#8B7355] mt-1.5 leading-relaxed">{activeTable.deskripsi}</p>}
              {(!!activeTable.dp_minimum || !!activeTable.minimum_transaksi) && (
                <div className="flex gap-5 mt-2">
                  {!!activeTable.dp_minimum && (
                    <div>
                      <p className="text-[11px] text-[#8B7355]">DP minimum</p>
                      <p className="text-sm font-bold text-[#5C3D1A]">Rp {activeTable.dp_minimum.toLocaleString("id-ID")}</p>
                    </div>
                  )}
                  {!!activeTable.minimum_transaksi && (
                    <div>
                      <p className="text-[11px] text-[#8B7355]">Min. transaksi</p>
                      <p className="text-sm font-bold text-[#5C3D1A]">Rp {activeTable.minimum_transaksi.toLocaleString("id-ID")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {photos.length > 0 && (
            <div className="px-4 pb-6">
              <p className="text-xs font-bold text-[#C8973E] mb-2 px-2 tracking-[0.15em] uppercase">Pilih meja</p>
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-1 px-1">
                {photos.map((t, i) => (
                  <button key={t.Id} onClick={() => { setActiveIdx(i); setAutoplay(false); }}
                    className={`flex items-center gap-3 shrink-0 md:shrink w-[180px] md:w-full text-left p-2 rounded-xl border transition-all ${i === activeIdx ? "border-[#C8973E] bg-[#C8973E]/10 shadow-sm" : "border-transparent hover:bg-[#C8973E]/5"}`}>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 ring-1 ring-[#C8973E]/20">
                      <Image src={t.foto_url!} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate font-serif ${i === activeIdx ? "text-[#5C3D1A]" : "text-[#5C3D1A]/70"}`}>{t.nama_meja || `Meja ${t.nomor_meja}`}</p>
                      <p className="text-xs text-[#8B7355]">Muat {t.kapasitas} orang</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel kanan: foto besar */}
        <div className={`relative flex-1 min-w-0 aspect-[4/3] md:aspect-auto md:h-full bg-gradient-to-br ${gradient} overflow-hidden`}>
          {activeTable?.foto_url ? (
            <Image src={activeTable.foto_url} alt={activeTable.nama_meja || `Meja ${activeTable.nomor_meja}`}
              fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover transition-opacity duration-700" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30 text-white">{icon}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

          {/* Ornamen ikon area di pojok */}
          <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-[#C8973E] text-lg">{icon}</div>

          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all z-10">✕</button>

          {/* Nama meja di atas foto */}
          {activeTable && (
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-lg drop-shadow-lg font-serif">{activeTable.nama_meja || `Meja ${activeTable.nomor_meja}`}</p>
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
        <Image key={p.url} src={p.url} alt={p.label}
          fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-opacity duration-700"
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
/* ========== TESTIMONI ==========
   Ganti nama, rating, dan teks di bawah ini dengan ulasan ASLI dari Google Maps Anda.
   Buka Google Maps > profil bisnis > Ulasan > pilih 3-6 ulasan terbaik > copy teksnya ke sini. */
const testimonials = [
  { nama: "Dian Prakoso", rating: 5, teks: "Salah satu restoran favorit di Kota Solo. Tempat sangat strategis, pelayanan bagus, pilihan makanan banyak. Rasanya khas Timur Tengah banget." },
  { nama: "Afifudin Dhikri", rating: 5, teks: "Recommended banget untuk makan nasi kebuli bersama keluarga, apalagi kebabnya mantap. Pelayanan sat-set, super ramah, tempat bersih." },
  { nama: "Inggi Lestari", rating: 5, teks: "Dari menu sampai ambience-nya super oke. Pelayanannya juga super cepat, baik waiters maupun admin. Terima kasih Yassalam Solo!" },
  { nama: "Agus Purnomo", rating: 5, teks: "Tempat makan yang nyaman dan estetik, toilet dan musola bersih dan wangi. Makanan dan minuman enak semua, pelayanan ramah. Sudah langganan sejak lama." },
  { nama: "Surya Chanel", rating: 5, teks: "Tempat makan yang nyaman, adem, serta makanannya enak cocok di lidah. Cocok buat meet up bareng geng, tempatnya luas banget." },
  { nama: "Abdul Rohman S", rating: 5, teks: "First time ke sini, pelayanannya sangat bagus, dapat welcome snack sambil menunggu. Daging kambingnya empuk tanpa bau prengus. Ada mushola dan parkiran luas juga." },
  { nama: "Danang Prayogo", rating: 5, teks: "Tempatnya amazing, nyaman banget, makan enak, pelayanan ramah. Jangan sampai skip cheese kunafa-nya, itu alasan saya balik lagi ke sini!" },
  { nama: "Ip x", rating: 5, teks: "Makanannya enak, porsi besar, kambingnya empuk dan rempahnya berasa banget. Pelayanannya juga ramah banget, sekarang sudah ada parkiran di belakang." },
  { nama: "Puspo Riny", rating: 5, teks: "Suasana Timur Tengahnya dapet banget, banyak VIP room dengan pilihan meja kursi atau lesehan. Menunya lengkap, paling suka sama platter-nya." },
  { nama: "Rahma Dewy Amalia Hikmah", rating: 5, teks: "Tempatnya menyenangkan, bersih, ber-AC, interior cantik. Rasa makanannya khas Timur Tengah banget, sesuai ekspektasi." },
  { nama: "M. Haris Maraputra", rating: 5, teks: "The real Arabian food, rasa rempahnya nampol, serving-nya cakep dan cepat, kambing lembut rasanya nampol. Atmosfernya khas Timur Tengah, rekomen untuk makan bersama keluarga besar." },
  { nama: "avril sulistia", rating: 5, teks: "Dulu hobi banget makan kebuli waktu di Surabaya, alhamdulillah sekarang pindah dan nemu Yassalam. Rasanya enak, porsinya banyak bisa sharing, pelayanan ramah." },
  { nama: "fini tetus", rating: 5, teks: "Pesan menu paket untuk 5 orang, rasanya cocok di lidah orang Indonesia dan porsinya mengenyangkan. Dekorasi tempatnya benar-benar mencerminkan Timur Tengah." },
  { nama: "Edy Sarwanto", rating: 5, teks: "Tempat sangat strategis di tepi jalan raya, full AC. Makanan khas Arab, pelayanan memuaskan, suasana khas Arab yang kental." },
  { nama: "Muhammad Adnan", rating: 5, teks: "Makanannya enak, banyak pilihan tidak cuma daging kambing. Tempat nyaman, ada ruangan sendiri yang luas untuk keluarga, parkir mobil luas di belakang." },
  { nama: "Lisa Salma", rating: 5, teks: "Salah satu masakan Arab terbaik di kota ini. Paket family bisa mix nasi jadi bisa coba semuanya, aromanya kenceng dan rempahnya kerasa banget." },
];

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeRestored, setWelcomeRestored] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSpotlightTour, setShowSpotlightTour] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [notif, setNotif] = useState<{ kind: "error" | "warning" | "libur" | "success"; title: string; messages: string[]; onClose?: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  function showNotif(kind: "error" | "warning" | "libur" | "success", title: string, messages: string | string[], onClose?: () => void) {
    setNotif({ kind, title, messages: Array.isArray(messages) ? messages : [messages], onClose });
  }
  function closeNotif() {
    const cb = notif?.onClose;
    setNotif(null);
    if (cb) cb();
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const [outlet, setOutlet] = useState("");

  const [holdMinutes, setHoldMinutes] = useState(15);
  const [minBookingHours, setMinBookingHours] = useState(2);
  const [maxBookingDays, setMaxBookingDays] = useState(30);
  const [jamOperasional, setJamOperasional] = useState<Record<string, { buka: string; tutup: string }>>({
    solo: { buka: "09:00", tutup: "21:00" },
    jogja: { buka: "09:00", tutup: "21:00" },
  });
  const [liburList, setLiburList] = useState<{ outlet: string; tanggal_mulai: string; tanggal_selesai: string; alasan: string | null }[]>([]);

  // Ambil semua pengaturan dari admin (jam operasional, kebijakan booking, jadwal libur) sekali saat halaman dibuka
  useEffect(() => {
    async function fetchSettingsAdmin() {
      const keys = ["booking_hold_minutes", "booking_min_hours", "booking_max_days", "jam_buka_solo", "jam_tutup_solo", "jam_buka_jogja", "jam_tutup_jogja"];
      const { data } = await supabase.from("AppSettings").select("key, value").in("key", keys);
      const map = Object.fromEntries((data || []).map((d: { key: string; value: string }) => [d.key, d.value]));
      if (map.booking_hold_minutes) setHoldMinutes(Number(map.booking_hold_minutes));
      if (map.booking_min_hours) setMinBookingHours(Number(map.booking_min_hours));
      if (map.booking_max_days) setMaxBookingDays(Number(map.booking_max_days));
      setJamOperasional({
        solo: { buka: map.jam_buka_solo || "09:00", tutup: map.jam_tutup_solo || "21:00" },
        jogja: { buka: map.jam_buka_jogja || "09:00", tutup: map.jam_tutup_jogja || "21:00" },
      });

      const { data: liburData } = await supabase.from("LiburOutlet").select("outlet, tanggal_mulai, tanggal_selesai, alasan");
      setLiburList(liburData || []);
    }
    fetchSettingsAdmin();
  }, []);

  useEffect(() => {
    const savedShowWelcome = sessionStorage.getItem("yassalam_show_welcome");
    const savedOutlet = sessionStorage.getItem("yassalam_outlet");
    if (savedShowWelcome === "false" && savedOutlet) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setShowWelcome(false);
      setOutlet(savedOutlet);
    }
    setWelcomeRestored(true);
  }, []);

  useEffect(() => {
    if (!welcomeRestored) return;
    sessionStorage.setItem("yassalam_show_welcome", String(showWelcome));
    sessionStorage.setItem("yassalam_outlet", outlet);
  }, [showWelcome, outlet, welcomeRestored]);
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [jumlahTamu, setJumlahTamu] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [namaTamu, setNamaTamu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [website, setWebsite] = useState(""); // honeypot anti-spam — jangan diisi manusia
  const [catatan, setCatatan] = useState("");
  const [selectedAreaModal, setSelectedAreaModal] = useState<AreaData | null>(null);
  const [holdId, setHoldId] = useState<number | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [areasData, setAreasData] = useState<AreaData[]>([]);

  // Meja yang tersedia untuk step 2
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [availableGabungan, setAvailableGabungan] = useState<MejaGabungan[]>([]);
  const [selectedGabungan, setSelectedGabungan] = useState<MejaGabungan | null>(null);
  const [preselectMejaId, setPreselectMejaId] = useState<number | null>(null);
  const [preselectTipe, setPreselectTipe] = useState<"tunggal" | "gabungan" | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; nama: string } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showBigGroupModal, setShowBigGroupModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  const jamSelesai = hitungJamSelesai(jam);
  const today = new Date().toISOString().split("T")[0];
  const jamAktif = jamOperasional[outlet] || { buka: "09:00", tutup: "21:00" };
  const maxDateStr = new Date(Date.now() + maxBookingDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const backToHome = useCallback(() => {
    if (holdId) {
      supabase.from("BookingHold").update({ status: "released" }).eq("Id", holdId);
    }
    setHoldId(null);
    setHoldExpiry(null);
    setShowForm(false);
    setSukses(false);
    setStep(1);
    setTanggal("");
    setJam("");
    setJumlahTamu("");
    setSelectedTable(null);
    setShareToken(null);
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
        showNotif("warning", "Waktu Habis", "Waktu hold meja telah habis. Silakan mulai ulang.", () => backToHome());
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

  // === BACK BUTTON HP ===
  const navStateRef = useRef({ selectedAreaModal, showForm, sukses, step, showWelcome, showBackConfirm });
  navStateRef.current = { selectedAreaModal, showForm, sukses, step, showWelcome, showBackConfirm };

  const backToHomeRef = useRef(backToHome);
  backToHomeRef.current = backToHome;

  const isBackRef = useRef(false);

  // Push history saat navigasi MAJU (bukan saat back)
  useEffect(() => {
    if (isBackRef.current) { isBackRef.current = false; return; }
    if (!showWelcome) window.history.pushState(null, "");
  }, [showWelcome]);

  useEffect(() => {
    if (isBackRef.current) { isBackRef.current = false; return; }
    if (showForm) window.history.pushState(null, "");
  }, [showForm]);

  useEffect(() => {
    if (isBackRef.current) { isBackRef.current = false; return; }
    if (showForm && step > 1) window.history.pushState(null, "");
  }, [step, showForm]);

  useEffect(() => {
    if (isBackRef.current) { isBackRef.current = false; return; }
    if (selectedAreaModal) window.history.pushState(null, "");
  }, [selectedAreaModal]);

  useEffect(() => {
    if (isBackRef.current) { isBackRef.current = false; return; }
    if (showBackConfirm) window.history.pushState(null, "");
  }, [showBackConfirm]);

  // Popstate: hanya handle back, TIDAK push ulang
  useEffect(() => {
    const handlePopState = () => {
      isBackRef.current = true;
      const s = navStateRef.current;
      if (s.showBackConfirm) { setShowBackConfirm(false); }
      else if (s.selectedAreaModal) { setSelectedAreaModal(null); }
      else if (s.showForm && s.sukses) { backToHomeRef.current(); }
      else if (s.showForm && s.step === 3) { setShowBackConfirm(true); }
      else if (s.showForm && s.step > 1) { setStep((prev) => prev - 1); }
      else if (s.showForm) { setShowForm(false); }
      else if (!s.showWelcome) { setShowWelcome(true); }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Preload gambar maskot panduan (tour) begitu halaman dibuka, biar pas tour muncul gambarnya udah siap di cache
  useEffect(() => {
    ["/guide_point_v2.png", "/guide_celebrate.png"].forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  // Fetch data outlet (+ dengar perubahan realtime dari admin)
  useEffect(() => {
    if (!outlet) return;

    function fetchTablesAndAreas() {
      supabase.from("Tables")
        .select("Id, outlet, nomor_meja, nama_meja, kapasitas, posisi, status, foto_url, dp_minimum, kapasitas_minimum, minimum_transaksi, deskripsi")
        .eq("outlet", outlet).order("nomor_meja").then(({ data }) => setTables(data || []));
      supabase.from("Areas")
        .select("Id, outlet, nama, slug, deskripsi, urutan")
        .eq("outlet", outlet).order("urutan").then(({ data }) => setAreasData(data || []));
    }

    fetchTablesAndAreas();

    const channel = supabase
      .channel(`public-tables-areas-${outlet}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "Tables", filter: `outlet=eq.${outlet}` }, fetchTablesAndAreas)
      .on("postgres_changes", { event: "*", schema: "public", table: "Areas", filter: `outlet=eq.${outlet}` }, fetchTablesAndAreas)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outlet]);
  useEffect(() => {
    if (showWelcome || showForm) return;
    const sudahLihatTutorial = typeof window !== "undefined" && localStorage.getItem("yassalam_tour_done");
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (!sudahLihatTutorial) setShowSpotlightTour(true);
  }, [showWelcome, showForm]);

  // Fetch meja tersedia saat masuk step 2
  async function fetchAvailableTables(): Promise<{ available: Table[]; availGab: MejaGabungan[] }> {
    if (!outlet || !tanggal || !jam || !jumlahTamu) return { available: [], availGab: [] };
    setLoadingTables(true);
    setSelectedGabungan(null);
    const computedEnd = hitungJamSelesai(jam);

    const [{ data: resData }, { data: holdData }, { data: gabData }] = await Promise.all([
      supabase
        .from("reservation_slots").select("meja_id, jam, jam_selesai")
        .eq("tanggal", tanggal),
      supabase
        .from("BookingHold").select("meja_id, jam, jam_selesai")
        .eq("tanggal", tanggal).eq("status", "active")
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("MejaGabungan").select("*")
        .eq("outlet", outlet).eq("aktif", true),
    ]);

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
    return { available, availGab };
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
      if (tanggal && tanggal > maxDateStr) errs.push(`Reservasi maksimal ${maxBookingDays} hari ke depan`);
      if (!jam) errs.push("Pilih jam kunjungan");
      if (jam) {
        const h = parseInt(jam.split(":")[0]);
        const jamBukaH = parseInt(jamAktif.buka.split(":")[0]);
        const jamTutupH = parseInt(jamAktif.tutup.split(":")[0]);
        if (h < jamBukaH || h >= jamTutupH) errs.push(`Jam reservasi antara ${jamAktif.buka} - ${jamAktif.tutup}`);
      }
      if (tanggal && jam) {
        const waktuReservasi = new Date(`${tanggal}T${jam}:00`);
        const batasMinimal = new Date(Date.now() + minBookingHours * 60 * 60 * 1000);
        if (waktuReservasi < batasMinimal) errs.push(`Reservasi minimal ${minBookingHours} jam sebelum jam kunjungan`);
      }
      if (tanggal) {
        const liburAktif = liburList.find((l) => l.outlet === outlet && tanggal >= l.tanggal_mulai && tanggal <= l.tanggal_selesai);
        if (liburAktif) errs.push(`Outlet libur pada tanggal ini${liburAktif.alasan ? ": " + liburAktif.alasan : ""}`);
      }
      if (!jumlahTamu || Number(jumlahTamu) < 1) errs.push("Isi jumlah tamu");
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Isi nama lengkap Anda");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    }
    if (s === 2) {
      if (!selectedTable && !selectedGabungan) errs.push("Pilih salah satu meja yang tersedia");
    }
    if (s === 3) {
      if (!selectedTable && !selectedGabungan) errs.push("Meja belum dipilih");
    }
    return errs;
  }
async function checkRateLimitWa(noWaValue: string): Promise<boolean> {
    try {
      const res = await fetch("/api/cek-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noWa: noWaValue }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      return !!json.limited;
    } catch {
      return false;
    }
  }
  async function nextStep() {
    const errs = validateStep(step);
    if (errs.length > 0) {
      const isLibur = errs.some((e) => e.toLowerCase().includes("libur"));
      showNotif(isLibur ? "libur" : "warning", isLibur ? "Outlet Sedang Libur" : "Periksa Kembali Form Anda", errs);
      return;
    }

    if (step === 1) {
      // Honeypot: field ini cuma bisa keisi oleh bot, manusia tidak akan lihat/isi ini
      if (website) return;

      // Rate limit: cegah nomor yang sama spam reservasi berkali-kali dalam waktu singkat
      const kenaLimit = await checkRateLimitWa(noWa);
      if (kenaLimit) {
        setShowRateLimitModal(true);
        return;
      }

      // Hitung kapasitas terbesar dari meja tunggal + gabungan
      const maxTunggal = Math.max(...tables.map((t) => t.kapasitas), 0);
      const gabunganData = availableGabungan.length > 0 ? availableGabungan : [];
      const maxGabungan = gabunganData.length > 0 ? Math.max(...gabunganData.map((g) => g.kapasitas_total)) : 0;
      const maxKapasitas = Math.max(maxTunggal, maxGabungan);

      // Rombongan besar → arahkan ke WhatsApp
      if (Number(jumlahTamu) > maxKapasitas) {
        setShowBigGroupModal(true);
        return;
      }
      // Cari meja tersedia (pakai hasilnya langsung, tanpa nunggu state ke-update)
      const { available, availGab } = await fetchAvailableTables();

      // Kalau customer sudah pilih meja spesifik dari halaman Cek Ketersediaan,
      // coba langsung lanjut ke step 3 tanpa suruh customer cari ulang
      if (preselectMejaId && preselectTipe === "tunggal") {
        const found = available.find((t) => t.Id === preselectMejaId);
        if (found) {
          setSelectedTable(found);
          setSelectedGabungan(null);
          const ok = await createBookingHold([found.Id]);
          if (ok) { setStep(3); return; }
        }
      } else if (preselectMejaId && preselectTipe === "gabungan") {
        const foundG = availGab.find((g) => g.Id === preselectMejaId);
        if (foundG) {
          setSelectedGabungan(foundG);
          setSelectedTable(null);
          const ok = await createBookingHold(foundG.meja_ids);
          if (ok) { setStep(3); return; }
        }
      }

      if (preselectMejaId) {
        showNotif("warning", "Meja Pilihan Tidak Tersedia", "Meja yang kamu pilih sebelumnya baru saja tidak tersedia. Silakan pilih meja lain di bawah ini.");
        setPreselectMejaId(null);
        setPreselectTipe(null);
      }
      setStep(2);
    } else if (step === 2) {
      // Masuk step 3: create hold agar meja terkunci selama proses bayar
      const success = await createBookingHold();
      if (!success) return;
      setStep(3);
    }
  }

  async function createBookingHold(overrideMejaIds?: number[]) {
    const mejaIds: number[] = overrideMejaIds || (selectedGabungan
      ? selectedGabungan.meja_ids
      : selectedTable ? [selectedTable.Id] : []);
    if (mejaIds.length === 0 || !tanggal || !jam) return false;

    const computedEnd = hitungJamSelesai(jam);

    try {
      const res = await fetch("/api/booking-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mejaIds, tanggal, jam, jamSelesai: computedEnd, holdMinutes,
          releaseHoldId: holdId || undefined,
          namaTamu, noWhatsapp: noWa,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotif("warning", "Meja Baru Saja Diambil", json.error || "Salah satu meja baru saja di-hold orang lain. Silakan pilih ulang.");
        return false;
      }
      setHoldId(json.holdId);
      setHoldExpiry(new Date(json.expiresAt));
      return true;
    } catch {
      showNotif("error", "Gagal Mengunci Meja", "Terjadi kesalahan, coba lagi.");
      return false;
    }
  }

  async function releaseHold() {
    if (!holdId) return;
    try {
      await fetch("/api/booking-hold", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId }),
      });
    } catch { /* best effort, gak perlu blocking UI */ }
    setHoldId(null);
    setHoldExpiry(null);
  }

  function generateShareToken() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }

  // Step 3: Konfirmasi bayar → insert reservation
  async function handleConfirmPayment() {
    const errs = validateStep(3);
    if (errs.length > 0) {
      const isLibur = errs.some((e) => e.toLowerCase().includes("libur"));
      showNotif(isLibur ? "libur" : "warning", isLibur ? "Outlet Sedang Libur" : "Periksa Kembali Form Anda", errs);
      return;
    }
    setLoading(true);

    const dpAmount = selectedGabungan?.dp_minimum || selectedTable?.dp_minimum || 0;
    const mejaId = selectedGabungan ? selectedGabungan.meja_ids[0] : selectedTable?.Id;
    const token = generateShareToken();

    const { error } = await supabase.from("Reservation").insert({
      nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
      jumlah_tamu: Number(jumlahTamu), catatan: catatan || null,
      meja_id: mejaId, menu_paket_id: null, share_token: token,
      dp_amount: dpAmount, dp_status: "sudah_bayar", status: "Confirmed",
    });

    if (error) {
      setLoading(false);
      showNotif("error", "Gagal Menyimpan Reservasi", error.message);
      return;
    }

    // Kalau gabungan, hold/book semua meja component (token sama biar satu bill)
    if (selectedGabungan) {
      const extraMejaIds = selectedGabungan.meja_ids.slice(1);
      for (const mid of extraMejaIds) {
        const { error: extraError } = await supabase.from("Reservation").insert({
          nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
          jumlah_tamu: Number(jumlahTamu), catatan: `[Gabungan: ${selectedGabungan.nama}]`,
          meja_id: mid, menu_paket_id: null, share_token: token,
          dp_amount: 0, dp_status: "sudah_bayar", status: "Confirmed",
        });
        if (extraError) {
          setLoading(false);
          showNotif("error", "Gagal Menyimpan Meja Gabungan", `Meja tambahan (Id: ${mid}) gagal disimpan: ${extraError.message}`);
          return;
        }
      }
    }

    if (holdId) {
      // Release semua holds dari session ini
      await supabase.from("BookingHold").update({ status: "completed" }).eq("tanggal", tanggal).eq("jam", jam).eq("status", "active");
      setHoldId(null); setHoldExpiry(null);
    }

    // Notifikasi WA ke admin — fire-and-forget, jangan sampai bikin customer nunggu / gagal kalau notif error
    (() => {
      const isGabunganNotif = !!selectedGabungan;
      const mejaLabelNotif = isGabunganNotif
        ? `Gabungan ${selectedGabungan!.nama}`
        : (selectedTable ? (selectedTable.nama_meja || `Meja ${selectedTable.nomor_meja}`) : "Belum ditentukan");
      fetch("/api/notify-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaTamu, noWhatsapp: noWa, outlet, tanggal, jam, jamSelesai,
          jumlahTamu: Number(jumlahTamu), mejaLabel: mejaLabelNotif,
        }),
      }).catch(() => { /* silent — notifikasi WA gagal gak boleh ganggu proses reservasi customer */ });
    })();

    setShareToken(token);
    setSukses(true);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startReservation() {
    setShowForm(true);
    setStep(1);
    setSukses(false);
    setShareToken(null);
    setSelectedTable(null);
    setAvailableTables([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mulai") !== "1") return;

    const o = params.get("outlet");
    const tgl = params.get("tanggal");
    const j = params.get("jam");
    const t = params.get("tamu");
    const mejaIdParam = params.get("mejaId");
    const tipeParam = params.get("tipe");

    /* eslint-disable react-hooks/set-state-in-effect */
    if (o) setOutlet(o);
    setShowWelcome(false);
    startReservation();
    if (tgl) setTanggal(tgl);
    if (j) setJam(j);
    if (t) setJumlahTamu(t);
    if (mejaIdParam) setPreselectMejaId(Number(mejaIdParam));
    if (tipeParam === "tunggal" || tipeParam === "gabungan") setPreselectTipe(tipeParam);
    /* eslint-enable react-hooks/set-state-in-effect */

    window.history.replaceState({}, "", window.location.pathname);
  }, []);
  const stepLabels = ["Data Diri", "Pilih Meja", "Bayar Uang Muka"];
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] placeholder-[#C8B89A] transition-all text-[15px]";
  const labelClass = "block text-xs font-bold text-[#C8973E] mb-2 tracking-[0.15em] uppercase";

  const slides = [
    "from-[#2a1a0e] via-[#3a2415] to-[#1a0f07]",
    "from-[#3a2a12] via-[#4a3018] to-[#241608]",
    "from-[#241a10] via-[#3a2818] to-[#150c05]",
  ];
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideRestored, setSlideRestored] = useState(false);
  

  // ===== SOUND: klik global untuk semua tombol/link di website =====
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clickBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    fetch("/click.mp3")
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => { clickBufferRef.current = decoded; })
      .catch(() => {});
    return () => { ctx.close(); };
  }, []);

  useEffect(() => {
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
    function handleGlobalClick(e: MouseEvent) {
      const el = e.target as HTMLElement;
      const clickable = el?.closest('button, a, [role="button"], input[type="date"], input[type="time"], input[type="tel"], select') as (HTMLElement & { disabled?: boolean }) | null;
      if (!clickable) return;
      if ("disabled" in clickable && clickable.disabled) return;
      playClick();
    }
    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, []);

 useEffect(() => {
    const saved = sessionStorage.getItem("yassalam_slide_index");
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (saved) setSlideIndex(Number(saved));
    setSlideRestored(true);
  }, []);

  useEffect(() => {
    if (!slideRestored) return;
    sessionStorage.setItem("yassalam_slide_index", String(slideIndex));
  }, [slideIndex, slideRestored]);

  /* ===== WELCOME ===== */
  if (showWelcome) {
    return <WelcomeSplash slides={slides} slideIndex={slideIndex} setSlideIndex={setSlideIndex}
      onReservasi={(o) => { setOutlet(o); setShowWelcome(false); }} />;
  }

  /* ===== SUKSES ===== */
  if (showForm && sukses) {
    async function downloadTiket() {
      const jsPDF = (await import("jspdf")).default;
      const QRCode = (await import("qrcode")).default;

      // Data meja — dukung meja tunggal MAUPUN meja gabungan (dulu cuma baca selectedTable, jadi "undefined" kalau gabungan)
      const isGabungan = !!selectedGabungan;
      const mejaNomorList = isGabungan
        ? selectedGabungan!.meja_ids.map((id) => tables.find((t) => t.Id === id)?.nomor_meja).filter((n): n is number => n != null)
        : [];
      const mejaBigLabel = isGabungan ? (mejaNomorList.join("+") || "-") : String(selectedTable?.nomor_meja ?? "-");
      const mejaInfoValue = isGabungan
        ? `Gabungan ${selectedGabungan!.nama}`
        : `No. ${selectedTable?.nomor_meja ?? "-"}${selectedTable?.posisi ? " - " + getPosisiLabel(selectedTable.posisi) : ""}`;
      const dpValue = selectedTable?.dp_minimum || selectedGabungan?.dp_minimum || null;
      const kodeTiket = `YSL-${outlet.toUpperCase().slice(0, 3)}-${tanggal.replace(/-/g, "")}-M${mejaBigLabel}`;

      // QR code asli (bukan dekorasi) — bisa discan admin dengan kamera HP biasa
      // QR encode share_token (unik per reservasi) — bukan teks tampilan, biar pencarian di admin pas scan gak ambigu
      const qrPayload = `YSL-CHECKIN:${shareToken}`;
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 240, color: { dark: "#3D2B14", light: "#FFFFFF" } });

      // Format tiket ala konser: landscape, ada stub sobekan di sisi kanan
      const pdf = new jsPDF("l", "mm", [200, 85]);
      const w = 200, h = 85;
      const stubW = 60, stubX = w - stubW; // sobekan mulai dari sini
      const cx2 = stubX + stubW / 2; // titik tengah stub

      const gold: [number, number, number] = [200, 151, 62];
      const brown1: [number, number, number] = [42, 26, 14];
      const cream: [number, number, number] = [255, 252, 245];
      const textDark: [number, number, number] = [72, 51, 26];
      const textMuted: [number, number, number] = [160, 140, 115];

      // Latar & bingkai luar (bertingkat: luar tebal + dalam tipis, kesan lebih premium)
      pdf.setFillColor(...cream); pdf.rect(0, 0, w, h, "F");
      pdf.setFillColor(...gold); pdf.rect(0, 0, w, 2, "F"); pdf.rect(0, h - 2, w, 2, "F");
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.35); pdf.roundedRect(4, 4, w - 8, h - 8, 3, 3, "S");
      pdf.setDrawColor(220, 195, 150); pdf.setLineWidth(0.15); pdf.roundedRect(10, 7, stubX - 20, 73, 2, 2, "S");
      pdf.setDrawColor(220, 195, 150); pdf.roundedRect(stubX + 10, 7, stubW - 20, 73, 2, 2, "S");

      // Ornamen belah ketupat di 4 sudut — motif khas Yassalam
      function diamond(dx: number, dy: number, s: number) {
        pdf.setFillColor(...gold);
        pdf.triangle(dx, dy - s, dx - s, dy, dx, dy + s, "F");
        pdf.triangle(dx, dy - s, dx + s, dy, dx, dy + s, "F");
      }
      diamond(9, 9, 1.4); diamond(w - 9, 9, 1.4); diamond(9, h - 9, 1.4); diamond(w - 9, h - 9, 1.4);

      // Garis sobekan (perforasi) + lubang "sobekan" di ujung atas & bawah
      pdf.setDrawColor(...gold); pdf.setLineDashPattern([1.5, 1.5], 0); pdf.setLineWidth(0.25);
      pdf.line(stubX, 8, stubX, h - 8); pdf.setLineDashPattern([], 0);
      pdf.setFillColor(...cream); pdf.circle(stubX, 3, 3, "F"); pdf.circle(stubX, h - 3, 3, "F");
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.3); pdf.circle(stubX, 3, 3, "S"); pdf.circle(stubX, h - 3, 3, "S");

      /* ===== BAGIAN KIRI ===== */
      const contentR = stubX - 16; // batas kanan konten, kasih jarak aman dari garis perforasi
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(...gold);
      pdf.setCharSpace(0.5); pdf.text("YASSALAM ARABIAN RESTO & CATERING", 16, 18); pdf.setCharSpace(0);
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(16, 22, contentR, 22);

      pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(...brown1);
      pdf.setCharSpace(0.4); pdf.text("TIKET RESERVASI", 16, 37); pdf.setCharSpace(0);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...gold);
      pdf.text(`a.n. ${namaTamu}`, 16, 45);

      // Divider belah ketupat — motif "━━ ✦ ━━" khas Yassalam
      const dcx = (16 + contentR) / 2;
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(16, 51, dcx - 4, 51); pdf.line(dcx + 4, 51, contentR, 51);
      diamond(dcx, 51, 1.5);

      // Grid field — 3 kolom rapi, selalu terisi penuh biar gak ada ruang kosong
      const col = [16, 16 + (contentR - 16) / 3, 16 + ((contentR - 16) / 3) * 2];
      const fields: { lbl: string; val: string }[] = [
        { lbl: "OUTLET", val: outlet.charAt(0).toUpperCase() + outlet.slice(1) },
        { lbl: "TANGGAL", val: tanggal },
        { lbl: "JAM", val: `${jam} - ${jamSelesai}` },
        { lbl: "JUMLAH TAMU", val: `${jumlahTamu} orang` },
        { lbl: "MEJA", val: mejaInfoValue },
      ];
      if (dpValue) fields.push({ lbl: "UANG MUKA", val: formatRupiah(dpValue) });

      fields.forEach((f, i) => {
        const cIdx = i % 3, rIdx = Math.floor(i / 3);
        const x = col[cIdx], y = 58 + rIdx * 14;
        pdf.setFillColor(...gold); pdf.circle(x - 3, y - 2, 0.6, "F");
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(...textMuted);
        pdf.text(f.lbl, x, y);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(f.val.length > 16 ? 7 : 8.5); pdf.setTextColor(...textDark);
        pdf.text(f.val, x, y + 6);
      });

      // Kode tiket kecil, tegak lurus di tepi kiri (aksen khas tiket)
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(5); pdf.setTextColor(...gold);
      pdf.text(kodeTiket, 7, h / 2, { align: "center", angle: 90 });

      /* ===== STUB KANAN ===== */
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(...gold);
      pdf.setCharSpace(0.6); pdf.text("MEJA", cx2, 20, { align: "center" }); pdf.setCharSpace(0);
      pdf.setFontSize(32); pdf.setTextColor(...brown1);
      pdf.text(mejaBigLabel, cx2, 37, { align: "center" });
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.2); pdf.line(cx2 - 12, 41, cx2 + 12, 41);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(...textMuted);
      pdf.text(`${outlet.charAt(0).toUpperCase() + outlet.slice(1)} - ${tanggal}`, cx2, 47, { align: "center" });

      const qrSize = 23;
      pdf.setFillColor(255, 255, 255); pdf.roundedRect(cx2 - qrSize / 2 - 1.5, 50, qrSize + 3, qrSize + 3, 2, 2, "F");
      pdf.setDrawColor(...gold); pdf.setLineWidth(0.25); pdf.roundedRect(cx2 - qrSize / 2 - 1.5, 50, qrSize + 3, qrSize + 3, 2, 2, "S");
      pdf.addImage(qrDataUrl, "PNG", cx2 - qrSize / 2, 51.5, qrSize, qrSize);

      pdf.setFont("helvetica", "normal"); pdf.setFontSize(4.8); pdf.setTextColor(...textMuted);
      pdf.text(kodeTiket, cx2, 78, { align: "center" });
      pdf.setFontSize(4.3); pdf.setTextColor(180, 165, 140);
      pdf.text("Scan saat tiba di outlet", cx2, 79.5, { align: "center" });

      pdf.save(`Tiket-Reservasi-Yassalam-${tanggal}.pdf`);
    }

    const menuLink = shareToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/pesan/${shareToken}` : "";
    function copyMenuLink() {
      navigator.clipboard.writeText(menuLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
              <div className="flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">{selectedGabungan ? `Gabungan ${selectedGabungan.nama}` : `No. ${selectedTable?.nomor_meja} · ${getPosisiLabel(selectedTable?.posisi || "")}`}</span></div>
              {(selectedTable?.dp_minimum || selectedGabungan?.dp_minimum) ? (
                <div className="flex justify-between border-t border-[#C8973E]/15 pt-2"><span className="text-[#8B7355]">Uang Muka</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedTable?.dp_minimum || selectedGabungan?.dp_minimum || 0)}</span></div>
              ) : null}
            </div>

            {/* Link Pesan Menu Bersama */}
            <div className="mt-6 bg-[#FEFCF8] border border-[#E8DCC8] rounded-2xl p-5 text-left">
              <p className="text-xs font-bold text-[#C8973E] mb-2 tracking-[0.15em] uppercase">Pesan Menu (opsional)</p>
              <p className="text-[#8B7355] text-xs leading-relaxed mb-3">
                Bagikan link ini ke teman/rombongan Anda — semua orang bisa pilih menu sendiri-sendiri lewat link yang sama, dan otomatis masuk ke satu tagihan meja Anda.
              </p>
              <div className="bg-white border border-[#E8DCC8] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className="text-xs text-[#5C3D1A] truncate flex-1 font-mono">{menuLink}</span>
                <button onClick={copyMenuLink} className="text-xs font-bold text-[#C8973E] bg-[#FDF6EC] border border-[#C8973E]/30 rounded-lg px-3 py-1.5 hover:bg-[#C8973E] hover:text-white transition-all shrink-0">
                  {copiedLink ? "✓ Disalin" : "Salin"}
                </button>
              </div>
              <a href={menuLink} className="mt-3 w-full py-2.5 rounded-xl bg-[#C8973E] text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                🍽 Pesan Menu Sekarang
              </a>
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

        {/* Konfirmasi Kembali dari Step 3 */}
        {step === 3 && showBackConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowBackConfirm(false)}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-5 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-white font-bold text-lg font-serif">Yakin ingin kembali?</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[#5C3D1A] font-semibold text-sm">Hold meja Anda akan dilepas</p>
                <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">
                  Meja <span className="font-bold text-[#C8973E]">{selectedGabungan ? selectedGabungan.nama : selectedTable?.nama_meja || `No. ${selectedTable?.nomor_meja}`}</span> yang sudah di-hold akan kembali tersedia untuk orang lain.
                </p>
                {countdown && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-[#FDF6EC] border border-[#C8973E]/20 rounded-full px-4 py-2">
                    <span className="text-sm">⏱</span>
                    <span className="text-xs text-[#8B7355]">Sisa waktu hold:</span>
                    <span className="font-mono font-bold text-[#C8973E]">{countdown}</span>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowBackConfirm(false)}
                    className="flex-1 py-3.5 rounded-xl border-2 border-[#C8973E] text-[#C8973E] font-bold text-sm transition-all active:scale-[0.98] hover:bg-[#FDF6EC]">
                    Lanjut Bayar
                  </button>
                  <button onClick={() => { setShowBackConfirm(false); releaseHold(); setStep(2); }}
                    className="flex-1 py-3.5 rounded-xl bg-[#8B7355] text-white font-bold text-sm transition-all active:scale-[0.98]">
                    Ya, Kembali
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
{/* Popup rombongan besar */}
        {showBigGroupModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowBigGroupModal(false)}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-4xl">👥</span>
                </div>
                <h3 className="text-white font-bold text-lg font-serif">Rombongan Besar</h3>
                <p className="text-white/80 text-sm mt-1">{jumlahTamu} orang</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-[#5C3D1A] font-semibold text-sm">Reservasi untuk rombongan besar membutuhkan koordinasi khusus</p>
                <p className="text-[#8B7355] text-sm mt-3 leading-relaxed">
                  Untuk memastikan pengalaman terbaik Anda, tim kami akan membantu mengatur meja, menu, dan kebutuhan spesial lainnya secara langsung.
                </p>
                <div className="mt-6 space-y-3">
                  
                  <a  href={`https://wa.me/${outlet === "solo" ? "6281222666068" : "6281222666030"}?text=${encodeURIComponent(`Halo Yassalam, saya ingin reservasi untuk ${jumlahTamu} orang di outlet ${outlet === "solo" ? "Solo" : "Yogyakarta"} pada tanggal ${tanggal} jam ${jam}. Nama: ${namaTamu}, WA: ${noWa}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/></svg>
                    Hubungi Kami via WhatsApp
                  </a>
                  <button onClick={() => setShowBigGroupModal(false)}
                    className="w-full py-3 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all text-sm">
                    Ubah Jumlah Tamu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
{/* Popup rate limit */}
        {showRateLimitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowRateLimitModal(false)}>
            <div className="bg-[#FDF6EC] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-6 py-7 text-center">
                <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-white font-serif text-lg">Sabar dulu ya</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[#5C3D1A] font-semibold text-sm">Kamu baru saja membuat reservasi dengan nomor WhatsApp ini</p>
                <p className="text-[#8B7355] text-sm mt-2.5 leading-relaxed">Untuk menjaga sistem tetap adil buat semua orang, tunggu beberapa menit sebelum mencoba reservasi baru lagi.</p>
                <div className="mt-6 space-y-3">
                  <Link href="/cek-reservasi"
                    className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-semibold text-sm text-center transition-all active:scale-[0.98]">
                    Cek Reservasi Saya
                  </Link>
                  <button onClick={() => setShowRateLimitModal(false)}
                    className="w-full py-3 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all text-sm">
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popup notifikasi umum (validasi form, outlet libur, gagal simpan, dsb) */}
        {notif && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm" onClick={closeNotif}>
            <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
              <div className={`px-6 py-6 text-center bg-gradient-to-r ${
                notif.kind === "error" ? "from-red-500 to-red-600"
                : notif.kind === "success" ? "from-emerald-500 to-emerald-600"
                : "from-[#C8973E] to-[#A67B2E]"
              }`}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">{notif.kind === "libur" ? "📅" : notif.kind === "error" ? "⚠" : notif.kind === "success" ? "✓" : "⚠"}</span>
                </div>
                <h3 className="text-white font-bold text-lg font-serif">{notif.title}</h3>
              </div>
              <div className="p-6">
                {notif.messages.length === 1 ? (
                  <p className="text-[#5C3D1A] text-sm text-center leading-relaxed">{notif.messages[0]}</p>
                ) : (
                  <ul className="space-y-2">
                    {notif.messages.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#5C3D1A]">
                        <span className="text-[#C8973E] mt-0.5">•</span><span>{m}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={closeNotif}
                  className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold text-sm transition-all active:scale-[0.98]">
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast kecil — konfirmasi ringan yang hilang sendiri */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#3D2B14] text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl animate-fadeInUp flex items-center gap-2">
            <span className="text-emerald-400">✓</span> {toast}
          </div>
        )}
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
            <button onClick={() => { if (step === 3) { setShowBackConfirm(true); } else if (step > 1) { setStep(step - 1); } else backToHome(); }}
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
                    <input type="date" min={today} max={maxDateStr} value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Jam</label>
                    <div className="flex gap-2">
                      {(() => {
                        const isToday = tanggal === today;
                        const nowH = new Date().getHours();
                        const nowM = new Date().getMinutes();
                        const selectedH = Number(jam.split(":")[0] || -1);
                        const jamBukaH = parseInt(jamAktif.buka.split(":")[0]);
                        const jamTutupH = parseInt(jamAktif.tutup.split(":")[0]);
                        const jamTersedia = Math.max(0, jamTutupH - jamBukaH);
                        return (
                          <>
                            <select value={jam.split(":")[0] || ""} onChange={(e) => setJam(`${e.target.value}:${jam.split(":")[1] || "00"}`)} className={inputClass}>
                              <option value="">Jam</option>
                              {Array.from({ length: jamTersedia }, (_, i) => jamBukaH + i).map((h) => (
                                <option key={h} value={String(h).padStart(2, "0")} disabled={isToday && h < nowH}>
                                  {String(h).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                            <select value={jam.split(":")[1] || ""} onChange={(e) => setJam(`${jam.split(":")[0] || "07"}:${e.target.value}`)} className={inputClass}>
                              <option value="">Mnt</option>
                              {[0, 15, 30, 45].map((m) => (
                                <option key={m} value={String(m).padStart(2, "0")} disabled={isToday && selectedH === nowH && m < nowM}>
                                  {String(m).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                          </>
                        );
                      })()}
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
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                />
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
  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col ${selectedTable?.Id === t.Id ? "border-[#C8973E] bg-[#FDF6EC] shadow-md" : "border-[#E8DCC8] hover:border-[#C8973E]/50"}`}>
                                {t.foto_url && (
  <div className="relative mb-3 h-40 group/photo">
    <Image src={t.foto_url} alt="" fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover rounded-xl" />
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
                                  onClick={async (e) => { e.stopPropagation(); setSelectedTable(t); setSelectedGabungan(null); const ok = await createBookingHold([t.Id]); if (ok) setStep(3); }}
                                  className="w-full mt-auto pt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white text-sm font-bold transition-all active:scale-[0.98] shadow-md shadow-[#C8973E]/20">
                                  <span className="block text-center">Lanjut Booking →</span>
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
                                onClick={async (e) => { e.stopPropagation(); setSelectedGabungan(g); setSelectedTable(null); const ok = await createBookingHold(g.meja_ids); if (ok) setStep(3); }}
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
                      <button onClick={() => { navigator.clipboard.writeText("1234567890"); setToast("Nomor rekening disalin!"); }}
                        className="text-xs font-bold text-[#C8973E] bg-white border border-[#C8973E]/30 rounded-lg px-3 py-1.5 hover:bg-[#C8973E] hover:text-white transition-all">
                        Salin
                      </button>
                    </div>
                    <div className="mt-3 bg-[#FDF6EC] rounded-lg px-4 py-3">
                      <p className="text-xs text-[#8B7355]">Jumlah transfer</p>
                      <p className="font-bold text-lg text-[#C8973E]">{formatRupiah(selectedGabungan?.dp_minimum || selectedTable?.dp_minimum || 0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#8B7355] mt-3 leading-relaxed">
                    Setelah transfer, tekan tombol di bawah untuk mengonfirmasi. Meja akan langsung terkunci untuk Anda.
                  </p>
                </div>
<div className="flex gap-3">
                  <button onClick={() => setShowBackConfirm(true)}
                    className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">
                    ← Kembali
                  </button>
                  <button onClick={handleConfirmPayment} disabled={loading}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${loading ? "bg-[#E8DCC8] text-[#B8A88A] cursor-not-allowed" : "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white active:scale-[0.98] shadow-lg shadow-[#C8973E]/25"}`}>
                    {loading ? "Memproses..." : "Sudah Transfer ✦"}
                  </button>
                </div>
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
        <div className="absolute inset-0 opacity-[0.22]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07]/45 via-transparent to-[#1a0f07]/10" />
        <button onClick={() => setShowWelcome(true)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 text-sm font-bold text-[#C8973E] bg-[#1a0f07] border border-[#C8973E]/50 rounded-full px-5 py-3 sm:px-4 sm:py-2 transition-colors active:scale-[0.97] shadow-lg">
          <span>←</span> <span>Beranda</span>
        </button>
        <div className="relative text-center px-6 max-w-2xl z-10">
          <Image src="/logo.PNG" alt="Yassalam" width={150} height={150} priority className="mx-auto drop-shadow-2xl animate-fadeInUp" />
          <p className="text-[#C8973E]/40 mt-5 text-sm tracking-[0.5em] animate-fadeInUp" style={{ animationDelay: "0.2s" }}>━━━ ✦ ━━━</p>
          <p className="italic text-[#C8973E] mt-5 text-3xl font-serif animate-fadeInUp" style={{ animationDelay: "0.3s" }}>Selamat Datang di Yassalam</p>
          <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Nikmati cita rasa autentik Timur Tengah dalam suasana yang elegan. Reservasi meja Anda sekarang.
          </p>
          <div className="mt-9 grid grid-cols-3 gap-2.5 sm:gap-3 max-w-lg mx-auto animate-fadeInUp" style={{ animationDelay: "0.5s" }}>
            <button id="tour-reservasi" onClick={startReservation}
              className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white px-2 sm:px-4 py-4 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide whitespace-nowrap">
              Reservasi
            </button>
            <Link id="tour-cek-reservasi" href="/cek-reservasi"
              className="px-2 sm:px-4 py-4 rounded-xl border-2 border-[#C8973E]/40 text-[#C8973E] font-semibold text-sm sm:text-base transition-all active:scale-[0.98] hover:bg-[#C8973E]/10 tracking-wide text-center whitespace-nowrap">
              Cek reservasi
            </Link>
            <Link id="tour-ketersediaan" href="/cek-ketersediaan"
              className="px-2 sm:px-4 py-4 rounded-xl border-2 border-[#C8973E]/40 text-[#C8973E] font-semibold text-sm sm:text-base transition-all active:scale-[0.98] hover:bg-[#C8973E]/10 tracking-wide text-center whitespace-nowrap">
              Ketersediaan
            </Link>
          </div>
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
                    <button id={i === 0 ? "tour-area-card" : undefined} onClick={() => setSelectedAreaModal(area)} className="w-full h-48 relative overflow-hidden block text-left">
                      <AreaCardPhotos photos={photos} icon={visual.icon} gradient={visual.gradient} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold tracking-widest uppercase border border-white/60 rounded-full px-4 py-1.5">Lihat Foto</span>
                      </div>
                    </button>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-[#5C3D1A] font-serif">{area.nama}</h3>
                      {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}
                      <div className="mt-3 flex gap-3 text-xs text-[#8B7355]">
                        <span>🪑 {areaTables.length} tempat</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
         </div>
      </div>


      {/* OUR STORY */}
      <div className="pt-4 pb-10 md:py-20 px-4 bg-[#FDF6EC]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Kisah Kami</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#5C3D1A] font-serif mt-3 leading-snug">Warisan Rasa Yang Disajikan Dengan Sepenuh Hati</h2>
            <p className="text-[#C8973E]/40 mt-4 mb-5">━━ ✦ ━━</p>
            <p className="text-[#8B7355] leading-relaxed text-[15px]">
              Di balik setiap hidangan Yassalam, tersimpan sepenggal kisah keluarga yang diwariskan dengan penuh cinta dari generasi ke generasi. Resep yang tersaji hari ini bukan sekadar bumbu dan rempah, melainkan warisan rasa dari Keluarga — dijaga keasliannya, dirawat dengan kesungguhan, dan disempurnakan dengan ketulusan yang sama seperti pertama kali diciptakan.
            </p>
            <p className="text-[#8B7355] leading-relaxed text-[15px] mt-4">
              Tiga hidangan istimewa Yassalam — Nasi Mandhi, Kabsah, dan Kabuli — hadir sebagai bukti nyata dedikasi tersebut. Setiap suapan mengajak Anda menyelami kehangatan cita rasa Timur Tengah yang otentik, tersaji dengan sepenuh hati di dua kota tercinta: Solo dan Yogyakarta.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-3"><p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">8+</p><p className="text-xs text-[#8B7355] leading-tight">Tahun<br/>Pengalaman</p></div>
              <div className="h-10 w-px bg-[#C8973E]/20" />
              <div className="flex items-center gap-3"><p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">100%</p><p className="text-xs text-[#8B7355] leading-tight">Resep<br/>Autentik</p></div>
            </div>
          </div>
          <div className="overflow-hidden order-1 md:order-2 bg-[#FDF6EC]"><MenuFlipbook /></div>
        </div>
      </div>

      {/* TESTIMONI */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-[#C8973E] text-xs tracking-[0.3em] uppercase font-semibold">Testimoni</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#5C3D1A] mt-2">Apa Kata Pelanggan Kami</h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-10 h-px bg-[#C8973E]/40" />
            <span className="text-[#C8973E]">◆</span>
            <div className="w-10 h-px bg-[#C8973E]/40" />
          </div>
        </div>

        <div className="relative overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
          <div className="flex gap-6 w-max" style={{ animation: "marquee 70s linear infinite" }}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="w-[280px] sm:w-[340px] shrink-0 bg-white border border-[#F0E6D2] border-t-2 border-t-[#C8973E] rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 20 20" fill={j < t.rating ? "#C8973E" : "#E8DCC8"}>
                        <path d="M10 1l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L10 14.9 4.4 18l1.4-6.3L1 7.4l6.4-.6z" />
                      </svg>
                    ))}
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <p className="text-[#5C3D1A] text-sm leading-relaxed">&ldquo;{t.teks}&rdquo;</p>
                <p className="text-[#8B7355] text-sm font-semibold mt-4">{t.nama}</p>
              </div>
            ))}
          </div>
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
              <div className="text-center md:text-left"><p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Solo</p><p className="text-4xl font-bold text-white font-serif mt-3">{jamOperasional.solo.buka} – {jamOperasional.solo.tutup}</p></div>
              <div className="w-16 h-[1px] bg-[#C8973E]/25" />
              <div className="text-center md:text-left"><p className="text-[#C8973E] text-xs tracking-[0.25em] uppercase font-semibold">Yogyakarta</p><p className="text-4xl font-bold text-white font-serif mt-3">{jamOperasional.jogja.buka} – {jamOperasional.jogja.tutup}</p></div>
            </div>
            <div className="mt-6 border-t border-[#C8973E]/15 pt-6 flex flex-col items-center md:items-start gap-3">
              <a href="https://instagram.com/yassalamcatering" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.31-1.46.72-2.13 1.38C1.35 2.67.94 3.34.63 4.13c-.3.76-.5 1.64-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.33 1.35 20.66.94 19.87.63c-.76-.3-1.64-.5-2.91-.56C15.67 0 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.85a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/></svg>
                @yassalamcatering
              </a>
              <a href="https://tiktok.com/@yassalamresto" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-sm text-[#C8973E] hover:text-[#D4A44A] font-semibold transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                @yassalamresto
              </a>
            </div>
          </div>
          <div>
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold text-center md:text-left">Lokasi</p>
            <h2 className="text-3xl font-bold text-white font-serif mt-2 text-center md:text-left">Outlet Kami</h2>
            <p className="text-[#C8973E]/40 mt-3 text-center md:text-left">━━ ✦ ━━</p>
            <div className="grid gap-4 mt-8">
              {[
                { city: "Solo", ov: "solo", address: "Jl. Kapten Mulyadi No. 193, Pasar Kliwon, Surakarta", mapsUrl: "https://maps.app.goo.gl/e5fgMNMXcPEnufUD8", wa: "6281222666068", waLabel: "0812-2266-6068", active: true },
                { city: "Yogyakarta", ov: "jogja", address: "Jl. Timoho No. 56, Muja Muju, Umbulharjo, DIY", mapsUrl: "https://maps.app.goo.gl/dnZ9UeXykTtsodh49", wa: "6281222666030", waLabel: "0812-2266-6030", active: true },
                { city: "Surabaya", ov: "surabaya", address: "Coming Soon", mapsUrl: "", wa: "", waLabel: "", active: false },
                { city: "Semarang", ov: "semarang", address: "Coming Soon", mapsUrl: "", wa: "", waLabel: "", active: false },
              ].map((o) => (
                <div key={o.city} className={`border rounded-2xl p-6 transition-all ${o.active ? "border-[#C8973E]/20 hover:border-[#C8973E]/40" : "border-[#C8973E]/10 opacity-60"}`}>
                  <h3 className="font-bold text-lg text-white font-serif">{o.city}</h3>
                  <p className="text-gray-400 text-sm mt-1">{o.address}</p>
                  {o.active ? (
                    <>
                      <a href={o.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C8973E] mt-2 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        Lihat di Maps
                      </a>
                      <a href={`https://wa.me/${o.wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C8973E] mt-2 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.25-4.37c0-4.53 3.7-8.24 8.23-8.24zm-3.13 4.5c-.16 0-.42.06-.65.31-.22.25-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.13.16 1.66 2.65 4.1 3.6 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.03.14-1.14-.06-.11-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.44-.06-.13-.55-1.36-.77-1.85-.2-.48-.4-.42-.56-.42h-.5z"/></svg>
                        WA {o.waLabel}
                      </a>
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
      
      {showSpotlightTour && (
        <SpotlightTour
          steps={[
            { targetId: "tour-ketersediaan", text: "Belum tahu mau reservasi kapan? Klik di sini dulu untuk cek tanggal dan jam mana saja yang masih ada meja kosong, sebelum kamu mengisi form reservasi." },
            { targetId: "tour-reservasi", text: "Kalau sudah tahu mau kapan, klik tombol ini. Kamu akan diminta isi tanggal, jam, jumlah tamu, nama, dan nomor WhatsApp — sistem akan otomatis carikan meja yang muat." },
            { targetId: "tour-area-card", text: "Setiap area punya suasana berbeda-beda. Klik salah satu kartu ini untuk lihat foto asli tiap meja beserta detailnya (kapasitas, uang muka, dll) sebelum kamu memutuskan." },
            { targetId: "tour-cek-reservasi", text: "Sudah pernah reservasi sebelumnya? Klik di sini dan masukkan nomor WhatsApp kamu — kamu bisa lihat status reservasi, ubah pesanan menu, atau unduh tiket digital kapan saja." },
            { targetId: "tour-reservasi", text: "Yeay, itu dia semua fitur serunya! Sekarang giliran kamu—pilih tanggal, isi form, dan meja favoritmu siap menyambut. Sampai ketemu di Yassalam ya!" },
          ]}
          onFinish={() => {
            if (typeof window !== "undefined") localStorage.setItem("yassalam_tour_done", "1");
            setShowSpotlightTour(false);
          }}
        />
      )}

      {selectedAreaModal && (() => {
        const idx = areasData.findIndex((a) => a.Id === selectedAreaModal.Id) % areaVisuals.length;
        const visual = areaVisuals[idx >= 0 ? idx : 0];
        const liveArea = areasData.find((a) => a.Id === selectedAreaModal.Id) || selectedAreaModal;
        return <AreaGalleryModal area={liveArea} tables={tables.filter((t) => t.posisi === liveArea.slug)}
          gradient={visual.gradient} icon={visual.icon} onClose={() => setSelectedAreaModal(null)} />;
      })()}
    </div>
  );
}