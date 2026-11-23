import { useRef, useState, type TouchEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { tambahHari } from "../lib/izinAturan";
import { hariSeminggu, seninDari } from "../lib/tinjauAbsenAturan";

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/**
 * Strip satu minggu (seperti Tinjau Absensi) untuk memilih satu tanggal: ketuk
 * hari, geser jari/panah untuk pindah minggu. Di luar `min`–`max` tidak bisa
 * dipilih (bawaan: hari depan mati). `lompat` = nama bulan bisa diketuk untuk
 * membuka kalender HP, supaya tanggal yang jauh tidak perlu digeser per minggu.
 */
export default function StripTanggal({
  nilai,
  hariIni,
  onUbah,
  min,
  max = hariIni,
  lompat = false,
}: {
  nilai: string;
  hariIni: string;
  onUbah: (ymd: string) => void;
  min: string;
  max?: string;
  lompat?: boolean;
}) {
  const [senin, setSenin] = useState(() => seninDari(nilai));
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const hari = hariSeminggu(senin);

  function geser(n: 1 | -1) {
    const baru = tambahHari(senin, 7 * n);
    if (n < 0 && tambahHari(baru, 6) < min) return;
    if (n > 0 && baru > max) return;
    setArah(n > 0 ? "kanan" : "kiri");
    setSenin(baru);
  }

  function pilih(d: string) {
    if (d < min || d > max) return;
    onUbah(d);
    const s = seninDari(d);
    if (s !== senin) {
      setArah(s > senin ? "kanan" : "kiri");
      setSenin(s);
    }
  }

  const bulan = fmtBulan.format(keDate(hari[3]));

  return (
    <div className="rounded-2xl border border-gray-200 p-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => geser(-1)}
          disabled={tambahHari(senin, -1) < min}
          aria-label="Minggu sebelumnya"
          className="flex h-9 w-9 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-1.5">
          {lompat ? (
            <label className="relative flex min-h-[36px] cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2 text-sm font-bold capitalize text-brand-text hover:bg-gray-100">
              {bulan} <ChevronDown size={14} className="text-gray-400" aria-hidden="true" />
              {/* kalender bawaan HP hanya untuk lompat jauh; tanggal tetap dipilih lewat strip */}
              <input
                type="date"
                value={nilai}
                min={min}
                max={max}
                onChange={(e) => e.target.value && pilih(e.target.value)}
                aria-label="Lompat ke tanggal"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          ) : (
            <p className="whitespace-nowrap text-sm font-bold capitalize text-brand-text">{bulan}</p>
          )}
          {nilai !== hariIni && hariIni >= min && hariIni <= max && (
            <button
              type="button"
              onClick={() => pilih(hariIni)}
              className="whitespace-nowrap rounded-full border border-brand-masuk/30 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk"
            >
              Hari ini
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => geser(1)}
          disabled={tambahHari(senin, 7) > max}
          aria-label="Minggu berikutnya"
          className="flex h-9 w-9 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div
        className="-mx-1 -mb-1 touch-pan-y overflow-hidden p-1"
        onTouchStart={(e: TouchEvent) => {
          const t = e.touches[0];
          sentuh.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e: TouchEvent) => {
          const awal = sentuh.current;
          sentuh.current = null;
          if (!awal) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - awal.x;
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(t.clientY - awal.y)) return;
          geser(dx < 0 ? 1 : -1);
        }}
      >
        <div key={senin} className={`grid grid-cols-7 ${arah ? `anim-geser-${arah}` : ""}`} role="group" aria-label="Pilih tanggal">
          {hari.map((d, i) => {
            const mati = d < min || d > max;
            const terpilih = d === nilai;
            const libur = i >= 5;
            return (
              <div key={d} className="flex justify-center px-0.5">
                <button
                  type="button"
                  disabled={mati}
                  onClick={() => pilih(d)}
                  aria-pressed={terpilih}
                  aria-label={`${fmtHari.format(keDate(d))}${d === hariIni ? ", hari ini" : ""}`}
                  className={`flex h-14 w-full max-w-12 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${
                    terpilih
                      ? "bg-brand-masuk text-white shadow-sm"
                      : mati
                        ? "text-gray-200"
                        : libur
                          ? "text-gray-400 hover:bg-gray-100"
                          : "text-brand-text hover:bg-gray-100"
                  } ${d === hariIni && !terpilih ? "ring-1 ring-brand-masuk/60" : ""}`}
                >
                  <span className={`text-[10px] font-semibold ${terpilih ? "text-white/80" : libur && !mati ? "text-red-300" : mati ? "text-gray-200" : "text-gray-400"}`}>
                    {NAMA_HARI[i]}
                  </span>
                  <span className="text-base font-bold leading-tight">{Number(d.slice(8))}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
