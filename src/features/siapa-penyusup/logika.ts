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

// ---------------------------------------------------------------------------
// Permainan — cermin RPC di migrasi 0033
// ---------------------------------------------------------------------------

/** Lewat dari ronde ini penyusup menang karena berhasil berbaur. */
export const BATAS_RONDE = 6;
export const PANJANG_PETUNJUK = 24;

/** Sama dengan game_normal() di SQL: "Kupu-kupu!" -> "kupu kupu". */
export function normalKata(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function rapikanPetunjuk(teks: string): string {
  return teks.replace(/\s+/g, " ").trim();
}

export type AlasanTolakPetunjuk = "kosong" | "panjang" | "satu_kata" | "sama_kata";

/**
 * Cermin penyusup_petunjuk(): 1 kata, maks 24 huruf, dan tidak sama persis
 * dengan kata sendiri. Bagian kata ("Prambanan" untuk "Candi Prambanan") boleh.
 */
export function cekPetunjuk(teks: string, kataSendiri: string): AlasanTolakPetunjuk | null {
  const t = rapikanPetunjuk(teks);
  if (!t) return "kosong";
  if (t.length > PANJANG_PETUNJUK) return "panjang";
  if (t.includes(" ")) return "satu_kata";
  const a = normalKata(t);
  const b = normalKata(kataSendiri);
  if (a === b || a.replace(/ /g, "") === b.replace(/ /g, "")) return "sama_kata";
  return null;
}

/** Sisa detik (dibulatkan ke atas) sampai tenggat fase, menurut jam server. */
export function sisaDetik(faseBerakhir: string | null, sekarangMs: number): number {
  if (!faseBerakhir) return 0;
  return Math.max(0, Math.ceil((Date.parse(faseBerakhir) - sekarangMs) / 1000));
}

/** Timer cincin: kuning <= 10 dtk, merah bergetar <= 5 dtk. */
export function kelasTimer(sisa: number): string {
  if (sisa <= 5) return "is-critical sp-anim-critical";
  if (sisa <= 10) return "is-warning";
  return "";
}

export interface Suara {
  voter: string;
  /** null = lewati */
  target: string | null;
}

/**
 * Cermin _penyusup_hitung_vote(): suara terbanyak tersingkir; seri di posisi
 * teratas, atau suara lewati >= suara terbanyak, berarti tidak ada yang tersingkir.
 */
export function hitungVote(suara: Suara[]): { tally: Record<string, number>; lewati: number; tersingkir: string | null } {
  const tally: Record<string, number> = {};
  let lewati = 0;
  for (const s of suara) {
    if (s.target === null) lewati++;
    else tally[s.target] = (tally[s.target] ?? 0) + 1;
  }
  const nilai = Object.values(tally);
  const maks = nilai.length ? Math.max(...nilai) : 0;
  const teratas = Object.keys(tally).filter((k) => tally[k] === maks);
  const tersingkir = maks > lewati && teratas.length === 1 ? teratas[0] : null;
  return { tally, lewati, tersingkir };
}

export type Peran = "pemandu" | "penyusup";

/** Cermin _penyusup_cek_menang(). null = permainan berlanjut. */
export function cekPemenang(penyusupHidup: number, pemanduHidup: number): Peran | null {
  if (penyusupHidup === 0) return "pemandu";
  if (penyusupHidup >= pemanduHidup) return "penyusup";
  return null;
}

/**
 * Cermin perhitungan poin di _penyusup_selesai() (tabel skor README):
 * pemandu menang +100 (+50 kalau masih hidup), +30 per vote ke penyusup;
 * penyusup menang +300, +50 per ronde selamat, +200 tebakan terakhir benar.
 * Pemain yang keluar sebelum game selesai tidak mendapat poin.
 */
export function poinPemain(p: {
  peran: Peran;
  pemenang: Peran;
  aktif: boolean;
  hidup: boolean;
  voteTepat: number;
  rondeSelamat: number;
  tebakanBenar: boolean;
}): number {
  if (!p.aktif) return 0;
  if (p.peran === "pemandu") {
    return (p.pemenang === "pemandu" ? 100 + (p.hidup ? 50 : 0) : 0) + 30 * p.voteTepat;
  }
  return (p.pemenang === "penyusup" ? 300 : 0) + 50 * p.rondeSelamat + (p.tebakanBenar ? 200 : 0);
}

// ---------------------------------------------------------
// Truth or Dare untuk yang kalah (migrasi 0037)
// ---------------------------------------------------------

/** Roda TRUTH/DARE: 8 juring, dihitung searah jarum jam dari atas; juring genap TRUTH, ganjil DARE. */
export const JURING_RODA = 8;

export function jenisJuring(i: number): "truth" | "dare" {
  return i % 2 === 0 ? "truth" : "dare";
}

/**
 * Arah akhir roda (0–360°, searah jarum jam) supaya jarum di atas menunjuk
 * juring `indeks` dari `jumlah` juring. `acak` 0..1 menggeser posisi di dalam
 * juring, tapi tidak pernah mepet garis batas.
 */
export function arahRoda(indeks: number, jumlah: number, acak: number): number {
  const lebar = 360 / jumlah;
  const tengah = indeks * lebar + lebar / 2 + (Math.min(Math.max(acak, 0), 1) - 0.5) * lebar * 0.6;
  return (360 - tengah + 360) % 360;
}

/** Arah akhir roda TRUTH/DARE untuk `jenis`; `acak` memilih salah satu juringnya & posisinya. */
export function arahRodaTod(jenis: "truth" | "dare", acak: number): number {
  const calon = Array.from({ length: JURING_RODA }, (_, i) => i).filter((i) => jenisJuring(i) === jenis);
  const x = Math.min(Math.max(acak, 0), 0.999999) * calon.length;
  return arahRoda(calon[Math.floor(x)], JURING_RODA, x - Math.floor(x));
}

/** Sudut putar berikutnya dari posisi `sekarang`: maju `putaran` kali penuh lalu berhenti di `arah`. */
export function putarRoda(sekarang: number, arah: number, putaran = 5): number {
  return Math.ceil(sekarang / 360) * 360 + putaran * 360 + arah;
}

/** Juring yang ada di bawah jarum setelah roda diputar `sudut` derajat. */
export function juringDiJarum(sudut: number, jumlah = JURING_RODA): number {
  const lebar = 360 / jumlah;
  return Math.floor(((((360 - (sudut % 360)) % 360) + 360) % 360) / lebar);
}

const URUTAN_STATUS_TOD: Record<string, number> = { menunggu_ai: 0, membuat: 1, siap: 2, tidak_ada: 2 };

/**
 * Data Truth or Dare paling baru untuk game ini, dari baris room (Realtime /
 * detak) atau balasan RPC sendiri — putaran terbaru, lalu status paling maju.
 */
export function todTerkini<T extends { game_ke: number; ke?: number; status: string }>(
  gameKe: number,
  ...daftar: (T | null | undefined)[]
): T | null {
  const nilai = (t: T) => (t.ke ?? 0) * 10 + (URUTAN_STATUS_TOD[t.status] ?? 0);
  let hasil: T | null = null;
  for (const t of daftar) {
    if (!t || t.game_ke !== gameKe) continue;
    if (!hasil || nilai(t) > nilai(hasil)) hasil = t;
  }
  return hasil;
}
