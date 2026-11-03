import type { CSSProperties } from "react";
import { peringkat } from "../../game/logika";
import { ikon } from "../aset";

export interface BarisPeringkat {
  id: string;
  nama: string;
  sub?: string;
  poin: number;
  /** nilai CSS untuk --dv (warna divisi) */
  warna: string;
}

/** Papan skor (.sp-leader). Poin sama = peringkat sama (1, 1, 3, …). */
export default function DaftarPeringkat({ baris, kosong }: { baris: BarisPeringkat[]; kosong: string }) {
  if (baris.length === 0) return <p className="sp-muted">{kosong}</p>;
  const urut = peringkat(baris.map((b) => ({ ...b, skor: b.poin })));
  return (
    <div className="sp-leader sp-anim-stagger">
      {urut.map((b, i) => (
        <div key={b.id} className="sp-leader__row" style={{ "--dv": b.warna, "--i": i } as CSSProperties}>
          <span className="sp-leader__rank">{b.posisi}</span>
          <span className="sp-leader__nama">
            {b.nama}
            {b.sub && <small>{b.sub}</small>}
          </span>
          <span className="sp-leader__pts">
            <img src={ikon("poin")} alt="" />
            {b.poin}
          </span>
        </div>
      ))}
    </div>
  );
}
