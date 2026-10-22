import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import Loading from "../../components/Loading";
import "./game.css";
import { ASET } from "./assets";
import { gabungRoom } from "./api";
import { useMusikLatar } from "./musik";
import AturRoom from "./komponen/AturRoom";
import HalamanRoom from "./komponen/HalamanRoom";
import Lobi from "./komponen/Lobi";

/** Game "Coret Tebak" — dimuat lazy dari App.tsx supaya bundel absensi tidak membesar. */
export default function GamePage() {
  useMusikLatar(ASET.musik);
  return (
    <div className="coret-tebak ct-latar -mx-4 -mt-4 min-h-screen px-4 pb-10 pt-4">
      <Routes>
        <Route index element={<Lobi />} />
        <Route path="baru" element={<AturRoom />} />
        <Route path="gabung/:kode" element={<GabungLewatLink />} />
        <Route path="main/:roomId" element={<HalamanRoom />} />
        <Route path="*" element={<Navigate to="/game" replace />} />
      </Routes>
    </div>
  );
}

/** /game/gabung/KODE — dari link yang dibagikan: langsung gabung lalu masuk room. */
function GabungLewatLink() {
  const { kode = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    gabungRoom(kode)
      .then((id) => {
        if (!batal) navigate(`/game/main/${id}`, { replace: true });
      })
      .catch((e) => {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal bergabung.");
      });
    return () => {
      batal = true;
    };
  }, [kode, navigate]);

  if (!error) return <Loading teks="Bergabung ke room..." />;
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <img src={ASET.wajah.kalah} alt="" className="h-32 w-auto" />
      <p className="font-semibold">{error}</p>
      <button type="button" onClick={() => navigate("/game", { replace: true })} className="ct-tombol">
        Ke Lobi
      </button>
    </div>
  );
}
