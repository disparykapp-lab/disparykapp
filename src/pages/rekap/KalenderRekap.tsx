import { useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HariRekap, JenisRekap } from "../../lib/rekapSayaAturan";
import { GAYA_HARI } from "./gaya";

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtLengkap = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const AMBANG_GESER = 50;

/** Kalender satu bulan: tiap tanggal diwarnai sesuai kehadiran; geser untuk ganti bulan. */
export default function KalenderRekap({
  ym,
  hari,
  hariIni,
  sorot,
  bisaMundur,
  bisaMaju,
  onGeser,
  onKeBulanIni,
  onPilih,
}: {
  ym: string;
  hari: HariRekap[];
  hariIni: string;
  sorot: JenisRekap | null;
  bisaMundur: boolean;
  bisaMaju: boolean;
  onGeser: (n: 1 | -1) => void;
  onKeBulanIni: (() => void) | null;
  onPilih: (tanggal: string) => void;
}) {
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const sentuh = useRef<{ x: number; y: number } | null>(null);

  function geser(n: 1 | -1) {
    if ((n < 0 && !bisaMundur) || (n > 0 && !bisaMaju)) return;
    setArah(n > 0 ? "kanan" : "kiri");
    onGeser(n);
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    sentuh.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const awal = sentuh.current;
    sentuh.current = null;
    if (!awal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - awal.x;
    if (Math.abs(dx) < AMBANG_GESER || Math.abs(dx) < Math.abs(t.clientY - awal.y)) return;
    geser(dx < 0 ? 1 : -1);
  }

  const kosongDepan = hari.length ? (keDate(hari[0].tanggal).getUTCDay() + 6) % 7 : 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => geser(-1)}
          disabled={!bisaMundur}
          aria-label="Bulan sebelumnya"
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold capitalize text-brand-text" aria-live="polite">
            {fmtBulan.format(keDate(`${ym}-01`))}
          </p>
          {onKeBulanIni && (
            <button type="button" onClick={onKeBulanIni} className="rounded-full border border-brand-masuk/30 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk">
              Bulan ini
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => geser(1)}
          disabled={!bisaMaju}
          aria-label="Bulan berikutnya"
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400" aria-hidden="true">
        {NAMA_HARI.map((h, i) => (
          <span key={h} className={`pb-1 ${i >= 5 ? "text-red-300" : ""}`}>
            {h}
          </span>
        ))}
      </div>

      <div className="-mx-1 touch-pan-y overflow-hidden px-1 py-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={ym} className={`grid grid-cols-7 gap-y-1.5 ${arah ? `anim-geser-${arah}` : ""}`} role="group" aria-label="Kalender kehadiran">
          {Array.from({ length: kosongDepan }, (_, i) => (
            <span key={`k${i}`} />
          ))}
          {hari.map((h) => {
            const g = GAYA_HARI[h.jenis];
            const bisa = !!h.row || h.jenis === "tidak";
            const redup = sorot !== null && h.jenis !== sorot;
            const kelas = `relative flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${g.sel} ${redup ? "opacity-20" : ""}`;
            const isi = (
              <>
                {Number(h.tanggal.slice(8))}
                {h.tanggal === hariIni && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-brand-masuk" aria-hidden="true" />}
              </>
            );
            const label = [fmtLengkap.format(keDate(h.tanggal)), h.tanggal === hariIni && "hari ini", g.label].filter(Boolean).join(", ");
            return (
              <div key={h.tanggal} className="flex justify-center">
                {bisa ? (
                  <button type="button" onClick={() => onPilih(h.tanggal)} aria-label={label} aria-haspopup="dialog" className={`${kelas} active:scale-90`}>
                    {isi}
                  </button>
                ) : (
                  <span className={kelas} aria-label={label}>
                    {isi}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Ketuk tanggal berwarna untuk melihat detail · geser untuk ganti bulan</p>
    </section>
  );
}
