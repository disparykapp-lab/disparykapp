// Logika murni game Siapa Penyusup — tanpa import, supaya bisa diuji langsung
// dengan `node --test` (lihat tests/siapa-penyusup.test.ts). Aturan yang sama
// akan dijalankan di server (migrasi 0032/0033); yang di sini dipakai klien
// untuk tampilan dan validasi awal sebelum memanggil RPC.

export const MIN_PEMAIN = 4;
export const MAKS_PEMAIN = 12;

/** Huruf kode room: tanpa O/0/I/1 yang mudah tertukar (sama dengan Coret Tebak). */
export const HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PANJANG_KODE = 5;

/** Huruf besar, buang karakter di luar HURUF_KODE ("jog 25" -> "JOG25"). */
export function rapikanKode(teks: string): string {
  return [...teks.toUpperCase()].filter((c) => HURUF_KODE.includes(c)).join("");
}

export function kodeValid(kode: string): boolean {
  return kode.length === PANJANG_KODE && rapikanKode(kode) === kode;
}

export type ModeRoom = "satu_divisi" | "antar_divisi";

export interface Batas {
  min: number;
  maks: number;
  langkah: number;
}

/** Rentang pengaturan room (README bagian 1). Jumlah penyusup 0 = otomatis. */
export const BATAS = {
  jumlahPenyusup: { min: 0, maks: 3, langkah: 1 },
  waktuPetunjuk: { min: 15, maks: 60, langkah: 5 },
  waktuDiskusi: { min: 30, maks: 180, langkah: 15 },
  waktuVoting: { min: 15, maks: 60, langkah: 5 },
} satisfies Record<string, Batas>;

export interface PengaturanRoom {
  mode: ModeRoom;
  /** null = kategori acak */
  kategori: string | null;
  jumlahPenyusup: number;
  waktuPetunjuk: number;
  waktuDiskusi: number;
  waktuVoting: number;
  penyusupTahu: boolean;
  tebakanTerakhir: boolean;
  privat: boolean;
}

export const PENGATURAN_AWAL: PengaturanRoom = {
  mode: "antar_divisi",
  kategori: null,
  jumlahPenyusup: 0,
  waktuPetunjuk: 30,
  waktuDiskusi: 90,
  waktuVoting: 30,
  penyusupTahu: false,
  tebakanTerakhir: false,
  privat: true,
};

/** Naik/turun satu langkah, tetap di dalam batas. */
export function geser(nilai: number, arah: 1 | -1, b: Batas): number {
  return Math.min(b.maks, Math.max(b.min, nilai + arah * b.langkah));
}

/** Bawaan: 1 penyusup, otomatis 2 kalau pemain ≥ 7. */
export function jumlahPenyusupOtomatis(jumlahPemain: number): number {
  return jumlahPemain >= 7 ? 2 : 1;
}

/** Jumlah penyusup harus kurang dari setengah jumlah pemain. */
export function jumlahPenyusupValid(jumlahPenyusup: number, jumlahPemain: number): boolean {
  return jumlahPenyusup >= 1 && jumlahPenyusup * 2 < jumlahPemain;
}

/** Jumlah penyusup yang benar-benar dipakai saat game dimulai (0 = otomatis). */
export function penyusupDipakai(pengaturan: number, jumlahPemain: number): number {
  return pengaturan === 0 ? jumlahPenyusupOtomatis(jumlahPemain) : pengaturan;
}

// ---------------------------------------------------------------------------
// Room & lobi — cermin RPC di migrasi 0032
// ---------------------------------------------------------------------------

export type StatusRoom =
  | "menunggu"
  | "bagikan"
  | "petunjuk"
  | "diskusi"
  | "voting"
  | "hasil_vote"
  | "tebakan_terakhir"
  | "selesai";

export type AksiGabung = "lanjut" | "gabung" | "dikeluarkan" | "beda_divisi" | "berjalan" | "penuh";

/**
 * Aksi untuk satu room di daftar. Sama dengan aturan penyusup_gabung(): yang
 * dikeluarkan tidak boleh kembali; pemain lama selalu boleh kembali; pemain
 * baru hanya ke room yang menunggu, divisinya cocok (Satu Divisi), dan belum penuh.
 */
export function aksiGabung(k: {
  status: StatusRoom;
  mode: ModeRoom;
  divisiRoom: string | null;
  divisiSaya: string | null;
  jumlahOnline: number;
  saya: { dikeluarkan: boolean } | null;
}): AksiGabung {
  if (k.saya?.dikeluarkan) return "dikeluarkan";
  if (k.saya) return "lanjut";
  if (k.mode === "satu_divisi" && (k.divisiRoom === null || k.divisiRoom !== k.divisiSaya)) return "beda_divisi";
  if (k.status !== "menunggu") return "berjalan";
  return k.jumlahOnline >= MAKS_PEMAIN ? "penuh" : "gabung";
}

export interface CalonHost {
  user_id: string;
  aktif: boolean;
  online: boolean;
  bergabung_at: string;
}

/**
 * Cermin _penyusup_pindah_host(): pemain aktif yang paling lama di room,
 * utamakan yang online. null = host tidak berubah.
 */
export function hostBerikut(pemain: CalonHost[], hostLama: string): string | null {
  const calon = pemain
    .filter((p) => p.aktif)
    .sort((a, b) => Number(b.online) - Number(a.online) || Date.parse(a.bergabung_at) - Date.parse(b.bergabung_at));
  const baru = calon[0]?.user_id ?? null;
  return baru === hostLama ? null : baru;
}

/** Host boleh mengeluarkan pemain aktif selain dirinya sendiri. */
export function bolehKeluarkan(saya: string, hostId: string, target: { user_id: string; aktif: boolean }): boolean {
  return saya === hostId && target.user_id !== saya && target.aktif;
}

/** Tombol "Mulai Game": hanya host, dan minimal 4 pemain aktif yang online. */
export function bisaMulai(sayaHost: boolean, jumlahOnline: number): boolean {
  return sayaHost && jumlahOnline >= MIN_PEMAIN;
}

/**
 * Nomor warna --divisi-1..8 dari urutan divisi di database (created_at, id).
 * null = pemain tanpa divisi.
 */
export function nomorWarnaDivisi(divisiId: string | null, urutanDivisi: string[]): number | null {
  if (!divisiId) return null;
  const i = urutanDivisi.indexOf(divisiId);
  return i < 0 ? null : (i % 8) + 1;
}
