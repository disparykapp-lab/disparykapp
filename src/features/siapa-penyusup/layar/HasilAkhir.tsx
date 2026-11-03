import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { namaPendek } from "../../game/logika";
import type { AkhirGame } from "../api";
import { avatar, ikon, ui } from "../aset";
import { sfx } from "../audio";
import DaftarPeringkat from "../komponen/DaftarPeringkat";
import Layar from "../komponen/Layar";
import { Konfeti } from "../komponen/efek";
import { BATAS_RONDE } from "../logika";
import type { StatePenyusupRoom } from "../usePenyusupRoom";

function teksAlasan(akhir: AkhirGame, namaPenyusup: string, namaPenebak: string): string {
  switch (akhir.alasan) {
    case "semua_tertangkap":
      return "Semua penyusup tertangkap!";
    case "penyusup_seimbang":
      return `${namaPenyusup} berhasil berbaur sampai akhir!`;
    case "batas_ronde":
      return `${namaPenyusup} bertahan ${BATAS_RONDE} ronde tanpa ketahuan!`;
    case "tebakan_benar":
      return `${namaPenebak} menebak kata Pemandu dengan benar!`;
    case "pemain_keluar":
      return akhir.pemenang === "pemandu"
        ? "Penyusup keluar dari permainan."
        : "Pemandu yang tersisa tinggal sedikit karena ada yang keluar.";
  }
}

/** Layar 10: pemenang, kata kedua pihak, papan skor per divisi / per pemain. */
export default function HasilAkhir({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const akhir = room.akhir!;
  const navigate = useNavigate();
  const pemandu = akhir.pemenang === "pemandu";
  const antarDivisi = room.mode === "antar_divisi";
  const [tab, setTab] = useState<"divisi" | "pemain">(antarDivisi ? "divisi" : "pemain");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    sfx(pemandu ? "jingle_pemandu_menang" : "jingle_penyusup_menang");
    const t = window.setTimeout(() => sfx("sfx_poin"), 800);
    return () => window.clearTimeout(t);
  }, [pemandu, room.game_ke]);

  const penyusup = akhir.penyusup_ids.map((id) => s.pemain.find((p) => p.user_id === id)).filter((p) => !!p);
  const namaPenyusup = akhir.penyusup_ids.map((id) => namaPendek(s.namaPemain(id))).join(" & ");
  const skorSaya = akhir.skor.find((x) => x.user_id === s.saya);

  const barisPemain = akhir.skor.map((k) => ({
    id: k.user_id,
    nama: `${namaPendek(s.namaPemain(k.user_id))}${k.user_id === s.saya ? " (kamu)" : ""}`,
    sub: `${k.peran === "penyusup" ? "Penyusup" : "Pemandu"}${s.namaDivisi(k.divisi_id) ? ` · ${s.namaDivisi(k.divisi_id)}` : ""}`,
    poin: k.poin,
    warna: s.warnaDivisi(k.divisi_id),
  }));
  const barisDivisi = akhir.skor_divisi.map((d) => ({
    id: d.divisi_id,
    nama: s.namaDivisi(d.divisi_id) ?? "Divisi",
    poin: d.poin,
    warna: s.warnaDivisi(d.divisi_id),
  }));

  async function keluar() {
    sfx("sfx_klik");
    await s.keluar();
    navigate("/siapa-penyusup", { replace: true });
  }

  async function mainLagi() {
    sfx("sfx_klik");
    setSibuk(true);
    await s.mainLagi();
    setSibuk(false);
  }

  return (
    <Layar bg={pemandu ? "bg_hasil_pemandu_menang" : "bg_hasil_penyusup_menang"} bgm={null}>
      <img
        src={ui(pemandu ? "banner_pemandu_menang" : "banner_penyusup_menang")}
        className="sp-anim-banner sp-banner"
        alt={pemandu ? "Pemandu menang!" : "Penyusup menang!"}
      />
      {!pemandu && penyusup.length > 0 && (
        <div className="sp-avatar-baris">
          {penyusup.map((p) => (
            <img key={p.user_id} className="sp-avatar-besar sp-anim-reveal" src={avatar(p.avatar, "penyusup")} alt="" />
          ))}
        </div>
      )}
      <p className="sp-hint">{teksAlasan(akhir, namaPenyusup, namaPendek(s.namaPemain(akhir.penebak_benar)))}</p>
      <div className="sp-kata-akhir sp-anim-slide-up">
        <div className="sp-kata-akhir__pemandu">
          <small>Kata Pemandu</small>
          <b>{akhir.kata_pemandu}</b>
        </div>
        <div className="sp-kata-akhir__penyusup">
          <small>Kata Penyusup</small>
          <b>{akhir.kata_penyusup}</b>
        </div>
      </div>
      {pemandu && <p className="sp-ringkas">Penyusupnya: {namaPenyusup}</p>}

      <div className="sp-panel sp-stack sp-anim-slide-up" style={{ animationDelay: ".15s" }}>
        {antarDivisi && (
          <div className="sp-tab" role="tablist" aria-label="Papan skor">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "divisi"}
              className={`sp-btn sp-btn--sm ${tab === "divisi" ? "" : "sp-btn--light"}`}
              onClick={() => {
                sfx("sfx_pop");
                setTab("divisi");
              }}
            >
              Per Divisi
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "pemain"}
              className={`sp-btn sp-btn--sm ${tab === "pemain" ? "" : "sp-btn--light"}`}
              onClick={() => {
                sfx("sfx_pop");
                setTab("pemain");
              }}
            >
              Per Pemain
            </button>
          </div>
        )}
        {tab === "divisi" ? (
          <DaftarPeringkat key="divisi" baris={barisDivisi} kosong="Belum ada poin divisi." />
        ) : (
          <DaftarPeringkat key="pemain" baris={barisPemain} kosong="Belum ada poin." />
        )}
      </div>
      {skorSaya && (
        <p className="sp-poin-saya">
          Kamu dapat <b>{skorSaya.poin}</b> poin
          {skorSaya.poin > 0 && (
            <span className="sp-anim-points sp-poin-melayang" aria-hidden="true">
              +{skorSaya.poin}
            </span>
          )}
        </p>
      )}

      <div className="sp-spacer" />
      <div className="sp-row">
        <button type="button" className="sp-btn sp-btn--light sp-lebar-isi" onClick={() => void keluar()}>
          <img src={ikon("keluar")} alt="" />
          Keluar
        </button>
        {s.sayaHost ? (
          <button type="button" className="sp-btn" onClick={() => void mainLagi()} disabled={sibuk}>
            <img src={ikon("ulang")} alt="" />
            Main Lagi
          </button>
        ) : (
          <p className="sp-hint">Menunggu host memulai lagi…</p>
        )}
      </div>
      {pemandu && <Konfeti />}
    </Layar>
  );
}
