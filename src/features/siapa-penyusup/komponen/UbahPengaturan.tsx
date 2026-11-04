import { useEffect, useId, useRef, useState } from "react";
import { ubahPengaturan, type PenyusupRoom } from "../api";
import { ikon } from "../aset";
import { sfx } from "../audio";
import { pengaturanDariRoom, samaPengaturan, type PengaturanRoom } from "../logika";
import FormPengaturan from "./FormPengaturan";
import { useToast } from "./toastKonteks";

/**
 * Modal host di lobi: ganti mode, kategori, & aturan room tanpa membuat room baru
 * (mis. setelah Main Lagi). Dirender di dalam .sp-root (bukan portal).
 */
export default function UbahPengaturan({
  room,
  onTersimpan,
  onTutup,
}: {
  room: PenyusupRoom;
  onTersimpan: () => void;
  onTutup: () => void;
}) {
  const toast = useToast();
  const idJudul = useId();
  const [awal] = useState(() => pengaturanDariRoom(room));
  const [p, setP] = useState<PengaturanRoom>(awal);
  const [menyimpan, setMenyimpan] = useState(false);
  const tutup = useRef(onTutup);
  useEffect(() => {
    tutup.current = onTutup;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const berubah = !samaPengaturan(p, awal);

  async function simpan() {
    setMenyimpan(true);
    try {
      await ubahPengaturan(room.id, p);
      sfx("sfx_poin");
      toast("Pengaturan room disimpan");
      onTersimpan();
    } catch (e) {
      sfx("sfx_error");
      toast(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
      setMenyimpan(false);
    }
  }

  return (
    <div className="sp-overlay" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="sp-panel sp-modal sp-modal--gulir sp-stack sp-anim-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={idJudul} className="sp-panel__title" style={{ margin: 0 }}>
          <img src={ikon("pengaturan")} width={28} alt="" />
          Ubah Pengaturan
        </h2>
        <FormPengaturan p={p} onUbah={setP} />
        <div className="sp-row sp-modal__aksi">
          <button type="button" className="sp-btn sp-btn--light sp-lebar-isi" onClick={onTutup} disabled={menyimpan}>
            Batal
          </button>
          <button type="button" className="sp-btn sp-btn--teal" onClick={() => void simpan()} disabled={!berubah || menyimpan}>
            <img src={ikon("benar")} alt="" />
            {menyimpan ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
