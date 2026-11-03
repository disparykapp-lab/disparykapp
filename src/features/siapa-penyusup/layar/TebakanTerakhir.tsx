import { useState, type FormEvent } from "react";
import { namaPendek } from "../../game/logika";
import { avatar, ikon } from "../aset";
import { sfx } from "../audio";
import FaseTimer from "../komponen/FaseTimer";
import Layar from "../komponen/Layar";
import { useToast } from "../komponen/toastKonteks";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useSisaDetik } from "../useWaktu";

/** Penyusup yang baru tertangkap boleh menebak kata Pemandu (15 dtk). Benar = penyusup menang. */
export default function TebakanTerakhir({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const toast = useToast();
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  const [teks, setTeks] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const penebak = s.pemain.find((p) => p.user_id === room.giliran_user_id) ?? null;
  const sayaPenebak = room.giliran_user_id === s.saya;
  const nama = namaPendek(s.namaPemain(room.giliran_user_id));

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (!teks.trim()) return;
    setMengirim(true);
    const hasil = await s.tebakAkhir(teks);
    setMengirim(false);
    if (hasil === "salah") {
      sfx("sfx_error");
      toast("Tebakanmu salah.");
    } else if (hasil === "kosong") {
      toast("Tulis tebakanmu dulu.");
    }
  }

  return (
    <Layar bg="bg_voting" bgm={null}>
      <FaseTimer ikonFase="penyusup" label="Tebakan terakhir" sub={sayaPenebak ? "Giliranmu!" : nama} sisa={sisa} total={15} />
      <div className="sp-spacer" />
      <div className="sp-center sp-stack">
        {penebak && <img className="sp-avatar-besar sp-anim-reveal" style={{ margin: "0 auto" }} src={avatar(penebak.avatar, "penyusup")} alt="" />}
        <h1 className="sp-title">{sayaPenebak ? "Kesempatan terakhir!" : `${nama} menebak…`}</h1>
        <p className="sp-hint">
          {sayaPenebak
            ? "Kamu tertangkap. Tebak kata Pemandu dengan benar untuk mencuri kemenangan!"
            : `${nama} sedang menebak kata Pemandu. Kalau benar, penyusup menang!`}
        </p>
      </div>
      <div className="sp-spacer" />
      {sayaPenebak && (
        <form className="sp-input" onSubmit={(e) => void kirim(e)}>
          <input
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Kata Pemandu menurutmu…"
            maxLength={40}
            aria-label="Tebakan kata Pemandu"
            autoComplete="off"
            autoFocus
          />
          <button type="submit" className="sp-btn sp-btn--sm sp-btn--maroon" disabled={mengirim}>
            <img src={ikon("kirim")} alt="" />
            Tebak
          </button>
        </form>
      )}
    </Layar>
  );
}
