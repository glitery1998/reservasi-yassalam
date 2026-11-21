"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { halamanMenu } from "../MenuFlipbook";

// react-pageflip butuh window, jadi buku dimuat hanya di browser
const BukuMenuFlip = dynamic(() => import("./BukuMenuFlip"), {
  ssr: false,
  loading: () => <p className="py-24 text-center text-sm text-[#C8973E]/70">Membuka buku menu...</p>,
});

// Pola Arab emas yang sama dengan halaman awal reservasi (app/page.tsx)
const POLA_ARAB =
  "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")";

type Mode = "buku" | "daftar";

export default function BukuMenu() {
  const [mode, setMode] = useState<Mode>("buku");
  const halaman = halamanMenu();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0f07] text-[#FDF6EC]">
      {/* Latar: gradasi coklat tua, pola Arab emas, dan garis emas di atas, seperti halaman awal reservasi */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-[#2a1a0e] via-[#3a2415] to-[#1a0f07]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.22]" style={{ backgroundImage: POLA_ARAB, backgroundSize: "80px 80px" }} />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-t from-[#1a0f07]/70 via-transparent to-[#1a0f07]/30" />
      <div className="pointer-events-none fixed left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />

      <div className="relative z-10">
        <header className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.PNG" alt="Yassalam" className="h-24 w-auto drop-shadow-2xl" />
          <p className="mt-4 text-sm tracking-[0.5em] text-[#C8973E]/50">━━━ ✦ ━━━</p>
          <h1 className="mt-3 font-serif text-3xl italic text-[#C8973E]">Buku Menu</h1>
          <p className="mt-2 text-sm text-[#e8dcc8]/70">Yassalam Arabian Resto &amp; Catering</p>

          <div className="mt-6 inline-flex rounded-full border border-[#C8973E]/40 bg-[#1a0f07]/70 p-1 backdrop-blur" role="tablist" aria-label="Cara melihat menu">
            {(
              [
                ["buku", "Buka buku"],
                ["daftar", "Semua halaman"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${mode === m ? "bg-[#C8973E] text-[#1a0f07]" : "text-[#C8973E]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-4 pb-12 pt-8">
          {mode === "buku" ? (
            <BukuMenuFlip halaman={halaman} />
          ) : (
            // Mode daftar: halaman berurutan ke bawah, mudah diperbesar dengan dua jari di HP
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {halaman.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`Halaman menu ${i + 1}`}
                  loading={i < 2 ? "eager" : "lazy"}
                  width={1200}
                  height={1697}
                  className="h-auto w-full rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
                />
              ))}
            </div>
          )}
          <p className="mt-10 text-center text-sm tracking-[0.5em] text-[#C8973E]/40">━━━ ✦ ━━━</p>
          <p className="mt-3 text-center text-xs text-[#e8dcc8]/60">Harga dan ketersediaan menu dapat berubah sewaktu-waktu.</p>
        </section>
      </div>
    </main>
  );
}
