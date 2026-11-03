import { useState, type SyntheticEvent } from "react";
import { ikon, ui } from "../aset";
import { sfx } from "../audio";
import type { PenyusupKartu } from "../api";

/** Kata panjang (> 18 huruf) dikecilkan supaya tetap muat di kartu. */
const gayaKata = (kata: string) => (kata.length > 18 ? { fontSize: "clamp(24px, 6.5vw, 36px)" } : undefined);

/**
 * Kartu kata: tekan & tahan untuk membalik, lepas untuk menutup. Teks kata
 * dirender HTML di atas kartu_kata_depan.svg dan hanya ada di DOM saat kartu
 * terbuka (jangan masukkan kata ke URL / SVG).
 */
export function KartuKata({ kata, dibagikan }: { kata: string; dibagikan: boolean }) {
  const [buka, setBuka] = useState(false);

  function bukaKartu(e: SyntheticEvent) {
    e.preventDefault();
    if (buka) return;
    setBuka(true);
    sfx("sfx_kartu_flip");
  }
  const tutup = () => setBuka(false);

  return (
    <div
      className={`sp-word-card ${dibagikan ? "sp-anim-deal" : ""} ${buka ? "is-open" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={buka}
      aria-label="Tekan dan tahan untuk melihat kata rahasiamu"
      onPointerDown={bukaKartu}
      onPointerUp={tutup}
      onPointerLeave={tutup}
      onPointerCancel={tutup}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") bukaKartu(e);
      }}
      onKeyUp={tutup}
      onBlur={tutup}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="sp-word-card__inner">
        <div className="sp-word-card__face">
          <img src={ui("kartu_kata_belakang")} alt="" draggable={false} />
        </div>
        <div className="sp-word-card__face sp-word-card__face--front">
          <img src={ui("kartu_kata_depan")} alt="" draggable={false} />
          <div className="sp-word-card__word" style={gayaKata(kata)} aria-live="polite">
            {buka ? kata : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tombol kecil "tahan untuk lihat kataku" untuk layar petunjuk & diskusi. */
export function LihatKata({ kartu }: { kartu: PenyusupKartu | null }) {
  const [buka, setBuka] = useState(false);
  if (!kartu) return null;
  const peran = kartu.peran_terlihat === "penyusup" ? " · kamu PENYUSUP" : kartu.peran_terlihat === "pemandu" ? " · kamu Pemandu" : "";
  return (
    <button
      type="button"
      className={`sp-lihat-kata ${buka ? "is-open" : ""}`}
      aria-pressed={buka}
      onPointerDown={(e) => {
        e.preventDefault();
        setBuka(true);
      }}
      onPointerUp={() => setBuka(false)}
      onPointerLeave={() => setBuka(false)}
      onPointerCancel={() => setBuka(false)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setBuka(true);
        }
      }}
      onKeyUp={() => setBuka(false)}
      onBlur={() => setBuka(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img src={ikon(buka ? "sembunyikan_kata" : "lihat_kata")} alt="" />
      {buka ? `${kartu.kata}${peran}` : "Tahan untuk lihat kataku"}
    </button>
  );
}
