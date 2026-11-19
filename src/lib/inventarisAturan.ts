// Aturan Inventaris yang murni (tanpa Supabase/DOM) — diuji di tests/inventaris.test.ts.
// Tanggal selalu string "YYYY-MM-DD" (tanggal kantor/WIB).
import type { BarangInventaris, JenisMutasi, LogInventaris, MutasiInventaris } from "../types/database";
import { selisihHari, tambahHari } from "./izinAturan.ts";
import { tanggalWIB } from "./tinjauAbsenAturan.ts";

/** Batas panjang & angka — sama dengan cek di migrasi 0045. */
export const BATAS_INVENTARIS = {
  nama: 80,
  kategori: 40,
  satuan: 20,
  keterangan: 500,
  pihak: 100,
  jumlah: 1_000_000,
  /** catatan masuk/keluar paling jauh ke belakang (hari) */
  hariMundur: 366,
} as const;

export const KATEGORI_SARAN = ["Kaos", "Totebag", "Topi", "Pin", "Gantungan kunci", "Tumbler", "Lanyard", "Stiker", "Buku & brosur", "Suvenir"];
export const SATUAN_SARAN = ["pcs", "buah", "set", "lembar", "box", "pak", "lusin"];

export const rapikan = (s: string) => s.trim().replace(/\s+/g, " ");

const angka = new Intl.NumberFormat("id-ID");
export const formatAngka = (n: number) => angka.format(n);

// ---------------------------------------------------------------- stok

export type StatusStok = "habis" | "menipis" | "aman";

export function statusStok(b: Pick<BarangInventaris, "stok" | "stok_minimum">): StatusStok {
  if (b.stok <= 0) return "habis";
  if (b.stok_minimum > 0 && b.stok <= b.stok_minimum) return "menipis";
  return "aman";
}

export const perluRestok = (b: Pick<BarangInventaris, "stok" | "stok_minimum">) => statusStok(b) !== "aman";

/** Perubahan stok oleh satu catatan. */
export const delta = (m: Pick<MutasiInventaris, "jenis" | "jumlah">) => (m.jenis === "masuk" ? m.jumlah : -m.jumlah);

type Catatan = Pick<MutasiInventaris, "jenis" | "jumlah">;

/** Stok yang boleh dikeluarkan — kalau sedang mengubah catatan, catatan lamanya dianggap belum ada. */
export function tersediaUntukKeluar(stok: number, lama?: Catatan | null): number {
  return stok - (lama ? delta(lama) : 0);
}

/** Stok setelah form disimpan. */
export function stokSetelah(stok: number, baru: Catatan, lama?: Catatan | null): number {
  return tersediaUntukKeluar(stok, lama) + delta(baru);
}

/** Urutan terbaru dulu, sama dengan urutan saldo di database (tanggal, lalu urutan catat). */
export function urutTerbaru<T extends Pick<MutasiInventaris, "tanggal" | "urut">>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.tanggal === b.tanggal ? b.urut - a.urut : a.tanggal < b.tanggal ? 1 : -1));
}

/**
 * Sisa stok setelah tiap catatan, dihitung mundur dari stok sekarang.
 * `terbaruDulu` = catatan terbaru (boleh dipotong limit, asal tidak bolong di tengah).
 */
export function saldoSetelah(terbaruDulu: MutasiInventaris[], stokSekarang: number): Map<string, number> {
  const hasil = new Map<string, number>();
  let saldo = stokSekarang;
  for (const m of terbaruDulu) {
    hasil.set(m.id, saldo);
    saldo -= delta(m);
  }
  return hasil;
}

// ---------------------------------------------------------------- daftar barang

export function daftarKategori(list: Pick<BarangInventaris, "kategori">[]): { nama: string; jumlah: number }[] {
  const hitung = new Map<string, { nama: string; jumlah: number }>();
  for (const b of list) {
    if (!b.kategori) continue;
    const k = b.kategori.toLocaleLowerCase("id");
    const ada = hitung.get(k);
    if (ada) ada.jumlah++;
    else hitung.set(k, { nama: b.kategori, jumlah: 1 });
  }
  return [...hitung.values()].sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, "id"));
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("id");

/** "semua", "restok", atau "kategori:<nama>" */
export type SaringanBarang = string;

