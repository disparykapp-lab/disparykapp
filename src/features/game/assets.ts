// Semua aset game dipotong dari satu lembar "Lembar Aset Game Coret Tebak.png"
// (latar buram dibuang, jadi WebP transparan). Dibaca lewat satu modul supaya
// Vite hanya memaketkannya ke chunk game yang dimuat lazy, bukan ke bundel absensi.

const u = (nama: string) => new URL(`./assets/${nama}.webp`, import.meta.url).href;

export const ASET = {
  logo: u("logo"),
  maskot: {
    berdiri: u("mascot-berdiri"),
    menunjuk: u("mascot-menunjuk"),
    senang: u("mascot-senang"),
  },
  wajah: {
    tertawa: u("wajah-tertawa"),
    pikir: u("wajah-pikir"),
    kalah: u("wajah-kalah"),
  },
  avatar: [u("avatar-01"), u("avatar-02"), u("avatar-03"), u("avatar-04"), u("avatar-05"), u("avatar-06")],
  ikon: {
    benar: u("ikon-benar"),
    gambar: u("ikon-gambar"),
  },
  medali: [u("medali-1"), u("medali-2"), u("medali-3")],
  tema: { tugu: u("tema-tugu") },
  item: {
    ransel: u("item-ransel"),
    peta: u("item-peta"),
    makanan: u("item-makanan"),
    becak: u("item-becak"),
  },
  ornamen: { gunungan: u("ornamen-gunungan") },
  latar: { jalan: u("latar-jalan") },
};

/** Avatar kartun tetap untuk pemain tanpa foto profil (dipilih dari id, jadi selalu sama). */
export function avatarCadangan(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return ASET.avatar[h % ASET.avatar.length];
}
