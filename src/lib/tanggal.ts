import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { id } from "date-fns/locale";

export function formatTanggal(tanggal: string | Date, pola = "d MMM yyyy") {
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return format(d, pola, { locale: id });
}

export function rentangMinggu(ref: Date) {
  const dari = startOfWeek(ref, { weekStartsOn: 1 });
  const sampai = endOfWeek(ref, { weekStartsOn: 1 });
  return { dari, sampai };
}

export function rentangBulan(ref: Date) {
  return { dari: startOfMonth(ref), sampai: endOfMonth(ref) };
}

export function geserMinggu(ref: Date, arah: 1 | -1) {
  return addDays(ref, arah * 7);
}

export function geserBulan(ref: Date, arah: 1 | -1) {
  return addMonths(ref, arah);
}

export function keYMD(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Jumlah hari kerja (Senin-Jumat) dalam rentang tanggal, inklusif. */
export function jumlahHariKerja(dari: Date, sampai: Date): number {
  let n = 0;
  let cur = new Date(dari);
  const batasHariIni = new Date();
  batasHariIni.setHours(0, 0, 0, 0);
  const akhir = sampai < batasHariIni ? sampai : batasHariIni;
  while (cur <= akhir) {
    const hari = cur.getDay();
    if (hari !== 0 && hari !== 6) n++;
    cur = addDays(cur, 1);
  }
  return n;
}
