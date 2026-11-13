import type { Nada } from "../../lib/absenAturan";

export const NADA: Record<Nada, string> = {
  hijau: "bg-green-100 text-green-700",
  kuning: "bg-amber-100 text-amber-800",
  biru: "bg-sky-100 text-sky-700",
  abu: "bg-gray-100 text-gray-600",
};

export const CHIP_STATUS: Record<string, { teks: string; nada: Nada }> = {
  hadir: { teks: "Tepat waktu", nada: "hijau" },
  telat: { teks: "Telat", nada: "kuning" },
  dinas_luar: { teks: "Dinas Luar", nada: "biru" },
  izin: { teks: "Izin", nada: "abu" },
};

export const TOMBOL_UTAMA =
  "flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-masuk px-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50";
export const TOMBOL_KEDUA =
  "flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 font-semibold text-brand-text transition active:scale-[0.98]";

export const JUDUL_ABSEN = { masuk: "Absen Masuk", pulang: "Absen Pulang" } as const;
export const STIKER_ABSEN = { masuk: "/beranda/masuk.png", pulang: "/beranda/pulang.png" } as const;

const fmtJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const fmtDetik = new Intl.DateTimeFormat("id-ID", { second: "2-digit", timeZone: "Asia/Jakarta" });
const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
const fmtTanggal = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

/** "08.04" (WIB) */
export const jamWIB = (ms: number) => fmtJam.format(ms);
/** "07" detik (WIB) */
export const detikWIB = (ms: number) => fmtDetik.format(ms).padStart(2, "0");
/** "Kamis, 12 November" */
export const hariWIB = (ms: number) => fmtHari.format(ms);
/** "Kamis, 12 November 2026" */
export const tanggalWIB = (ms: number) => fmtTanggal.format(ms);
