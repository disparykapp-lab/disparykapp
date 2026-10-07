import { lazy, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ambilStatusLanding } from "../lib/landing";

const LandingPage = lazy(() => import("./LandingPage"));

/**
 * Pintu masuk `/`: kalau landing dimatikan admin, langsung diarahkan ke login.
 * Selama status belum diketahui, layar kosong putih (tidak sempat menampilkan landing).
 */
export default function GerbangLanding() {
  const [aktif, setAktif] = useState<boolean | null>(null);

  useEffect(() => {
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
  return <LandingPage />;
}
