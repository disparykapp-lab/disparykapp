import { supabase } from "./supabase";
import {
  cekFileTwibbon,
  cekTransparansi,
  hitungTransparansi,
  ukuranUnggahTwibbon,
} from "./twibbonMeta";

// Twibbon foto absen yang bisa diganti admin (migrasi 0035). File ada di bucket
// publik "twibbon"; nama file yang dipakai dicatat di pengaturan.twibbon_path.

const BUCKET = "twibbon";

/** Nama file twibbon yang sedang dipakai; null = tanpa twibbon (bawaan). */
export async function ambilTwibbonPath(): Promise<string | null> {
  const { data, error } = await supabase.from("pengaturan").select("twibbon_path").eq("id", 1).maybeSingle();
  if (error) {
    if (error.message.includes("twibbon_path")) {
      throw new Error("Fitur twibbon belum aktif di database. Jalankan migrasi 0035_twibbon.sql di Supabase.");
    }
    throw new Error(error.message);
  }
  return (data as { twibbon_path: string | null } | null)?.twibbon_path ?? null;
}

/** URL publik twibbon; null = tanpa twibbon. */
export function urlTwibbon(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** URL bingkai untuk kamera absen; null = tanpa bingkai (juga kalau pengaturan gagal dibaca). */
export async function ambilUrlTwibbon(): Promise<string | null> {
  try {
    return urlTwibbon(await ambilTwibbonPath());
  } catch {
    return null;
  }
}

export interface HasilPeriksaTwibbon {
  /** Object URL untuk pratinjau — panggil URL.revokeObjectURL kalau sudah tidak dipakai. */
  pratinjau: string;
  lebar: number;
  tinggi: number;
  ukuranByte: number;
  /** File yang akan diunggah (sudah dikecilkan kalau lebih besar dari ukuran saran). */
  blob: Blob;
  masalah: string[];
}

/** Baca file pilihan admin lalu cek semua ketentuan twibbon. */
export async function periksaTwibbon(file: File): Promise<HasilPeriksaTwibbon> {
  const pratinjau = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error());
      img.src = pratinjau;
    });
  } catch {
    URL.revokeObjectURL(pratinjau);
    throw new Error("Gambar tidak bisa dibaca. Pastikan file berformat PNG.");
  }

  const lebar = img.naturalWidth;
  const tinggi = img.naturalHeight;
  const masalah = cekFileTwibbon({ tipe: file.type, ukuranByte: file.size, lebar, tinggi });

  // Transparansi cukup dicek di versi kecil gambar (120 px lebar).
  const kecil = document.createElement("canvas");
  kecil.width = 120;
  kecil.height = Math.max(1, Math.round((120 * tinggi) / lebar));
  const ctxKecil = kecil.getContext("2d", { willReadFrequently: true });
  if (!ctxKecil) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctxKecil.drawImage(img, 0, 0, kecil.width, kecil.height);
  const data = ctxKecil.getImageData(0, 0, kecil.width, kecil.height).data;
  masalah.push(...cekTransparansi(hitungTransparansi(data, kecil.width, kecil.height)));

  let blob: Blob = file;
  const target = ukuranUnggahTwibbon(lebar, tinggi);
  if (masalah.length === 0 && target.lebar < lebar) {
    const canvas = document.createElement("canvas");
    canvas.width = target.lebar;
    canvas.height = target.tinggi;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const kecilkan = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (kecilkan && kecilkan.size < file.size) blob = kecilkan;
  }

  return { pratinjau, lebar, tinggi, ukuranByte: file.size, blob, masalah };
}

/** Unggah twibbon baru, pakai di pengaturan, lalu hapus file lama. Mengembalikan path baru. */
export async function gantiTwibbon(blob: Blob, pathLama: string | null): Promise<string> {
  const path = `twibbon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error: errUnggah } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/png",
    // nama file selalu baru, jadi aman di-cache lama
    cacheControl: "31536000",
  });
  if (errUnggah) throw new Error(errUnggah.message);

  const { error } = await supabase.from("pengaturan").update({ twibbon_path: path }).eq("id", 1);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  if (pathLama) await supabase.storage.from(BUCKET).remove([pathLama]);
  return path;
}

/** Lepas twibbon (kamera absen jadi tanpa bingkai) dan hapus file yang lama. */
export async function hapusTwibbon(pathLama: string | null): Promise<void> {
  const { error } = await supabase.from("pengaturan").update({ twibbon_path: null }).eq("id", 1);
  if (error) throw new Error(error.message);
  if (pathLama) await supabase.storage.from(BUCKET).remove([pathLama]);
}
