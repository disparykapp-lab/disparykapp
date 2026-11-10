import { supabase } from "./supabase";

// Kompres gambar & unggah ke Storage dengan progres — dipakai lampiran tugas.
// (Foto bukti izin punya versi sendiri di buktiIzin.ts dengan pengaturan tetap.)

/** createImageBitmap (ikut orientasi EXIF); cadangan <img> untuk browser HP lama. */
async function bacaGambar(file: Blob): Promise<{ sumber: CanvasImageSource; lebar: number; tinggi: number; tutup: () => void }> {
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
    throw new Error("Gambar tidak bisa dibaca.");
  }
  return { sumber: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) };
}

/**
 * Kecilkan gambar ke JPEG (sisi terpanjang maks. `sisiMaks`), turunkan kualitas
 * sampai ≤ `targetByte`. Latar transparan jadi putih. Gagal dibaca (mis. HEIC di
 * browser yang tidak mendukung) = lempar Error, pemanggil boleh memakai file asli.
 */
export async function kompresGambar(file: Blob, sisiMaks: number, targetByte: number): Promise<Blob> {
  const gambar = await bacaGambar(file);
  const skala = Math.min(1, sisiMaks / Math.max(gambar.lebar, gambar.tinggi));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(gambar.lebar * skala);
  canvas.height = Math.round(gambar.tinggi * skala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kompres gambar.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(gambar.sumber, 0, 0, canvas.width, canvas.height);
  gambar.tutup();

  const keBlob = (kualitas: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal mengompres gambar."))), "image/jpeg", kualitas)
    );
  let kualitas = 0.85;
  let hasil = await keBlob(kualitas);
  while (hasil.size > targetByte && kualitas > 0.55) {
    kualitas -= 0.1;
    hasil = await keBlob(kualitas);
  }
  return hasil;
}

/**
 * Unggah lewat REST Storage dengan XMLHttpRequest — supabase-js tidak melaporkan
 * progres unggahan, sedangkan XHR punya upload.onprogress.
 */
export async function unggahDenganProgres(opsi: {
  bucket: string;
  path: string;
  isi: Blob;
  tipe: string;
  onProgres: (persen: number) => void;
  /** pesan kalau bucket belum ada (migrasi belum dijalankan) */
  pesanBelumAktif: string;
  /** pesan kalau ditolak aturan akses (403) */
  pesanDitolak?: string;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi login habis. Muat ulang aplikasi lalu coba lagi.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${opsi.bucket}/${opsi.path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_ANON_KEY as string);
    xhr.setRequestHeader("Content-Type", opsi.tipe);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opsi.onProgres(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opsi.onProgres(100);
        resolve();
      } else if (xhr.status === 404 || /bucket not found/i.test(xhr.responseText)) {
        reject(new Error(opsi.pesanBelumAktif));
      } else if (xhr.status === 403 || /row-level security/i.test(xhr.responseText)) {
        reject(new Error(opsi.pesanDitolak ?? "Kamu tidak punya izin mengunggah lampiran untuk tugas ini."));
      } else if (xhr.status === 413 || /maximum allowed size|too large/i.test(xhr.responseText)) {
        reject(new Error("File terlalu besar untuk diunggah."));
      } else if (/mime type/i.test(xhr.responseText)) {
        reject(new Error("Jenis file ini tidak diterima."));
      } else {
        reject(new Error("Gagal mengunggah. Coba lagi."));
      }
    };
    xhr.onerror = () => reject(new Error("Gagal mengunggah. Periksa koneksi internet kamu."));
    xhr.send(opsi.isi);
  });
}
