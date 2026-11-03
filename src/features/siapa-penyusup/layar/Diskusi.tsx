import { useEffect, useRef, useState, type FormEvent } from "react";
import { namaPendek } from "../../game/logika";
import { ikon } from "../aset";
import { sfx } from "../audio";
import DaftarPetunjuk from "../komponen/DaftarPetunjuk";
import FaseTimer from "../komponen/FaseTimer";
import { LihatKata } from "../komponen/KartuKata";
import Layar from "../komponen/Layar";
import { useToast } from "../komponen/toastKonteks";
import { PESAN_CHAT } from "../pesan";
import type { StatePenyusupRoom } from "../usePenyusupRoom";
import { useItemBaru, useSisaDetik } from "../useWaktu";

/** Layar 7: chat bebas; host boleh mempercepat ke voting. */
export default function Diskusi({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const toast = useToast();
  const sisa = useSisaDetik(room.fase_berakhir, s.sekarang);
  const [teks, setTeks] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const kotakChat = useRef<HTMLDivElement>(null);
  const pesan = s.chat.filter((c) => c.ronde === room.ronde);
  const sayaMain = !!s.sayaPemain?.hidup;

  useItemBaru(s.chat, (c) => {
    if (c.user_id !== s.saya) sfx("sfx_chat");
  });

  // gulir ke pesan terbaru
  useEffect(() => {
    const el = kotakChat.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pesan.length]);

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (!teks.trim()) return;
    setMengirim(true);
    const hasil = await s.kirimChat(teks);
    setMengirim(false);
    if (hasil === "ok") {
      setTeks("");
    } else if (hasil) {
      sfx("sfx_error");
      toast(PESAN_CHAT[hasil]);
    }
  }

  async function keVoting() {
    sfx("sfx_waktu_habis");
    await s.keVoting();
  }

  return (
    <Layar bg="bg_diskusi" bgm="bgm_diskusi">
      <FaseTimer ikonFase="chat" label="Diskusi" sub="Siapa yang janggal?" sisa={sisa} total={room.waktu_diskusi} />
      <div className="sp-panel">
        <DaftarPetunjuk s={s} hanyaRondeIni />
      </div>
      <div className="sp-panel sp-chat" ref={kotakChat} aria-live="polite">
        <div className="sp-bubble sp-bubble--system">Diskusi dimulai! {room.waktu_diskusi} detik</div>
        {pesan.map((c) => {
          if (c.user_id === s.saya) {
            return (
              <div key={c.id} className="sp-bubble sp-bubble--me">
                {c.teks}
              </div>
            );
          }
          const p = s.pemain.find((x) => x.user_id === c.user_id);
          const divisi = s.namaDivisi(p?.divisi_id ?? null);
          return (
            <div key={c.id} className="sp-bubble">
              <b>
                {namaPendek(s.namaPemain(c.user_id))}
                {divisi ? ` · ${divisi}` : ""}
              </b>
              {c.teks}
            </div>
          );
        })}
      </div>
      <LihatKata kartu={s.kartu} />
      <div className="sp-spacer" />
      {sayaMain ? (
        <form className="sp-input" onSubmit={(e) => void kirim(e)}>
          <input
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Tulis pendapatmu…"
            maxLength={200}
            aria-label="Pesan diskusi"
            autoComplete="off"
          />
          <button type="submit" className="sp-btn sp-btn--sm" disabled={mengirim} aria-label="Kirim pesan">
            <img src={ikon("kirim")} alt="" />
          </button>
        </form>
      ) : (
        <p className="sp-hint">Kamu sudah tersingkir — tonton diskusinya.</p>
      )}
      {s.sayaHost && (
        <button type="button" className="sp-btn sp-btn--maroon sp-btn--block" onClick={() => void keVoting()}>
          <img src={ikon("vote")} alt="" />
          Lanjut ke Voting
        </button>
      )}
    </Layar>
  );
}
