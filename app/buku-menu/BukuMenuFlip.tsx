"use client";
import { useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { CoverPage, Page } from "../MenuFlipbook";

type FlipApi = { pageFlip: () => { flipNext: () => void; flipPrev: () => void } | undefined };

// Buku menu ukuran besar untuk /buku-menu. Di layar lebar buku langsung terbuka: sampul di kiri, halaman 1 di kanan (seperti buku
// menu di halaman awal reservasi). Di HP satu halaman (usePortrait). Tanpa sampul belakang, supaya jumlah halaman genap dan
// bentangan terakhir tidak menyisakan sisi kosong.
export default function BukuMenuFlip({ halaman }: { halaman: string[] }) {
  const ref = useRef<FlipApi | null>(null);
  const [posisi, setPosisi] = useState(0);
  // Perkiraan awal (komponen ini hanya dimuat di browser); dipastikan lagi oleh onInit dan onChangeOrientation
  const [mendatar, setMendatar] = useState(() => window.innerWidth >= 640);
  const total = halaman.length + 1; // + sampul depan
  const n = halaman.length;

  // posisi = indeks halaman kiri yang tampil (0 = sampul). Bentangan: sampul + hal 1, hal 2-3, dst.
  const label = mendatar
    ? posisi === 0
      ? `Sampul · halaman 1 dari ${n}`
      : `Halaman ${posisi}${posisi + 1 <= n ? `-${posisi + 1}` : ''} dari ${n}`
    : posisi === 0
      ? 'Sampul'
      : `Halaman ${posisi} dari ${n}`;
  const diAkhir = posisi >= (mendatar ? total - 2 : total - 1);

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
        showCover={false}
        usePortrait
        mobileScrollSupport
        drawShadow
        maxShadowOpacity={0.4}
        flippingTime={650}
        onFlip={(e: { data: number }) => setPosisi(e.data)}
        onInit={(e: { data: { mode: string } }) => setMendatar(e.data?.mode === 'landscape')}
        onChangeOrientation={(e: { data: string }) => setMendatar(e.data === 'landscape')}
        className="overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
      >
        <CoverPage type="front" />
        {halaman.map((img, i) => (
          <Page key={img} image={img} pageNumber={i + 1} />
        ))}
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
          disabled={diAkhir}
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
