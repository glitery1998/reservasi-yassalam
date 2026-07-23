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
};
type MenuPaket = {
  Id: number; nama_paket: string; deskripsi: string; harga: number; outlet: string;
};
type AreaData = {
  Id: number; outlet: string; nama: string; slug: string;
  deskripsi: string | null; urutan: number;
};
type BookingSlot = {
  Id: number; meja_id: number; tanggal: string; jam: string; jam_selesai: string;
  status: string; type: "reservation" | "hold";
};

/** Cek apakah dua slot waktu overlap */
function isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/** Status ketersediaan meja pada jam tertentu */
function getTableAvailability(
  tableId: number, checkJam: string, checkJamSelesai: string, slots: BookingSlot[]
): { status: "available" | "booked" | "on-hold"; conflictSlot?: BookingSlot } {
  const tableSlots = slots.filter((s) => s.meja_id === tableId);
  for (const slot of tableSlots) {
    if (isTimeOverlap(checkJam, checkJamSelesai, slot.jam, slot.jam_selesai)) {
      if (slot.type === "hold") return { status: "on-hold", conflictSlot: slot };
      return { status: "booked", conflictSlot: slot };
    }
  }
  return { status: "available" };
}

/** Ambil semua booking hari itu untuk satu meja */
function getTableDaySchedule(tableId: number, slots: BookingSlot[]): BookingSlot[] {
  return slots.filter((s) => s.meja_id === tableId).sort((a, b) => a.jam.localeCompare(b.jam));
}

const areaVisuals = [
  { gradient: "from-amber-800 to-yellow-900", icon: "✦" },
  { gradient: "from-stone-700 to-stone-900", icon: "◈" },
  { gradient: "from-amber-900 to-orange-950", icon: "◆" },
  { gradient: "from-emerald-900 to-emerald-950", icon: "❋" },
  { gradient: "from-yellow-800 to-amber-950", icon: "★" },
];

