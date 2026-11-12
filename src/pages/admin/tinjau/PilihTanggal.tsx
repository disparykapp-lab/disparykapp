import { useRef, useState, type TouchEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { tambahHari } from "../../../lib/izinAturan";
import {
  MAKS_HARI_TINJAU,
  PILIHAN_CEPAT,
  batasTinjau,
  hariSeminggu,
  labelRentang,
  rentangCepat,
  seninDari,
} from "../../../lib/tinjauAbsenAturan";
import LembarRentang from "../../../components/LembarRentang";

const ubahCepat = (r: { mulai: string; selesai: string }) => ({ dari: r.mulai, sampai: r.selesai });

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtBulanPendek = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });
const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const AMBANG_GESER = 50;

/**
 * Pemilih tanggal Tinjau Absensi: strip satu minggu yang bisa digeser (ketuk
 * satu hari = tampilkan hari itu), plus kalender rentang seperti kalender izin.
 */
export default function PilihTanggal({
  dari,
  sampai,
  hariIni,
  onUbah,
}: {
  dari: string;
  sampai: string;
  hariIni: string;
  onUbah: (dari: string, sampai: string) => void;
}) {
  const [senin, setSenin] = useState(() => seninDari(sampai));
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const [kalender, setKalender] = useState(false);
  const sentuh = useRef<{ x: number; y: number } | null>(null);
  const { min, max } = batasTinjau(hariIni, { mulai: null, selesai: null });
  const label = labelRentang(dari, sampai, hariIni);
  const hari = hariSeminggu(senin);
  const minggu = hari[6];

  function ubah(d: string, s: string) {
    onUbah(d, s);
    const baru = seninDari(s);
    if (baru !== senin) {
      setArah(baru > senin ? "kanan" : "kiri");
      setSenin(baru);
    }
  }

  function geser(n: 1 | -1) {
    const baru = tambahHari(senin, 7 * n);
    if (n < 0 && tambahHari(baru, 6) < min) return;
    if (n > 0 && baru > max) return;
    setArah(n > 0 ? "kanan" : "kiri");
    setSenin(baru);
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

  const judulBulan =
    senin.slice(0, 7) === minggu.slice(0, 7)
      ? fmtBulan.format(keDate(senin))
      : `${fmtBulanPendek.format(keDate(senin))} – ${fmtBulan.format(keDate(minggu))}`;
  const bukanHariIni = dari !== hariIni || sampai !== hariIni;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-masuk">{label.ket || "Tanggal"}</p>
          <p className="font-bold leading-snug text-brand-text" aria-live="polite">
            {label.judul}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setKalender(true)}
          aria-haspopup="dialog"
          className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-lnd-sky px-3 text-sm font-semibold text-brand-masuk transition active:scale-95"
        >
          <CalendarDays size={16} aria-hidden="true" /> Kalender
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => geser(-1)}
          disabled={tambahHari(senin, -1) < min}
          aria-label="Minggu sebelumnya"
          className="flex h-9 w-9 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold capitalize text-brand-text">{judulBulan}</p>
          {bukanHariIni && (
            <button
              type="button"
              onClick={() => ubah(hariIni, hariIni)}
              className="rounded-full border border-brand-masuk/30 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk"
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

      {/* overflow-hidden memotong animasi geser; p-1 (dibalas -m-1) supaya garis "hari ini" & bayangan tidak ikut terpotong */}
      <div className="-mx-1 -mb-1 touch-pan-y overflow-hidden p-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={senin} className={`grid grid-cols-7 ${arah ? `anim-geser-${arah}` : ""}`} role="group" aria-label="Pilih hari">
          {hari.map((d, i) => {
            const mati = d < min || d > max;
            const terpilih = d >= dari && d <= sampai;
            const ujung = d === dari || d === sampai;
            const berpita = dari !== sampai && terpilih;
            const libur = i >= 5;
            return (
              <div
                key={d}
                className={`flex justify-center px-0.5 ${berpita ? "bg-brand-masuk/10" : ""} ${berpita && d === dari ? "rounded-l-2xl" : ""} ${berpita && d === sampai ? "rounded-r-2xl" : ""}`}
              >
                <button
                  type="button"
                  disabled={mati}
                  onClick={() => ubah(d, d)}
                  aria-pressed={terpilih}
                  aria-label={`${fmtHari.format(keDate(d))}${d === hariIni ? ", hari ini" : ""}`}
                  className={`flex h-14 w-full max-w-12 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${
                    ujung
                      ? "bg-brand-masuk text-white shadow-sm"
                      : mati
                        ? "text-gray-200"
                        : libur
                          ? "text-gray-400 hover:bg-gray-100"
                          : "text-brand-text hover:bg-gray-100"
                  } ${d === hariIni && !ujung ? "ring-1 ring-brand-masuk/60" : ""}`}
                >
                  <span className={`text-[10px] font-semibold ${ujung ? "text-white/80" : libur ? "text-red-300" : "text-gray-400"}`}>{NAMA_HARI[i]}</span>
                  <span className="text-base font-bold leading-tight">{Number(d.slice(8))}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {kalender && (
        <LembarRentang
          dari={dari}
          sampai={sampai}
          hariIni={hariIni}
          cepat={PILIHAN_CEPAT.map((c) => ({ id: c.id, label: c.label, ...ubahCepat(rentangCepat(c.id, hariIni)) }))}
          batas={(x) => batasTinjau(hariIni, x)}
          maksHari={MAKS_HARI_TINJAU}
          onTutup={() => setKalender(false)}
          onTerapkan={(d, s) => {
            setKalender(false);
            ubah(d, s);
          }}
        />
      )}
    </section>
  );
}
