import { lazy, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ambilStatusLanding } from "../lib/landing";
import { drafPratinjau } from "./drafPratinjau";

const LandingPage = lazy(() => import("./LandingPage"));
const HalamanDestinasi = lazy(() => import("./HalamanDestinasi"));

/**
 * Pintu masuk halaman publik (`/` dan `/destinasi/:id`): kalau landing dimatikan
 * admin, langsung diarahkan ke login. Selama status belum diketahui, layar kosong
 * putih (tidak sempat menampilkan landing).
 */
export default function GerbangLanding({ halaman = "landing" }: { halaman?: "landing" | "destinasi" }) {
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

  if (aktif === null) return <div className="min-h-screen bg-white" />;
  if (!aktif) return <Navigate to="/login" replace />;
  return halaman === "destinasi" ? <HalamanDestinasi /> : <LandingPage />;
}
