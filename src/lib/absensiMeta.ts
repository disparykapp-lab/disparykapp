import type { StatusAbsen } from "../types/database";

export const LABEL_STATUS_ABSEN: Record<StatusAbsen, string> = {
  hadir: "Hadir",
  telat: "Telat",
  dinas_luar: "Dinas Luar",
  izin: "Izin/Sakit",
};

const SEHARI_MS = 24 * 60 * 60 * 1000;
const WIB_MS = 7 * 60 * 60 * 1000; // UTC+7, tanpa musim panas

/** Sisa waktu (ms) sampai pukul 00.00 WIB berikutnya — saat foto absen hari ini berhenti tampil. */
export function msSampaiBesokWIB(sekarang: Date = new Date()): number {
  return SEHARI_MS - ((sekarang.getTime() + WIB_MS) % SEHARI_MS);
}
