import { supabase } from "./supabase";
import type { BarisAbsensi } from "./rekap";
import type { PegawaiTinjau } from "./tinjauAbsenAturan";

const PER_HALAMAN = 1000;

/** Semua baris absensi di rentang (dipaging, karena server membatasi 1000 baris sekali ambil). */
export async function ambilAbsensiTinjau(dari: string, sampai: string): Promise<BarisAbsensi[]> {
  const hasil: BarisAbsensi[] = [];
  for (let awal = 0; ; awal += PER_HALAMAN) {
    const { data, error } = await supabase
      .from("absensi")
      .select("*, profiles(nama, divisi_id)")
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .order("tanggal", { ascending: false })
      .order("id")
      .range(awal, awal + PER_HALAMAN - 1);
    if (error) throw new Error(error.message);
    const baris = (data as BarisAbsensi[]) ?? [];
    hasil.push(...baris);
    if (baris.length < PER_HALAMAN) return hasil;
  }
}

/** Pegawai aktif — untuk mencari siapa yang belum absen. */
export async function ambilPegawaiTinjau(): Promise<PegawaiTinjau[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama, divisi_id, foto_url, aktif, wajib_absen, created_at, tanggal_mulai_magang, tanggal_selesai_magang")
    .eq("aktif", true)
    .order("nama");
  if (error) throw new Error(error.message);
  return (data as PegawaiTinjau[]) ?? [];
}

/** URL sementara foto absen (bucket privat), diminta sekaligus per 100 foto. */
export async function urlFotoAbsensi(paths: string[]): Promise<Record<string, string | null>> {
  const hasil: Record<string, string | null> = {};
  for (let i = 0; i < paths.length; i += 100) {
    const potong = paths.slice(i, i + 100);
    const { data, error } = await supabase.storage.from("absensi").createSignedUrls(potong, 3600);
    for (const p of potong) hasil[p] = null;
    if (error || !data) continue;
    for (const d of data) if (d.path && d.signedUrl && !d.error) hasil[d.path] = d.signedUrl;
  }
  return hasil;
}
