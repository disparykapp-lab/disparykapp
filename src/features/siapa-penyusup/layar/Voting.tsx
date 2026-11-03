import { useEffect, useRef, useState } from "react";
import { namaPendek } from "../../game/logika";
import { ikon, ui } from "../aset";
import { sfx } from "../audio";
import FaseTimer from "../komponen/FaseTimer";
import Layar from "../komponen/Layar";
import TilePemain from "../komponen/TilePemain";
import { useToast } from "../komponen/toastKonteks";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useSisaDetik } from "../useWaktu";

/**
 * Layar 8: pilih 1 tersangka atau Lewati. Vote rahasia: selama voting hanya
 * terlihat SIAPA yang sudah vote (centang), bukan memilih siapa. Bisa diganti
 * sampai waktu habis.
 */
export default function Voting({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const toast = useToast();
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  const [pilih, setPilih] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const sayaMain = !!s.sayaPemain?.hidup;
  const habis = sisa === 0;

  const hidup = s.aktif.filter((p) => p.hidup);
  const calon = hidup.filter((p) => p.user_id !== s.saya);
  const jumlahSudah = hidup.filter((p) => p.sudah_vote).length;

  // pemain lain memasukkan suaranya
  const sudahLain = hidup.filter((p) => p.sudah_vote && p.user_id !== s.saya).length;
  const sebelumnya = useRef(sudahLain);
  useEffect(() => {
    if (sudahLain > sebelumnya.current) sfx("sfx_vote_masuk");
    sebelumnya.current = sudahLain;
  }, [sudahLain]);

  useEffect(() => {
    if (habis) sfx("sfx_waktu_habis");
  }, [habis]);

  async function kirim(target: string | null) {
    setMengirim(true);
    const ok = await s.vote(target);
    setMengirim(false);
    if (!ok) return;
    sfx("sfx_vote_stempel");
    setPilih(null);
    toast(target ? `Suaramu untuk ${namaPendek(s.namaPemain(target))} tercatat` : "Kamu memilih lewati");
  }

  const pilihanTersimpan =
    s.voteSaya === undefined ? "Belum memilih" : s.voteSaya === null ? "Pilihanmu: lewati" : `Pilihanmu: ${namaPendek(s.namaPemain(s.voteSaya))}`;

  return (
    <Layar bg="bg_voting" bgm="bgm_voting">
      <FaseTimer ikonFase="vote" label="Voting" sub="Pilih 1 tersangka" sisa={sisa} total={room.waktu_voting} tik={sayaMain} />
      <p className="sp-hint">
        {sayaMain ? "Ketuk pemain yang kamu curigai, lalu tekan Vote." : "Kamu sudah tersingkir — tonton voting."} {jumlahSudah}/{hidup.length} sudah vote
      </p>
      <div className="sp-grid-players sp-anim-stagger">
        {(sayaMain ? calon : hidup).map((p, i) => {
          const dipilih = pilih === p.user_id || (pilih === null && s.voteSaya === p.user_id);
          const bisaPilih = sayaMain && !habis && !mengirim;
          return (
            <TilePemain
              key={p.user_id}
              s={s}
              p={p}
              i={i}
              kelas={[bisaPilih ? "is-selectable" : "", dipilih ? "is-selected" : "", p.sudah_vote ? "is-voted" : ""].join(" ")}
              divisi={room.mode === "antar_divisi"}
              onClick={
                bisaPilih
                  ? () => {
                      sfx("sfx_pop");
                      setPilih(p.user_id);
                    }
                  : undefined
              }
              label={bisaPilih ? `Pilih ${p.profiles?.nama ?? "pemain"}` : undefined}
            >
              {s.voteSaya === p.user_id && <img key={s.voteSaya} className="sp-stempel-tile sp-anim-stamp" src={ui("stempel_terpilih")} alt="" />}
            </TilePemain>
          );
        })}
      </div>
      <div className="sp-spacer" />
      {sayaMain && (
        <>
          <p className="sp-ringkas">{pilihanTersimpan}{s.voteSaya !== undefined && !habis ? " · masih bisa diganti" : ""}</p>
          <div className="sp-vote-aksi">
            <button type="button" className="sp-btn sp-btn--light" disabled={habis || mengirim} onClick={() => void kirim(null)}>
              <img src={ikon("lewati_vote")} alt="" />
              Lewati
            </button>
            <button type="button" className="sp-btn sp-btn--danger" disabled={!pilih || habis || mengirim} onClick={() => void kirim(pilih)}>
              <img src={ikon("vote")} alt="" />
              Vote
            </button>
          </div>
        </>
      )}
    </Layar>
  );
}
