import { useEffect, useState } from "react";
import { ikon, ui } from "../aset";
import { sfx } from "../audio";
import { KartuKata } from "../komponen/KartuKata";
import Layar from "../komponen/Layar";
import { TombolSuara } from "../komponen/bersama";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useSisaDetik } from "../useWaktu";

type Tahap = "hitung" | "peran" | "kartu";

/** Layar 5: hitung mundur 3-2-1, (kartu peran), kartu kata terbang masuk, tahan untuk lihat. */
export default function BagikanKata({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  // hitung mundur hanya kalau baru saja dimulai, bukan saat memuat ulang di tengah fase
  const [tahap, setTahap] = useState<Tahap>(() =>
    s.sekarang() - Date.parse(room.fase_mulai ?? "") < 2500 ? "hitung" : "kartu"
  );
  const [angka, setAngka] = useState(3);
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    if (tahap !== "hitung") return;
    const t = [
      window.setTimeout(() => setAngka(2), 900),
      window.setTimeout(() => setAngka(1), 1800),
      window.setTimeout(() => setTahap("peran"), 2700),
    ];
    return () => t.forEach((x) => window.clearTimeout(x));
  }, [tahap]);

  useEffect(() => {
    if (tahap !== "peran") return;
    const t = window.setTimeout(() => setTahap("kartu"), 2200);
    return () => window.clearTimeout(t);
  }, [tahap]);

  // kartu peran hanya ada kalau setting "penyusup tahu perannya" aktif
  const peran = s.kartu?.peran_terlihat ?? null;
  const tampil: Tahap = tahap === "peran" && !peran ? "kartu" : tahap;

  useEffect(() => {
    if (tampil === "hitung") sfx("sfx_hitung_mundur");
  }, [tampil, angka]);
  useEffect(() => {
    if (tampil !== "hitung") sfx("sting_kartu_dibagikan");
  }, [tampil]);

  const hidup = s.aktif.filter((p) => p.hidup);
  const sudahHafal = hidup.filter((p) => p.hafal).length;
  const sayaHafal = !!s.sayaPemain?.hafal;
  const sayaMain = !!s.sayaPemain?.hidup;

  async function hafal() {
    sfx("sfx_klik");
    setMengirim(true);
    await s.hafal();
    setMengirim(false);
  }

  return (
    <Layar bg="bg_diskusi" bgm={tampil === "kartu" ? "bgm_diskusi" : null}>
      <div className="sp-topbar">
        <span />
        <span className="sp-hint">Ronde {room.ronde}</span>
        <TombolSuara />
      </div>

      {tampil === "hitung" && (
        <div className="sp-count-layer">
          <div key={angka} className="sp-anim-countdown" aria-live="assertive">
            {angka}
          </div>
        </div>
      )}
      {tampil === "peran" && peran && (
        <div className="sp-count-layer">
          <img
            src={ui(peran === "penyusup" ? "kartu_peran_penyusup" : "kartu_peran_pemandu")}
            className="sp-anim-reveal sp-kartu-peran"
            alt={peran === "penyusup" ? "Kamu Penyusup!" : "Kamu Pemandu"}
          />
        </div>
      )}

      {tampil === "kartu" && (
        <>
          <div className="sp-spacer" />
          {s.kartu ? (
            <KartuKata kata={s.kartu.kata} dibagikan />
          ) : (
            <p className="sp-hint">{sayaMain ? "Mengambil kartu…" : "Kamu sedang menonton ronde ini."}</p>
          )}
          {s.kartu && <p className="sp-hint">Tahan kartu untuk melihat kata. Lepas untuk menyembunyikan.</p>}
          {peran && (
            <p className="sp-hint">{peran === "penyusup" ? "Kamu PENYUSUP — berbaurlah!" : "Kamu Pemandu — temukan penyusupnya!"}</p>
          )}
          <div className="sp-spacer" />
          {sayaMain && !sayaHafal ? (
            <button type="button" className="sp-btn sp-btn--teal sp-btn--block" onClick={() => void hafal()} disabled={mengirim || !s.kartu}>
              <img src={ikon("benar")} alt="" />
              Sudah Hafal
            </button>
          ) : (
            <p className="sp-hint">
              Menunggu pemain lain… {sudahHafal}/{hidup.length} sudah hafal
            </p>
          )}
          <p className="sp-ringkas">Ronde dimulai paling lambat {sisa} detik lagi.</p>
        </>
      )}
    </Layar>
  );
}
