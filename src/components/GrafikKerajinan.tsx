import { useEffect, useMemo, useState } from "react";
import type { BarisAbsensi } from "../lib/rekap";
import { jumlahHariKerja } from "../lib/tanggal";
import { hitungPeringkat, type EntriPeringkat as Entri, type PegawaiGrafik } from "../lib/peringkat";

interface Props {
  rows: BarisAbsensi[];
  pegawai: PegawaiGrafik[];
  dari: Date;
  sampai: Date;
  /** jumlah pegawai yang tidak wajib absen (tidak diikutkan peringkat) */
  dikecualikan?: number;
}

function useCountUp(target: number, durasi = 900) {
  const [nilai, setNilai] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNilai(target);
      return;
    }
    let raf = 0;
    const mulai = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - mulai) / durasi);
      setNilai(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durasi]);
  return nilai;
}

function Skor({ nilai, className }: { nilai: number; className?: string }) {
  const tampil = useCountUp(nilai);
  return <span className={className}>{tampil}%</span>;
}

function Avatar({ e, ukuran }: { e: Entri; ukuran: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-masuk/10 font-bold text-brand-masuk ${ukuran}`}
    >
      {e.foto_url ? (
        <img src={e.foto_url} alt="" className="h-full w-full object-cover" />
      ) : (
        e.nama.charAt(0).toUpperCase()
      )}
    </span>
  );
}

/**
 * Peringkat kerajinan pegawai untuk rentang tanggal yang sedang dilihat —
 * cuma podium 3 teratas, tidak ada daftar lengkap pegawai lain.
 */
export default function GrafikKerajinan({ rows, pegawai, dari, sampai, dikecualikan = 0 }: Props) {
  const hariKerja = useMemo(() => jumlahHariKerja(dari, sampai), [dari, sampai]);

  const daftar = useMemo(
    () => hitungPeringkat(rows, pegawai, dari, sampai),
    [rows, pegawai, dari, sampai]
  );

  if (hariKerja === 0) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-text">🏅 Peringkat Kerajinan</h2>
        <p className="mt-2 text-xs text-gray-400">
          Rentang ini belum punya hari kerja (Senin–Jumat) yang bisa dinilai.
        </p>
      </section>
    );
  }

  if (daftar.length === 0) return null;

  const podium = daftar.length >= 3 ? [daftar[1], daftar[0], daftar[2]] : [];
  const tinggiPodium = [64, 88, 48];
  const urutanMedali = ["🥈", "🥇", "🥉"];

  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm print:break-inside-avoid">
      <div>
        <h2 className="text-sm font-semibold text-brand-text">🏅 Peringkat Kerajinan</h2>
        {dikecualikan > 0 && (
          <p className="mt-0.5 text-[11px] text-gray-400">
            {dikecualikan} pegawai tidak wajib absen, tidak diikutkan.
          </p>
        )}
      </div>

      {podium.length === 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {podium.map((e, i) => (
            <div key={e.id} className="flex w-1/3 max-w-[9rem] flex-col items-center gap-1 text-center">
              <span
                className="anim-medali text-2xl"
                style={{ animationDelay: `${300 + i * 150}ms` }}
              >
                {urutanMedali[i]}
              </span>
              <Avatar e={e} ukuran={i === 1 ? "h-14 w-14 text-xl" : "h-11 w-11 text-base"} />
              <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-tight text-brand-text">
                {e.nama}
              </p>
              <Skor nilai={e.skor} className="text-sm font-bold text-brand-masuk" />
              <div
                className="anim-podium w-full rounded-t-lg bg-brand-masuk/15"
                style={{ height: tinggiPodium[i], animationDelay: `${i * 120}ms` }}
              />
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
