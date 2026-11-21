import type { Metadata } from "next";
import BukuMenu from "./BukuMenu";

// Buku menu online yang bisa dibagikan ke tamu (link tetap /buku-menu). Hanya untuk dilihat: tidak ada tombol pesan.
export const metadata: Metadata = {
  title: "Buku Menu · Yassalam Arabian Resto & Catering",
  description: "Lihat buku menu Yassalam Arabian Resto & Catering secara online.",
  openGraph: {
    title: "Buku Menu Yassalam",
    description: "Lihat buku menu Yassalam Arabian Resto & Catering secara online.",
    images: ["/menu/menu-01.jpg"],
  },
};

export default function BukuMenuPage() {
  return <BukuMenu />;
}
