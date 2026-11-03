import { useNavigate } from "react-router-dom";
import "./game.css";
import { ASET } from "./assets";
import Lembar from "./komponen/Lembar";

// Diambil langsung (bukan lewat siapa-penyusup/aset.ts) supaya chunk pop-up tetap kecil.
const EMBLEM_PENYUSUP = new URL("../siapa-penyusup/assets/ui/emblem_app.svg", import.meta.url).href;

/**
 * Pop-up "Zona Game" dari tombol Game di Beranda — terpisah dari deretan menu
 * kerja. Dimuat lazy dari Beranda, jadi aset game baru diunduh saat dibuka.
 */
export default function PopupGame({ onTutup }: { onTutup: () => void }) {
  const navigate = useNavigate();

  return (
    <Lembar
      judul="Zona Game"
      ikon={<img src="/icon_gamepad.webp" alt="" aria-hidden="true" className="h-7 w-auto rounded-md bg-white/90 p-0.5" />}
      onTutup={onTutup}
    >
      <div className="flex flex-col gap-3 p-4">
        <article className="relative overflow-hidden rounded-2xl border-2 border-[var(--ct-biru)]/20">
          <img src={ASET.latar.jalan} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="relative flex items-end gap-3 p-3">
            <img src={ASET.maskot.senang} alt="" aria-hidden="true" className="ct-napas h-32 w-auto shrink-0 drop-shadow" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pb-1">
              <img src={ASET.logo} alt="Coret Tebak" className="h-14 w-auto self-start drop-shadow" />
              <p className="text-sm text-slate-700">Gambar · Tebak · Menang! Tebak gambar bareng rekan kantor.</p>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm">
                  <img src={ASET.ui.grup} alt="" aria-hidden="true" className="h-3 w-auto" /> 2–10 pemain
                </span>
                <span className="rounded-full bg-white/90 px-2 py-0.5 shadow-sm">7 tema</span>
              </div>
            </div>
          </div>
          <div className="relative px-3 pb-3">
            <button data-fokus-awal type="button" onClick={() => navigate("/game")} className="ct-tombol ct-tombol-hijau w-full text-lg">
              Main Sekarang
            </button>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border-2 border-[#9B1D3A]/20 bg-[#FFF7E8]">
          <div className="relative flex items-center gap-3 p-3">
            <img src={EMBLEM_PENYUSUP} alt="" aria-hidden="true" className="ct-napas h-24 w-24 shrink-0 drop-shadow" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="ct-judul text-xl leading-tight text-[#5E0F24]">Siapa Penyusup?</p>
              <p className="text-sm text-slate-700">Tebak kata, temukan penyusupnya! Main satu divisi atau antar divisi.</p>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm">
                  <img src={ASET.ui.grup} alt="" aria-hidden="true" className="h-3 w-auto" /> 4–12 pemain
                </span>
                <span className="rounded-full bg-white/90 px-2 py-0.5 shadow-sm">Voting</span>
              </div>
            </div>
          </div>
          <div className="relative px-3 pb-3">
            <button type="button" onClick={() => navigate("/siapa-penyusup")} className="ct-tombol ct-tombol-merah w-full text-lg">
              Main Sekarang
            </button>
          </div>
        </article>
      </div>
    </Lembar>
  );
}
