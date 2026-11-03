import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gabungRoom } from "../api";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import { TombolSuara } from "../komponen/bersama";
import { avatarTersimpan } from "../preferensi";

/** /siapa-penyusup/gabung/KODE — dari link undangan: langsung gabung lalu masuk room. */
export default function GabungLewatLink() {
  const { kode = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    gabungRoom(kode, avatarTersimpan())
      .then((id) => {
        if (!batal) navigate(`/siapa-penyusup/main/${id}`, { replace: true });
      })
      .catch((e) => {
        if (batal) return;
        sfx("sfx_error");
        setError(e instanceof Error ? e.message : "Gagal bergabung.");
      });
    return () => {
      batal = true;
    };
  }, [kode, navigate]);

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <span />
        <TombolSuara />
      </div>
      <div className="sp-spacer" />
      <div className="sp-panel sp-anim-pop-in sp-stack sp-center">
        <h1 className="sp-panel__title" style={{ justifyContent: "center", margin: 0 }}>
          {error ? "Tidak bisa bergabung" : `Bergabung ke room ${kode.toUpperCase()}…`}
        </h1>
        {error && (
          <>
            <p className="sp-muted">{error}</p>
            <button type="button" className="sp-btn sp-btn--block" onClick={() => navigate("/siapa-penyusup", { replace: true })}>
              Ke Menu
            </button>
          </>
        )}
      </div>
      <div className="sp-spacer" />
    </Layar>
  );
}
