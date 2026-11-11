// Kartu "Status Hari Ini" di Beranda (murni — diuji di tests/statusHariIni.test.ts).
// Semua jam dihitung di WIB (UTC+7), sama dengan absen_masuk() di server.
import { hariKerja } from "./izinAturan.ts";

export type Tahap = "belum" | "kerja" | "selesai" | "izin" | "libur";

interface AbsenHariIni {
  status: string;
  masuk_at: string | null;
  keluar_at: string | null;
}

export interface KeadaanHariIni {
  tahap: Tahap;
  /** posisi pesawat di rute Masuk → Pulang, 0..1 */
  progres: number;
  /** lama bekerja sejauh ini (menit), 0 kalau belum masuk */
  kerjaMenit: number;
  /** menit menuju jam pulang (negatif = sudah lewat); null kalau jam pulang tidak diketahui */
  menujuPulang: number | null;
  /** menit menuju jam masuk (negatif = sudah lewat); null kalau jam masuk tidak diketahui */
  menujuMasuk: number | null;
}

const MENIT = 60_000;

/** "08:00:00" pada tanggal WIB tsb → epoch ms. */
export function jamPada(tanggal: string, jam: string): number {
  const [h, m] = jam.split(":").map(Number);
  return Date.parse(`${tanggal}T00:00:00+07:00`) + (h * 60 + m) * MENIT;
}

export function keadaanHariIni(
  absensi: AbsenHariIni | null,
  sekarang: number,
  tanggal: string,
  jamMasuk: string | null,
  jamPulang: string | null
): KeadaanHariIni {
  const pulangMs = jamPulang ? jamPada(tanggal, jamPulang) : null;
  const masukMs = jamMasuk ? jamPada(tanggal, jamMasuk) : null;
  const menujuPulang = pulangMs === null ? null : Math.round((pulangMs - sekarang) / MENIT);
  const menujuMasuk = masukMs === null ? null : Math.round((masukMs - sekarang) / MENIT);
  const dasar = { menujuPulang, menujuMasuk };

  if (!absensi?.masuk_at) {
    const tahap: Tahap = absensi?.status === "izin" ? "izin" : hariKerja(tanggal) ? "belum" : "libur";
    return { tahap, progres: 0, kerjaMenit: 0, ...dasar };
  }

  const masuk = Date.parse(absensi.masuk_at);
  if (absensi.keluar_at) {
    const keluar = Date.parse(absensi.keluar_at);
    return { tahap: "selesai", progres: 1, kerjaMenit: Math.max(0, Math.round((keluar - masuk) / MENIT)), ...dasar };
  }

  const kerjaMenit = Math.max(0, Math.round((sekarang - masuk) / MENIT));
  // pesawat terbang dari jam masuk menuju jam pulang; tanpa jam pulang, anggap 8 jam
  const target = pulangMs !== null && pulangMs > masuk ? pulangMs : masuk + 8 * 60 * MENIT;
  const progres = Math.min(1, Math.max(0, (sekarang - masuk) / (target - masuk)));
  return { tahap: "kerja", progres, kerjaMenit, ...dasar };
}

/** 192 → "3j 12m", 45 → "45m", 120 → "2j". */
export function formatDurasi(menit: number): string {
  const m = Math.max(0, Math.round(menit));
  const j = Math.floor(m / 60);
  const s = m % 60;
  if (j === 0) return `${s}m`;
  return s === 0 ? `${j}j` : `${j}j ${s}m`;
}

/** "08:00:00" → "08.00" (gaya jam Indonesia). */
export const jamPendek = (jam: string) => jam.slice(0, 5).replace(":", ".");
