// Aturan halaman Kelola Pegawai yang murni — diuji di tests/pegawai.test.ts.
import { tambahHari, type PilihanRentang } from "./izinAturan.ts";

export type SaringPegawai = "semua" | "online" | "admin" | "magang" | "nonaktif";

export const KOTAK_PEGAWAI: { id: SaringPegawai; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "online", label: "Online" },
  { id: "admin", label: "Admin" },
  { id: "magang", label: "Magang" },
  { id: "nonaktif", label: "Nonaktif" },
];

/** Divisi kosong ditampilkan sebagai chip ini. */
export const TANPA_DIVISI = "tanpa";

export interface PegawaiRingkas {
  id: string;
  nama: string;
  email: string;
  jabatan: string | null;
  role: string;
  aktif: boolean;
  divisi_id: string | null;
  tanggal_mulai_magang: string | null;
  tanggal_selesai_magang: string | null;
}

export const punyaMasaMagang = (p: PegawaiRingkas) => !!p.tanggal_mulai_magang && !!p.tanggal_selesai_magang;

export function cocokSaring(p: PegawaiRingkas, saring: SaringPegawai, online: Set<string>): boolean {
  switch (saring) {
    case "semua":
      return true;
    case "online":
      return online.has(p.id);
    case "admin":
      return p.role === "admin";
    case "magang":
      return punyaMasaMagang(p);
    case "nonaktif":
      return !p.aktif;
  }
}

export function cocokCari(p: PegawaiRingkas, cari: string): boolean {
  const q = cari.trim().toLowerCase();
  if (!q) return true;
  return [p.nama, p.email, p.jabatan ?? ""].some((x) => x.toLowerCase().includes(q));
}

export const cocokDivisi = (p: PegawaiRingkas, divisi: string) =>
  divisi === "semua" || (divisi === TANPA_DIVISI ? !p.divisi_id : p.divisi_id === divisi);

/** Aktif dulu; di dalamnya yang online dulu, lalu nama. Nonaktif paling bawah. */
export function urutkanPegawai<P extends PegawaiRingkas>(list: P[], online: Set<string>): P[] {
  return [...list].sort(
    (a, b) =>
      Number(b.aktif) - Number(a.aktif) ||
      Number(online.has(b.id)) - Number(online.has(a.id)) ||
      a.nama.localeCompare(b.nama, "id")
  );
}

export function hitungKotak(list: PegawaiRingkas[], online: Set<string>): Record<SaringPegawai, number> {
  const h = { semua: 0, online: 0, admin: 0, magang: 0, nonaktif: 0 };
  for (const p of list) for (const k of KOTAK_PEGAWAI) if (cocokSaring(p, k.id, online)) h[k.id]++;
  return h;
}

/** Tanggal selesai magang untuk durasi n bulan (mis. 1 Sep + 6 bln = 28 Feb). */
export function selesaiMagang(mulai: string, bulan: number): string {
  const [y, m, d] = mulai.split("-").map(Number);
  // hari terakhir bulan tujuan, supaya 31 Agu + 6 bln tidak loncat ke Maret
  const akhirBulan = new Date(Date.UTC(y, m - 1 + bulan + 1, 0)).getUTCDate();
  const tujuan = new Date(Date.UTC(y, m - 1 + bulan, Math.min(d, akhirBulan)));
  return tambahHari(tujuan.toISOString().slice(0, 10), -1);
}

export const DURASI_MAGANG = [3, 6, 12];
/** Paling jauh 2 tahun ke belakang/depan, dan satu masa magang paling lama 2 tahun. */
const BATAS_HARI_MAGANG = 730;

export function batasMagang(hariIni: string, p: PilihanRentang): { min: string; max: string } {
  const min = tambahHari(hariIni, -BATAS_HARI_MAGANG);
  const max = tambahHari(hariIni, BATAS_HARI_MAGANG);
  if (p.mulai && !p.selesai) {
    const maxRentang = tambahHari(p.mulai, BATAS_HARI_MAGANG);
    return { min, max: maxRentang < max ? maxRentang : max };
  }
  return { min, max };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pesan galat form tambah pegawai, atau null kalau boleh disimpan. */
export function cekPegawaiBaru(nama: string, email: string): string | null {
  if (nama.trim().length < 2) return "Isi nama lengkap dulu.";
  if (!EMAIL.test(email.trim())) return "Email belum benar — pakai email Google pegawai.";
  return null;
}

/** Foto Google tersimpan kecil (=s96-c); minta versi besar untuk dibuka layar penuh. */
export function fotoBesar(url: string): string {
  return /googleusercontent\.com\//.test(url) ? url.replace(/=s\d+(-c)?$/, "=s800$1") : url;
}
