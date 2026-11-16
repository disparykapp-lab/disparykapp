import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sedangModeDaftar, useAuth } from "../contexts/AuthContext";
import { ambilTujuanGoogle, arahSetelahGoogle, hapusTujuanGoogle } from "../lib/alurGoogle";
import { drafPratinjau } from "../landing/drafPratinjau";

/**
 * Setelah kembali dari Google (Supabase selalu mendaratkan di `/`), bawa pengguna
 * ke halaman yang tepat: formulir /daftar, /beranda, atau /login dengan pesan
 * penolakan. Tidak menggambar apa pun.
 */
export default function PengarahGoogle() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (drafPratinjau() !== null) return;
    const arah = arahSetelahGoogle(
      ambilTujuanGoogle(),
      { loading, adaSesi: !!session, adaProfil: !!profile, modeDaftar: sedangModeDaftar() },
      pathname
    );
    if (arah.selesai) hapusTujuanGoogle();
    if (arah.ke) navigate(arah.ke, { replace: true });
  }, [loading, session, profile, pathname, navigate]);

  return null;
}
