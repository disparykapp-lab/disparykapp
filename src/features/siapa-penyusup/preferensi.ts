// Preferensi per perangkat: karakter terakhir (dikirim saat buat/gabung room)
// dan setelan "kurangi gerakan" dari sistem.

const KUNCI_AVATAR = "siapa-penyusup:avatar";

export function avatarTersimpan(): number | null {
  try {
    const v = localStorage.getItem(KUNCI_AVATAR);
    const n = Number(v);
    return v !== null && Number.isInteger(n) && n >= 0 && n <= 7 ? n : null;
  } catch {
    return null;
  }
}

export function simpanAvatar(indeks: number) {
  try {
    localStorage.setItem(KUNCI_AVATAR, String(indeks));
  } catch {
    // penyimpanan diblokir (mode privat) — abaikan
  }
}

/** Pengguna memilih "kurangi gerakan" di pengaturan perangkat. */
export function kurangiGerak(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
