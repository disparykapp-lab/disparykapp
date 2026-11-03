import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { buatRoom } from "../api";
import { ikon } from "../aset";
import { sfx } from "../audio";
import Layar from "../komponen/Layar";
import { TombolKembali, TombolSuara } from "../komponen/bersama";
import { useToast } from "../komponen/toastKonteks";
import { DAFTAR_KATEGORI } from "../kategori";
import { BATAS, PENGATURAN_AWAL, geser, type Batas, type PengaturanRoom } from "../logika";
import { avatarTersimpan } from "../preferensi";

export default function BuatRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const { divisi } = useAuth();
  const [p, setP] = useState<PengaturanRoom>(PENGATURAN_AWAL);
  const [membuat, setMembuat] = useState(false);

  function ubah<K extends keyof PengaturanRoom>(kunci: K, nilai: PengaturanRoom[K]) {
    sfx("sfx_pop");
    setP((lama) => ({ ...lama, [kunci]: nilai }));
  }

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
        <h2 className="sp-panel__title" style={{ margin: 0 }}>
          Mode
        </h2>
        <div className="sp-mode" role="radiogroup" aria-label="Mode room">
          <label className="sp-mode__opt">
            <input
              type="radio"
              name="mode"
              checked={p.mode === "satu_divisi"}
              disabled={!divisi}
              onChange={() => ubah("mode", "satu_divisi")}
            />
            <img src={ikon("divisi")} alt="" />
            <strong>Satu Divisi</strong>
            <span>{divisi ? `Khusus divisi ${divisi.nama}` : "Kamu belum punya divisi"}</span>
          </label>
          <label className="sp-mode__opt">
            <input type="radio" name="mode" checked={p.mode === "antar_divisi"} onChange={() => ubah("mode", "antar_divisi")} />
            <img src={ikon("antar_divisi")} alt="" />
            <strong>Antar Divisi</strong>
            <span>Semua divisi, adu poin</span>
          </label>
        </div>

        <h2 className="sp-panel__title" style={{ margin: "6px 0 0" }}>
          Pengaturan
        </h2>
        <Stepper
          label="Jumlah penyusup"
          keterangan={p.jumlahPenyusup === 0 ? "1, atau 2 jika ≥ 7 pemain" : undefined}
          nilai={p.jumlahPenyusup}
          tampil={p.jumlahPenyusup === 0 ? "Otomatis" : String(p.jumlahPenyusup)}
          batas={BATAS.jumlahPenyusup}
          onUbah={(n) => ubah("jumlahPenyusup", n)}
        />
        <Stepper
          label="Waktu petunjuk"
          keterangan="per pemain"
          nilai={p.waktuPetunjuk}
          tampil={`${p.waktuPetunjuk} dtk`}
          batas={BATAS.waktuPetunjuk}
          onUbah={(n) => ubah("waktuPetunjuk", n)}
        />
        <Stepper
          label="Waktu diskusi"
          nilai={p.waktuDiskusi}
          tampil={`${p.waktuDiskusi} dtk`}
          batas={BATAS.waktuDiskusi}
          onUbah={(n) => ubah("waktuDiskusi", n)}
        />
        <Stepper
          label="Waktu voting"
          nilai={p.waktuVoting}
          tampil={`${p.waktuVoting} dtk`}
          batas={BATAS.waktuVoting}
          onUbah={(n) => ubah("waktuVoting", n)}
        />
        <Toggle
          label="Penyusup tahu perannya"
          keterangan="Mati = penyusup mengira dirinya pemandu"
          nilai={p.penyusupTahu}
          onUbah={(v) => ubah("penyusupTahu", v)}
        />
        <Toggle
          label="Tebakan terakhir"
          keterangan="Penyusup yang tertangkap boleh menebak kata pemandu"
          nilai={p.tebakanTerakhir}
          onUbah={(v) => ubah("tebakanTerakhir", v)}
        />
        <Toggle label="Room privat (pakai kode)" nilai={p.privat} onUbah={(v) => ubah("privat", v)} />
        <label className="sp-toggle">
          Kategori kata
          <select
            className="sp-pilih"
            value={p.kategori ?? ""}
            onChange={(e) => ubah("kategori", e.target.value || null)}
          >
            <option value="">Acak</option>
            {DAFTAR_KATEGORI.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="sp-btn sp-btn--block" onClick={() => void buat()} disabled={membuat}>
        <img src={ikon("main")} alt="" />
        {membuat ? "Membuat room…" : "Buat & Masuk Lobby"}
      </button>
    </Layar>
  );
}

function Label({ label, keterangan }: { label: string; keterangan?: ReactNode }) {
  return (
    <span className="sp-toggle__teks">
      {label}
      {keterangan && <small>{keterangan}</small>}
    </span>
  );
}

function Stepper({
  label,
  keterangan,
  nilai,
  tampil,
  batas,
  onUbah,
}: {
  label: string;
  keterangan?: string;
  nilai: number;
  tampil: string;
  batas: Batas;
  onUbah: (n: number) => void;
}) {
  return (
    <div className="sp-toggle">
      <Label label={label} keterangan={keterangan} />
      <span className="sp-stepper">
        <button
          type="button"
          onClick={() => onUbah(geser(nilai, -1, batas))}
          disabled={nilai <= batas.min}
          aria-label={`Kurangi ${label.toLowerCase()}`}
        >
          −
        </button>
        <output aria-live="polite">{tampil}</output>
        <button
          type="button"
          onClick={() => onUbah(geser(nilai, 1, batas))}
          disabled={nilai >= batas.maks}
          aria-label={`Tambah ${label.toLowerCase()}`}
        >
          +
        </button>
      </span>
    </div>
  );
}

function Toggle({
  label,
  keterangan,
  nilai,
  onUbah,
}: {
  label: string;
  keterangan?: string;
  nilai: boolean;
  onUbah: (v: boolean) => void;
}) {
  return (
    <label className="sp-toggle">
      <Label label={label} keterangan={keterangan} />
      <input type="checkbox" checked={nilai} onChange={(e) => onUbah(e.target.checked)} />
    </label>
  );
}
