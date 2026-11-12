import { useRef, useState, type PointerEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HariRekap, JenisRekap } from "../../lib/rekapSayaAturan";
import { GAYA_HARI } from "./gaya";

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtLengkap = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const AMBANG_GESER = 50;
const LAMA_TAHAN_MS = 450;

/** Rentang pilihan: mulai saja = sedang memilih tanggal akhir; keduanya = rentang aktif. */
export interface RentangRekap {
  mulai: string | null;
  selesai: string | null;
}

/**
 * Kalender satu bulan: tiap tanggal diwarnai sesuai kehadiran; geser untuk ganti bulan.
 * Tahan sebuah tanggal untuk memulai rentang, lalu ketuk tanggal akhir (boleh di bulan lain).
 */
const TANPA_RENTANG: RentangRekap = { mulai: null, selesai: null };

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
  rentang = TANPA_RENTANG,
  onRentang,
  bacaSaja = false,
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
  rentang?: RentangRekap;
  onRentang?: (r: RentangRekap) => void;
  /** true = tanpa pilih rentang (mis. dilihat admin) */
  bacaSaja?: boolean;
}) {
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const tahan = useRef<{ t: number; x: number; y: number } | null>(null);
  const baruDitahan = useRef(false);
  const memilihAkhir = !!rentang.mulai && !rentang.selesai;
  const [dari, sampai] =
    rentang.mulai && rentang.selesai
      ? [rentang.mulai, rentang.selesai].sort()
      : [rentang.mulai, rentang.mulai];

  function mulaiTahan(e: PointerEvent, tanggal: string) {
    if (bacaSaja || !onRentang) return;
    const x = e.clientX;
    const y = e.clientY;
    const t = window.setTimeout(() => {
      tahan.current = null;
      baruDitahan.current = true;
      navigator.vibrate?.(15);
      onRentang?.({ mulai: tanggal, selesai: null });
    }, LAMA_TAHAN_MS);
    tahan.current = { t, x, y };
  }
  function batalTahan(e?: PointerEvent) {
    const h = tahan.current;
    if (!h) return;
    // bergeser sedikit masih dianggap menahan; lebih jauh = menggeser kalender
    if (e && e.type === "pointermove" && Math.hypot(e.clientX - h.x, e.clientY - h.y) < 10) return;
    window.clearTimeout(h.t);
    tahan.current = null;
  }
  function ketuk(tanggal: string, bisaDetail: boolean) {
    if (baruDitahan.current) {
      baruDitahan.current = false;
      return;
    }
    if (memilihAkhir && rentang.mulai) {
      const [a, b] = [rentang.mulai, tanggal].sort();
      onRentang?.({ mulai: a, selesai: b });
      return;
    }
    if (bisaDetail) onPilih(tanggal);
  }

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
          {(rentang.mulai || rentang.selesai) && (
            <button type="button" onClick={() => onRentang?.({ mulai: null, selesai: null })} className="rounded-full border border-brand-masuk/30 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk">
              Hapus rentang
            </button>
          )}
          {!(rentang.mulai || rentang.selesai) && onKeBulanIni && (
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
            const ujung = h.tanggal === dari || h.tanggal === sampai;
            const dalam = !!dari && !!sampai && h.tanggal >= dari && h.tanggal <= sampai;
            const kelas = `relative flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${g.sel} ${redup ? "opacity-20" : ""} ${
              ujung ? "outline outline-2 outline-offset-2 outline-brand-masuk" : ""
            }`;
            const isi = (
              <>
                {Number(h.tanggal.slice(8))}
                {h.tanggal === hariIni && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-brand-masuk" aria-hidden="true" />}
              </>
            );
            const label = [fmtLengkap.format(keDate(h.tanggal)), h.tanggal === hariIni && "hari ini", g.label].filter(Boolean).join(", ");
            // pita rentang di belakang tanggal: membulat di ujung awal & akhir
            const kolom = (keDate(h.tanggal).getUTCDay() + 6) % 7; // 0 = Senin
            const pita = dalam
              ? `bg-brand-masuk/10 ${h.tanggal === dari || kolom === 0 ? "rounded-l-full" : ""} ${h.tanggal === sampai || kolom === 6 ? "rounded-r-full" : ""}`
              : "";
            return (
              <div key={h.tanggal} className={`flex justify-center ${pita}`}>
                <button
                  type="button"
                  onClick={() => ketuk(h.tanggal, bisa)}
                  onPointerDown={(e) => mulaiTahan(e, h.tanggal)}
                  onPointerUp={() => batalTahan()}
                  onPointerLeave={() => batalTahan()}
                  onPointerCancel={() => batalTahan()}
                  onPointerMove={(e) => batalTahan(e)}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={label}
                  aria-haspopup={bisa && !memilihAkhir ? "dialog" : undefined}
                  className={`${kelas} select-none [-webkit-touch-callout:none] ${bisa || memilihAkhir ? "active:scale-90" : "cursor-default"}`}
                >
                  {isi}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <p className={`mt-2 text-[11px] ${memilihAkhir ? "font-semibold text-brand-masuk" : "text-gray-400"}`} aria-live="polite">
        {memilihAkhir
          ? "Ketuk tanggal akhir rentang (boleh geser ke bulan lain)"
          : bacaSaja
            ? "Ketuk tanggal berwarna untuk melihat detail · geser untuk ganti bulan"
            : "Ketuk tanggal berwarna untuk melihat detail · tahan tanggal untuk pilih rentang · geser untuk ganti bulan"}
      </p>
    </section>
  );
}
