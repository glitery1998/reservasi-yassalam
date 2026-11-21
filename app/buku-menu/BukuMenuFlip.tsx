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
        className="overflow-hidden rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
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
          className="min-h-11 rounded-full border border-[#d9c7a8] bg-white px-5 text-sm font-semibold disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          ← Sebelumnya
        </button>
        <span className="min-w-36 text-center text-sm text-[#8B7355]" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          onClick={() => ref.current?.pageFlip()?.flipNext()}
          disabled={posisi >= total - 1}
          className="min-h-11 rounded-full bg-[#3a2a1a] px-5 text-sm font-semibold text-[#FDF6EC] disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          Berikutnya →
        </button>
      </div>
      <p className="mt-3 text-xs text-[#8B7355]">Geser atau ketuk tepi halaman untuk membalik.</p>
    </div>
  );
}
