import { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import "./game.css";
import { ASET } from "./assets";

/**
 * Pop-up "Zona Game" dari tombol Game di Beranda — terpisah dari deretan menu
 * kerja. Dimuat lazy dari Beranda, jadi aset game baru diunduh saat dibuka.
 */
export default function PopupGame({ onTutup }: { onTutup: () => void }) {
  const navigate = useNavigate();
  const tombolMain = useRef<HTMLButtonElement>(null);
  // callback terbaru disimpan di ref, supaya render ulang Beranda tidak menjalankan
  // ulang efek di bawah (yang akan merebut fokus kembali ke tombol Main)
  const tutup = useRef(onTutup);
  useLayoutEffect(() => {
    tutup.current = onTutup;
  });

  useEffect(() => {
    tombolMain.current?.focus();
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="coret-tebak ct-popup-latar fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-zona-game"
        className="ct-kartu ct-popup w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 bg-[var(--ct-biru)] px-4 py-3 text-white">
          <img src="/icon_gamepad.webp" alt="" aria-hidden="true" className="h-7 w-auto rounded-md bg-white/90 p-0.5" />
          <h2 id="judul-zona-game" className="ct-judul flex-1 text-xl">
            Zona Game
          </h2>
          <button type="button" onClick={onTutup} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <X size={20} />
          </button>
        </header>

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
              <button
                ref={tombolMain}
                type="button"
                onClick={() => navigate("/game")}
                className="ct-tombol ct-tombol-hijau w-full text-lg"
              >
                Main Sekarang
              </button>
            </div>
          </article>

          <p className="rounded-2xl border-2 border-dashed border-slate-200 p-3 text-center text-sm text-slate-400">
            Game lain menyusul…
          </p>
        </div>
      </div>
    </div>
  );
}
