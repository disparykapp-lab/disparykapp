import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buatRoom } from "../api";
import { ikon } from "../aset";
import { sfx } from "../audio";
import FormPengaturan from "../komponen/FormPengaturan";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { useToast } from "../komponen/toastKonteks";
import { PENGATURAN_AWAL, type PengaturanRoom } from "../logika";
import { avatarTersimpan } from "../preferensi";

export default function BuatRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const [p, setP] = useState<PengaturanRoom>(PENGATURAN_AWAL);
  const [membuat, setMembuat] = useState(false);

  async function buat() {
    setMembuat(true);
    try {
      const id = await buatRoom(p, avatarTersimpan());
      sfx("sfx_gabung");
      navigate(`/siapa-penyusup/main/${id}`, { replace: true });
    } catch (e) {
      sfx("sfx_error");
      toast(e instanceof Error ? e.message : "Gagal membuat room.");
      setMembuat(false);
    }
  }

  return (
    <Layar bg="bg_lobby" bgm="bgm_lobby">
      <div className="sp-topbar">
        <TombolKembali onClick={() => navigate("/siapa-penyusup")} />
        <h1 className="sp-title">Buat Room</h1>
        <TombolSuara />
      </div>

      <div className="sp-panel sp-anim-slide-up sp-stack">
        <FormPengaturan p={p} onUbah={setP} />
      </div>

      <button type="button" className="sp-btn sp-btn--block" onClick={() => void buat()} disabled={membuat}>
        <img src={ikon("main")} alt="" />
        {membuat ? "Membuat room…" : "Buat & Masuk Lobby"}
      </button>
    </Layar>
  );
}
