import { useEffect, type CSSProperties } from "react";
import { ikon, type NamaIkon } from "../aset";
import { sfx } from "../audio";
import { kelasTimer } from "../logika";

/** Header fase (.sp-phase) + timer cincin. Detik ≤ 5 berbunyi tik tiap detik. */
export default function FaseTimer({
  ikonFase,
  label,
  sub,
  sisa,
  total,
  tik = true,
}: {
  ikonFase: NamaIkon;
  label: string;
  sub?: string;
  sisa: number;
  total: number;
  tik?: boolean;
}) {
  useEffect(() => {
    if (tik && sisa > 0 && sisa <= 5) sfx("sfx_tick_kritis");
  }, [sisa, tik]);

  const porsi = Math.max(0, Math.min(1, sisa / Math.max(1, total)));
  return (
    <div className="sp-phase">
      <div className="sp-phase__label">
        <img src={ikon(ikonFase)} width={26} alt="" />
        {label}
        {sub && <small>{sub}</small>}
      </div>
      <div className={`sp-timer ${kelasTimer(sisa)}`} style={{ "--p": porsi } as CSSProperties} role="timer" aria-label={`Sisa ${sisa} detik`}>
        <span>{sisa}</span>
      </div>
    </div>
  );
}