/** Helper: hitung jam selesai (jam + 2 jam) */
function hitungJamSelesai(jam: string): string {
  if (!jam) return "";
  const [h, m] = jam.split(":").map(Number);
  const totalMenit = (h * 60 + m + 120) % (24 * 60);
  const eh = Math.floor(totalMenit / 60);
  const em = totalMenit % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

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
    const waNumber = outletValue === "solo" ? "6281222666068" : "6281222666030";
    if (pendingAction === "reservasi") {
      onReservasi(outletValue);
    } else if (pendingAction === "aqiqah") {
      window.open(`https://wa.me/${waNumber}?text=Halo%20Yassalam%2C%20saya%20ingin%20order%20Aqiqah%20untuk%20outlet%20${outletLabel}`, "_blank");
    } else if (pendingAction === "preorder") {
      window.open(`https://wa.me/${waNumber}?text=Halo%20Yassalam%2C%20saya%20ingin%20Pre%20Order%20untuk%20outlet%20${outletLabel}`, "_blank");
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

        </div>
    </div>
  );
}
function AreaModal({
  area, tables, gradient, icon, onClose, onSelectTable,
  previewJam, previewJamSelesai, daySlots, previewTamu,
}: {
  area: AreaData;
  tables: Table[];
  gradient: string;
  icon: string;
  onClose: () => void;
  onSelectTable: (table: Table) => void;
  previewJam: string;
  previewJamSelesai: string;
  daySlots: BookingSlot[];
  previewTamu: number;
}) {
  const photos = tables.filter((t) => t.foto_url).map((t) => t.foto_url as string);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pickedTable, setPickedTable] = useState<Table | null>(null);

  useEffect(() => {
    if (pickedTable) return;
    if (photos.length < 2) return;
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % photos.length), 3500);
    return () => clearInterval(t);
  }, [photos.length, pickedTable]);

  const displayedPhoto = pickedTable?.foto_url || photos[slideIndex] || null;
  const hasTimeFilter = !!previewJam && !!previewJamSelesai;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden overflow-y-auto max-w-3xl w-full shadow-2xl animate-fadeInUp max-h-[90vh] grid md:grid-cols-2" onClick={(e) => e.stopPropagation()}>

        {/* KOLOM KIRI: Foto */}
        <div className={`relative h-56 sm:h-64 md:h-auto shrink-0 bg-gradient-to-br ${gradient} overflow-hidden sticky top-0 z-20`}>
          {displayedPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={displayedPhoto} src={displayedPhoto} alt={pickedTable ? (pickedTable.nama_meja || `Meja ${pickedTable.nomor_meja}`) : area.nama}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out animate-fadeInUp" style={{ animationDuration: "0.4s" }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30 text-white">{icon}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r md:from-black/40 md:via-transparent md:to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all z-10">✕</button>

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

        {/* KOLOM KANAN: Info & daftar meja */}
        <div className="p-6 md:overflow-y-auto md:max-h-[90vh]">
          <h3 className="font-bold text-2xl text-[#5C3D1A] font-serif">{area.nama}</h3>
          {area.deskripsi && <p className="text-[#8B7355] text-sm mt-2 leading-relaxed">{area.deskripsi}</p>}

          {/* Legend ketersediaan */}
          {hasTimeFilter && (
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tersedia</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Terisi</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Di-hold</span>
              {previewTamu > 0 && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-300" /> Kapasitas kurang</span>}
            </div>
          )}

          <div className="mt-5">
            <p className="text-xs font-bold text-[#C8973E] mb-3 tracking-[0.15em] uppercase">Pilih Meja</p>
            {tables.length === 0 ? (
              <p className="text-sm text-[#B8A88A]">Belum ada meja tersedia di area ini.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tables.map((t) => {
                  const avail = hasTimeFilter
                    ? getTableAvailability(t.Id, previewJam, previewJamSelesai, daySlots)
                    : { status: "available" as const };
                  const schedule = getTableDaySchedule(t.Id, daySlots);
                  const isBooked = avail.status === "booked";
                  const isHeld = avail.status === "on-hold";
                  const isTooSmall = previewTamu > 0 && t.kapasitas < previewTamu;
                  const isDisabled = isBooked || isHeld || isTooSmall;

                  return (
                    <button
                      key={t.Id}
                      onClick={() => { if (!isDisabled) setPickedTable(t); }}
                      disabled={isDisabled}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                        isDisabled
                          ? "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                          : pickedTable?.Id === t.Id
                          ? "border-[#C8973E] bg-[#FDF6EC] shadow-md"
                          : "border-[#E8DCC8] hover:border-[#C8973E]/50"
                      }`}
                    >
                      {/* Status badge */}
                      {hasTimeFilter && (
                        <span className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                          isBooked ? "bg-red-400" : isHeld ? "bg-amber-400" : isTooSmall ? "bg-orange-300" : "bg-emerald-500"
                        }`} />
                      )}

                      <p className={`font-bold ${isDisabled ? "text-gray-400" : "text-[#5C3D1A]"}`}>
                        {t.nama_meja || `Meja ${t.nomor_meja}`}
                      </p>
                      <p className={`text-sm mt-1 ${isDisabled ? "text-gray-400" : "text-[#8B7355]"}`}>
                        {t.kapasitas} orang
                      </p>

                      {/* Status text */}
                      {isBooked && (
                        <p className="text-xs text-red-500 mt-1.5 font-semibold">
                          Terisi {avail.conflictSlot?.jam}–{avail.conflictSlot?.jam_selesai}
                        </p>
                      )}
                      {isHeld && (
                        <p className="text-xs text-amber-600 mt-1.5 font-semibold">
                          Sedang di-hold
                        </p>
                      )}
                      {isTooSmall && !isBooked && !isHeld && (
                        <p className="text-xs text-orange-500 mt-1.5 font-semibold">
                          Maks {t.kapasitas} orang
                        </p>
                      )}
                      {!isDisabled && hasTimeFilter && (
                        <p className="text-xs text-emerald-600 mt-1.5 font-semibold">✓ Tersedia</p>
                      )}

                      {t.dp_minimum && !isDisabled ? (
                        <p className="text-xs text-[#C8973E] mt-1 font-semibold">
                          DP min. Rp {t.dp_minimum.toLocaleString("id-ID")}
                        </p>
                      ) : null}

                      {/* Jadwal hari ini */}
                      {schedule.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                          <p className="text-[10px] text-[#8B7355] font-semibold uppercase tracking-wider mb-1">Jadwal hari ini</p>
                          {schedule.map((s) => (
                            <p key={s.Id} className={`text-[11px] leading-relaxed ${
                              hasTimeFilter && isTimeOverlap(previewJam, previewJamSelesai, s.jam, s.jam_selesai)
                                ? "text-red-500 font-semibold"
                                : "text-[#B8A88A]"
                            }`}>
                              {s.jam}–{s.jam_selesai}
                              {s.type === "hold" && " (hold)"}
                            </p>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          </div>

        {/* Tombol reservasi sticky di bawah */}
        {pickedTable && (
          <div className="md:col-start-2 sticky bottom-0 bg-white border-t border-[#E8DCC8] p-4">
            <button onClick={() => onSelectTable(pickedTable)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20">
              Reservasi {pickedTable.nama_meja || `Meja ${pickedTable.nomor_meja}`} →
            </button>
          </div>
        )}
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
  const [jumlahTamu, setJumlahTamu] = useState("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuPaket | null>(null);
  const [jumlahPorsi, setJumlahPorsi] = useState("");
  const [namaTamu, setNamaTamu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [selectedAreaModal, setSelectedAreaModal] = useState<AreaData | null>(null);
  const [kapasitasWarning, setKapasitasWarning] = useState(false);
  const [holdId, setHoldId] = useState<number | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuPaket[]>([]);
  const [areasData, setAreasData] = useState<AreaData[]>([]);

  // Preview tanggal & jam untuk cek ketersediaan meja di landing page
  const [previewTanggal, setPreviewTanggal] = useState("");
  const [previewJam, setPreviewJam] = useState("");
  const [previewTamu, setPreviewTamu] = useState("");
  const previewJamSelesai = hitungJamSelesai(previewJam);
  const [daySlots, setDaySlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // FIX #1: jamSelesai dihitung via helper function yang juga dipakai di createBookingHold
  const jamSelesai = hitungJamSelesai(jam);

  // FIX #2: backToHome dibungkus useCallback agar stabil untuk dependency useEffect
  const backToHome = useCallback(() => {
    // release hold inline (tidak bisa panggil releaseHold karena circular dep)
    if (holdId) {
      supabase.from("BookingHold").update({ status: "released" }).eq("Id", holdId);
    }
    setHoldId(null);
    setHoldExpiry(null);
    setReservationId(null);
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
  }, [holdId]);

  // FIX #2: Countdown timer — backToHome sekarang ada di dependency array
  useEffect(() => {
    if (!holdExpiry) { queueMicrotask(() => setCountdown("")); return; }
    const tick = () => {
      const diff = holdExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        setHoldId(null);
        setHoldExpiry(null);
        alert("Waktu hold meja telah habis. Silakan pilih meja kembali.");
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

  // FIX #1: createBookingHold sekarang pakai hitungJamSelesai() langsung
  async function createBookingHold() {
    if (!selectedTable || !tanggal || !jam) return false;
    const computedJamSelesai = hitungJamSelesai(jam);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    // Cleanup expired holds first, then check existing active holds
    await supabase.from("BookingHold").delete().lt("expires_at", new Date().toISOString());
    
    const { data: existingHolds } = await supabase
      .from("BookingHold")
      .select("*")
      .eq("meja_id", selectedTable.Id)
      .eq("tanggal", tanggal)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());
    
    if (existingHolds && existingHolds.length > 0) {
      alert("Meja ini sedang di-hold oleh customer lain. Silakan pilih meja atau waktu lain.");
      return false;
    }

    // Also check existing confirmed reservations
    const { data: existingRes } = await supabase
      .from("Reservation")
      .select("*")
      .eq("meja_id", selectedTable.Id)
      .eq("tanggal", tanggal)
      .eq("status", "Confirmed");

    if (existingRes && existingRes.length > 0) {
      const conflict = existingRes.some((r: { jam: string; jam_selesai: string }) => {
        const rStart = r.jam.replace(":00", "");
        const rEnd = r.jam_selesai;
        // FIX #1: pakai computedJamSelesai, bukan variabel luar yang mungkin belum tersedia
        return (jam < rEnd && computedJamSelesai > rStart);
      });
      if (conflict) {
        alert("Meja ini sudah dibooking pada jam tersebut. Silakan pilih waktu atau meja lain.");
        return false;
      }
    }
    
    const { data, error } = await supabase.from("BookingHold").insert({
      meja_id: selectedTable.Id,
      tanggal,
      jam,
      jam_selesai: computedJamSelesai,
      session_id: sessionId,
      expires_at: expiresAt,
      status: "active",
    }).select().single();
    
    if (error) {
      alert("Gagal hold meja: " + error.message);
      return false;
    }
    
    setHoldId(data.Id);
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

  const today = new Date().toISOString().split("T")[0];

  // Handle tombol back HP
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (selectedAreaModal) {
        setSelectedAreaModal(null);
      } else if (showForm && sukses) {
        backToHome();
      } else if (showForm && step > 1) {
        setStep((s) => s - 1);
      } else if (showForm) {
        backToHome();
      } else if (!showWelcome) {
        setShowWelcome(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedAreaModal, showForm, sukses, step, showWelcome, backToHome]);

  useEffect(() => {
    window.history.pushState({ overlay: true }, "");
  }, [showForm, selectedAreaModal, showWelcome]);

  useEffect(() => {
    if (showForm && step > 1) {
      window.history.pushState({ overlay: true }, "");
    }
  }, [step, showForm]);

  useEffect(() => {
    if (!outlet) return;
    supabase.from("Tables").select("*").eq("outlet", outlet).order("nomor_meja")
      .then(({ data }) => setTables(data || []));
    supabase.from("MenuPaket").select("*").eq("outlet", outlet).eq("aktif", true)
      .then(({ data }) => setMenus(data || []));
    supabase.from("Areas").select("*").eq("outlet", outlet).order("urutan")
      .then(({ data }) => setAreasData(data || []));
  }, [outlet]);

  // Fetch booking slots ketika preview tanggal/outlet berubah
  useEffect(() => {
    if (!outlet || !previewTanggal) { setDaySlots([]); return; }
    setLoadingSlots(true);
    const fetchSlots = async () => {
      // Fetch confirmed reservations
      const { data: resData } = await supabase
        .from("Reservation")
        .select("Id, meja_id, tanggal, jam, jam_selesai, status")
        .eq("tanggal", previewTanggal)
        .in("status", ["Confirmed", "Pending"])
        .in("meja_id", tables.map((t) => t.Id));

      // Fetch active holds
      const { data: holdData } = await supabase
        .from("BookingHold")
        .select("Id, meja_id, tanggal, jam, jam_selesai, status")
        .eq("tanggal", previewTanggal)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .in("meja_id", tables.map((t) => t.Id));

      const slots: BookingSlot[] = [
        ...(resData || []).map((r) => ({ ...r, type: "reservation" as const })),
        ...(holdData || []).map((h) => ({ ...h, type: "hold" as const })),
      ];
      setDaySlots(slots);
      setLoadingSlots(false);
    };
    fetchSlots();
  }, [outlet, previewTanggal, tables]);

  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
  function getPosisiLabel(p: string) {
    const map: Record<string, string> = { "indoor-jendela": "Dekat Jendela", "indoor-tengah": "Indoor Tengah", "indoor-pojok": "Indoor Pojok", "outdoor": "Outdoor Garden", "vip": "VIP Room" };
    return map[p] || p;
  }

  // FIX #3: validateStep sekarang validasi semua step yang relevan
  function validateStep(s: number): string[] {
    const errs: string[] = [];
    // Step 1: Waktu & data tamu
    if (s === 1) {
      if (!tanggal) errs.push("Pilih tanggal reservasi");
      if (tanggal && tanggal < today) errs.push("Tanggal tidak boleh hari yang sudah lewat");
      if (!jam) errs.push("Pilih jam reservasi");
      if (jam) { const h = parseInt(jam.split(":")[0]); if (h < 7 || h >= 20) errs.push("Jam reservasi hanya 07:00 - 20:00"); }
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Nama tamu minimal 2 karakter");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp harus 10-15 digit angka");
    }
    // Step 2: DP — meja sudah dipilih sebelum masuk form
    if (s === 2) {
      if (!selectedTable) errs.push("Pilih meja terlebih dahulu");
    }
    // Step 3: Konfirmasi — validasi ulang semua sebelum booking
    if (s === 3) {
      if (!tanggal) errs.push("Tanggal reservasi belum dipilih");
      if (!jam) errs.push("Jam reservasi belum dipilih");
      if (!selectedTable) errs.push("Meja belum dipilih");
      if (!namaTamu || namaTamu.trim().length < 2) errs.push("Nama tamu tidak valid");
      if (!noWa || !/^[0-9]{10,15}$/.test(noWa)) errs.push("No. WhatsApp tidak valid");
    }
    // Step 4: Menu — opsional, tapi kalau pilih harus isi porsi
    if (s === 4) {
      if (selectedMenu && (!jumlahPorsi || Number(jumlahPorsi) < 1)) {
        errs.push("Jumlah porsi minimal 1 jika memilih menu paket");
      }
    }
    return errs;
  }

  async function nextStep() {
    if (step === 1 && selectedTable && Number(jumlahTamu) > selectedTable.kapasitas) {
      setKapasitasWarning(true);
      return;
    }
    const errs = validateStep(step);
    setErrors(errs);
    if (errs.length > 0) return;
    
    // Step 1 → 2: create booking hold
    if (step === 1) {
      const success = await createBookingHold();
      if (!success) return;
    }
    
    setStep(step + 1);
  }

  // Step 3: Konfirmasi → insert reservation ke DB (meja langsung terbooking)
  async function handleConfirmBooking() {
    const errs = validateStep(3);
    setErrors(errs);
    if (errs.length > 0) return;
    setLoading(true);
    
    const dpAmount = selectedTable?.dp_minimum || 0;
    
    const { data, error } = await supabase.from("Reservation").insert({
      nama_tamu: namaTamu, no_whatsapp: noWa, outlet, tanggal, jam, jam_selesai: jamSelesai,
      jumlah_tamu: Number(jumlahTamu), catatan: catatan || null,
      meja_id: selectedTable?.Id, menu_paket_id: null,
      dp_amount: dpAmount,
      dp_status: "belum_bayar",
      status: "Confirmed",
    }).select().single();
    
    // Mark hold as completed
    if (holdId) {
      await supabase.from("BookingHold").update({ status: "completed" }).eq("Id", holdId);
      setHoldId(null);
      setHoldExpiry(null);
    }
    
    setLoading(false);
    if (error) {
      alert("Gagal: " + error.message);
    } else {
      setReservationId(data.Id);
      setStep(4); // lanjut ke pilih menu (opsional)
    }
  }

  // Step 4: Update menu ke reservation yang sudah ada (opsional)
  async function handleSaveMenu() {
    if (selectedMenu) {
      const errs = validateStep(4);
      setErrors(errs);
      if (errs.length > 0) return;
    }
    setLoading(true);

    if (selectedMenu && reservationId) {
      await supabase.from("Reservation").update({
        menu_paket_id: selectedMenu.Id,
      }).eq("Id", reservationId);
    }

    setLoading(false);
    setSukses(true);
  }

  function startReservation() {
    setShowForm(true);
    setStep(1);
    setSukses(false);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stepLabels = ["Waktu", "DP", "Konfirmasi", "Menu"];
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
          setTimeout(() => {
            document.getElementById("pilihan-area")?.scrollIntoView({ behavior: "smooth" });
          }, 300);
        }}
      />
    );
  }

  // ==================== SUKSES ====================
  if (showForm && sukses) {
    async function downloadTiket() {
      const jsPDF = (await import("jspdf")).default;

      const logoImg = await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = "/logo.PNG";
      });

      const pdf = new jsPDF("p", "mm", [120, 220]);
      const w = 120, h = 220;
      const cx = w / 2;

      pdf.setFillColor(255, 252, 245);
      pdf.rect(0, 0, w, h, "F");
      pdf.setFillColor(200, 151, 62);
      pdf.rect(0, 0, w, 3, "F");
      pdf.rect(0, h - 3, w, 3, "F");
      pdf.setDrawColor(200, 151, 62);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(5, 7, w - 10, h - 14, 3, 3, "S");
      pdf.setFillColor(200, 151, 62);
      pdf.circle(9, 11, 0.8, "F");
      pdf.circle(w - 9, 11, 0.8, "F");
      pdf.circle(9, h - 11, 0.8, "F");
      pdf.circle(w - 9, h - 11, 0.8, "F");
      pdf.addImage(logoImg, "PNG", cx - 14, 14, 28, 28);
      pdf.setDrawColor(200, 151, 62);
      pdf.setLineWidth(0.3);
      pdf.line(25, 48, cx - 4, 48);
      pdf.line(cx + 4, 48, w - 25, 48);
      pdf.setFillColor(200, 151, 62);
      pdf.triangle(cx, 46, cx - 2, 48, cx, 50, "F");
      pdf.triangle(cx, 46, cx + 2, 48, cx, 50, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(200, 151, 62);
      pdf.text("TIKET RESERVASI", cx, 57, { align: "center" });
      pdf.setDrawColor(200, 151, 62);
      pdf.setLineWidth(0.3);
      pdf.line(20, 60, w - 20, 60);
      pdf.setFillColor(253, 246, 236);
      pdf.roundedRect(12, 65, w - 24, 78, 3, 3, "F");
      pdf.setDrawColor(220, 195, 150);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(12, 65, w - 24, 78, 3, 3, "S");

      let y = 76;
      const lx = 18, vx = w - 18;
      const rh = 10;

      function infoRow(lbl: string, val: string, gold?: boolean) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(160, 140, 115);
        pdf.text(lbl, lx, y);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        if (gold) {
          pdf.setTextColor(200, 151, 62);
        } else {
          pdf.setTextColor(72, 51, 26);
        }
        pdf.text(val, vx, y, { align: "right" });
        pdf.setDrawColor(230, 220, 200);
        pdf.setLineWidth(0.1);
        pdf.line(lx, y + 3, vx, y + 3);
        y += rh;
      }

      infoRow("NAMA TAMU", namaTamu);
      infoRow("OUTLET", outlet.charAt(0).toUpperCase() + outlet.slice(1));
      infoRow("TANGGAL", tanggal);
      infoRow("JAM", `${jam} - ${jamSelesai}`);
      infoRow("JUMLAH TAMU", `${jumlahTamu} orang`);
      infoRow("MEJA", `No. ${selectedTable?.nomor_meja} - ${getPosisiLabel(selectedTable?.posisi || "")}`, true);

      if (selectedTable?.dp_minimum) {
        pdf.setDrawColor(200, 151, 62);
        pdf.setLineWidth(0.15);
        pdf.line(lx, y - 4, vx, y - 4);
        infoRow("DOWN PAYMENT", formatRupiah(selectedTable.dp_minimum), true);
      }

      const tearY = 150;
      pdf.setFillColor(255, 252, 245);
      pdf.circle(5, tearY, 4, "F");
      pdf.circle(w - 5, tearY, 4, "F");
      pdf.setDrawColor(200, 151, 62);
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.setLineWidth(0.2);
      pdf.line(10, tearY, w - 10, tearY);
      pdf.setLineDashPattern([], 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(200, 151, 62);
      pdf.text("MEJA", cx, 159, { align: "center" });
      pdf.setFontSize(36);
      pdf.setTextColor(200, 151, 62);
      pdf.text(`${selectedTable?.nomor_meja || "-"}`, cx, 174, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(160, 140, 115);
      pdf.text(`${outlet.charAt(0).toUpperCase() + outlet.slice(1)} - ${tanggal} - ${jam}`, cx, 181, { align: "center" });

      const barcodeY = 186;
      const barH = 10;
      const pattern = [1.2, 0.6, 1.2, 0.6, 1.8, 0.6, 1.2, 0.6, 0.6, 1.8, 1.2, 0.6, 1.2, 0.6, 1.8, 0.6, 0.6, 1.2, 1.8, 0.6, 1.2, 0.6, 1.2, 0.6, 1.8, 0.6, 1.2, 0.6, 0.6, 1.8, 1.2, 0.6, 1.2, 0.6, 1.8, 0.6, 0.6, 1.2, 1.8, 0.6];
      const totalBars = pattern.length;
      const barGap = 0.8;
      const totalW = pattern.reduce((a, b) => a + b, 0) + (totalBars - 1) * barGap;
      let bx = cx - totalW / 2;
      pdf.setFillColor(200, 151, 62);
      for (let i = 0; i < totalBars; i++) {
        pdf.rect(bx, barcodeY, pattern[i], barH, "F");
        bx += pattern[i] + barGap;
      }

      const barcodeNum = `YSL-${outlet.toUpperCase().slice(0, 3)}-${tanggal.replace(/-/g, "")}-M${selectedTable?.nomor_meja || "0"}`;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5);
      pdf.setTextColor(160, 140, 115);
      pdf.text(barcodeNum, cx, 200, { align: "center" });
      pdf.setFontSize(4.5);
      pdf.setTextColor(180, 165, 140);
      pdf.text("Tunjukkan tiket ini kepada staff saat tiba di outlet", cx, 207, { align: "center" });
      pdf.text("Reservasi berlaku selama 2 jam", cx, 211, { align: "center" });

      pdf.save(`Tiket-Reservasi-Yassalam-${tanggal}.pdf`);
    }
    return (
      <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white border border-[#C8973E]/20 rounded-3xl p-10 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C8973E]/20 via-[#C8973E] to-[#C8973E]/20" />
            <div className="w-20 h-20 bg-gradient-to-br from-[#C8973E] to-[#A67B2E] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#C8973E]/20">
              <span className="text-white text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-[#5C3D1A] font-serif mt-5">Reservasi Berhasil</h1>
            <p className="text-[#C8973E]/50 mt-1 text-sm">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 text-sm">Terima kasih telah memilih Yassalam. Simpan tiket Anda sebagai bukti reservasi.</p>
            <div className="bg-[#FDF6EC] border border-[#C8973E]/15 rounded-2xl p-5 mt-6 text-left text-sm space-y-2">
              <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">No. {selectedTable?.nomor_meja} · {getPosisiLabel(selectedTable?.posisi || "")}</span></div>
              {selectedTable?.dp_minimum ? (
                <div className="flex justify-between border-t border-[#C8973E]/15 pt-2"><span className="text-[#8B7355]">DP</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedTable.dp_minimum)}</span></div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <button onClick={downloadTiket} className="w-full bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20 flex items-center justify-center gap-2">
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
  // ==================== FORM RESERVASI ====================
  if (showForm) {
    return (
      <div className="min-h-screen bg-white animate-fadeInUp" style={{ animationDuration: "0.6s" }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f07] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <button onClick={backToHome} className="flex items-center gap-2 text-sm font-bold text-[#C8973E] bg-[#1a0f07]/60 hover:bg-[#1a0f07] border border-[#C8973E]/40 hover:border-[#C8973E] rounded-full px-4 py-2.5 sm:px-3 sm:py-1.5 transition-all active:scale-[0.97]">
              <span aria-hidden className="text-base">←</span> <span>Beranda</span>
            </button>
            <div className="flex items-center gap-2.5">
              <Image src="/logo.PNG" alt="Yassalam" width={30} height={30} />
              <span className="text-sm font-bold text-white tracking-[0.15em]">YASSALAM</span>
            </div>
            <span className="text-xs font-bold text-[#C8973E] tracking-[0.15em] uppercase">Reservasi Meja</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          {/* Kapasitas Warning Modal */}
          {kapasitasWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setKapasitasWarning(false)}>
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 bg-[#FDF6EC] rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-[#5C3D1A] font-serif mt-4">Kapasitas Meja Tidak Cukup</h3>
                <p className="text-sm text-[#8B7355] mt-3 leading-relaxed">
                  Jumlah tamu (<span className="font-bold text-[#C8973E]">{jumlahTamu} orang</span>) melebihi kapasitas <span className="font-bold text-[#C8973E]">{selectedTable?.nama_meja || `Meja ${selectedTable?.nomor_meja}`}</span> (maks <span className="font-bold text-[#C8973E]">{selectedTable?.kapasitas} orang</span>).
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button onClick={() => {
                    setKapasitasWarning(false);
                    backToHome();
                    setTimeout(() => {
                      document.getElementById("pilihan-area")?.scrollIntoView({ behavior: "smooth" });
                    }, 300);
                  }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/20">
                    Pilih Meja Lain
                  </button>
                  <button onClick={() => setKapasitasWarning(false)} className="w-full py-3 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">
                    Ubah Jumlah Tamu
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pilih Waktu</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Tentukan waktu kunjungan Anda</p>
                  </div>
                  <div className="bg-[#FDF6EC] border border-[#C8973E]/20 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#8B7355]">Outlet</p>
                      <p className="font-bold text-[#5C3D1A] capitalize">{outlet}</p>
                    </div>
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
                    Lanjut ke Pembayaran DP →
                  </button>
                </div>
              )}

              

              {/* STEP 2 — DP */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Pembayaran DP</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Selesaikan pembayaran DP untuk mengkonfirmasi meja Anda</p>
                  </div>

                  {/* Countdown timer */}
                  {countdown && (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${countdown === "00:00" ? "border-red-300 bg-red-50" : "border-[#C8973E]/30 bg-[#FDF6EC]"}`}>
                      <div className="w-10 h-10 rounded-full bg-[#C8973E] flex items-center justify-center shrink-0">
                        <span className="text-white text-lg">⏱</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#8B7355]">Meja di-hold selama</p>
                        <p className={`text-2xl font-bold font-mono ${countdown === "00:00" ? "text-red-500" : "text-[#C8973E]"}`}>{countdown}</p>
                      </div>
                    </div>
                  )}

                  {/* Info meja & DP */}
                  <div className="border-2 border-[#C8973E]/15 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3">
                      <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Detail Pembayaran</h3>
                    </div>
                    <div className="p-5 space-y-3 text-sm bg-[#FEFCF8]">
                      <div className="flex justify-between">
                        <span className="text-[#8B7355]">Meja</span>
                        <span className="font-semibold text-[#C8973E]">{selectedTable?.nama_meja || `Meja ${selectedTable?.nomor_meja}`} · {getPosisiLabel(selectedTable?.posisi || "")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8B7355]">Kapasitas</span>
                        <span className="font-semibold text-[#5C3D1A]">{selectedTable?.kapasitas} orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8B7355]">Tanggal</span>
                        <span className="font-semibold text-[#5C3D1A]">{tanggal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8B7355]">Jam</span>
                        <span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span>
                      </div>
                      <div className="border-t border-[#E8DCC8] pt-3 flex justify-between items-center">
                        <span className="text-[#8B7355] font-semibold">DP Minimum</span>
                        <span className="text-xl font-bold text-[#C8973E]">{formatRupiah(selectedTable?.dp_minimum || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Placeholder pembayaran BCA */}
                  <div className="bg-[#FDF6EC] border-2 border-dashed border-[#C8973E]/30 rounded-2xl p-6 text-center">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <span className="text-2xl">🏦</span>
                    </div>
                    <p className="font-bold text-[#5C3D1A] mt-4">Integrasi BCA API</p>
                    <p className="text-sm text-[#8B7355] mt-2">Fitur pembayaran otomatis via BCA akan segera tersedia.</p>
                    <p className="text-xs text-[#B8A88A] mt-3">Saat ini, lanjutkan ke tahap berikutnya dan selesaikan pembayaran DP di outlet.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { releaseHold(); setStep(1); }} className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">← Kembali</button>
                    <button onClick={() => { setErrors([]); setStep(3); }} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#C8973E]/25">Lanjut Konfirmasi →</button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Konfirmasi & Booking (meja langsung terkunci setelah ini) */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Konfirmasi Reservasi</h2>
                    <p className="text-[#8B7355] text-sm mt-1">Periksa kembali data Anda. Setelah konfirmasi, meja akan langsung terbooking.</p>
                  </div>
                  <div><label className={labelClass}>Catatan <span className="text-[#B8A88A] normal-case tracking-normal font-normal">(opsional)</span></label><textarea placeholder="Contoh: kursi bayi, alergi, dll." rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass + " resize-none"} /></div>

                  <div className="border-2 border-[#C8973E]/15 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-5 py-3">
                      <h3 className="text-sm font-bold text-white tracking-[0.15em] uppercase">Ringkasan Booking</h3>
                    </div>
                    <div className="p-5 space-y-2 text-sm bg-[#FEFCF8]">
                      <div className="flex justify-between"><span className="text-[#8B7355]">Outlet</span><span className="font-semibold text-[#5C3D1A] capitalize">{outlet}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Tanggal</span><span className="font-semibold text-[#5C3D1A]">{tanggal}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Jam</span><span className="font-semibold text-[#5C3D1A]">{jam} - {jamSelesai}</span></div>
                      <div className="flex justify-between"><span className="text-[#8B7355]">Tamu</span><span className="font-semibold text-[#5C3D1A]">{jumlahTamu} orang</span></div>
                      <div className="border-t border-[#E8DCC8] pt-2 flex justify-between"><span className="text-[#8B7355]">Meja</span><span className="font-semibold text-[#C8973E]">No. {selectedTable?.nomor_meja} · {getPosisiLabel(selectedTable?.posisi || "")}</span></div>
                      {selectedTable?.dp_minimum ? (
                        <div className="border-t border-[#E8DCC8] pt-2 flex justify-between"><span className="text-[#8B7355]">DP</span><span className="font-bold text-[#C8973E]">{formatRupiah(selectedTable.dp_minimum)}</span></div>
                      ) : null}
                    </div>
                  </div>

                  <div className="bg-[#FDF6EC] border border-[#C8973E]/20 rounded-2xl p-4">
                    <p className="text-sm text-[#8B7355] leading-relaxed">
                      <span className="font-bold text-[#C8973E]">⚡ Penting:</span> Setelah konfirmasi, meja <span className="font-semibold text-[#5C3D1A]">{selectedTable?.nama_meja || `No. ${selectedTable?.nomor_meja}`}</span> akan langsung terbooking untuk Anda pada tanggal dan jam tersebut. Customer lain tidak bisa memilih meja ini di waktu yang sama.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl border-2 border-[#E8DCC8] text-[#8B7355] font-semibold hover:bg-[#FDF6EC] transition-all">← Kembali</button>

                    <button onClick={handleConfirmBooking} disabled={loading}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${loading ? "bg-[#E8DCC8] text-[#B8A88A] cursor-not-allowed" : "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white active:scale-[0.98] shadow-lg shadow-[#C8973E]/25"}`}>
                      {loading ? "Memproses..." : "Konfirmasi Booking ✦"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — Pilih Menu (opsional, reservasi sudah tersimpan) */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#C8973E] to-[#A67B2E] rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-lg">✓</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#5C3D1A] font-serif">Meja Berhasil Dibooking!</h2>
                        <p className="text-[#8B7355] text-sm">Ingin pre-order menu sekarang? (opsional)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FDF6EC] border border-[#C8973E]/20 rounded-2xl p-4 text-sm text-[#8B7355]">
                    Reservasi Anda sudah dikonfirmasi. Anda bisa pilih menu sekarang atau langsung pesan di outlet nanti.
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
                  <button onClick={handleSaveMenu} disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${loading ? "bg-[#E8DCC8] text-[#B8A88A] cursor-not-allowed" : "bg-gradient-to-r from-[#C8973E] to-[#A67B2E] text-white active:scale-[0.98] shadow-lg shadow-[#C8973E]/25"}`}>
                    {loading ? "Menyimpan..." : selectedMenu ? "Simpan Menu & Selesai ✦" : "Lewati & Selesai ✦"}
                  </button>
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
                {selectedTable?.dp_minimum ? (
                  <div className="pt-3 border-t border-[#EFE6D6] flex justify-between">
                    <span className="text-[#8B7355]">DP</span>
                    <span className="font-bold text-[#C8973E]">{formatRupiah(selectedTable.dp_minimum)}</span>
                  </div>
                ) : null}
                {countdown && (
                  <div className="pt-3 border-t border-[#EFE6D6] flex justify-between items-center">
                    <span className="text-[#8B7355]">Hold</span>
                    <span className="font-bold text-[#C8973E] font-mono">{countdown}</span>
                  </div>
                )}

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

        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10L50 25H30L40 10ZM40 70L30 55H50L40 70ZM10 40L25 30V50L10 40ZM70 40L55 50V30L70 40Z' fill='%23C8973E'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='%23C8973E' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: "80px 80px" }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8973E] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07]/80 via-transparent to-[#1a0f07]/30" />

        <button
          onClick={() => setShowWelcome(true)}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 text-sm font-bold text-[#C8973E] bg-[#1a0f07] hover:bg-[#241608] border border-[#C8973E]/50 hover:border-[#C8973E] rounded-full px-5 py-3 sm:px-4 sm:py-2 transition-colors active:scale-[0.97] shadow-lg"
        >
          <span aria-hidden className="text-lg">←</span> <span>Beranda</span>
        </button>

        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex ? "w-6 bg-[#C8973E]" : "w-1.5 bg-[#C8973E]/30"}`} />
          ))}
        </div>

        <div className="relative text-center px-6 max-w-2xl z-10">
          <Image src="/logo.PNG" alt="Yassalam" width={150} height={150} className="mx-auto drop-shadow-2xl animate-fadeInUp" />
          <p className="text-[#C8973E]/40 mt-5 text-sm tracking-[0.5em] animate-fadeInUp" style={{ animationDelay: "0.2s" }}>━━━ ✦ ━━━</p>
          <p className="italic text-[#C8973E] mt-5 text-3xl font-serif animate-fadeInUp" style={{ animationDelay: "0.3s" }}>Selamat Datang di Yassalam</p>
          <p className="text-gray-400 mt-4 max-w-md mx-auto text-sm leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Nikmati cita rasa autentik Timur Tengah dalam suasana yang elegan. Reservasi meja Anda sekarang untuk pengalaman tak terlupakan.
          </p>

          <button onClick={() => document.getElementById("pilihan-area")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-9 bg-gradient-to-r from-[#C8973E] to-[#A67B2E] hover:from-[#D4A44A] hover:to-[#B8892E] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#C8973E]/20 tracking-wide animate-fadeInUp"
            style={{ animationDelay: "0.5s" }}>
            Reservasi Sekarang
          </button>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 border-2 border-[#C8973E]/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#C8973E]/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* ===== SECTION: AREA KAMI ===== */}
      <div id="pilihan-area" className="py-10 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[#C8973E] text-sm tracking-[0.3em] uppercase font-semibold">Pilihan Area</p>
            <h2 className="text-3xl font-bold text-[#5C3D1A] font-serif mt-2">Temukan Tempat Favorit Anda</h2>
            <p className="text-[#C8973E]/40 mt-2">━━ ✦ ━━</p>
            <p className="text-[#8B7355] mt-3 max-w-lg mx-auto text-sm">Pilih tanggal dan jam dulu untuk melihat ketersediaan meja secara real-time</p>
          </div>

          {/* ===== DATE/TIME PICKER untuk cek ketersediaan ===== */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="bg-white border-2 border-[#C8973E]/20 rounded-2xl p-5 sm:p-6 shadow-md">
              <p className="text-xs font-bold text-[#C8973E] mb-4 tracking-[0.15em] uppercase text-center">Cek Ketersediaan Meja</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8B7355] mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    min={today}
                    value={previewTanggal}
                    onChange={(e) => setPreviewTanggal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B7355] mb-1.5">Jam Mulai</label>
                  <div className="flex gap-2">
                    <select
                      value={previewJam.split(":")[0] || ""}
                      onChange={(e) => setPreviewJam(`${e.target.value}:${previewJam.split(":")[1] || "00"}`)}
                      className="flex-1 px-3 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] transition-all text-sm"
                    >
                      <option value="">Jam</option>
                      {Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => (
                        <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <select
                      value={previewJam.split(":")[1] || ""}
                      onChange={(e) => setPreviewJam(`${previewJam.split(":")[0] || "07"}:${e.target.value}`)}
                      className="flex-1 px-3 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] transition-all text-sm"
                    >
                      <option value="">Mnt</option>
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B7355] mb-1.5">Jumlah Tamu</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    placeholder="Berapa orang?"
                    value={previewTamu}
                    onChange={(e) => setPreviewTamu(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E8DCC8] focus:border-[#C8973E] bg-[#FEFCF8] outline-none text-[#5C3D1A] placeholder-[#C8B89A] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B7355] mb-1.5">Jam Selesai</label>
                  <div className="flex items-center h-[50px] px-4 rounded-xl border-2 border-[#E8DCC8] bg-[#F5F0E6] text-sm">
                    {previewJamSelesai ? (
                      <span className="text-[#5C3D1A] font-semibold">{previewJamSelesai} <span className="text-[#B8A88A] font-normal">(2 jam)</span></span>
                    ) : (
                      <span className="text-[#C8B89A]">Otomatis</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status info */}
              {previewTanggal && previewJam && (
                <div className="mt-4 pt-4 border-t border-[#E8DCC8]">
                  {loadingSlots ? (
                    <p className="text-sm text-[#B8A88A] text-center">Memuat ketersediaan...</p>
                  ) : (() => {
                    const pTamu = Number(previewTamu) || 0;
                    const timeAvail = tables.filter((t) => getTableAvailability(t.Id, previewJam, previewJamSelesai, daySlots).status === "available");
                    const fullyAvail = pTamu > 0 ? timeAvail.filter((t) => t.kapasitas >= pTamu).length : timeAvail.length;
                    const tooSmall = pTamu > 0 ? timeAvail.filter((t) => t.kapasitas < pTamu).length : 0;
                    const booked = tables.filter((t) => getTableAvailability(t.Id, previewJam, previewJamSelesai, daySlots).status === "booked").length;
                    const held = tables.filter((t) => getTableAvailability(t.Id, previewJam, previewJamSelesai, daySlots).status === "on-hold").length;
                    return (
                      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-[#5C3D1A] font-semibold">{fullyAvail}</span>
                          <span className="text-[#8B7355]">Tersedia</span>
                        </span>
                        {tooSmall > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-orange-300" />
                            <span className="text-[#5C3D1A] font-semibold">{tooSmall}</span>
                            <span className="text-[#8B7355]">Kapasitas kurang</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-400" />
                          <span className="text-[#5C3D1A] font-semibold">{booked}</span>
                          <span className="text-[#8B7355]">Terisi</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-amber-400" />
                          <span className="text-[#5C3D1A] font-semibold">{held}</span>
                          <span className="text-[#8B7355]">Di-hold</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {!previewTanggal && !previewJam && (
                <p className="text-xs text-[#B8A88A] text-center mt-3 leading-relaxed">
                  Anda tetap bisa melihat area tanpa memilih tanggal, tapi status ketersediaan meja tidak akan ditampilkan.
                </p>
              )}
            </div>
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

                      {/* Availability mini-summary per area */}
                      {previewJam && previewJamSelesai && (
                        (() => {
                          const pTamu = Number(previewTamu) || 0;
                          const timeAvail = areaTables.filter((t) => getTableAvailability(t.Id, previewJam, previewJamSelesai, daySlots).status === "available");
                          const avail = pTamu > 0 ? timeAvail.filter((t) => t.kapasitas >= pTamu).length : timeAvail.length;
                          const total = areaTables.length;
                          return (
                            <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${avail > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              <span className={`w-2 h-2 rounded-full ${avail > 0 ? "bg-emerald-500" : "bg-red-400"}`} />
                              {avail > 0
                                ? `${avail} dari ${total} meja tersedia${pTamu > 0 ? ` (≥${pTamu} orang)` : ""}`
                                : pTamu > 0 ? "Tidak ada meja yang cukup" : "Semua meja terisi pada jam ini"}
                            </div>
                          );
                        })()
                      )}

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
      <div className="pt-4 pb-10 md:py-20 px-4 bg-[#FDF6EC]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="order-2 md:order-1">
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
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">8+</p>
                <p className="text-xs text-[#8B7355] leading-tight">Tahun<br/>Pengalaman</p>
              </div>
              <div className="h-10 w-px bg-[#C8973E]/20" />
              <div className="flex items-center gap-3">
                <p className="text-4xl font-bold text-[#C8973E] font-serif leading-none">100%</p>
                <p className="text-xs text-[#8B7355] leading-tight">Resep<br/>Autentik</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden order-1 md:order-2 bg-[#FDF6EC]">
            <MenuFlipbook />
          </div>
        </div>
      </div>

      {/* ===== SECTION: JAM OPERASIONAL & OUTLET ===== */}
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
                      <button onClick={() => { setOutlet(o.outletValue); document.getElementById("pilihan-area")?.scrollIntoView({ behavior: "smooth" }); }}
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
              // Pre-fill tanggal & jam dari preview ke form reservasi
              if (previewTanggal) setTanggal(previewTanggal);
              if (previewJam) setJam(previewJam);
              if (previewTamu) setJumlahTamu(previewTamu);
              setSelectedAreaModal(null);
              startReservation();
            }}
            previewJam={previewJam}
            previewJamSelesai={previewJamSelesai}
            daySlots={daySlots}
            previewTamu={Number(previewTamu) || 0}
          />
        );
      })()}
    </div>
  );
}