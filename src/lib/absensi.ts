import { supabase } from "./supabase";
import type { Absensi, ModeAbsen } from "../types/database";

export function tanggalHariIniWIB(): string {
  const sekarang = new Date();
  const wib = new Date(sekarang.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, "0");
  const d = String(wib.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function ambilAbsensiHariIni(userId: string): Promise<Absensi | null> {
  const { data, error } = await supabase
    .from("absensi")
    .select("*")
    .eq("user_id", userId)
    .eq("tanggal", tanggalHariIniWIB())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Absensi) ?? null;
}

export async function unggahFotoAbsen(
  userId: string,
  jenis: "masuk" | "keluar",
  blob: Blob
): Promise<string> {
  const tanggal = tanggalHariIniWIB();
  const path = `${userId}/${tanggal}/${jenis}-${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from("absensi").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) throw new Error("Gagal mengunggah foto. Periksa koneksi internet kamu.");
  return path;
}

export interface ParamAbsen {
  lat: number;
  lng: number;
  akurasi: number;
  mode: ModeAbsen;
  catatan: string | null;
  fotoPath: string;
}

export async function panggilAbsenMasuk(p: ParamAbsen) {
  const { data, error } = await supabase.rpc("absen_masuk", {
    p_lat: p.lat,
    p_lng: p.lng,
    p_akurasi: p.akurasi,
    p_mode: p.mode,
    p_catatan: p.catatan,
    p_foto_path: p.fotoPath,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; jarak_m: number; status: string };
}

export async function panggilAbsenPulang(p: ParamAbsen) {
  const { data, error } = await supabase.rpc("absen_pulang", {
    p_lat: p.lat,
    p_lng: p.lng,
    p_akurasi: p.akurasi,
    p_mode: p.mode,
    p_catatan: p.catatan,
    p_foto_path: p.fotoPath,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; jarak_m: number; status: string };
}

export async function tandaiAbsensi(id: string, ditandai: boolean, alasan: string | null) {
  const { error } = await supabase.rpc("tandai_absensi", {
    p_id: id,
    p_ditandai: ditandai,
    p_alasan: alasan,
  });
  if (error) throw new Error(error.message);
}

export async function kirimKlarifikasiAbsensi(tanggal: string, catatan: string, buktiUrl: string) {
  const { error } = await supabase.rpc("kirim_klarifikasi_absensi", {
    p_tanggal: tanggal,
    p_catatan: catatan,
    p_bukti_url: buktiUrl || null,
  });
  if (error) throw new Error(error.message);
}

/** Hapus satu foto absen: file di Storage lewat API resmi, lalu kosongkan referensinya di baris absensi. */
export async function hapusFotoAbsensi(id: string, jenis: "masuk" | "keluar", fotoPath: string) {
  const { error: errorStorage } = await supabase.storage.from("absensi").remove([fotoPath]);
  if (errorStorage) throw new Error("Gagal menghapus file foto: " + errorStorage.message);

  const { error: errorRpc } = await supabase.rpc("hapus_foto_absensi", {
    p_id: id,
    p_jenis: jenis,
  });
  if (errorRpc) throw new Error(errorRpc.message);
}
