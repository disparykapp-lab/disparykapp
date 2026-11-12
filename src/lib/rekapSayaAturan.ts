// Rekap absensi milik sendiri per bulan (murni — diuji di tests/rekapSaya.test.ts).
// Tanggal "YYYY-MM-DD" (WIB); warna sama dengan Tinjau Absensi.
import { hariKerja, tambahHari } from "./izinAturan.ts";
import { wajibPadaTanggal, type PegawaiTinjau } from "./tinjauAbsenAturan.ts";

/** Kategori yang dihitung & bisa disaring. */
export type JenisRekap = "hadir" | "telat" | "dinas" | "izin" | "tidak";
/** Jenis tiap tanggal di kalender. */
export type JenisHari = JenisRekap | "belum" | "libur" | "kosong" | "nanti";

export const KOTAK_REKAP: { id: JenisRekap; label: string }[] = [
  { id: "hadir", label: "Hadir" },
  { id: "telat", label: "Telat" },
  { id: "dinas", label: "Dinas Luar" },
  { id: "izin", label: "Izin/Sakit" },
  { id: "tidak", label: "Tidak absen" },
];

interface BarisRekap {
  tanggal: string;
  status: string;
  masuk_at: string | null;
  keluar_at: string | null;
}

export interface HariRekap<R extends BarisRekap = BarisRekap> {
  tanggal: string;
  jenis: JenisHari;
  row: R | null;
}

export type ProfilRekap = Pick<PegawaiTinjau, "aktif" | "wajib_absen" | "created_at" | "tanggal_mulai_magang" | "tanggal_selesai_magang">;

export function jenisBaris(r: BarisRekap): JenisHari {
  if (r.masuk_at) return r.status === "telat" ? "telat" : r.status === "dinas_luar" ? "dinas" : "hadir";
  return r.status === "izin" ? "izin" : "kosong";
}

/** "2026-11" → { dari: "2026-11-01", sampai: "2026-11-30" } */
export function rentangBulanYm(ym: string): { dari: string; sampai: string } {
  const [y, m] = ym.split("-").map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { dari: `${ym}-01`, sampai: `${ym}-${String(akhir).padStart(2, "0")}` };
}

export function geserBulanYm(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Satu entri per tanggal dalam bulan itu. */
export function susunBulan<R extends BarisRekap>(ym: string, rows: R[], profil: ProfilRekap, hariIni: string): HariRekap<R>[] {
  const { dari, sampai } = rentangBulanYm(ym);
  const peta = new Map(rows.map((r) => [r.tanggal, r]));
  // wajibPadaTanggal butuh field pegawai lengkap; sisanya tidak dipakai
  const p = { id: "", nama: "", divisi_id: null, foto_url: null, ...profil } as PegawaiTinjau;
  const hasil: HariRekap<R>[] = [];
  for (let d = dari; d <= sampai; d = tambahHari(d, 1)) {
    const row = peta.get(d) ?? null;
    let jenis: JenisHari;
    if (row) jenis = jenisBaris(row);
    else if (d > hariIni) jenis = "nanti";
    else if (!hariKerja(d)) jenis = "libur";
    else if (d === hariIni) jenis = "belum";
    else jenis = wajibPadaTanggal(p, d) ? "tidak" : "kosong";
    hasil.push({ tanggal: d, jenis, row });
  }
  return hasil;
}

export interface RingkasanSaya {
  hitung: Record<JenisRekap, number>;
  /** hari kerja yang seharusnya diisi (hadir+telat+dinas+izin+tidak) */
  hariWajib: number;
  /** persen hadir (termasuk telat & dinas luar); null kalau belum ada hari wajib */
  persen: number | null;
  menitKerja: number;
}

/** Hanya sampai hari ini — izin yang sudah diajukan untuk hari mendatang belum dihitung. */
export function hitungRekapSaya(hari: HariRekap[], hariIni: string): RingkasanSaya {
  const hitung: Record<JenisRekap, number> = { hadir: 0, telat: 0, dinas: 0, izin: 0, tidak: 0 };
  let menitKerja = 0;
  for (const h of hari) {
    if (h.tanggal > hariIni) continue;
    if (h.jenis in hitung) hitung[h.jenis as JenisRekap]++;
    if (h.row?.masuk_at && h.row.keluar_at) {
      menitKerja += Math.max(0, Math.round((Date.parse(h.row.keluar_at) - Date.parse(h.row.masuk_at)) / 60_000));
    }
  }
  const masuk = hitung.hadir + hitung.telat + hitung.dinas;
  const hariWajib = masuk + hitung.izin + hitung.tidak;
  return { hitung, hariWajib, persen: hariWajib ? Math.round((masuk / hariWajib) * 100) : null, menitKerja };
}