export function saringBarang<T extends BarangInventaris>(list: T[], cari: string, saringan: SaringanBarang): T[] {
  const kata = normal(rapikan(cari)).split(" ").filter(Boolean);
  const kategori = saringan.startsWith("kategori:") ? normal(saringan.slice(9)) : null;
  return list
    .filter((b) => {
      if (saringan === "restok" && !perluRestok(b)) return false;
      if (kategori !== null && normal(b.kategori ?? "") !== kategori) return false;
      if (!kata.length) return true;
      const teks = normal([b.nama, b.kategori, b.keterangan].filter(Boolean).join(" "));
      return kata.every((k) => teks.includes(k));
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export interface Ringkasan {
  jenis: number;
  restok: number;
  keluarBulanIni: number;
  masukBulanIni: number;
}

export function ringkasan(barang: BarangInventaris[], mutasiBulanIni: Pick<MutasiInventaris, "barang_id" | "jenis" | "jumlah">[]): Ringkasan {
  const aktif = new Set(barang.map((b) => b.id));
  let keluar = 0;
  let masuk = 0;
  for (const m of mutasiBulanIni) {
    if (!aktif.has(m.barang_id)) continue;
    if (m.jenis === "keluar") keluar += m.jumlah;
    else masuk += m.jumlah;
  }
  return { jenis: barang.length, restok: barang.filter(perluRestok).length, keluarBulanIni: keluar, masukBulanIni: masuk };
}

/** Isian "untuk/dari" yang pernah dipakai — terbaru dulu, tanpa kembar. */
export function saranPihak(list: Pick<MutasiInventaris, "jenis" | "pihak">[], jenis: JenisMutasi, maks = 6): string[] {
  const hasil: string[] = [];
  const sudah = new Set<string>();
  for (const m of list) {
    if (m.jenis !== jenis || !m.pihak) continue;
    const k = m.pihak.toLocaleLowerCase("id");
    if (sudah.has(k)) continue;
    sudah.add(k);
    hasil.push(m.pihak);
    if (hasil.length >= maks) break;
  }
  return hasil;
}

// ---------------------------------------------------------------- validasi (cermin cek database)

export interface FormBarang {
  nama: string;
  kategori: string;
  satuan: string;
  stokMinimum: number;
  stokAwal: number;
  keterangan: string;
}

export function validasiBarang(f: FormBarang, namaLain: string[] = []): string | null {
  const nama = rapikan(f.nama);
  if (nama.length < 2) return "Nama barang minimal 2 huruf.";
  if (nama.length > BATAS_INVENTARIS.nama) return `Nama barang maksimal ${BATAS_INVENTARIS.nama} huruf.`;
  const kunci = nama.toLocaleLowerCase("id");
  if (namaLain.some((n) => rapikan(n).toLocaleLowerCase("id") === kunci)) return `Sudah ada barang bernama "${nama}".`;
  if (rapikan(f.kategori).length > BATAS_INVENTARIS.kategori) return `Kategori maksimal ${BATAS_INVENTARIS.kategori} huruf.`;
  if (rapikan(f.satuan).length > BATAS_INVENTARIS.satuan) return `Satuan maksimal ${BATAS_INVENTARIS.satuan} huruf.`;
  if (f.keterangan.trim().length > BATAS_INVENTARIS.keterangan) return `Keterangan maksimal ${BATAS_INVENTARIS.keterangan} huruf.`;
  for (const n of [f.stokMinimum, f.stokAwal]) {
    if (!Number.isInteger(n) || n < 0 || n > BATAS_INVENTARIS.jumlah) return "Angka stok tidak valid.";
  }
  return null;
}

export interface FormMutasi {
  jenis: JenisMutasi;
  jumlah: number;
  tanggal: string;
  pihak: string;
  keterangan: string;
}

export function validasiMutasi(f: FormMutasi, opsi: { hariIni: string; tersedia: number; satuan: string }): string | null {
  if (!Number.isInteger(f.jumlah) || f.jumlah < 1) return "Jumlah minimal 1.";
  if (f.jumlah > BATAS_INVENTARIS.jumlah) return "Jumlahnya terlalu besar.";
  if (f.jenis === "keluar" && f.jumlah > opsi.tersedia) return `Stok tidak cukup. Sisa ${formatAngka(Math.max(opsi.tersedia, 0))} ${opsi.satuan}.`;
  if (f.tanggal > opsi.hariIni) return "Tanggal tidak boleh melewati hari ini.";
  if (selisihHari(f.tanggal, opsi.hariIni) > BATAS_INVENTARIS.hariMundur) return "Tanggal paling lama setahun ke belakang.";
  if (rapikan(f.pihak).length > BATAS_INVENTARIS.pihak) return `Kolom ${f.jenis === "keluar" ? "untuk" : "dari"} maksimal ${BATAS_INVENTARIS.pihak} huruf.`;
  if (f.keterangan.trim().length > BATAS_INVENTARIS.keterangan) return `Keterangan maksimal ${BATAS_INVENTARIS.keterangan} huruf.`;
  return null;
}

// ---------------------------------------------------------------- tanggal

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function formatTanggalPendek(ymd: string, hariIni?: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const tahun = hariIni && hariIni.slice(0, 4) === ymd.slice(0, 4) ? "" : ` ${y}`;
  return `${d} ${BULAN_PENDEK[m - 1]}${tahun}`;
}

/** "Hari ini", "Kemarin", "Senin, 17 Nov", atau "17 Nov 2025" untuk tahun lain. */
export function labelTanggal(ymd: string, hariIni: string): string {
  if (ymd === hariIni) return "Hari ini";
  if (ymd === tambahHari(hariIni, -1)) return "Kemarin";
  if (ymd.slice(0, 4) !== hariIni.slice(0, 4)) return formatTanggalPendek(ymd);
  const hari = HARI[new Date(`${ymd}T00:00:00Z`).getUTCDay()];
  return `${hari}, ${formatTanggalPendek(ymd, hariIni)}`;
}

/** Jam WIB "09.12" dari timestamp. */
export function jamWIB(timestamp: string): string {
  return new Date(Date.parse(timestamp) + 7 * 3_600_000).toISOString().slice(11, 16).replace(":", ".");
}

/** Kelompokkan daftar (yang sudah terurut) per tanggal, urutan dipertahankan. */
export function kelompokPerTanggal<T>(list: T[], tanggalDari: (x: T) => string, hariIni: string): { tanggal: string; label: string; isi: T[] }[] {
  const hasil: { tanggal: string; label: string; isi: T[] }[] = [];
  for (const x of list) {
    const t = tanggalDari(x);
    const akhir = hasil[hasil.length - 1];
    if (akhir && akhir.tanggal === t) akhir.isi.push(x);
    else hasil.push({ tanggal: t, label: labelTanggal(t, hariIni), isi: [x] });
  }
  return hasil;
}

export const tanggalLog = (l: Pick<LogInventaris, "dibuat_at">) => tanggalWIB(l.dibuat_at);

// ---------------------------------------------------------------- log CRUD

export type NadaLog = "masuk" | "keluar" | "tambah" | "ubah" | "hapus" | "pulihkan";

export interface KalimatLog {
  /** kata kerja setelah nama pelaku, mis. "mencatat keluar" */
  kata: string;
  /** mis. "20 pcs" (ditebalkan) */
  jumlah: string | null;
  barang: string;
  detail: string | null;
  nada: NadaLog;
}

const teks = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const bil = (v: unknown) => (typeof v === "number" ? v : null);

function snapshot(l: LogInventaris) {
  return (l.sesudah ?? l.sebelum ?? {}) as Record<string, unknown>;
}

function teksPihak(jenis: unknown, pihak: unknown): string | null {
  const p = teks(pihak);
  if (!p) return null;
  return `${jenis === "masuk" ? "Dari" : "Untuk"} ${p}`;
}

const LABEL_KOLOM: Record<string, string> = {
  nama: "nama",
  kategori: "kategori",
  satuan: "satuan",
  stok_minimum: "batas menipis",
  keterangan: "keterangan",
  foto_path: "foto",
  jenis: "jenis",
  jumlah: "jumlah",
  tanggal: "tanggal",
  pihak: "untuk/dari",
};

export function kalimatLog(l: LogInventaris): KalimatLog {
  const s = snapshot(l);
  const satuan = teks(s.satuan) ?? "";
  const jml = bil(s.jumlah);
  const jumlah = jml !== null ? `${formatAngka(jml)} ${satuan}`.trim() : null;
  const jenis = l.jenis ?? (teks(s.jenis) as JenisMutasi | null) ?? "keluar";
  const barang = l.nama_barang;

  switch (l.aksi) {
    case "barang_tambah":
      return { kata: "menambah barang", jumlah: null, barang, detail: [teks(s.kategori), teks(s.satuan)].filter(Boolean).join(" · ") || null, nada: "tambah" };
    case "barang_ubah": {
      const kolom = Object.keys(l.sesudah ?? {}).map((k) => LABEL_KOLOM[k] ?? k);
      return { kata: "mengubah", jumlah: null, barang, detail: kolom.length ? `Diubah: ${kolom.join(", ")}` : null, nada: "ubah" };
    }
    case "barang_hapus": {
      const stok = bil(s.stok);
      return { kata: "menghapus barang", jumlah: null, barang, detail: stok !== null ? `Sisa stok saat dihapus: ${formatAngka(stok)} ${satuan}`.trim() : null, nada: "hapus" };
    }
    case "barang_pulihkan":
      return { kata: "memulihkan barang", jumlah: null, barang, detail: null, nada: "pulihkan" };
    case "mutasi_tambah":
      return {
        kata: `mencatat ${jenis}`,
        jumlah,
        barang,
        detail: [teksPihak(jenis, s.pihak), teks(s.keterangan)].filter(Boolean).join(" · ") || null,
        nada: jenis === "masuk" ? "masuk" : "keluar",
      };
    case "mutasi_ubah": {
      const ubah = rincianPerubahan(l).map((r) => `${r.label.toLocaleLowerCase("id")} ${r.dari} → ${r.ke}`);
      return { kata: `mengubah catatan ${jenis}`, jumlah: null, barang, detail: ubah.join(" · ") || null, nada: "ubah" };
    }
    case "mutasi_hapus":
      return { kata: `menghapus catatan ${jenis}`, jumlah, barang, detail: teksPihak(jenis, s.pihak), nada: "hapus" };
    default:
      return { kata: "mengubah", jumlah: null, barang, detail: null, nada: "ubah" };
  }
}

function nilaiKolom(k: string, v: unknown, satuan: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (k === "tanggal" && typeof v === "string") return formatTanggalPendek(v);
  if (k === "jenis") return v === "masuk" ? "Masuk" : "Keluar";
  if (k === "stok_minimum") return v === 0 ? "Tidak diatur" : `${formatAngka(Number(v))} ${satuan}`.trim();
  if (k === "jumlah" || k === "stok") return `${formatAngka(Number(v))} ${satuan}`.trim();
  if (k === "foto_path") return "Ada foto";
  return String(v);
}

function labelKolom(k: string, jenis: unknown): string {
  if (k === "pihak") return jenis === "masuk" ? "Dari" : "Untuk";
  if (k === "stok_minimum") return "Batas menipis";
  if (k === "stok") return "Stok";
  const l = LABEL_KOLOM[k] ?? k;
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export interface BarisPerubahan {
  kunci: string;
  label: string;
  dari: string;
  ke: string;
}

/** Untuk aksi *_ubah: kolom yang berubah, sebelum → sesudah. */
export function rincianPerubahan(l: LogInventaris): BarisPerubahan[] {
  const sebelum = (l.sebelum ?? {}) as Record<string, unknown>;
  const sesudah = (l.sesudah ?? {}) as Record<string, unknown>;
  const satuanLama = teks(sebelum.satuan) ?? teks(sesudah.satuan) ?? "";
  const satuanBaru = teks(sesudah.satuan) ?? satuanLama;
  const jenis = sesudah.jenis ?? l.jenis;
  const kunci = Object.keys(sesudah).filter((k) => !(k === "satuan" && l.aksi === "mutasi_ubah"));
  return kunci.map((k) => ({
    kunci: k,
    label: labelKolom(k, jenis),
    dari: k === "foto_path" ? (sebelum[k] ? "Foto lama" : "Tanpa foto") : nilaiKolom(k, sebelum[k], satuanLama),
    ke: k === "foto_path" ? (sesudah[k] ? "Foto baru" : "Foto dihapus") : nilaiKolom(k, sesudah[k], satuanBaru),
  }));
}

/** Untuk aksi tambah/hapus/pulihkan: isi lengkap baris saat itu. */
export function isiLog(l: LogInventaris): { label: string; nilai: string }[] {
  const s = snapshot(l);
  const satuan = teks(s.satuan) ?? "";
  const kunci = l.aksi.startsWith("mutasi_")
    ? ["jenis", "jumlah", "tanggal", "pihak", "keterangan"]
    : ["nama", "kategori", "satuan", "stok", "stok_minimum", "keterangan"];
  return kunci
    .filter((k) => k in s && !(k === "keterangan" && !teks(s[k])))
    .map((k) => ({ label: labelKolom(k, s.jenis ?? l.jenis), nilai: nilaiKolom(k, s[k], satuan) }));
}

// ---------------------------------------------------------------- foto

/** Foto disimpan dua ukuran: utama (detail) dan "-kecil" (kartu daftar). */
export function pathFotoKecil(path: string): string {
  return path.replace(/\.jpg$/i, "-kecil.jpg");
}
