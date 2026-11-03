import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ikon, ui } from "../aset";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import { TombolSuara } from "../komponen/bersama";

const urut = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Menu() {
  const navigate = useNavigate();

  function ke(path: string) {
    sfx("sfx_klik");
    navigate(path);
  }

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <button type="button" className="sp-icon-btn" onClick={() => ke("/beranda")} aria-label="Kembali ke aplikasi absensi">
          <img src={ikon("absensi")} alt="" />
        </button>
        <TombolSuara />
      </div>
      <img className="sp-logo sp-anim-pop-in" src={ui("logo_siapa_penyusup")} alt="Siapa Penyusup?" />
      <p className="sp-hint">Tebak kata, temukan penyusupnya!</p>
      <div className="sp-spacer" />
      <div className="sp-stack sp-anim-stagger">
        <button type="button" className="sp-btn sp-btn--block" style={urut(0)} onClick={() => ke("/siapa-penyusup/buat")}>
          <img src={ikon("buat_room")} alt="" />
          Buat Room
        </button>
        <button type="button" className="sp-btn sp-btn--teal sp-btn--block" style={urut(1)} onClick={() => ke("/siapa-penyusup/gabung")}>
          <img src={ikon("gabung_room")} alt="" />
          Gabung Room
        </button>
        <div className="sp-row" style={urut(2)}>
          <button type="button" className="sp-btn sp-btn--light sp-btn--sm" onClick={() => ke("/siapa-penyusup/cara-main")}>
            <img src={ikon("bantuan")} alt="" />
            Cara Main
          </button>
          <button type="button" className="sp-btn sp-btn--light sp-btn--sm" onClick={() => ke("/siapa-penyusup/papan-skor")}>
            <img src={ikon("papan_skor")} alt="" />
            Papan Skor
          </button>
        </div>
      </div>
    </Layar>
  );
}
