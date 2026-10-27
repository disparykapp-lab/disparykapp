import { supabase } from "./supabase";

// Foto bukti keterangan izin/sakit di bucket privat "bukti_izin" (migrasi 0031).
// Di kolom absensi.bukti_url disimpan sebagai "storage:bukti_izin/<path>";
// link lama (https://...) tetap didukung.

const BUCKET = "bukti_izin";
const AWALAN = `storage:${BUCKET}/`;

/** Sisi terpanjang & target ukuran setelah kompres — cukup jelas untuk membaca surat dokter. */
const SISI_MAKS = 1600;
const UKURAN_TARGET = 450 * 1024;

export function buktiDiStorage(nilai: string | null | undefined): boolean {
  return !!nilai && nilai.startsWith(AWALAN);
}

/** URL sementara (5 menit) untuk melihat foto bukti; link lama dikembalikan apa adanya. */
export async function urlBukti(nilai: string): Promise<string> {
  if (!buktiDiStorage(nilai)) return nilai;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(nilai.slice(AWALAN.length), 300);
  if (error || !data) throw new Error("Gagal membuka foto bukti.");
  return data.signedUrl;
}

/**
 * Buka bukti di tab baru. Tab dibuka lebih dulu (masih dalam klik pengguna) lalu
 * diarahkan setelah signed URL siap — supaya tidak diblokir pemblokir pop-up.
 */
export async function bukaBukti(nilai: string): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const url = await urlBukti(nilai);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** Kecilkan foto ke JPEG (sisi terpanjang maks. 1600 px), turunkan kualitas sampai ≤ ~450 KB. */
export async function kompresFoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa foto/gambar.");
  const gambar = await bacaGambar(file);
  const skala = Math.min(1, SISI_MAKS / Math.max(gambar.lebar, gambar.tinggi));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(gambar.lebar * skala);
  canvas.height = Math.round(gambar.tinggi * skala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kompres foto.");
  ctx.fillStyle = "#fff"; // PNG transparan jangan jadi hitam
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(gambar.sumber, 0, 0, canvas.width, canvas.height);
  gambar.tutup();

  let kualitas = 0.8;
  let hasil = await keBlob(canvas, kualitas);
  while (hasil.size > UKURAN_TARGET && kualitas > 0.45) {
    kualitas -= 0.1;
    hasil = await keBlob(canvas, kualitas);
  }
  return hasil;
}

/** createImageBitmap (ikut orientasi EXIF); cadangan <img> untuk browser HP lama. */
async function bacaGambar(file: File): Promise<{ sumber: CanvasImageSource; lebar: number; tinggi: number; tutup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { sumber: bmp, lebar: bmp.width, tinggi: bmp.height, tutup: () => bmp.close() };
    } catch {
      // lanjut ke cara <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error());
      img.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Foto tidak bisa dibaca. Coba ambil ulang atau pilih foto lain.");
  }
  return { sumber: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) };
}

function keBlob(canvas: HTMLCanvasElement, kualitas: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal mengompres foto."))), "image/jpeg", kualitas)
  );
}

/**
 * Unggah foto lewat REST Storage dengan XMLHttpRequest — supabase-js tidak
 * melaporkan progres unggahan, sedangkan XHR punya upload.onprogress.
 * Mengembalikan nilai untuk kolom bukti_url.
 */
export async function unggahBukti(userId: string, foto: Blob, onProgres: (persen: number) => void): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi login habis. Muat ulang aplikasi lalu coba lagi.");

  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_ANON_KEY as string);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgres(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgres(100);
        resolve();
      } else if (xhr.status === 404 || /bucket not found/i.test(xhr.responseText)) {
        reject(new Error("Penyimpanan bukti belum aktif. Admin perlu menjalankan migrasi 0031_bukti_izin.sql."));
      } else {
        reject(new Error("Gagal mengunggah foto. Coba lagi."));
      }
    };
    xhr.onerror = () => reject(new Error("Gagal mengunggah foto. Periksa koneksi internet kamu."));
    xhr.send(foto);
  });

  return AWALAN + path;
}

/** Hapus foto bukti yang batal dipakai (diganti/dihapus sebelum disimpan). Gagal pun tidak apa-apa. */
export async function hapusBuktiStorage(nilai: string): Promise<void> {
  if (!buktiDiStorage(nilai)) return;
  await supabase.storage.from(BUCKET).remove([nilai.slice(AWALAN.length)]);
}
