import { useEffect, useMemo, useState } from "react";
import { hitungRingkasan, type BarisAbsensi } from "../lib/rekap";
import { jumlahHariKerja } from "../lib/tanggal";
import type { Profile } from "../types/database";

type PegawaiGrafik = Pick<Profile, "id" | "nama" | "foto_url">;

interface Props {
  rows: BarisAbsensi[];
  pegawai: PegawaiGrafik[];
  dari: Date;
  sampai: Date;
}

// Warna segmen = warna status (hadir hijau, telat kuning, tidak absen merah,
// dst). Kuning/merah/hijau memakai token status baku; makna warna selalu
// dibantu ikon + label + angka, jadi tidak bergantung pada warna saja.
const SEGMEN = [
  { kunci: "hadir", label: "Hadir tepat waktu", ikon: "✅", warna: "#0ca30c" },
  { kunci: "dinasLuar", label: "Dinas luar", ikon: "🚗", warna: "#2a78d6" },
  { kunci: "telat", label: "Telat", ikon: "⏰", warna: "#fab219" },
  { kunci: "izin", label: "Izin/Sakit", ikon: "📝", warna: "#4a3aa7" },
  { kunci: "tidakAbsen", label: "Tidak absen", ikon: "❌", warna: "#d03b3b" },
] as const;

interface Entri {
  id: string;
  nama: string;
  foto_url: string | null;
  hadir: number;
  dinasLuar: number;
  telat: number;
  izin: number;
  tidakAbsen: number;
  skor: number;
}

function tingkat(skor: number) {
  if (skor >= 95) return { label: "Sangat Rajin", emoji: "🌟", cls: "bg-green-100 text-green-800" };
  if (skor >= 85) return { label: "Rajin", emoji: "💪", cls: "bg-green-50 text-green-700" };
  if (skor >= 70) return { label: "Cukup", emoji: "🙂", cls: "bg-gray-100 text-gray-600" };
  if (skor >= 50) return { label: "Kurang Rajin", emoji: "😕", cls: "bg-amber-100 text-amber-800" };
  return { label: "Sangat Malas", emoji: "😴", cls: "bg-red-100 text-red-700" };
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
 * Peringkat kerajinan pegawai untuk rentang tanggal yang sedang dilihat:
 * podium 3 teratas, daftar "paling malas", dan bar bertumpuk per pegawai
 * (komposisi hari kerja: hadir/dinas luar/telat/izin/tidak absen).
 */
export default function GrafikKerajinan({ rows, pegawai, dari, sampai }: Props) {
  const hariKerja = useMemo(() => jumlahHariKerja(dari, sampai), [dari, sampai]);

  const daftar = useMemo<Entri[]>(() => {
    const perUser = new Map<string, BarisAbsensi[]>();
    for (const r of rows) {
      const arr = perUser.get(r.user_id) ?? [];
      arr.push(r);
      perUser.set(r.user_id, arr);
    }
    return pegawai
      .map((p) => {
        const r = hitungRingkasan(perUser.get(p.id) ?? [], dari, sampai);
        // Poin: hadir tepat waktu & dinas luar = 1, telat/izin = 1/2, tidak absen = 0.
        const poin = r.hadir + r.dinasLuar + 0.5 * (r.telat + r.izin);
        const skor = hariKerja > 0 ? Math.min(100, Math.round((poin / hariKerja) * 100)) : 0;
        return {
          id: p.id,
          nama: p.nama,
          foto_url: p.foto_url,
          hadir: r.hadir,
          dinasLuar: r.dinasLuar,
          telat: r.telat,
          izin: r.izin,
          tidakAbsen: r.tidakAbsen,
          skor,
        };
      })
      .sort(
        (a, b) =>
          b.skor - a.skor ||
          a.tidakAbsen - b.tidakAbsen ||
          a.telat - b.telat ||
          a.nama.localeCompare(b.nama, "id")
      );
  }, [rows, pegawai, dari, sampai, hariKerja]);

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
  const paling_malas = [...daftar]
    .reverse()
    .filter((e) => e.skor < 70)
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm print:break-inside-avoid">
      <div>
        <h2 className="text-sm font-semibold text-brand-text">🏅 Peringkat Kerajinan</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          {hariKerja} hari kerja · skor: hadir tepat waktu &amp; dinas luar = 1, telat/izin = ½,
          tidak absen = 0
        </p>
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

      {paling_malas.length > 0 && (
        <div className="rounded-xl bg-red-50 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">😴 Paling Malas</p>
          <div className="flex flex-wrap gap-2">
            {paling_malas.map((e) => (
              <span
                key={e.id}
                className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs shadow-sm"
              >
                <Avatar e={e} ukuran="h-6 w-6 text-[10px]" />
                <span className="font-semibold text-brand-text">{e.nama}</span>
                <span className="text-red-600">
                  {e.skor}% · tidak absen {e.tidakAbsen}x
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
        {SEGMEN.map((s) => (
          <span key={s.kunci} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.warna }} />
            {s.ikon} {s.label}
          </span>
        ))}
      </div>

      <ol className="flex flex-col gap-3">
        {daftar.map((e, i) => {
          const t = tingkat(e.skor);
          const total = Math.max(
            hariKerja,
            e.hadir + e.dinasLuar + e.telat + e.izin + e.tidakAbsen
          );
          return (
            <li key={e.id} className="flex items-start gap-3">
              <span className="w-6 shrink-0 pt-0.5 text-right text-xs font-bold text-gray-400">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-brand-text">{e.nama}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.cls}`}>
                      {t.emoji} {t.label}
                    </span>
                    <Skor nilai={e.skor} className="w-10 text-right text-sm font-bold text-brand-text" />
                  </div>
                </div>

                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="anim-bar flex h-full gap-[2px]"
                    style={{ animationDelay: `${Math.min(i, 20) * 40}ms` }}
                  >
                    {SEGMEN.map((s) => {
                      const jumlah = e[s.kunci];
                      if (jumlah <= 0) return null;
                      return (
                        <div
                          key={s.kunci}
                          title={`${s.label}: ${jumlah} hari`}
                          style={{ width: `${(jumlah / total) * 100}%`, backgroundColor: s.warna }}
                        />
                      );
                    })}
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-gray-500">
                  {SEGMEN.filter((s) => e[s.kunci] > 0)
                    .map((s) => `${s.ikon} ${s.label} ${e[s.kunci]}`)
                    .join(" · ") || "Belum ada data"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
