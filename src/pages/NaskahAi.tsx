import { useId, useRef, useState, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import SlideNaskah from "./naskahAi/SlideNaskah";
import SlidePertanyaan from "./naskahAi/SlidePertanyaan";

const MODE = [
  { id: "naskah", emoji: "✍️", label: "Naskah", sorot: "Ceritain acaranya,", lanjut: "AI yang nulis naskahnya." },
  { id: "pertanyaan", emoji: "🎤", label: "Wawancara", sorot: "Mau wawancara?", lanjut: "Pertanyaannya langsung beres." },
] as const;
type Mode = (typeof MODE)[number]["id"];

const AMBANG_GESER = 60;

/** Halaman Naskah AI: "studio" dua mode (naskah liputan & pertanyaan wawancara). */
export default function NaskahAi() {
  const navigate = useNavigate();
  const idDasar = useId();
  const [mode, setMode] = useState<Mode>("naskah");
  const mulai = useRef<{ x: number; y: number } | null>(null);
  const indeks = MODE.findIndex((m) => m.id === mode);
  const aktif = MODE[indeks];

  function onTouchStart(e: TouchEvent) {
    // geser di dalam kotak teks = memindah kursor/seleksi, bukan ganti mode
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    const t = e.touches[0];
    mulai.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const awal = mulai.current;
    mulai.current = null;
    if (!awal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - awal.x;
    const dy = t.clientY - awal.y;
    if (Math.abs(dx) < AMBANG_GESER || Math.abs(dx) < Math.abs(dy)) return;
    setMode(dx < 0 ? "pertanyaan" : "naskah");
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="naskah-hero -mx-4 -mt-4 rounded-b-[2rem] px-4 pb-5 pt-5 text-white shadow-lg">
        <span className="naskah-blob" style={{ width: 230, height: 230, left: -80, top: -100, background: "#c0334f" }} aria-hidden="true" />
        <span className="naskah-blob" style={{ width: 250, height: 250, right: -100, top: 0, background: "#7c3aed", animationDelay: "-4s" }} aria-hidden="true" />
        <span
          className="naskah-blob"
          style={{ width: 170, height: 170, left: "30%", bottom: -110, background: "#ff8a65", opacity: 0.55, animationDelay: "-8s" }}
          aria-hidden="true"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/beranda")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-brand-masuk shadow-sm"
            aria-label="Kembali"
          >
            ←
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/15 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" aria-hidden="true" />
            RAFAEL AI
          </span>
        </div>

        <div className="relative mt-5 min-h-[5.5rem]">
          {/* stiker melayang — hiasan saja */}
          <div className="pointer-events-none absolute right-0 top-0 flex w-24 flex-wrap justify-end gap-2" aria-hidden="true">
            {[
              { e: "✍️", putar: "-10deg", jeda: "0s" },
              { e: "🎤", putar: "9deg", jeda: "-1.4s" },
              { e: "✨", putar: "-6deg", jeda: "-2.6s" },
            ].map((s) => (
              <span
                key={s.e}
                className="stiker-ai flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl ring-1 ring-white/20 backdrop-blur"
                style={{ ["--putar" as string]: s.putar, animationDelay: s.jeda }}
              >
                {s.e}
              </span>
            ))}
          </div>
          <h1 className="text-[2rem] font-black leading-none tracking-tight">Naskah AI</h1>
          <p className="mt-2 max-w-[15rem] text-lg font-extrabold leading-snug tracking-tight sm:max-w-md" aria-live="polite">
            <span className="teks-gradasi-ai">{aktif.sorot}</span> {aktif.lanjut}
          </p>
        </div>

        <div role="tablist" aria-label="Mode Naskah AI" className="relative mt-4 grid grid-cols-2 rounded-2xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur sm:max-w-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-md transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${indeks * 100}%)` }}
          />
          {MODE.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`${idDasar}-tab-${m.id}`}
              aria-selected={mode === m.id}
              aria-controls={`${idDasar}-panel-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`relative z-10 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors ${
                mode === m.id ? "text-[#170b26]" : "text-white/75 hover:text-white"
              }`}
            >
              <span aria-hidden="true">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* overflow-x-clip (bukan hidden) supaya tombol "Bikin" tetap bisa menempel di bawah layar */}
      <div className="overflow-x-clip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex items-start transition-transform duration-300 ease-out"
          style={{ width: "200%", transform: `translateX(-${indeks * 50}%)` }}
        >
          {MODE.map((m) => (
            <div
              key={m.id}
              role="tabpanel"
              id={`${idDasar}-panel-${m.id}`}
              aria-labelledby={`${idDasar}-tab-${m.id}`}
              inert={mode !== m.id}
              className="w-1/2 shrink-0 px-0.5"
            >
              {m.id === "naskah" ? <SlideNaskah /> : <SlidePertanyaan />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
