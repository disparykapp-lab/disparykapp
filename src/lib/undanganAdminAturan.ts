// Aturan link pendaftaran admin (migrasi 0046) yang murni — diuji di tests/undanganAdmin.test.ts.
import type { UndanganAdmin } from "../types/database";

export const POLA_KODE_UNDANGAN = /^[0-9a-f]{32}$/;
export const kodeUndanganSah = (k: unknown): k is string => typeof k === "string" && POLA_KODE_UNDANGAN.test(k);

export function urlUndangan(origin: string, kode: string): string {
  return `${origin.replace(/\/+$/, "")}/daftar-admin/${kode}`;
}

/** Sama dengan _status_undangan_admin() di database. */
export type StatusUndangan = "berlaku" | "dipakai" | "dibatalkan" | "kedaluwarsa" | "tidak_berlaku" | "tidak_ada";

export function statusUndangan(
  u: Pick<UndanganAdmin, "dibatalkan_at" | "dipakai_at" | "berlaku_sampai"> & { pembuat: { role: string; aktif: boolean } | null },
  sekarang: number
): StatusUndangan {
  if (u.dibatalkan_at) return "dibatalkan";
  if (u.dipakai_at) return "dipakai";
  if (!u.pembuat || u.pembuat.role !== "admin" || !u.pembuat.aktif) return "tidak_berlaku";
  if (Date.parse(u.berlaku_sampai) <= sekarang) return "kedaluwarsa";
  return "berlaku";
}

/** "7 hari lagi", "5 jam lagi", "kurang dari 1 jam", "sudah lewat". */
export function sisaWaktu(berlakuSampai: string, sekarang: number): string {
  const ms = Date.parse(berlakuSampai) - sekarang;
  if (ms <= 0) return "sudah lewat";
  const jam = Math.floor(ms / 3_600_000);
  if (jam < 1) return "kurang dari 1 jam";
  if (jam < 24) return `${jam} jam lagi`;
  // dibulatkan: link yang baru dibuat (6 hari 23 jam) tertulis "7 hari lagi"
  return `${Math.max(1, Math.round(ms / 86_400_000))} hari lagi`;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "26 Nov, 21.41" (WIB). */
export function formatWaktuWIB(iso: string): string {
  const d = new Date(Date.parse(iso) + 7 * 3_600_000);
  const jam = `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}, ${jam}`;
}

/** Teks pesan yang ikut dibagikan bersama link. */
export function teksUndangan(berlakuSampai: string): string {
  return (
    "Kamu diundang jadi admin aplikasi DisparYK (Dinas Pariwisata Kota Yogyakarta). " +
    "Buka link ini lalu masuk dengan akun Gmail kamu — tidak perlu isi data lain. " +
    `Link hanya bisa dipakai sekali, berlaku sampai ${formatWaktuWIB(berlakuSampai)} WIB.`
  );
}

/** Judul & penjelasan untuk link yang tidak bisa dipakai. */
export function pesanStatus(status: Exclude<StatusUndangan, "berlaku">): { judul: string; isi: string } {
  switch (status) {
    case "dipakai":
      return { judul: "Link sudah dipakai", isi: "Satu link pendaftaran admin hanya berlaku sekali, dan link ini sudah dipakai mendaftar. Minta link baru ke admin." };
    case "dibatalkan":
      return { judul: "Link sudah dibatalkan", isi: "Admin pembuatnya sudah membatalkan link ini. Minta link baru kalau kamu memang perlu jadi admin." };
    case "kedaluwarsa":
      return { judul: "Link sudah kedaluwarsa", isi: "Link pendaftaran admin berlaku 7 hari sejak dibuat. Minta link baru ke admin." };
    case "tidak_berlaku":
      return { judul: "Link tidak berlaku lagi", isi: "Pembuat link ini sudah bukan admin, jadi link-nya ikut tidak berlaku. Minta link baru ke admin lain." };
    default:
      return { judul: "Link tidak dikenal", isi: "Alamat link-nya mungkin terpotong saat disalin. Buka lagi dari pesan aslinya, atau minta link baru ke admin." };
  }
}
