import { useEffect, useState } from "react";
import { namaPendek } from "../../game/logika";
import { avatar, ui } from "../aset";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import TilePemain from "../komponen/TilePemain";
import { TombolSuara } from "../komponen/bersama";
import { FlashMerah } from "../komponen/efek";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useSisaDetik } from "../useWaktu";

/** 0 = tegang, 1 = peran terungkap (1,4 dtk), 2 = stempel (2,4 dtk), 3 = selesai (3,1 dtk) */
type Langkah = 0 | 1 | 2 | 3;

/** Layar 9: siapa yang tersingkir, terungkap penyusup atau bukan, atau seri. */
export default function HasilVote({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const hasil = room.hasil_vote;
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  // memuat ulang di tengah fase: langsung tampilkan hasil akhirnya tanpa animasi
  const [animasi] = useState(() => s.sekarang() - Date.parse(room.fase_mulai ?? "") < 3000);
  const [langkah, setLangkah] = useState<Langkah>(animasi ? 0 : 3);

  const idTersingkir = hasil?.tersingkir_id ?? null;
  const peran = hasil?.peran ?? null;
  useEffect(() => {
    if (!animasi) return;
    const t = [
      window.setTimeout(() => {
        setLangkah(1);
        if (peran === "penyusup") sfx("sting_reveal_penyusup");
        else if (idTersingkir) {
          sfx("sfx_tersingkir");
          sfx("sting_bukan_penyusup");
        }
      }, 1400),
      window.setTimeout(() => {
        setLangkah(2);
        sfx("sfx_vote_stempel");
      }, 2400),
      window.setTimeout(() => {
        setLangkah(3);
        if (peran === "penyusup") sfx("sting_penyusup_tertangkap");
      }, 3100),
    ];
    return () => t.forEach((x) => window.clearTimeout(x));
  }, [animasi, idTersingkir, peran]);

  const tersingkir = idTersingkir ? s.pemain.find((p) => p.user_id === idTersingkir) ?? null : null;
  const penyusup = peran === "penyusup";

  if (!hasil) return null;
  const totalSuara = Object.values(hasil.tally).reduce((a, b) => a + b, 0) + hasil.lewati;
  const maks = Math.max(0, ...Object.values(hasil.tally));
  const nama = tersingkir ? namaPendek(tersingkir.profiles?.nama ?? "Pemain") : "";
  const tebakanMenyusul = penyusup && room.tebakan_terakhir;

  let keterangan = "Apakah dia penyusup?";
  if (!tersingkir) keterangan = hasil.lewati >= maks && hasil.lewati > 0 ? "Suara lewati paling banyak." : "Suara seri.";
  else if (langkah >= 2) keterangan = penyusup ? `Penyusup tertangkap! Katanya: ${hasil.kata}` : "Bukan penyusup… penyusup masih bersembunyi!";

  return (
    <Layar bg="bg_voting" bgm={null}>
      <div className="sp-topbar">
        <span />
        <span className="sp-hint">Hasil voting · {totalSuara} suara</span>
        <TombolSuara />
      </div>
      <div className="sp-spacer" />
      <div className="sp-center sp-stack">
        <h1 className="sp-title">{tersingkir ? `${nama} tersingkir…` : "Tidak ada yang tersingkir"}</h1>
        <div className="sp-stempel-wrap">
          {tersingkir && penyusup && (
            <img
              className={`sp-avatar-besar ${langkah >= 1 ? "sp-anim-penyusup" : ""}`}
              src={avatar(tersingkir.avatar, langkah >= 1 ? "penyusup" : "normal")}
              alt=""
            />
          )}
          {tersingkir && !penyusup && (
            <>
              <img className="sp-avatar-besar" src={avatar(tersingkir.avatar, langkah >= 1 ? "tersingkir" : "normal")} alt="" />
              {langkah >= 1 && animasi && (
                <img className="sp-avatar-besar sp-avatar-terbang sp-anim-tersingkir" src={avatar(tersingkir.avatar)} alt="" />
              )}
            </>
          )}
          {langkah >= 2 && (
            <img
              className="sp-stempel sp-anim-stamp"
              src={ui(!tersingkir ? "stempel_seri" : penyusup ? "stempel_penyusup" : "stempel_bukan_penyusup")}
              alt={!tersingkir ? "SERI" : penyusup ? "PENYUSUP!" : "BUKAN PENYUSUP"}
            />
          )}
        </div>
        <p className="sp-hint" aria-live="polite">
          {keterangan}
        </p>
      </div>
      {langkah === 1 && penyusup && <FlashMerah />}

      {langkah >= 2 && (
        <div className="sp-panel">
          <div className="sp-grid-players sp-grid-players--compact" style={{ paddingTop: 10 }}>
            {s.aktif.map((p) => (
              <TilePemain key={p.user_id} s={s} p={p} divisi={false} kelas={p.hidup ? "" : "is-eliminated"}>
                {(hasil.tally[p.user_id] ?? 0) > 0 && (
                  <span className="sp-player__votes" aria-label={`${hasil.tally[p.user_id]} suara`}>
                    {hasil.tally[p.user_id]}
                  </span>
                )}
              </TilePemain>
            ))}
          </div>
          {hasil.lewati > 0 && <p className="sp-muted sp-center">Lewati: {hasil.lewati} suara</p>}
        </div>
      )}
      <div className="sp-spacer" />
      <p className="sp-ringkas">
        {tebakanMenyusul ? "Penyusup boleh menebak kata Pemandu sebentar lagi…" : `Lanjut dalam ${sisa} detik`}
      </p>
    </Layar>
  );
}
