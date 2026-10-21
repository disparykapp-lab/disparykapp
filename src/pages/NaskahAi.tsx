import { useRef, useState, type TouchEvent } from "react";
import HeaderHalaman from "../components/HeaderHalaman";
import SlideNaskah from "./naskahAi/SlideNaskah";
import SlidePertanyaan from "./naskahAi/SlidePertanyaan";

const SLIDE = ["naskah", "pertanyaan"] as const;
type Slide = (typeof SLIDE)[number];

const AMBANG_GESER = 60;

export default function NaskahAi() {
  const [slide, setSlide] = useState<Slide>("naskah");
  const mulai = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
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
    if (dx < 0) setSlide("pertanyaan");
    else setSlide("naskah");
  }

  const indeks = SLIDE.indexOf(slide);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Naskah AI" kembaliKe="/beranda" />

      <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
        <TombolSlide aktif={slide === "naskah"} onClick={() => setSlide("naskah")}>
          📝 Naskah
        </TombolSlide>
        <TombolSlide aktif={slide === "pertanyaan"} onClick={() => setSlide("pertanyaan")}>
          🎤 Pertanyaan Wawancara
        </TombolSlide>
      </div>

      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ width: "200%", transform: `translateX(-${indeks * 50}%)` }}
        >
          <div className="w-1/2 shrink-0 px-0.5">
            <SlideNaskah />
          </div>
          <div className="w-1/2 shrink-0 px-0.5">
            <SlidePertanyaan />
          </div>
        </div>
      </div>
    </div>
  );
}

function TombolSlide({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
        aktif ? "bg-brand-masuk text-white" : "text-gray-500"
      }`}
    >
      {children}
    </button>
  );
}
