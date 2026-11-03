import type { CSSProperties } from "react";
import { namaPendek } from "../../game/logika";
import { avatar } from "../aset";
import type { StatePenyusupRoom } from "../usePenyusupRoom";

/** Petunjuk game ini: ronde sekarang di atas, ronde sebelumnya di bawahnya. */
export default function DaftarPetunjuk({ s, hanyaRondeIni = false }: { s: StatePenyusupRoom; hanyaRondeIni?: boolean }) {
  const ronde = s.room?.ronde ?? 1;
  const daftarRonde = hanyaRondeIni ? [ronde] : Array.from({ length: ronde }, (_, i) => ronde - i);

  return (
    <>
      {daftarRonde.map((r) => {
        const isi = s.petunjuk.filter((p) => p.ronde === r);
        if (r !== ronde && isi.length === 0) return null;
        return (
          <div key={r}>
            {!hanyaRondeIni && ronde > 1 && <p className="sp-ronde-label">Ronde {r}</p>}
            {isi.length === 0 ? (
              <p className="sp-muted">Belum ada petunjuk.</p>
            ) : (
              <div className={`sp-clues ${r === ronde ? "sp-anim-stagger" : ""}`}>
                {isi.map((p, i) => {
                  const pemain = s.pemain.find((x) => x.user_id === p.user_id);
                  return (
                    <span key={p.id} className={`sp-clue ${p.lewat ? "is-lewat" : ""}`} style={{ "--i": i } as CSSProperties}>
                      <img src={avatar(pemain?.avatar ?? 0)} alt="" />
                      {namaPendek(s.namaPemain(p.user_id))}: {p.teks}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
