// Aturan lampiran pengerjaan tugas (migrasi 0039) — tanpa dependensi supaya
// bisa diuji langsung (npm test). Daftar tipe di sini harus sama dengan
// allowed_mime_types bucket `tugas_lampiran`.

export type JenisLampiran = "file" | "gambar" | "audio" | "link";

export interface Lampiran {
  jenis: JenisLampiran;
  /** nama asli file, atau judul link */
  nama: string;
  /** file: path di bucket tugas_lampiran ({user_id}/{tugas_id}/...) */
  path?: string;
  /** link: alamat http(s) */
  url?: string;
  ukuran?: number;
  tipe?: string;
}

/** Folder file di bucket tugas_lampiran: hasil kerja pegawai (0039), atau materi dari pemberi tugas (0040). */
export const folderLampiranPegawai = (userId: string, tugasId: string) => `${userId}/${tugasId}`;
export const folderLampiranMateri = (tugasId: string) => `materi/${tugasId}`;

export const MAKS_LAMPIRAN = 8;
export const MAKS_UKURAN_FILE = 20 * 1024 * 1024;
/** Gambar dikecilkan ke sisi terpanjang ini & sekitar ukuran ini (JPEG) sebelum diunggah. */
export const SISI_MAKS_GAMBAR = 2048;
export const TARGET_UKURAN_GAMBAR = 1024 * 1024;

/** Ekstensi yang diterima → tipe konten saat diunggah (harus ada di bucket). */
export const TIPE_PER_EKSTENSI: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
  weba: "audio/webm",
};

/** Untuk atribut accept di input file. */
export const TERIMA_FILE = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z";
export const TERIMA_GAMBAR = "image/*";
export const TERIMA_AUDIO = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac";

function ekstensi(nama: string): string {
  const i = nama.lastIndexOf(".");
  return i > 0 ? nama.slice(i + 1).toLowerCase() : "";
}

/** Tipe konten untuk diunggah, dari ekstensi (browser kadang mengirim tipe kosong/aneh). null = tidak diterima. */
export function tipeKonten(nama: string): string | null {
  return TIPE_PER_EKSTENSI[ekstensi(nama)] ?? null;
}

export function jenisDariTipe(tipe: string): Exclude<JenisLampiran, "link"> {
  if (tipe.startsWith("image/")) return "gambar";
  if (tipe.startsWith("audio/")) return "audio";
  return "file";
}

/** Gambar foto biasa dikompres; GIF dibiarkan (animasinya hilang kalau digambar ulang). */
export function perluKompres(tipe: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(tipe);
}

/** Cek file sebelum diunggah. Kosong = boleh. */
export function cekFileLampiran(nama: string, ukuran: number, jumlahSekarang: number): string | null {
  if (jumlahSekarang >= MAKS_LAMPIRAN) return `Maksimal ${MAKS_LAMPIRAN} lampiran per tugas.`;
  if (!tipeKonten(nama)) return `Jenis file "${nama}" belum didukung. Kirim lewat link (mis. Google Drive) saja.`;
  if (ukuran > MAKS_UKURAN_FILE) {
    return `"${nama}" terlalu besar (${formatUkuran(ukuran)}), maksimal ${formatUkuran(MAKS_UKURAN_FILE)}. Kirim lewat link saja.`;
  }
  return null;
}

/** Nama file untuk path Storage: huruf/angka/titik/strip saja, nama asli tetap disimpan terpisah. */
export function namaFileAman(nama: string): string {
  const ext = ekstensi(nama);
  const dasar = (ext ? nama.slice(0, -(ext.length + 1)) : nama)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${dasar || "lampiran"}${ext ? `.${ext}` : ""}`;
}

/** Rapikan isian link; "drive.google.com/…" otomatis jadi https://. null = bukan link yang valid. */
export function rapikanLink(teks: string): string | null {
  let s = teks.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") || /\s/.test(s)) return null;
    return s.length <= 2000 ? s : null;
  } catch {
    return null;
  }
}

/** Judul link yang ringkas untuk ditampilkan: nama situs + awal path. */
export function judulLink(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    const teks = `${u.hostname.replace(/^www\./, "")}${path}`;
    return teks.length > 60 ? `${teks.slice(0, 57)}…` : teks;
  } catch {
    return url;
  }
}

export function formatUkuran(byte: number): string {
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
