import { useId, useRef, useState, type TouchEvent } from "react";
import HeaderHalaman from "../components/HeaderHalaman";
import SlideNaskah from "./naskahAi/SlideNaskah";
import SlidePertanyaan from "./naskahAi/SlidePertanyaan";

const MODE = [
  { id: "naskah", label: "📝 Naskah", judul: "Bikin naskah liputan", ket: "Tulis poin-poin acaranya, AI yang merangkai jadi naskah." },
  { id: "pertanyaan", label: "🎤 Wawancara", judul: "Bikin pertanyaan wawancara", ket: "Tulis topiknya, AI yang menyusun daftar pertanyaannya." },
] as const;
type Mode = (typeof MODE)[number]["id"];

const AMBANG_GESER = 60;

/** Halaman Naskah AI: dua mode (naskah liputan & pertanyaan wawancara), bisa digeser. */
export default function NaskahAi() {
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
      <HeaderHalaman judul="Naskah AI" kembaliKe="/beranda" />

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <img src="/naskah-ai/naskah.png" alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-bold text-brand-text">{aktif.judul}</p>
            <p className="text-xs text-gray-500">{aktif.ket}</p>
          </div>
        </div>
        <div role="tablist" aria-label="Mode Naskah AI" className="grid grid-cols-2 gap-1.5 rounded-full bg-gray-100 p-1 lg:w-80 lg:shrink-0">
          {MODE.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`${idDasar}-tab-${m.id}`}
              aria-selected={mode === m.id}
              aria-controls={`${idDasar}-panel-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`min-h-[40px] rounded-full px-2 text-sm font-semibold transition-colors ${mode === m.id ? "bg-brand-masuk text-white" : "text-gray-500"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

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
