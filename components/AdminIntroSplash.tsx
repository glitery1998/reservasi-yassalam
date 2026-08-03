"use client";
import { useState, useEffect, useRef } from "react";

export default function AdminIntroSplash({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Cek apakah dashboard ini dibuka sebagai aplikasi yang sudah di-install (PWA standalone),
    // bukan lewat tab browser biasa. Video intro cuma tampil kalau statusnya "app ter-install".
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (isStandalone) setShowSplash(true);
  }, []);

  function handleTimeUpdate() {
    // Tombol "Lewati" muncul setelah 1.5 detik, biar admin gak kelamaan nunggu tiap buka app
    if (videoRef.current && videoRef.current.currentTime > 1.5) setShowSkip(true);
  }

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  }

  return (
    <>
      {children}
      {showSplash && (
        <div className="fixed inset-0 z-[200] bg-[#3D0D14] overflow-hidden">
          <video
            ref={videoRef}
            src="/admin-intro.mp4"
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setShowSplash(false)}
            onError={() => setShowSplash(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            onClick={toggleMute}
            className="absolute bottom-8 left-8 w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-all"
            aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            )}
          </button>
          {showSkip && (
            <button
              onClick={() => setShowSplash(false)}
              className="absolute bottom-8 right-8 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-semibold active:scale-95 transition-all"
            >
              Lewati →
            </button>
          )}
        </div>
      )}
    </>
  );
}