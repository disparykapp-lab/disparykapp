import { useId, useRef, useState, type TouchEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import KalenderRentang from "../../../components/KalenderRentang";
import { rentangAkhir, tambahHari, type PilihanRentang } from "../../../lib/izinAturan";
import {
  MAKS_HARI_TINJAU,
  PILIHAN_CEPAT,
  batasTinjau,
  hariSeminggu,
  labelRentang,
  rentangCepat,
  seninDari,
} from "../../../lib/tinjauAbsenAturan";
import Lembar from "../../../components/Lembar";
import { useModal } from "../../../lib/useModal";

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
        <SheetKalender
          dari={dari}
          sampai={sampai}
          hariIni={hariIni}
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

function SheetKalender({
  dari,
  sampai,
  hariIni,
  onTutup,
  onTerapkan,
}: {
  dari: string;
  sampai: string;
  hariIni: string;
  onTutup: () => void;
  onTerapkan: (dari: string, sampai: string) => void;
}) {
  const idJudul = useId();
  const [pilihan, setPilihan] = useState<PilihanRentang>({ mulai: dari, selesai: sampai });
  // kalender dipasang ulang saat memilih chip, supaya bulannya ikut pindah
  const [kunci, setKunci] = useState(0);
  useModal(onTutup);

  const akhir = rentangAkhir(pilihan);
  const ringkas = akhir ? labelRentang(akhir.mulai, akhir.selesai, hariIni) : null;

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      judul={
        <>
          <CalendarDays size={20} className="text-brand-masuk" aria-hidden="true" /> Pilih tanggal
        </>
      }
    >
      <p className="-mt-1 text-xs text-gray-500">Ketuk tanggal awal lalu tanggal akhir. Paling panjang {MAKS_HARI_TINJAU} hari.</p>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]" role="group" aria-label="Pilihan cepat">
        {PILIHAN_CEPAT.map((c) => {
          const r = rentangCepat(c.id, hariIni);
          const aktif = !!akhir && akhir.mulai === r.mulai && akhir.selesai === r.selesai;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={aktif}
              onClick={() => {
                setPilihan(r);
                setKunci((k) => k + 1);
              }}
              className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 text-brand-text"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <KalenderRentang
        key={kunci}
        pilihan={pilihan}
        onPilih={setPilihan}
        hariIni={hariIni}
        batas={(p) => batasTinjau(hariIni, p)}
        teks={{ grup: "Pilih tanggal absensi", mulai: "tanggal awal", selesai: "tanggal akhir", libur: "akhir pekan" }}
        legenda={<span>Sabtu–Minggu tampil pudar · lingkaran tipis = hari ini</span>}
      />

      {ringkas && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-sm font-bold text-brand-text">{ringkas.judul}</p>
          <p className="text-[11px] text-gray-500">
            {!pilihan.selesai ? "Sekarang ketuk tanggal akhir — atau langsung Tampilkan untuk satu hari." : ringkas.ket || "Satu hari"}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!akhir}
        onClick={() => akhir && onTerapkan(akhir.mulai, akhir.selesai)}
        className="min-h-[48px] rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
      >
        Tampilkan
      </button>
    </Lembar>
  );
}
