"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { halamanMenu } from "../MenuFlipbook";

// react-pageflip butuh window, jadi buku dimuat hanya di browser
const BukuMenuFlip = dynamic(() => import("./BukuMenuFlip"), {
  ssr: false,
  loading: () => <p className="py-24 text-center text-sm text-[#8B7355]">Membuka buku menu...</p>,
});

type Mode = "buku" | "daftar";

export default function BukuMenu() {
  const [mode, setMode] = useState<Mode>("buku");
  const halaman = halamanMenu();

  return (
    <main className="min-h-screen bg-[#FDF6EC] text-[#3a2a1a]">
      <header className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.PNG" alt="Yassalam" className="h-16 w-auto" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Buku Menu</h1>
        <p className="mt-1 text-sm text-[#8B7355]">Yassalam Arabian Resto &amp; Catering</p>

        <div className="mt-5 inline-flex rounded-full border border-[#d9c7a8] bg-white p-1" role="tablist" aria-label="Cara melihat menu">
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
              className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${mode === m ? "bg-[#3a2a1a] text-[#FDF6EC]" : "text-[#3a2a1a]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-12 pt-6">
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
                className="h-auto w-full rounded-xl bg-white shadow-md"
              />
            ))}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-[#8B7355]">Harga dan ketersediaan menu dapat berubah sewaktu-waktu.</p>
      </section>
    </main>
  );
}
