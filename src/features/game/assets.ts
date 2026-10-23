// Aset game dari folder sumber "aset-game-sumber/" (PNG 2000 px, tidak di-commit),
// dioptimalkan jadi WebP kecil di ./assets. Dibaca lewat satu modul supaya Vite hanya
// memaketkannya ke chunk game yang dimuat lazy, bukan ke bundel absensi.

const u = (nama: string) => new URL(`./assets/${nama}.webp`, import.meta.url).href;

export const ASET = {
  logo: u("logo"),
  maskot: {
    berdiri: u("maskot-berdiri"),
    melukis: u("maskot-melukis"),
    menunjuk: u("maskot-menunjuk"),
    senang: u("maskot-senang"),
    salah: u("maskot-salah"),
  },
  wajah: {
    pikir: u("wajah-pikir"),
    kaget: u("wajah-kaget"),
  },
  avatar: [u("avatar-01"), u("avatar-02"), u("avatar-03"), u("avatar-04"), u("avatar-05"), u("avatar-06")],
  ui: {
    speaker: u("ui-speaker"),
    info: u("ui-info"),
    keluar: u("ui-keluar"),
    tautan: u("ui-tautan"),
    rumah: u("ui-rumah"),
    tambah: u("ui-tambah"),
    grup: u("ui-grup"),
    mahkota: u("ui-mahkota"),
    tamu: u("ui-tamu"),
    pensil: u("ui-pensil"),
    checklist: u("ui-checklist"),
    xMerah: u("ui-x-merah"),
    piala: u("ui-piala"),
    gear: u("ui-gear"),
  },
  medali: [u("lencana-1"), u("lencana-2"), u("lencana-3")],
  lencana: { api: u("lencana-api") },
  poin: { lima_puluh: u("poin-50"), seratus: u("poin-100") },
  tema: { tugu: u("tema-tugu"), candi: u("tema-candi") },
  item: { tas: u("item-tas"), gudeg: u("item-gudeg"), becak: u("item-becak") },
  dekorasi: { gunungan: u("dekorasi-gunungan") },
  latar: { jalan: u("latar-jalan") },
  musik: new URL("./assets/backsound_game.mp3", import.meta.url).href,
};

/** Avatar kartun tetap untuk pemain tanpa foto profil (dipilih dari id, jadi selalu sama). */
export function avatarCadangan(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return ASET.avatar[h % ASET.avatar.length];
}
