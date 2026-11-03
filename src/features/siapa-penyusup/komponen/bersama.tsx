import { useEffect, useState } from "react";
import { ikon } from "../aset";
import { aturSuara, dengarSuara, sfx, suaraNyala } from "../audio";

/** Satu tombol speaker untuk efek suara sekaligus musik latar. */
export function TombolSuara() {
  const [nyala, setNyala] = useState(suaraNyala);
  useEffect(() => dengarSuara(setNyala), []);
  return (
    <button
      type="button"
      className="sp-icon-btn"
      onClick={() => {
        aturSuara(!nyala);
        if (!nyala) sfx("sfx_klik");
      }}
      aria-label={nyala ? "Matikan suara" : "Nyalakan suara"}
      aria-pressed={!nyala}
    >
      <img src={ikon(nyala ? "suara_on" : "suara_off")} alt="" />
    </button>
  );
}

/** Tombol kembali (ikon keluar dicerminkan, seperti prototype). */
export function TombolKembali({ onClick, label = "Kembali" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="sp-icon-btn"
      onClick={() => {
        sfx("sfx_klik");
        onClick();
      }}
      aria-label={label}
    >
      <img src={ikon("keluar")} alt="" style={{ transform: "scaleX(-1)" }} />
    </button>
  );
}
