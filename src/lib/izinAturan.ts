// Aturan izin beberapa hari (migrasi 0043) yang murni — diuji di tests/izin.test.ts.
// Tanggal selalu string "YYYY-MM-DD" (tanggal kantor), dihitung di UTC supaya
// tidak bergeser oleh zona waktu perangkat.

/** Paling lama satu pengajuan (hari kalender), sama dengan cek di simpan_izin(). */
export const MAKS_HARI_IZIN = 30;
/** Tanggal izin paling jauh ke belakang / ke depan dari hari ini. */
export const BATAS_HARI_IZIN = 60;

const HARI_MS = 86_400_000;
const keMs = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const dariMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function tambahHari(ymd: string, n: number): string {
  return dariMs(keMs(ymd) + n * HARI_MS);
}

/** Selisih hari kalender (b - a). */
export function selisihHari(a: string, b: string): number {
  return Math.round((keMs(b) - keMs(a)) / HARI_MS);
}

/** Senin–Jumat (sama dengan hari kerja di rekap). */
export function hariKerja(ymd: string): boolean {
  const h = new Date(keMs(ymd)).getUTCDay();
  return h !== 0 && h !== 6;
}

export function hariDalamRentang(mulai: string, selesai: string): string[] {
  const hasil: string[] = [];
  for (let d = mulai; d <= selesai; d = tambahHari(d, 1)) hasil.push(d);
  return hasil;
}

/** Hari yang benar-benar tercatat izin: hanya hari kerja. */
export function hariKerjaDalamRentang(mulai: string, selesai: string): string[] {
  return hariDalamRentang(mulai, selesai).filter(hariKerja);
}

/** Hari kerja pertama pada/sesudah tanggal ini. */
export function hariKerjaBerikutnya(ymd: string): string {
  let d = ymd;
  while (!hariKerja(d)) d = tambahHari(d, 1);
  return d;
}

/** Tanggal selesai supaya rentang dari `mulai` berisi `n` hari kerja (akhir pekan dilewati). */
export function selesaiUntukDurasi(mulai: string, n: number): string {
  let d = mulai;
  let hitung = hariKerja(d) ? 1 : 0;
  while (hitung < n) {
    d = tambahHari(d, 1);
    if (hariKerja(d)) hitung++;
  }
  return d;
}

export interface PilihanRentang {
  mulai: string | null;
  selesai: string | null;
}

/**
 * Pilih tanggal seperti memilih tanggal tiket: ketukan pertama = mulai, kedua =
 * selesai. Mengetuk tanggal sebelum mulai, atau mengetuk lagi setelah rentang
 * lengkap, memulai pilihan baru. Mengetuk tanggal mulai lagi = izin satu hari.
 */
export function pilihTanggal(p: PilihanRentang, klik: string): PilihanRentang {
  if (!p.mulai || p.selesai) return { mulai: klik, selesai: null };
  if (klik < p.mulai) return { mulai: klik, selesai: null };
  return { mulai: p.mulai, selesai: klik };
}

/** Rentang akhir: tanpa tanggal selesai berarti izin satu hari. */
export function rentangAkhir(p: PilihanRentang): { mulai: string; selesai: string } | null {
  if (!p.mulai) return null;
  return { mulai: p.mulai, selesai: p.selesai ?? p.mulai };
}

/** Batas tanggal yang bisa diketuk di kalender. */
export function batasPilihan(hariIni: string, p: PilihanRentang): { min: string; max: string } {
  const min = tambahHari(hariIni, -BATAS_HARI_IZIN);
  const max = tambahHari(hariIni, BATAS_HARI_IZIN);
  // sedang memilih tanggal selesai: paling jauh 30 hari dari mulai
  if (p.mulai && !p.selesai) {
    const maxRentang = tambahHari(p.mulai, MAKS_HARI_IZIN - 1);
    return { min, max: maxRentang < max ? maxRentang : max };
  }
  return { min, max };
}

/** Pesan galat kalau rentang tidak boleh disimpan (cek yang sama dengan simpan_izin()). */
export function cekRentang(mulai: string, selesai: string, hariIni: string): string | null {
  if (selesai < mulai) return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  if (selisihHari(mulai, selesai) >= MAKS_HARI_IZIN) return `Izin paling lama ${MAKS_HARI_IZIN} hari sekali pengajuan.`;
  if (mulai < tambahHari(hariIni, -BATAS_HARI_IZIN)) return `Tanggal izin paling lama ${BATAS_HARI_IZIN} hari ke belakang.`;
  if (selesai > tambahHari(hariIni, BATAS_HARI_IZIN)) return `Tanggal izin paling jauh ${BATAS_HARI_IZIN} hari ke depan.`;
  if (hariKerjaDalamRentang(mulai, selesai).length === 0) return "Tanggal yang dipilih hanya Sabtu/Minggu — pilih hari kerja.";
  return null;
}

export interface HariAbsenSaya {
  tanggal: string;
  status: string;
  masuk_at: string | null;
  izin_id?: string | null;
}

/**
 * Keadaan satu pengajuan saat ini: hari yang masih izin, dan hari di rentangnya
 * yang ternyata dipakai absen (masuk kerja) — hari itu sudah lepas dari izin.
 */
export function ringkasIzin(
  izin: { id: string; mulai: string; selesai: string },
  hari: HariAbsenSaya[]
): { izin: string[]; masuk: string[] } {
  const diRentang = hari.filter((h) => h.tanggal >= izin.mulai && h.tanggal <= izin.selesai);
  return {
    izin: diRentang.filter((h) => h.izin_id === izin.id && h.status === "izin").map((h) => h.tanggal).sort(),
    masuk: diRentang.filter((h) => h.masuk_at).map((h) => h.tanggal).sort(),
  };
}

export type KeadaanIzin = "akan datang" | "berlangsung" | "selesai";

export function keadaanIzin(izin: { mulai: string; selesai: string }, hariIni: string): KeadaanIzin {
  if (izin.mulai > hariIni) return "akan datang";
  if (izin.selesai < hariIni) return "selesai";
  return "berlangsung";
}
