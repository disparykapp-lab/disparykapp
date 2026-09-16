import { addDays, addMonths } from "date-fns";
import { supabase } from "./supabase";
import { keYMD } from "./tanggal";

export interface StatusRetensi {
  akanTerhapus: number;
  retensiBulan: number;
}

/**
 * Hitung berapa banyak baris absensi yang akan terhapus otomatis dalam
 * 7 hari ke depan (mendekati batas retensi yang diatur admin), supaya
 * bisa ditampilkan sebagai peringatan "ekspor dulu" ke admin.
 */
export async function cekRetensiAbsensi(): Promise<StatusRetensi | null> {
  const { data: cfg } = await supabase
    .from("pengaturan")
    .select("retensi_absensi_bulan")
    .eq("id", 1)
    .maybeSingle();

  const bulan = cfg?.retensi_absensi_bulan ?? 3;
  const batasMendekat = keYMD(addDays(addMonths(new Date(), -bulan), 7));

  const { count, error } = await supabase
    .from("absensi")
    .select("id", { count: "exact", head: true })
    .lt("tanggal", batasMendekat);

  if (error) return null;
  return { akanTerhapus: count ?? 0, retensiBulan: bulan };
}
