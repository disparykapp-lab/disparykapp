// Aturan Tugas dari Admin yang murni (tanpa dependensi, diuji di tests/tugas.test.ts):
// status, urutan daftar, pengingat Beranda, langkah, arsip, dan pilihan bawaan (migrasi 0041).

export type StatusTugas = "belum" | "selesai" | "kendala" | "diperiksa" | "revisi";

export const LABEL_STATUS_TUGAS: Record<StatusTugas, string> = {
  belum: "Belum",
  selesai: "Selesai",
  kendala: "Kendala",
  diperiksa: "Menunggu dicek",
  revisi: "Perlu revisi",
};

export interface LangkahTugas {
  id: string;
  teks: string;
}

/** Kolom pilihan tugas (0041) — undefined = migrasi belum dijalankan, pakai bawaan. */
export interface PilihanTugas {
  perlu_cek?: boolean;
  mendesak?: boolean;
  kuota?: number | null;
  kuota_terisi?: number;
  wajib_baca?: boolean;
  langkah?: LangkahTugas[];
  arsip_hari?: number | null;
  ingatkan?: boolean;
  tanya_jawab?: boolean;
  /** pin dari admin; null = tidak disematkan */
  disematkan_at?: string | null;
}

export const PILIHAN_BAWAAN = {
  perlu_cek: false,
  mendesak: false,
  kuota: null,
  wajib_baca: false,
  langkah: [] as LangkahTugas[],
  arsip_hari: null,
  ingatkan: true,
  tanya_jawab: true,
  disematkan_at: null,
} satisfies Required<Omit<PilihanTugas, "kuota_terisi">>;

/** Sudah dikerjakan dari sisi pegawai (yang menunggu dicek juga dihitung selesai di daftarnya). */
export const sudahBeres = (s: StatusTugas | undefined) => s === "selesai" || s === "diperiksa";

/** Status yang dipilih di form pegawai (Belum/Selesai/Kendala) dari status tersimpan. */
export function pilihanStatus(s: StatusTugas | undefined): "belum" | "selesai" | "kendala" {
  if (s === "selesai" || s === "diperiksa") return "selesai";
  if (s === "kendala") return "kendala";
  return "belum";
}

/** Tugas berkuota yang belum diambil pegawai ini: boleh diambil, bukan kewajiban. */
export const belumDiambil = (t: PilihanTugas, punyaProgres: boolean) => t.kuota != null && !punyaProgres;

const JAM = 3_600_000;

/**
 * Perlu muncul di kartu pengingat Beranda? "mendesak" kalau ditandai admin;
 * "deadline" kalau pengingat nyala dan deadline tinggal < 24 jam (atau sudah lewat).
 */
export function perluPerhatian(
  t: PilihanTugas & { deadline_at: string | null },
  status: StatusTugas | undefined,
  punyaProgres: boolean,
  sekarang = Date.now()
): "mendesak" | "deadline" | null {
  if (sudahBeres(status) || belumDiambil(t, punyaProgres)) return null;
  if (t.mendesak) return "mendesak";
  if (t.ingatkan !== false && t.deadline_at && new Date(t.deadline_at).getTime() - sekarang < 24 * JAM) return "deadline";
  return null;
}

/** Urutan sematan: yang disematkan dulu (sematan terbaru paling atas); 0 kalau sama-sama tidak. */
function bandingSematan(a: PilihanTugas, b: PilihanTugas): number {
  const sa = a.disematkan_at ? new Date(a.disematkan_at).getTime() : null;
  const sb = b.disematkan_at ? new Date(b.disematkan_at).getTime() : null;
  if (sa === null || sb === null) return Number(sb !== null) - Number(sa !== null);
  return sb - sa;
}

/** Tugas yang disematkan admin naik ke atas; urutan sisanya tidak diubah (daftar admin). */
export function dahulukanSematan<T extends PilihanTugas>(daftar: T[]): T[] {
  return [...daftar].sort(bandingSematan);
}

/** Urutan daftar pegawai: disematkan, lalu mendesak, lalu deadline terdekat, lalu yang terbaru dibuat. */
export function urutkanTugas<T extends PilihanTugas & { deadline_at: string | null; created_at: string }>(daftar: T[]): T[] {
  const waktu = (iso: string | null) => (iso ? new Date(iso).getTime() : Infinity);
  return [...daftar].sort(
    (a, b) =>
      bandingSematan(a, b) ||
      Number(!!b.mendesak) - Number(!!a.mendesak) ||
      waktu(a.deadline_at) - waktu(b.deadline_at) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Gabungkan pesan tanya-jawab (dari muat ulang, kiriman sendiri, atau Realtime):
 * tanpa dobel (per id), urut waktu kirim. Pesan yang sama bisa datang dua kali —
 * dari balasan insert dan dari websocket.
 */
export function gabungTanya<T extends { id: number; dibuat_at: string }>(lama: T[], baru: T[]): T[] {
  if (baru.length === 0) return lama;
  const peta = new Map<number, T>();
  for (const m of lama) peta.set(m.id, m);
  for (const m of baru) peta.set(m.id, m);
  return [...peta.values()].sort((a, b) => new Date(a.dibuat_at).getTime() - new Date(b.dibuat_at).getTime() || a.id - b.id);
}

/** Sudah disembunyikan otomatis dari pegawai (arsip N hari setelah deadline)? */
export function sudahDiarsip(t: PilihanTugas & { deadline_at: string | null }, sekarang = Date.now()): boolean {
  if (t.arsip_hari == null || !t.deadline_at) return false;
  return new Date(t.deadline_at).getTime() + t.arsip_hari * 24 * JAM <= sekarang;
}

/** Id pendek untuk langkah baru (huruf kecil & angka, sesuai validasi 0041). */
export function idLangkah(): string {
  return Math.random().toString(36).slice(2, 10) || "l";
}

/** Rapikan isian editor langkah: buang yang kosong, potong 300 huruf, maks. 30 langkah. */
export function rapikanLangkah(daftar: LangkahTugas[]): LangkahTugas[] {
  return daftar
    .map((l) => ({ id: l.id, teks: l.teks.replace(/\s+/g, " ").trim().slice(0, 300) }))
    .filter((l) => l.teks.length > 0)
    .slice(0, 30);
}

/** Langkah yang sudah dicentang (hanya yang masih ada di daftar tugas). */
export function hitungLangkah(langkah: LangkahTugas[] | undefined, selesai: string[] | undefined): { selesai: number; total: number } {
  const ada = new Set((langkah ?? []).map((l) => l.id));
  return { selesai: (selesai ?? []).filter((id) => ada.has(id)).length, total: ada.size };
}

/**
 * Kolom pilihan yang dikirim saat menyimpan tugas. Sebelum migrasi 0041 dijalankan,
 * hanya kolom yang berbeda dari bawaan yang dikirim — tugas biasa tetap bisa disimpan.
 */
export function kolomPilihan(isi: Required<Omit<PilihanTugas, "kuota_terisi">>, migrasiAda: boolean): Partial<PilihanTugas> {
  const hasil: Partial<PilihanTugas> = {};
  for (const k of Object.keys(PILIHAN_BAWAAN) as (keyof typeof PILIHAN_BAWAAN)[]) {
    const beda = JSON.stringify(isi[k]) !== JSON.stringify(PILIHAN_BAWAAN[k]);
    if (migrasiAda || beda) (hasil as Record<string, unknown>)[k] = isi[k];
  }
  return hasil;
}
