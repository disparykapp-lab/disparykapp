import { useEffect, useId, useRef } from "react";
import { avatar, ikon, KARAKTER } from "../aset";

/** Modal pilih 1 dari 8 karakter. Dirender di dalam .sp-root (bukan portal). */
export default function PilihAvatar({
  nilai,
  onPilih,
  onTutup,
}: {
  nilai: number;
  onPilih: (indeks: number) => void;
  onTutup: () => void;
}) {
  const idJudul = useId();
  const kotak = useRef<HTMLDivElement>(null);
  const tutup = useRef(onTutup);
  useEffect(() => {
    tutup.current = onTutup;
  });

  useEffect(() => {
    kotak.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sp-overlay" onClick={onTutup}>
      <div
        ref={kotak}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="sp-panel sp-modal sp-anim-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={idJudul} className="sp-panel__title">
          <img src={ikon("pemain")} width={28} alt="" />
          Pilih Karakter
        </h2>
        <div className="sp-pilih-avatar">
          {KARAKTER.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`sp-player is-selectable ${i === nilai ? "is-selected" : ""}`}
              aria-pressed={i === nilai}
              aria-label={`Karakter ${id.slice(3)}`}
              onClick={() => onPilih(i)}
            >
              <img className="sp-player__avatar" src={avatar(i)} alt="" />
            </button>
          ))}
        </div>
        <button type="button" className="sp-btn sp-btn--light sp-btn--sm sp-btn--block" onClick={onTutup}>
          Selesai
        </button>
      </div>
    </div>
  );
}
