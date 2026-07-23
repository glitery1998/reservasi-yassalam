"use client";
import { forwardRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

const TOTAL_PAGES = 19;

const Page = forwardRef<HTMLDivElement, { image: string; pageNumber: number }>(
  ({ image, pageNumber }, ref) => {
    return (
      <div ref={ref} className="bg-transparent relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`Halaman menu ${pageNumber}`} className="w-full h-full object-contain" />
      </div>
    );
  }
);
Page.displayName = "MenuPage";

const CoverPage = forwardRef<HTMLDivElement, { type: "front" | "back" }>(
  ({ type }, ref) => {
    return (
      <div ref={ref} className="relative w-full h-full overflow-hidden">
        {/* Background kayu gelap */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#3a2a1a",
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 8px,
                rgba(0,0,0,0.05) 8px,
                rgba(0,0,0,0.05) 10px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                rgba(0,0,0,0.03) 40px,
                rgba(0,0,0,0.03) 42px
              )
            `,
          }}
        />

        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 20% 50%, rgba(60,40,20,0.4) 0%, transparent 70%),
              radial-gradient(ellipse at 80% 50%, rgba(30,20,10,0.3) 0%, transparent 70%)
            `,
          }}
        />

        {/* Strip kulit — kanan untuk cover depan (buku terbuka), kiri untuk cover belakang */}
        <div
          className={`absolute top-0 bottom-0 w-[12%] flex flex-col items-center justify-between py-[15%] ${type === "front" ? "right-0" : "left-0"}`}
          style={{
            background: "linear-gradient(135deg, #c48a4a 0%, #a0693a 30%, #8b5a2b 60%, #a0693a 100%)",
            boxShadow: type === "front" ? "-2px 0 8px rgba(0,0,0,0.3)" : "2px 0 8px rgba(0,0,0,0.3)",
          }}
        >
          {/* Rivet atas */}
          <div className="w-[40%] aspect-square rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-md border border-gray-400" />
          {/* Rivet tengah */}
          <div className="w-[40%] aspect-square rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-md border border-gray-400" />
          {/* Rivet bawah */}
          <div className="w-[40%] aspect-square rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-md border border-gray-400" />
        </div>

        {/* Konten tengah */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${type === "front" ? "pr-[12%]" : "pl-[12%]"}`}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.PNG"
            alt="Yassalam"
            className="w-[45%] h-auto drop-shadow-lg"
            style={{ filter: type === "front" ? "brightness(0.8) contrast(1.2)" : "brightness(0.7) contrast(1.1)" }}
          />
          <p className="mt-3 text-[#C8973E] text-[0.3rem] sm:text-[0.5rem] tracking-[0.15em] sm:tracking-[0.3em] uppercase font-semibold">
            Arabian Resto & Catering
          </p>
        </div>
      </div>
    );
  }
);
CoverPage.displayName = "CoverPage";

export default function MenuFlipbook() {
  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => `/menu/menu-${String(i + 1).padStart(2, "0")}.jpg`);
  const [hasInteracted, setHasInteracted] = useState(false);

  return (
    <div className="flex justify-center pt-0 pb-10 relative">
      {/* @ts-ignore */}
      <HTMLFlipBook
        width={240}
        height={328}
        size="stretch"
        minWidth={150}
        maxWidth={300}
        minHeight={205}
        maxHeight={450}
        showCover={false}
        usePortrait={false}
        drawShadow={false}
        maxShadowOpacity={0.5}
        flippingTime={700}
        onFlip={() => setHasInteracted(true)}
        className="rounded-2xl overflow-hidden shadow-[0_2px_0_#e8dcc8,0_4px_0_#ddd0b8,0_6px_0_#d2c4a8,0_8px_20px_rgba(0,0,0,0.25)]"
      >
        {/* Cover depan */}
        <CoverPage type="front" />

        {/* Halaman menu */}
        {pages.map((img, i) => (
          <Page key={img} image={img} pageNumber={i + 1} />
        ))}

        {/* Cover belakang */}
        <CoverPage type="back" />
      </HTMLFlipBook>
      {hasInteracted && (
        <div
          className="absolute top-4 w-8 pointer-events-none z-10"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            top: "1rem",
            bottom: "3.5rem",
            background: "linear-gradient(to right, transparent, rgba(0,0,0,0.35) 50%, transparent)",
            filter: "blur(3px)",
          }}
        />
      )}
      {!hasInteracted && (
        <div className="absolute -bottom-1 left-0 right-0 flex items-center justify-center gap-2 text-[#8B7355] text-xs animate-pulse">
          <span>Klik atau geser untuk lihat menu</span>
          <span className="text-base">👉</span>
        </div>
      )}
    </div>
  );
}