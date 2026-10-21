import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function HeaderHub() {
  const { profile, logout } = useAuth();
  const inisial = profile?.nama?.trim()?.charAt(0)?.toUpperCase() ?? "?";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bisu, setBisu] = useState(true);

  function toggleSuara() {
    const v = videoRef.current;
    if (!v) return;
    const bisuBaru = !v.muted;
    v.muted = bisuBaru;
    setBisu(bisuBaru);
    if (!bisuBaru) void v.play();
  }

  return (
    <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[2rem] bg-brand-masuk text-white shadow-md">
      <video
        ref={videoRef}
        src="/video_banner1.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-masuk/55 via-brand-masuk/35 to-brand-masuk-dark/70" />

      <div className="relative px-5 pb-7 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-disparyk.png" alt="Logo DisparYK" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight">DisparYK</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSuara}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800"
              aria-label={bisu ? "Nyalakan suara video" : "Matikan suara video"}
              title={bisu ? "Nyalakan suara" : "Matikan suara"}
            >
              {bisu ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
            <button
              onClick={() => void logout()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800"
              aria-label="Keluar"
              title="Keluar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <Link
            to="/profil"
            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-bold text-brand-masuk shadow"
            aria-label="Profil saya"
          >
            {profile?.foto_url ? (
              <img src={profile.foto_url} alt="" className="h-full w-full object-cover" />
            ) : (
              inisial
            )}
            <span className="absolute bottom-0 flex w-full items-center justify-center bg-black/40 py-0.5 text-[9px] text-white">
              Profil
            </span>
          </Link>
          <p className="mt-1 font-semibold">{profile?.nama}</p>
          <p className="text-xs text-white/80">Dinas Pariwisata Kota Yogyakarta</p>
          <span className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-masuk-dark">
            {profile?.role === "admin" ? "Admin" : "Pegawai"}
          </span>
        </div>
      </div>
    </div>
  );
}
