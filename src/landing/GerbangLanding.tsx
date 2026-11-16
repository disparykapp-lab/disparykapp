import { lazy, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ambilStatusLanding } from "../lib/landing";
import { ambilTujuanGoogle } from "../lib/alurGoogle";
import Loading from "../components/Loading";
import { drafPratinjau } from "./drafPratinjau";

const LandingPage = lazy(() => import("./LandingPage"));
const HalamanDestinasi = lazy(() => import("./HalamanDestinasi"));
const HalamanSemuaDestinasi = lazy(() => import("./HalamanSemuaDestinasi"));
const HalamanBerita = lazy(() => import("./HalamanBerita"));
const HalamanAgenda = lazy(() => import("./HalamanAgenda"));

/**
 * Pintu masuk halaman publik (`/`, `/destinasi`, `/destinasi/:id`, `/berita/:id`,
 * `/agenda/:id`): kalau landing dimatikan admin, langsung diarahkan ke login.
 * Selama status belum diketahui, layar kosong putih (tidak sempat menampilkan landing).
 */
export default function GerbangLanding({
  halaman = "landing",
}: {
  halaman?: "landing" | "destinasi" | "semua-destinasi" | "berita" | "agenda";
}) {
  // Di pratinjau admin landing selalu tampil, walau sedang dimatikan untuk pengunjung.
  const [aktif, setAktif] = useState<boolean | null>(() => (drafPratinjau() ? true : null));

  useEffect(() => {
    if (drafPratinjau()) return;
    let batal = false;
    ambilStatusLanding().then((v) => {
      if (!batal) setAktif(v);
    });
    return () => {
      batal = true;
    };
  }, []);

  // Baru kembali dari login Google (selalu mendarat di `/`): PengarahGoogle akan
  // memindahkan ke /daftar, /login, atau /beranda — jangan sempat menampilkan landing.
  if (halaman === "landing" && !drafPratinjau() && ambilTujuanGoogle()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loading teks="Menyambungkan akun Google…" />
      </div>
    );
  }
  if (aktif === null) return <div className="min-h-screen bg-white" />;
  if (!aktif) return <Navigate to="/login" replace />;
  if (halaman === "destinasi") return <HalamanDestinasi />;
  if (halaman === "semua-destinasi") return <HalamanSemuaDestinasi />;
  if (halaman === "berita") return <HalamanBerita />;
  if (halaman === "agenda") return <HalamanAgenda />;
  return <LandingPage />;
}
