import { useEffect, useState, type FormEvent } from "react";
import { namaPendek } from "../../game/logika";
import { ikon } from "../aset";
import { sfx } from "../audio";
import DaftarPetunjuk from "../komponen/DaftarPetunjuk";
import FaseTimer from "../komponen/FaseTimer";
import { LihatKata } from "../komponen/KartuKata";
import Layar from "../komponen/Layar";
import TilePemain from "../komponen/TilePemain";
import { useToast } from "../komponen/toastKonteks";
import { cekPetunjuk, PANJANG_PETUNJUK } from "../logika";
import { PESAN_PETUNJUK } from "../pesan";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useItemBaru, useSisaDetik } from "../useWaktu";

/** Layar 6: pemain bergiliran memberi 1 kata petunjuk. */
export default function Petunjuk({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const toast = useToast();
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  const giliran = room.giliran_user_id;
  const sayaGiliran = giliran === s.saya;
  const [teks, setTeks] = useState("");
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    if (sayaGiliran) sfx("sfx_giliranmu");
  }, [sayaGiliran, room.giliran_ke]);

  useItemBaru(s.petunjuk, (p) => {
    if (p.user_id !== s.saya) sfx("sfx_chat");
  });

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const alasan = cekPetunjuk(teks, s.kartu?.kata ?? "");
    if (alasan) {
      sfx("sfx_error");
      toast(PESAN_PETUNJUK[alasan]);
      return;
    }
    setMengirim(true);
    const hasil = await s.kirimPetunjuk(teks);
    setMengirim(false);
    if (hasil === "ok") {
      sfx("sfx_chat");
      setTeks("");
    } else if (hasil) {
      sfx("sfx_error");
      toast(PESAN_PETUNJUK[hasil]);
    }
  }

  return (
    <Layar bg="bg_diskusi" bgm="bgm_diskusi">
      <FaseTimer
        ikonFase="petunjuk"
        label="Petunjuk"
        sub={sayaGiliran ? "Giliran: Kamu" : `Giliran: ${namaPendek(s.namaPemain(giliran))}`}
        sisa={sisa}
        total={room.waktu_petunjuk}
        tik={sayaGiliran}
      />
      <div className="sp-panel">
        <div className="sp-grid-players sp-grid-players--compact" style={{ paddingTop: 10 }}>
          {s.aktif.map((p) => (
            <TilePemain
              key={p.user_id}
              s={s}
              p={p}
              divisi={false}
              kelas={[p.user_id === giliran ? "is-turn sp-anim-turn" : "", p.hidup ? "" : "is-eliminated"].join(" ")}
            />
          ))}
        </div>
      </div>
      <div className="sp-panel sp-stack">
        <h2 className="sp-panel__title" style={{ margin: 0 }}>
          <img src={ikon("kartu_kata")} width={28} alt="" />
          Petunjuk masuk · Ronde {room.ronde}
        </h2>
        <DaftarPetunjuk s={s} />
      </div>
      <LihatKata kartu={s.kartu} />
      <div className="sp-spacer" />
      {sayaGiliran ? (
        <>
          <p className="sp-hint">Giliranmu! Satu kata, jangan sebut katamu sendiri.</p>
          <form className="sp-input" onSubmit={(e) => void kirim(e)}>
            <input
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              placeholder="Ketik 1 kata petunjuk…"
              maxLength={PANJANG_PETUNJUK}
              aria-label="Kata petunjuk"
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="sp-btn sp-btn--sm" disabled={mengirim}>
              <img src={ikon("kirim")} alt="" />
              Kirim
            </button>
          </form>
        </>
      ) : (
        <p className="sp-hint">
          {s.sayaPemain?.hidup ? `Tunggu giliranmu… ${namaPendek(s.namaPemain(giliran))} sedang berpikir.` : "Kamu sudah tersingkir — tonton saja."}
        </p>
      )}
    </Layar>
  );
}
