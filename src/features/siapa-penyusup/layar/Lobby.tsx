import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { namaPendek } from "../../game/logika";
import { avatar, ikon } from "../aset";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import PilihAvatar from "../komponen/PilihAvatar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { useToast } from "../komponen/toastKonteks";
import { DAFTAR_KATEGORI } from "../kategori";
import { bisaMulai, bolehKeluarkan, MAKS_PEMAIN, MIN_PEMAIN } from "../logika";
import { simpanAvatar } from "../preferensi";
import type { StatePenyusupRoom } from "../usePenyusupRoom";

export default function Lobby({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const navigate = useNavigate();
  const toast = useToast();
  const [pilihAvatar, setPilihAvatar] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  const linkUndangan = `${window.location.origin}/siapa-penyusup/gabung/${room.kode}`;
  const hadir = s.aktif.filter((p) => s.online(p.user_id));
  const siapMulai = bisaMulai(s.sayaHost, hadir.length);
  const kategori = DAFTAR_KATEGORI.find((k) => k.id === room.kategori_id)?.nama ?? "Acak";
  const divisiRoom = s.namaDivisi(room.divisi_id);

  // Efek suara & toast untuk kejadian realtime (bukan riwayat yang dimuat di awal).
  const kejadianTerakhir = useRef<number | null>(null);
  const { kejadian, saya, namaPemain } = s;
  useEffect(() => {
    if (!kejadian || kejadian.id === kejadianTerakhir.current) return;
    kejadianTerakhir.current = kejadian.id;
    const id = kejadian.user_id ?? "";
    if (id === saya && kejadian.jenis !== "host") return;
    const nama = namaPendek(namaPemain(id));
    if (kejadian.jenis === "gabung") {
      sfx("sfx_gabung");
      toast(`${nama} bergabung`);
    } else if (kejadian.jenis === "keluar") {
      sfx("sfx_keluar_room");
      toast(`${nama} keluar`);
    } else if (kejadian.jenis === "dikeluarkan") {
      sfx("sfx_keluar_room");
      toast(`${nama} dikeluarkan host`);
    } else if (kejadian.jenis === "host" && id === saya) {
      sfx("sfx_pop");
      toast("Kamu sekarang host room ini");
    }
  }, [kejadian, saya, namaPemain, toast]);

  async function salinKode() {
    sfx("sfx_pop");
    try {
      await navigator.clipboard.writeText(room.kode);
      toast("Kode disalin!");
    } catch {
      toast(`Kode room: ${room.kode}`);
    }
  }

  async function undang() {
    sfx("sfx_klik");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Siapa Penyusup?", text: `Ayo main Siapa Penyusup! Kode room ${room.kode}`, url: linkUndangan });
        return;
      }
      await navigator.clipboard.writeText(linkUndangan);
      toast("Link undangan disalin");
    } catch {
      // dibatalkan pengguna / izin clipboard ditolak
    }
  }

  async function keluar() {
    sfx("sfx_keluar_room");
    await s.keluar();
    navigate("/siapa-penyusup", { replace: true });
  }

  async function keluarkan(userId: string) {
    if (!window.confirm(`Keluarkan ${s.namaPemain(userId)} dari room?`)) return;
    sfx("sfx_klik");
    await s.keluarkan(userId);
  }

  async function ubahSiap() {
    sfx("sfx_pop");
    setSibuk(true);
    await s.aturSiap(!s.sayaPemain?.siap);
    setSibuk(false);
  }

  function mulai() {
    sfx("sfx_klik");
    toast("Mulai game sedang disiapkan di tahap berikutnya.");
  }

  async function gantiAvatar(i: number) {
    sfx("sfx_pop");
    simpanAvatar(i);
    await s.pilihAvatar(i);
  }

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <TombolKembali onClick={() => void keluar()} label="Keluar dari room" />
        <span className="sp-room-code" aria-label={`Kode room ${room.kode}`}>
          {room.kode}
          <button type="button" className="sp-icon-btn" style={{ width: 40, height: 40 }} onClick={() => void salinKode()} aria-label="Salin kode room">
            <img src={ikon("salin")} alt="" />
          </button>
        </span>
        <TombolSuara />
      </div>
      <p className="sp-hint">
        {room.mode === "antar_divisi" ? "Mode Antar Divisi" : `Mode Satu Divisi${divisiRoom ? ` · ${divisiRoom}` : ""}`} · {s.aktif.length}/
        {MAKS_PEMAIN} pemain
      </p>

      <div className="sp-panel">
        <div className="sp-grid-players sp-anim-stagger sp-lobi-grid">
          {s.aktif.map((p, i) => {
            const saya = p.user_id === s.saya;
            const on = s.online(p.user_id);
            const nama = p.profiles?.nama ?? "Pemain";
            const kelas = [
              "sp-player",
              p.siap ? "is-ready" : "",
              saya ? "is-me is-selectable" : "",
              on ? "" : "is-offline",
              // animasi masuk untuk pemain yang baru bergabung (kejadian realtime terakhir)
              s.kejadian?.jenis === "gabung" && s.kejadian.user_id === p.user_id ? "sp-anim-join" : "",
            ].join(" ");
            const gaya = { "--dv": s.warnaDivisi(p.divisi_id), "--i": i } as CSSProperties;
            const isi = (
              <>
                {p.user_id === room.host_id && <img className="sp-player__host" src={ikon("host")} alt="Host" />}
                <img className="sp-player__avatar" src={avatar(p.avatar)} alt="" />
                <span className="sp-player__name" title={nama}>
                  {namaPendek(nama)}
                </span>
                <span className="sp-divisi" style={{ "--dv": s.warnaDivisi(p.divisi_id) } as CSSProperties}>
                  <span>{s.namaDivisi(p.divisi_id) ?? "Tanpa divisi"}</span>
                </span>
                {!on && <span className="sp-status-kecil">offline</span>}
              </>
            );
            return saya ? (
              <button key={p.user_id} type="button" className={kelas} style={gaya} onClick={() => setPilihAvatar(true)} aria-label="Ganti karakter">
                {isi}
              </button>
            ) : (
              <div key={p.user_id} className={kelas} style={gaya}>
                {isi}
                {bolehKeluarkan(s.saya, room.host_id, p) && (
                  <button type="button" className="sp-kick" onClick={() => void keluarkan(p.user_id)} aria-label={`Keluarkan ${nama}`}>
                    <img src={ikon("keluarkan_pemain")} alt="" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="sp-ringkas">
        Penyusup {room.jumlah_penyusup === 0 ? "otomatis" : room.jumlah_penyusup} · Petunjuk {room.waktu_petunjuk} dtk · Diskusi{" "}
        {room.waktu_diskusi} dtk · Voting {room.waktu_voting} dtk · {kategori}
        {room.penyusup_tahu ? " · Penyusup tahu perannya" : ""}
        {room.tebakan_terakhir ? " · Tebakan terakhir" : ""}
      </p>

      <div className="sp-spacer" />
      <div className="sp-row">
        <button type="button" className="sp-btn sp-btn--light sp-lebar-isi" onClick={() => void undang()}>
          <img src={ikon("undang")} alt="" />
          Undang
        </button>
        {s.sayaHost ? (
          <button type="button" className="sp-btn" onClick={mulai} disabled={!siapMulai}>
            <img src={ikon("main")} alt="" />
            Mulai Game
          </button>
        ) : (
          <button type="button" className={`sp-btn ${s.sayaPemain?.siap ? "sp-btn--light" : "sp-btn--teal"}`} onClick={() => void ubahSiap()} disabled={sibuk}>
            <img src={ikon(s.sayaPemain?.siap ? "salah" : "benar")} alt="" />
            {s.sayaPemain?.siap ? "Batal Siap" : "Siap!"}
          </button>
        )}
      </div>
      <p className="sp-hint">
        {s.sayaHost
          ? siapMulai
            ? "Semua sudah kumpul? Tekan Mulai Game."
            : `Minimal ${MIN_PEMAIN} pemain online untuk mulai (${hadir.length}/${MIN_PEMAIN}).`
          : "Hanya host (mahkota) yang bisa mulai. Ketuk karaktermu untuk menggantinya."}
      </p>

      {pilihAvatar && s.sayaPemain && (
        <PilihAvatar nilai={s.sayaPemain.avatar} onPilih={(i) => void gantiAvatar(i)} onTutup={() => setPilihAvatar(false)} />
      )}
    </Layar>
  );
}
