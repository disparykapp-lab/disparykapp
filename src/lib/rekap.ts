import { supabase } from "./supabase";
import type { Absensi } from "../types/database";
import { jumlahHariKerja, keYMD } from "./tanggal";

export interface BarisAbsensi extends Absensi {
  profiles?: { nama: string } | null;
}

export async function ambilAbsensiRentang(opts: {
  dari: Date;
  sampai: Date;
  userIds?: string[];
}): Promise<BarisAbsensi[]> {
  let query = supabase
    .from("absensi")
    .select("*, profiles(nama)")
    .gte("tanggal", keYMD(opts.dari))
    .lte("tanggal", keYMD(opts.sampai))
    .order("tanggal", { ascending: true });

  if (opts.userIds && opts.userIds.length > 0) {
    query = query.in("user_id", opts.userIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as BarisAbsensi[]) ?? [];
}

export interface Ringkasan {
  hadir: number;
  telat: number;
  dinasLuar: number;
  izin: number;
  tidakAbsen: number;
  totalJamKerja: number;
}

export function hitungRingkasan(rows: BarisAbsensi[], dari: Date, sampai: Date): Ringkasan {
  let hadir = 0;
  let telat = 0;
  let dinasLuar = 0;
  let izin = 0;
  let totalMs = 0;

  for (const r of rows) {
    if (r.status === "hadir") hadir++;
    else if (r.status === "telat") telat++;
    else if (r.status === "dinas_luar") dinasLuar++;
    else if (r.status === "izin") izin++;

    if (r.masuk_at && r.keluar_at) {
      totalMs += new Date(r.keluar_at).getTime() - new Date(r.masuk_at).getTime();
    }
  }

  const hariKerja = jumlahHariKerja(dari, sampai);
  const tidakAbsen = Math.max(0, hariKerja - rows.length);

  return {
    hadir,
    telat,
    dinasLuar,
    izin,
    tidakAbsen,
    totalJamKerja: totalMs / (1000 * 60 * 60),
  };
}

