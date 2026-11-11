import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { batasPilihan, hariKerja, pilihTanggal, tambahHari, type PilihanRentang } from "../lib/izinAturan";

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtLengkap = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/** Penanda hari: sudah ada izin lain, atau sudah absen (masuk kerja). */
export type TandaHari = "izin" | "masuk";

/**
 * Kalender pilih rentang tanggal (seperti memilih tanggal tiket): ketuk tanggal
 * mulai, lalu tanggal selesai. Sabtu/Minggu tampil pudar karena tidak dihitung izin.
 */
export default function KalenderRentang({
  pilihan,
  onPilih,
  hariIni,
  tanda,
}: {
  pilihan: PilihanRentang;
  onPilih: (p: PilihanRentang) => void;
  hariIni: string;
  tanda: Record<string, TandaHari>;
}) {
  const [bulan, setBulan] = useState((pilihan.mulai ?? hariIni).slice(0, 7));
  const [arah, setArah] = useState<string | null>(null);
  const { min, max } = batasPilihan(hariIni, pilihan);
  const batasLuar = batasPilihan(hariIni, { mulai: null, selesai: null });

  const awal = `${bulan}-01`;
  const geser = (n: number) => setBulan(geserBulanYmd(awal, n).slice(0, 7));
  const akhirBulan = tambahHari(geserBulanYmd(awal, 1), -1);
  const kosongDepan = (keDate(awal).getUTCDay() + 6) % 7;
  const sel: (string | null)[] = [...Array(kosongDepan).fill(null)];
  for (let d = awal; d <= akhirBulan; d = tambahHari(d, 1)) sel.push(d);
  while (sel.length % 7) sel.push(null);

  // ujung rentang yang ditampilkan: selesai, atau tanggal yang sedang ditunjuk saat memilih selesai
  const ujung = pilihan.selesai ?? (pilihan.mulai && arah && arah >= pilihan.mulai && arah <= max ? arah : null);

  return (
    <div className="select-none" onMouseLeave={() => setArah(null)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => geser(-1)}
          disabled={awal <= batasLuar.min}
          aria-label="Bulan sebelumnya"
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-text hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-bold capitalize text-brand-text" aria-live="polite">
          {fmtBulan.format(keDate(awal))}
        </p>
        <button
          type="button"
          onClick={() => geser(1)}
          disabled={akhirBulan >= batasLuar.max}
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
      <div className="grid grid-cols-7 gap-y-1" role="group" aria-label="Pilih tanggal izin">
        {sel.map((d, i) => {
          if (!d) return <span key={`k${i}`} />;
          const mulai = pilihan.mulai === d;
          const selesai = ujung === d;
          const diDalam = !!pilihan.mulai && !!ujung && d > pilihan.mulai && d < ujung;
          const berpita = !!pilihan.mulai && !!ujung && ujung > pilihan.mulai && (mulai || selesai || diDalam);
          const libur = !hariKerja(d);
          const mati = d < min || d > max;
          const t = tanda[d];
          const label = [
            fmtLengkap.format(keDate(d)),
            d === hariIni && "hari ini",
            mulai && "mulai izin",
            selesai && pilihan.selesai && "selesai izin",
            libur && "akhir pekan, tidak dihitung",
            t === "masuk" && "sudah absen",
            t === "izin" && "sudah ada izin",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <div
              key={d}
              className={`flex justify-center ${berpita ? "bg-brand-masuk/10" : ""} ${berpita && mulai ? "rounded-l-full" : ""} ${berpita && selesai ? "rounded-r-full" : ""}`}
            >
              <button
                type="button"
                disabled={mati}
                onClick={() => onPilih(pilihTanggal(pilihan, d))}
                onMouseEnter={() => setArah(d)}
                aria-label={label}
                aria-pressed={mulai || (selesai && !!pilihan.selesai) || diDalam}
                className={`relative flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm transition ${
                  mulai || selesai
                    ? "bg-brand-masuk font-bold text-white"
                    : mati
                      ? "text-gray-200"
                      : libur
                        ? "text-gray-400 hover:bg-gray-100"
                        : "text-brand-text hover:bg-gray-100"
                } ${d === hariIni && !(mulai || selesai) ? "font-bold ring-1 ring-brand-masuk/60" : ""}`}
              >
                {Number(d.slice(8))}
                {t && !mati && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${mulai || selesai ? "bg-white" : t === "masuk" ? "bg-green-500" : "bg-amber-500"}`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" /> sudah ada izin
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" /> sudah absen
        </span>
        <span>Sabtu–Minggu tidak dihitung</span>
      </p>
    </div>
  );
}

function geserBulanYmd(ymd: string, n: number): string {
  const d = keDate(ymd);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
