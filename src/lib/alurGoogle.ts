// Ke mana pengguna dibawa setelah kembali dari login Google.
//
// Supabase selalu mengembalikan pengguna ke alamat utama (`/`, halaman depan),
// bukan ke halaman tempat tombol Google ditekan. Tanpa pengarahan ini, orang
// yang menekan "Daftar" malah mendarat di halaman depan lagi (terasa "mental"),
// dan email yang belum terdaftar ditolak diam-diam tanpa pesan apa pun.
// Halaman asal disimpan di sessionStorage sebelum ke Google, lalu dibaca lagi
// saat kembali.

export type TujuanGoogle = "/login" | "/daftar";

/** Kenapa sesi Google ditolak masuk aplikasi. */
export interface Penolakan {
  alasan: "belum_terdaftar" | "nonaktif";
  email: string;
}

export const KUNCI_TUJUAN_GOOGLE = "disparyk_tujuan_google";
/** Lewat dari ini dianggap batal (tab ditinggal di tengah proses login). */
export const BATAS_TUJUAN_MS = 15 * 60 * 1000;

export function bacaTujuan(mentah: string | null, sekarang: number): TujuanGoogle | null {
  if (!mentah) return null;
  try {
    const v = JSON.parse(mentah) as { ke?: unknown; t?: unknown };
    if (v.ke !== "/login" && v.ke !== "/daftar") return null;
    if (typeof v.t !== "number") return null;
    const umur = sekarang - v.t;
    return umur >= 0 && umur < BATAS_TUJUAN_MS ? v.ke : null;
  } catch {
    return null;
  }
}

export function ambilTujuanGoogle(): TujuanGoogle | null {
  try {
    return bacaTujuan(sessionStorage.getItem(KUNCI_TUJUAN_GOOGLE), Date.now());
  } catch {
    return null;
  }
}

export function simpanTujuanGoogle(ke: TujuanGoogle) {
  try {
    sessionStorage.setItem(KUNCI_TUJUAN_GOOGLE, JSON.stringify({ ke, t: Date.now() }));
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

const HALAMAN_PINTU = ["/", "/login", "/daftar"];

/**
 * `selesai` = hasil login sudah jelas, tujuan boleh dihapus.
 * `ke` = halaman yang harus dibuka (null = sudah di tempat yang benar / masih menunggu).
 */
export function arahSetelahGoogle(
  tujuan: TujuanGoogle | null,
  k: KeadaanAuth,
  pathname: string
): { selesai: boolean; ke: string | null } {
  if (!tujuan || k.loading) return { selesai: false, ke: null };

  let target: string;
  if (k.adaSesi && k.adaProfil) {
    // Berhasil masuk. Kalau sudah di dalam aplikasi, biarkan.
    if (!HALAMAN_PINTU.includes(pathname)) return { selesai: true, ke: null };
    target = "/beranda";
  } else if (k.adaSesi && k.modeDaftar) {
    target = "/daftar";
  } else {
    // Ditolak, dibatalkan di layar Google, atau profil gagal dimuat:
    // kembali ke halaman asal yang akan menjelaskan apa yang terjadi.
    target = tujuan;
  }
  return { selesai: true, ke: target === pathname ? null : target };
}
