// Aturan halaman Tinjau Absensi yang murni — diuji di tests/tinjauAbsen.test.ts.
// Tanggal selalu string "YYYY-MM-DD" (tanggal kantor/WIB).
import { BATAS_HARI_IZIN, hariKerja, tambahHari, type PilihanRentang } from "./izinAturan.ts";

/** Warna garis kartu: hadir = tanpa garis, telat = kuning, izin = merah, belum = hitam. */
export type Kategori = "hadir" | "telat" | "izin" | "belum";

/** Rentang paling panjang sekali tampil (hari kalender). */
export const MAKS_HARI_TINJAU = 31;
/** Paling jauh ke belakang yang bisa dipilih di kalender. */
export const HARI_KE_BELAKANG = 365;

/** Dinas luar dihitung hadir (statusnya tidak pernah "telat"). */
export function kategoriStatus(status: string): Exclude<Kategori, "belum"> {
  if (status === "telat") return "telat";
  if (status === "izin") return "izin";
  return "hadir";
}

export interface PegawaiTinjau {
  id: string;
  nama: string;
  divisi_id: string | null;
  foto_url: string | null;
  aktif: boolean;
  wajib_absen: boolean;
  created_at: string;
  tanggal_mulai_magang: string | null;
  tanggal_selesai_magang: string | null;
}

