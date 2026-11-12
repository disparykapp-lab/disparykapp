import { supabase } from "./supabase";
import type { Absensi } from "../types/database";
import { keYMD } from "./tanggal";

export interface BarisAbsensi extends Absensi {
  profiles?: { nama: string; divisi_id: string | null } | null;
}

export async function ambilAbsensiRentang(opts: {
  dari: Date;
  sampai: Date;
  userIds?: string[];
}): Promise<BarisAbsensi[]> {
  let query = supabase
    .from("absensi")
    .select("*, profiles(nama, divisi_id)")
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

export { hitungRingkasan, type Ringkasan } from "./ringkasanAbsen";

/** Absensi milik satu pegawai di rentang tanggal "YYYY-MM-DD" (Rekap pegawai). */
export async function ambilAbsensiSaya(userId: string, dari: string, sampai: string): Promise<BarisAbsensi[]> {
  const { data, error } = await supabase
    .from("absensi")
    .select("*")
    .eq("user_id", userId)
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as BarisAbsensi[]) ?? [];
}
