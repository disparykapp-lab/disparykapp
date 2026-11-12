import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import RekapSaya from "./rekap/RekapSaya";
import RekapTim from "./rekap/RekapTim";

/** Pegawai: kalender kehadiran pribadi. Admin: rekap tim, dan bisa beralih ke rekap dirinya sendiri. */
export default function Rekap() {
  const { profile } = useAuth();
  const [lihatSaya, setLihatSaya] = useState(false);
  if (profile?.role !== "admin") return <RekapSaya />;
  const tombol = (teks: string, ke: boolean) => (
    <button
      type="button"
      onClick={() => setLihatSaya(ke)}
      className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-brand-masuk-dark shadow-sm transition active:scale-95"
    >
      {teks}
    </button>
  );
  return lihatSaya ? <RekapSaya aksi={tombol("Rekap tim", false)} /> : <RekapTim aksi={tombol("Rekap saya", true)} />;
}
