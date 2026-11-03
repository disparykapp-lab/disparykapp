import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ambilDaftarRoom, gabungRoom, type RoomTerbuka } from "../api";
import { ikon } from "../aset";
import { sfx } from "../audio";
import InputKode from "../komponen/InputKode";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { useToast } from "../komponen/toastKonteks";
import { kodeValid, MAKS_PEMAIN, PANJANG_KODE } from "../logika";
import { avatarTersimpan } from "../preferensi";

export default function GabungRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const [kode, setKode] = useState("");
  const [daftar, setDaftar] = useState<RoomTerbuka[] | null>(null);
  const [bergabung, setBergabung] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    const muat = () =>
      ambilDaftarRoom()
        .then((d) => !batal && setDaftar(d))
        .catch(() => !batal && setDaftar((lama) => lama ?? []));
    void muat();
    const iv = window.setInterval(() => void muat(), 6000);
    return () => {
      batal = true;
      window.clearInterval(iv);
    };
  }, []);

  async function gabung(k: string) {
    setBergabung(k);
    try {
      const id = await gabungRoom(k, avatarTersimpan());
      sfx("sfx_gabung");
      navigate(`/siapa-penyusup/main/${id}`);
    } catch (e) {
      sfx("sfx_error");
      toast(e instanceof Error ? e.message : "Gagal bergabung.");
      setBergabung(null);
    }
  }

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (!kodeValid(kode)) {
      sfx("sfx_error");
      toast(`Kode room harus ${PANJANG_KODE} huruf.`);
      return;
    }
    void gabung(kode);
  }

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <TombolKembali onClick={() => navigate("/siapa-penyusup")} />
        <h1 className="sp-title">Gabung Room</h1>
        <TombolSuara />
      </div>

      <form className="sp-panel sp-anim-slide-up sp-stack sp-center" onSubmit={kirim}>
        <img src={ikon("gabung_room")} width={64} style={{ margin: "0 auto" }} alt="" />
        <p className="sp-muted">Masukkan {PANJANG_KODE} huruf kode room dari temanmu</p>
        <InputKode nilai={kode} onUbah={setKode} />
        <button type="submit" className="sp-btn sp-btn--teal sp-btn--block" disabled={bergabung !== null}>
          {bergabung === kode && kode ? "Bergabung…" : "Gabung"}
        </button>
      </form>

      <div className="sp-panel sp-panel--dark sp-anim-slide-up" style={{ animationDelay: ".1s" }}>
        <h2 className="sp-panel__title">
          <img src={ikon("pemain")} width={28} alt="" />
          Room terbuka
        </h2>
        {daftar === null ? (
          <p className="sp-kosong">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="sp-kosong">Belum ada room terbuka. Buat room baru, atau minta kode dari temanmu.</p>
        ) : (
          daftar.map((r) => (
            <div key={r.id} className="sp-daftar-room">
              <b className="sp-daftar-room__kode">{r.kode}</b>
              <span className="sp-daftar-room__info">
                {r.mode === "antar_divisi" ? "Antar Divisi" : `Divisi ${r.divisi_nama ?? "-"}`}
                <small>
                  {r.status === "menunggu" ? `Host ${r.host_nama ?? "-"}` : "Sedang main"}
                  {r.saya_anggota ? " · room-mu" : ""}
                </small>
              </span>
              <span>
                {r.jumlah_pemain}/{MAKS_PEMAIN}
              </span>
              <button type="button" className="sp-btn sp-btn--sm" disabled={bergabung !== null} onClick={() => void gabung(r.kode)}>
                {r.saya_anggota ? "Lanjut" : "Masuk"}
              </button>
            </div>
          ))
        )}
      </div>
    </Layar>
  );
}
