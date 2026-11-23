// Aturan murni Koreksi Absensi (Super Admin): jam sampai detik & path foto.
//
// Jam disimpan sebagai teks "HH:MM:SS" (24 jam, WIB); "" = belum absen.
// Sengaja tidak memakai <input type="time" step="1">: Safari iPhone mengabaikan
// `step` sehingga detik tidak bisa diubah (hanya sampai menit).

/** Batas atas tiap bagian: jam, menit, detik. */
export const MAKS_SEGMEN = [23, 59, 59] as const;
export type IndeksSegmen = 0 | 1 | 2;

const dua = (n: number) => String(n).padStart(2, "0");

/** "7:5" / "07:30" / "07:30:45" → "07:05:00" / "07:30:00" / "07:30:45"; tidak sah → "". */
export function normalJam(v: string | null | undefined): string {
  if (!v) return "";
  const m = /^(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?/.exec(v.trim());
  if (!m) return "";
  const angka = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  if (angka.some((n, i) => n > MAKS_SEGMEN[i])) return "";
  return angka.map(dua).join(":");
}

/** "07:30:45" → [7, 30, 45]; kosong/tidak sah → null. */
export function pecahJam(v: string): [number, number, number] | null {
  const n = normalJam(v);
  if (!n) return null;
  const [j, m, d] = n.split(":").map(Number);
  return [j, m, d];
}

/** Ganti satu bagian dengan angka (dibatasi 0..maks). Jam kosong dianggap 00:00:00. */
export function isiSegmen(v: string, i: IndeksSegmen, angka: number): string {
  const bagian = pecahJam(v) ?? [0, 0, 0];
  bagian[i] = Math.max(0, Math.min(MAKS_SEGMEN[i], Math.trunc(angka) || 0));
  return bagian.map(dua).join(":");
}

/** Naik/turun satu bagian; berputar (59 → 00, 00 → 59) tanpa mengubah bagian lain. */
export function geserSegmen(v: string, i: IndeksSegmen, langkah: number): string {
  const bagian = pecahJam(v) ?? [0, 0, 0];
  const putaran = MAKS_SEGMEN[i] + 1;
  bagian[i] = (((bagian[i] + langkah) % putaran) + putaran) % putaran;
  return bagian.map(dua).join(":");
}

/** "07:30:45" → "07.30.45" (penulisan jam Indonesia). */
export function tampilJam(v: string): string {
  return normalJam(v).replaceAll(":", ".");
}

const fmtJamWib = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

/** ISO/timestamptz → "07:30:45" WIB; null → "". */
export function keJamWib(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return normalJam(fmtJamWib.format(d));
}

/** Jam sekarang (WIB) sampai detik. */
export function jamSekarangWib(sekarang = Date.now()): string {
  return keJamWib(new Date(sekarang).toISOString());
}

/** "2026-10-08" + "07:30:45" → "2026-10-08T07:30:45+07:00" (WIB tanpa musim panas); jam kosong → null. */
export function keIsoWib(tanggal: string, jam: string): string | null {
  const n = normalJam(jam);
  return n ? `${tanggal}T${n}+07:00` : null;
}

export type JenisSesi = "masuk" | "keluar";

/** Foto koreksi disimpan di folder pegawai yang dikoreksi (bukan folder super admin). */
export function pathFotoKoreksi(userId: string, tanggal: string, jenis: JenisSesi, acak: string): string {
  return `${userId}/${tanggal}/${jenis}-koreksi-${acak}.jpg`;
}
