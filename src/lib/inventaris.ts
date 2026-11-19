// Akses data Inventaris (migrasi 0045). Semua penulisan lewat RPC — tabelnya
// hanya bisa dibaca klien. Aturan murni ada di inventarisAturan.ts.
import { supabase } from "./supabase";
import { kompresGambar, unggahDenganProgres } from "./unggah";
import { pathFotoKecil, rapikan, type FormBarang, type FormMutasi } from "./inventarisAturan";
import type { BarangInventaris, LogInventaris, MutasiInventaris } from "../types/database";

const BUCKET = "inventaris_foto";
export const PESAN_INVENTARIS_BELUM_AKTIF =
  "Fitur Inventaris belum aktif di database. Admin perlu menjalankan migrasi 0045_inventaris.sql di Supabase.";

function galat(pesan: string): Error {
  if (/inventaris/i.test(pesan) && /does not exist|Could not find|schema cache/i.test(pesan)) {
    return new Error(PESAN_INVENTARIS_BELUM_AKTIF);
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(pesan)) {
    return new Error("Koneksi internet terputus. Coba lagi.");
  }
  return new Error(pesan);
}

export type Pelaku = { nama: string; foto_url: string | null } | null;
export type MutasiDenganPencatat = MutasiInventaris & { pencatat: Pelaku };
export type LogDenganPelaku = LogInventaris & { pelaku: Pelaku };

export function urlFotoBarang(path: string | null, kecil = false): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(kecil ? pathFotoKecil(path) : path).data.publicUrl;
}

/* ---------- baca ---------- */

export async function ambilBarang(): Promise<BarangInventaris[]> {
  const { data, error } = await supabase.from("inventaris_barang").select("*").is("dihapus_at", null).order("nama");
  if (error) throw galat(error.message);
  return (data as BarangInventaris[]) ?? [];
}

/** Satu barang, termasuk yang sudah dihapus (dibuka dari log). */
export async function ambilSatuBarang(id: string): Promise<BarangInventaris | null> {
  const { data, error } = await supabase.from("inventaris_barang").select("*").eq("id", id).maybeSingle();
  if (error) throw galat(error.message);
  return (data as BarangInventaris | null) ?? null;
}

export async function ambilMutasiSejak(tanggal: string): Promise<Pick<MutasiInventaris, "barang_id" | "jenis" | "jumlah">[]> {
  const { data, error } = await supabase.from("inventaris_mutasi").select("barang_id, jenis, jumlah").gte("tanggal", tanggal);
  if (error) throw galat(error.message);
  return (data as Pick<MutasiInventaris, "barang_id" | "jenis" | "jumlah">[]) ?? [];
}

/** Catatan masuk/keluar satu barang, terbaru dulu. */
export async function ambilRiwayatBarang(barangId: string, batas = 200): Promise<MutasiDenganPencatat[]> {
  const { data, error } = await supabase
    .from("inventaris_mutasi")
    .select("*, pencatat:user_id(nama, foto_url)")
    .eq("barang_id", barangId)
    .order("tanggal", { ascending: false })
    .order("urut", { ascending: false })
    .limit(batas);
  if (error) throw galat(error.message);
  return (data as MutasiDenganPencatat[]) ?? [];
}

/** Isian "untuk/dari" terbaru di semua barang, untuk chip saran. */
export async function ambilPihakTerakhir(): Promise<Pick<MutasiInventaris, "jenis" | "pihak">[]> {
  const { data, error } = await supabase
    .from("inventaris_mutasi")
    .select("jenis, pihak")
    .not("pihak", "is", null)
    .order("urut", { ascending: false })
    .limit(150);
  if (error) throw galat(error.message);
  return (data as Pick<MutasiInventaris, "jenis" | "pihak">[]) ?? [];
}

export type SaringanLog = "semua" | "keluar" | "masuk" | "barang";

export async function ambilLog(opsi: { saringan: SaringanLog; sebelumId?: number; batas?: number }): Promise<LogDenganPelaku[]> {
  let q = supabase
    .from("inventaris_log")
    .select("*, pelaku:user_id(nama, foto_url)")
    .order("id", { ascending: false })
    .limit(opsi.batas ?? 40);
  if (opsi.saringan === "keluar" || opsi.saringan === "masuk") q = q.eq("jenis", opsi.saringan);
  if (opsi.saringan === "barang") q = q.in("aksi", ["barang_tambah", "barang_ubah", "barang_hapus", "barang_pulihkan"]);
  if (opsi.sebelumId) q = q.lt("id", opsi.sebelumId);
  const { data, error } = await q;
  if (error) throw galat(error.message);
  return (data as LogDenganPelaku[]) ?? [];
}

/* ---------- tulis (RPC) ---------- */

export async function simpanBarang(id: string | null, f: FormBarang, fotoPath: string | null): Promise<string> {
  const { data, error } = await supabase.rpc("inventaris_simpan_barang", {
    p_id: id,
    p_nama: rapikan(f.nama),
    p_kategori: rapikan(f.kategori),
    p_satuan: rapikan(f.satuan),
    p_stok_minimum: f.stokMinimum,
    p_keterangan: f.keterangan.trim(),
    p_foto_path: fotoPath,
    p_stok_awal: id ? 0 : f.stokAwal,
  });
  if (error) throw galat(error.message);
  return data as string;
}

export async function hapusBarang(id: string): Promise<void> {
  const { error } = await supabase.rpc("inventaris_hapus_barang", { p_id: id });
  if (error) throw galat(error.message);
}

export async function pulihkanBarang(id: string): Promise<void> {
  const { error } = await supabase.rpc("inventaris_pulihkan_barang", { p_id: id });
  if (error) throw galat(error.message);
}

export async function simpanMutasi(id: string | null, barangId: string, f: FormMutasi): Promise<string> {
  const { data, error } = await supabase.rpc("inventaris_simpan_mutasi", {
    p_id: id,
    p_barang_id: barangId,
    p_jenis: f.jenis,
    p_jumlah: f.jumlah,
    p_tanggal: f.tanggal,
    p_pihak: rapikan(f.pihak),
    p_keterangan: f.keterangan.trim(),
  });
  if (error) throw galat(error.message);
  return data as string;
}

export async function hapusMutasi(id: string): Promise<void> {
  const { error } = await supabase.rpc("inventaris_hapus_mutasi", { p_id: id });
  if (error) throw galat(error.message);
}

/* ---------- foto ---------- */

/** Kompres foto jadi dua ukuran (detail & kartu), unggah, kembalikan path utamanya. */
export async function unggahFotoBarang(userId: string, file: Blob, onProgres: (persen: number) => void): Promise<string> {
  let besar: Blob;
  let kecil: Blob;
  try {
    besar = await kompresGambar(file, 1080, 260_000);
    kecil = await kompresGambar(besar, 360, 40_000);
  } catch {
    throw new Error("Foto ini tidak bisa dibaca. Coba foto lain (JPG/PNG).");
  }
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const umum = {
    bucket: BUCKET,
    tipe: "image/jpeg",
    pesanBelumAktif: PESAN_INVENTARIS_BELUM_AKTIF,
    pesanDitolak: "Divisi kamu belum diberi akses Inventaris.",
  };
  await unggahDenganProgres({ ...umum, path: pathFotoKecil(path), isi: kecil, onProgres: (p) => onProgres(Math.round(p * 0.15)) });
  await unggahDenganProgres({ ...umum, path, isi: besar, onProgres: (p) => onProgres(15 + Math.round(p * 0.85)) });
  return path;
}