/** Tanggal WIB dari timestamp (created_at disimpan UTC). */
export function tanggalWIB(timestamp: string): string {
  return new Date(Date.parse(timestamp) + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Pegawai ini seharusnya absen pada tanggal tsb? (aktif, wajib absen, hari kerja, masa kerjanya) */
export function wajibPadaTanggal(p: PegawaiTinjau, tanggal: string): boolean {
  if (!p.aktif || p.wajib_absen === false || !hariKerja(tanggal)) return false;
  if (p.created_at && tanggal < tanggalWIB(p.created_at)) return false;
  if (p.tanggal_mulai_magang && tanggal < p.tanggal_mulai_magang) return false;
  if (p.tanggal_selesai_magang && tanggal > p.tanggal_selesai_magang) return false;
  return true;
}

interface BarisMinimal {
  id: string;
  user_id: string;
  tanggal: string;
  status: string;
  profiles?: { nama: string; divisi_id: string | null } | null;
}

export interface KartuTinjau<R extends BarisMinimal> {
  kunci: string;
  tanggal: string;
  userId: string;
  nama: string;
  divisiId: string | null;
  kategori: Kategori;
  /** null = belum absen (tidak ada baris absensi) */
  row: R | null;
}

const URUTAN: Record<Kategori, number> = { belum: 0, telat: 1, izin: 2, hadir: 3 };

/**
 * Satu kartu per pegawai per hari: semua baris absensi di rentang, ditambah
 * pegawai wajib absen yang belum punya baris (hanya sampai hari ini). Urut:
 * tanggal terbaru dulu; dalam satu hari belum absen → telat → izin → hadir,
 * lalu nama.
 */
export function susunKartu<R extends BarisMinimal>(
  rows: R[],
  pegawai: PegawaiTinjau[],
  dari: string,
  sampai: string,
  hariIni: string
): KartuTinjau<R>[] {
  const peta = new Map(pegawai.map((p) => [p.id, p]));
  const ada = new Set<string>();
  const hasil: KartuTinjau<R>[] = [];

  for (const r of rows) {
    if (r.tanggal < dari || r.tanggal > sampai) continue;
    ada.add(`${r.user_id}|${r.tanggal}`);
    const p = peta.get(r.user_id);
    hasil.push({
      kunci: r.id,
      tanggal: r.tanggal,
      userId: r.user_id,
      nama: r.profiles?.nama ?? p?.nama ?? "-",
      divisiId: r.profiles?.divisi_id ?? p?.divisi_id ?? null,
      kategori: kategoriStatus(r.status),
      row: r,
    });
  }

  const akhir = sampai < hariIni ? sampai : hariIni;
  for (let d = dari; d <= akhir; d = tambahHari(d, 1)) {
    for (const p of pegawai) {
      if (ada.has(`${p.id}|${d}`) || !wajibPadaTanggal(p, d)) continue;
      hasil.push({ kunci: `belum:${p.id}:${d}`, tanggal: d, userId: p.id, nama: p.nama, divisiId: p.divisi_id, kategori: "belum", row: null });
    }
  }

  return hasil.sort(
    (a, b) =>
      (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0) ||
      URUTAN[a.kategori] - URUTAN[b.kategori] ||
      a.nama.localeCompare(b.nama, "id")
  );
}

export type Hitungan = Record<Kategori | "semua", number>;

export function hitungKategori(kartu: { kategori: Kategori }[]): Hitungan {
  const h: Hitungan = { semua: kartu.length, hadir: 0, telat: 0, izin: 0, belum: 0 };
  for (const k of kartu) h[k.kategori]++;
  return h;
}

/** Senin dari minggu tanggal ini. */
export function seninDari(ymd: string): string {
  const hari = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return tambahHari(ymd, -((hari + 6) % 7));
}

/** Tujuh tanggal Senin–Minggu mulai dari `senin`. */
export function hariSeminggu(senin: string): string[] {
  return Array.from({ length: 7 }, (_, i) => tambahHari(senin, i));
}

export type JenisCepat = "hari_ini" | "kemarin" | "minggu_ini" | "tujuh_hari" | "bulan_ini";

export const PILIHAN_CEPAT: { id: JenisCepat; label: string }[] = [
  { id: "hari_ini", label: "Hari ini" },
  { id: "kemarin", label: "Kemarin" },
  { id: "minggu_ini", label: "Minggu ini" },
  { id: "tujuh_hari", label: "7 hari terakhir" },
  { id: "bulan_ini", label: "Bulan ini" },
];

export function rentangCepat(jenis: JenisCepat, hariIni: string): { mulai: string; selesai: string } {
  switch (jenis) {
    case "hari_ini":
      return { mulai: hariIni, selesai: hariIni };
    case "kemarin": {
      const k = tambahHari(hariIni, -1);
      return { mulai: k, selesai: k };
    }
    case "minggu_ini":
      return { mulai: seninDari(hariIni), selesai: hariIni };
    case "tujuh_hari":
      return { mulai: tambahHari(hariIni, -6), selesai: hariIni };
    case "bulan_ini":
      return { mulai: `${hariIni.slice(0, 8)}01`, selesai: hariIni };
  }
}

/** Batas tanggal yang bisa diketuk di kalender Tinjau Absensi. */
export function batasTinjau(hariIni: string, p: PilihanRentang): { min: string; max: string } {
  const min = tambahHari(hariIni, -HARI_KE_BELAKANG);
  // izin bisa diajukan sampai 60 hari ke depan — admin bisa melihat siapa yang akan izin
  const max = tambahHari(hariIni, BATAS_HARI_IZIN);
  if (p.mulai && !p.selesai) {
    const maxRentang = tambahHari(p.mulai, MAKS_HARI_TINJAU - 1);
    return { min, max: maxRentang < max ? maxRentang : max };
  }
  return { min, max };
}

const keDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const fmtPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtHariBulan = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLengkap = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Judul rentang di atas halaman + keterangan kecilnya. */
export function labelRentang(dari: string, sampai: string, hariIni: string): { judul: string; ket: string } {
  if (dari === sampai) {
    const ket =
      dari === hariIni ? "Hari ini" : dari === tambahHari(hariIni, -1) ? "Kemarin" : dari === tambahHari(hariIni, 1) ? "Besok" : hariKerja(dari) ? "" : "Akhir pekan";
    return { judul: fmtPanjang.format(keDate(dari)), ket };
  }
  const tahunSama = dari.slice(0, 4) === sampai.slice(0, 4);
  const judul = `${(tahunSama ? fmtHariBulan : fmtLengkap).format(keDate(dari))} – ${fmtLengkap.format(keDate(sampai))}`;
  let hari = 0;
  let kerja = 0;
  for (let d = dari; d <= sampai; d = tambahHari(d, 1)) {
    hari++;
    if (hariKerja(d)) kerja++;
  }
  return { judul, ket: `${hari} hari · ${kerja} hari kerja` };
}
