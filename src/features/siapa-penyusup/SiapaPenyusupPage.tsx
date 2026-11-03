import { Navigate, Route, Routes } from "react-router-dom";
import "./assets/css/tokens.css";
import "./assets/css/komponen.css";
import "./assets/css/animasi.css";
import "./tambahan.css";
import { useAudioGame } from "./audio";
import { ToastProvider } from "./komponen/Toast";
import BuatRoom from "./layar/BuatRoom";
import CaraMain from "./layar/CaraMain";
import GabungLewatLink from "./layar/GabungLewatLink";
import GabungRoom from "./layar/GabungRoom";
import HalamanRoom from "./layar/HalamanRoom";
import Menu from "./layar/Menu";
import PapanSkor from "./layar/PapanSkor";

/**
 * Game "Siapa Penyusup?" — dimuat lazy dari App.tsx, layar penuh di luar AppLayout.
 * Semua UI (termasuk toast, modal, confetti) harus di dalam .sp-root karena token
 * CSS paket dipasang di sana.
 */
export default function SiapaPenyusupPage() {
  useAudioGame();
  return (
    <div className="sp-root">
      <ToastProvider>
        <Routes>
          <Route index element={<Menu />} />
          <Route path="cara-main" element={<CaraMain />} />
          <Route path="buat" element={<BuatRoom />} />
          <Route path="papan-skor" element={<PapanSkor />} />
          <Route path="gabung" element={<GabungRoom />} />
          <Route path="gabung/:kode" element={<GabungLewatLink />} />
          <Route path="main/:roomId" element={<HalamanRoom />} />
          <Route path="*" element={<Navigate to="/siapa-penyusup" replace />} />
        </Routes>
      </ToastProvider>
    </div>
  );
}
