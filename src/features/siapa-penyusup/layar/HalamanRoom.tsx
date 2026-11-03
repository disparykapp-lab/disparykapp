import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ikon } from "../aset";
import { gabungRoom } from "../api";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { useToast } from "../komponen/toastKonteks";
import { avatarTersimpan } from "../preferensi";
import { usePenyusupRoom } from "../usePenyusupRoom";
import BagikanKata from "./BagikanKata";
import Diskusi from "./Diskusi";
import HasilAkhir from "./HasilAkhir";
import HasilVote from "./HasilVote";
import Lobby from "./Lobby";
import Petunjuk from "./Petunjuk";
import TebakanTerakhir from "./TebakanTerakhir";
import Voting from "./Voting";

export default function HalamanRoom() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const s = usePenyusupRoom(roomId);
  const [bergabung, setBergabung] = useState(false);
  const dikeluarkan = !!s.sayaPemain?.dikeluarkan;

  // error aksi (kick, siap, …) tampil sebagai toast
  const { error, setError } = s;
  useEffect(() => {
    if (!error) return;
    sfx("sfx_error");
    toast(error);
    setError(null);
  }, [error, setError, toast]);

  useEffect(() => {
    if (dikeluarkan) sfx("sfx_error");
  }, [dikeluarkan]);

  // menutup tab tanpa menekan Keluar tidak apa-apa: server menganggap pemain
  // keluar setelah ~60 dtk tanpa detak.
  useEffect(() => {
    if (!s.ditutup) return;
    const t = window.setTimeout(() => navigate("/siapa-penyusup", { replace: true }), 2500);
    return () => window.clearTimeout(t);
  }, [s.ditutup, navigate]);

  const keMenu = () => navigate("/siapa-penyusup", { replace: true });

  if (s.ditutup) return <Pesan judul="Room sudah ditutup" isi="Kembali ke menu…" />;
  if (s.memuat || !s.room) return <Pesan judul="Masuk ke room…" />;

  if (dikeluarkan) {
    return (
      <Pesan judul="Kamu dikeluarkan" isi="Host mengeluarkanmu dari room ini." onKembali={keMenu}>
        <button type="button" className="sp-btn sp-btn--block" onClick={keMenu}>
          Ke Menu
        </button>
      </Pesan>
    );
  }

  // membuka link room yang belum / tidak lagi diikuti (mis. setelah menekan Keluar)
  if (!s.sayaAnggota) {
    return (
      <Pesan judul={`Room ${s.room.kode}`} isi="Kamu belum bergabung di room ini." onKembali={keMenu}>
        <button
          type="button"
          className="sp-btn sp-btn--teal sp-btn--block"
          disabled={bergabung}
          onClick={async () => {
            setBergabung(true);
            try {
              await gabungRoom(s.room!.kode, avatarTersimpan());
              sfx("sfx_gabung");
              await s.muatUlang();
            } catch (e) {
              sfx("sfx_error");
              toast(e instanceof Error ? e.message : "Gagal bergabung.");
            } finally {
              setBergabung(false);
            }
          }}
        >
          <img src={ikon("gabung_room")} alt="" />
          {bergabung ? "Bergabung…" : "Gabung"}
        </button>
      </Pesan>
    );
  }

  switch (s.room.status) {
    case "menunggu":
      return <Lobby s={s} />;
    case "bagikan":
      return <BagikanKata s={s} />;
    case "petunjuk":
      return <Petunjuk s={s} />;
    case "diskusi":
      return <Diskusi s={s} />;
    case "voting":
      return <Voting s={s} />;
    case "hasil_vote":
      return <HasilVote s={s} />;
    case "tebakan_terakhir":
      return <TebakanTerakhir s={s} />;
    case "selesai":
      return s.room.akhir ? <HasilAkhir s={s} /> : <Pesan judul="Permainan selesai" onKembali={keMenu} />;
  }
}

function Pesan({ judul, isi, onKembali, children }: { judul: string; isi?: string; onKembali?: () => void; children?: ReactNode }) {
  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        {onKembali ? <TombolKembali onClick={onKembali} /> : <span />}
        <TombolSuara />
      </div>
      <div className="sp-spacer" />
      <div className="sp-panel sp-anim-pop-in sp-stack sp-center">
        <h1 className="sp-panel__title" style={{ justifyContent: "center", margin: 0 }}>
          {judul}
        </h1>
        {isi && <p className="sp-muted">{isi}</p>}
        {children}
      </div>
      <div className="sp-spacer" />
    </Layar>
  );
}
