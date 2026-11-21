"use client";
import { useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { CoverPage, Page } from "../MenuFlipbook";

type FlipApi = { pageFlip: () => { flipNext: () => void; flipPrev: () => void } | undefined };

// Buku menu ukuran besar untuk /buku-menu. Di layar lebar tampil dua halaman, di HP satu halaman (usePortrait).
export default function BukuMenuFlip({ halaman }: { halaman: string[] }) {
  const ref = useRef<FlipApi | null>(null);
  const [posisi, setPosisi] = useState(0);
  const total = halaman.length + 2; // + sampul depan dan belakang

  const label = posisi === 0 ? "Sampul" : posisi >= total - 1 ? "Sampul belakang" : `Halaman ${Math.min(posisi, halaman.length)} dari ${halaman.length}`;

  return (
    <div className="flex flex-col items-center">
      {/* @ts-expect-error - react-pageflip belum punya tipe TypeScript yang lengkap */}
      <HTMLFlipBook
        ref={ref}
        width={420}
        height={594}
        size="stretch"
        minWidth={260}
        maxWidth={560}
        minHeight={368}
        maxHeight={792}
        showCover
        usePortrait
        mobileScrollSupport
        drawShadow
        maxShadowOpacity={0.4}
        flippingTime={650}
        onFlip={(e: { data: number }) => setPosisi(e.data)}
        className="overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
      >
        <CoverPage type="front" />
        {halaman.map((img, i) => (
          <Page key={img} image={img} pageNumber={i + 1} />
        ))}
        <CoverPage type="back" />
      </HTMLFlipBook>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.pageFlip()?.flipPrev()}
          disabled={posisi === 0}
          className="min-h-11 rounded-full border border-[#C8973E]/50 bg-[#1a0f07]/70 px-5 text-sm font-semibold text-[#C8973E] disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          ← Sebelumnya
        </button>
        <span className="min-w-36 text-center text-sm text-[#e8dcc8]/80" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          onClick={() => ref.current?.pageFlip()?.flipNext()}
          disabled={posisi >= total - 1}
          className="min-h-11 rounded-full bg-[#C8973E] px-5 text-sm font-semibold text-[#1a0f07] disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          Berikutnya →
        </button>
      </div>
      <p className="mt-3 text-xs text-[#e8dcc8]/60">Geser atau ketuk tepi halaman untuk membalik.</p>
    </div>
  );
}
