// Ke mana pengguna dibawa setelah kembali dari login Google.
//
// Supabase selalu mengembalikan pengguna ke alamat utama (`/`, halaman depan),
// bukan ke halaman tempat tombol Google ditekan. Tanpa pengarahan ini, orang
// yang menekan "Daftar" malah mendarat di halaman depan lagi (terasa "mental"),
// dan email yang belum terdaftar ditolak diam-diam tanpa pesan apa pun.
// Halaman asal disimpan di sessionStorage sebelum ke Google, lalu dibaca lagi
// saat kembali.

export type TujuanGoogle = "/login" | "/daftar";

export interface TujuanTersimpan {
  ke: TujuanGoogle;
  /** halaman di dalam aplikasi yang dibuka lagi setelah berhasil masuk (mis. sesi tadi berakhir) */
  kembali: string | null;
}

/** Kenapa sesi Google ditolak masuk aplikasi. */
export interface Penolakan {
  alasan: "belum_terdaftar" | "nonaktif";
  email: string;
}

export const KUNCI_TUJUAN_GOOGLE = "disparyk_tujuan_google";
/** Lewat dari ini dianggap batal (tab ditinggal di tengah proses login). */
export const BATAS_TUJUAN_MS = 15 * 60 * 1000;

const HALAMAN_PINTU = ["/", "/login", "/daftar"];

/** Hanya jalur di dalam aplikasi (bukan halaman pintu) yang boleh jadi tujuan kembali. */
export function bersihkanKembali(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 300) return null;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return HALAMAN_PINTU.includes(v.split(/[?#]/)[0]) ? null : v;
}

export function bacaTujuan(mentah: string | null, sekarang: number): TujuanTersimpan | null {
  if (!mentah) return null;
  try {
    const v = JSON.parse(mentah) as { ke?: unknown; t?: unknown; kembali?: unknown };
    if (v.ke !== "/login" && v.ke !== "/daftar") return null;
    if (typeof v.t !== "number") return null;
    const umur = sekarang - v.t;
    if (umur < 0 || umur >= BATAS_TUJUAN_MS) return null;
    return { ke: v.ke, kembali: v.ke === "/login" ? bersihkanKembali(v.kembali) : null };
  } catch {
    return null;
  }
}

export function ambilTujuanGoogle(): TujuanTersimpan | null {
  try {
    return bacaTujuan(sessionStorage.getItem(KUNCI_TUJUAN_GOOGLE), Date.now());
  } catch {
    return null;
  }
}

export function simpanTujuanGoogle(ke: TujuanGoogle, kembali?: string | null) {
  try {
    sessionStorage.setItem(KUNCI_TUJUAN_GOOGLE, JSON.stringify({ ke, t: Date.now(), kembali: bersihkanKembali(kembali) }));
  } catch {
    // sessionStorage bisa tidak tersedia (mode privat); pengguna tetap mendarat di `/`
  }
}

export function hapusTujuanGoogle() {
  try {
    sessionStorage.removeItem(KUNCI_TUJUAN_GOOGLE);
  } catch {
    // abaikan
  }
}

export interface KeadaanAuth {
  loading: boolean;
  adaSesi: boolean;
  adaProfil: boolean;
  /** sedang mendaftar: sesi tanpa profil dibiarkan supaya form /daftar bisa diisi */
  modeDaftar: boolean;
}

/**
 * `selesai` = hasil login sudah jelas, tujuan boleh dihapus.
 * `ke` = halaman yang harus dibuka (null = sudah di tempat yang benar / masih menunggu).
 */
export function arahSetelahGoogle(
  tujuan: TujuanTersimpan | null,
  k: KeadaanAuth,
  pathname: string
): { selesai: boolean; ke: string | null } {
  if (!tujuan || k.loading) return { selesai: false, ke: null };

  let target: string;
  if (k.adaSesi && k.adaProfil) {
    // Berhasil masuk. Kalau sudah di dalam aplikasi, biarkan.
    if (!HALAMAN_PINTU.includes(pathname)) return { selesai: true, ke: null };
    target = tujuan.kembali ?? "/beranda";
  } else if (k.adaSesi && k.modeDaftar) {
    target = "/daftar";
  } else {
    // Ditolak, dibatalkan di layar Google, atau profil gagal dimuat:
    // kembali ke halaman asal yang akan menjelaskan apa yang terjadi.
    target = tujuan.ke;
  }
  return { selesai: true, ke: target === pathname ? null : target };
}
