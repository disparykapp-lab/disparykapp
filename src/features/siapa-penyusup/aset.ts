// Aset dari paket "aset-game-sumber/siapa-penyusup/Asset/" (tidak di-commit). Hanya file
// yang dipakai yang disalin ke ./assets, dengan nama & subfolder asli: SVG tetap SVG
// supaya animasinya jalan, dan url() di assets/css tetap benar tanpa diedit. Dibaca
// lewat satu modul supaya Vite hanya memaketkannya ke chunk game yang dimuat lazy.

export type NamaLatar = "bg_lobby" | "bg_diskusi" | "bg_voting" | "bg_hasil_pemandu_menang" | "bg_hasil_penyusup_menang";

export type NamaIkon =
  | "absensi" | "antar_divisi" | "bantuan" | "benar" | "buat_room" | "chat" | "divisi" | "gabung_room"
  | "host" | "kartu_kata" | "keluar" | "keluarkan_pemain" | "kirim" | "kunci" | "lewati_vote" | "lihat_kata"
  | "main" | "papan_skor" | "pemain" | "pemandu" | "pengaturan" | "penyusup" | "petunjuk" | "poin"
  | "riwayat" | "salah" | "salin" | "sembunyikan_kata" | "suara_off" | "suara_on" | "timer" | "trofi"
  | "ulang" | "undang" | "vote";

export type NamaUi =
  | "banner_pemandu_menang" | "banner_penyusup_menang" | "emblem_app" | "kartu_kata_belakang"
  | "kartu_kata_depan" | "kartu_peran_pemandu" | "kartu_peran_penyusup" | "lencana_bulat"
  | "logo_siapa_penyusup" | "stempel_bukan_penyusup" | "stempel_penyusup" | "stempel_seri" | "stempel_terpilih";

/** 8 karakter; indeks 0–7 = kolom avatar pemain di database. */
export const KARAKTER = [
  "01_blangkon", "02_caping", "03_topi", "04_hijab", "05_bucket", "06_headphone", "07_kacamata", "08_peci",
] as const;

export type StatusAvatar = "normal" | "penyusup" | "tersingkir";

export type NamaBgm = "bgm_lobby" | "bgm_diskusi" | "bgm_voting";

export type NamaSfx =
  | "jingle_pemandu_menang" | "jingle_penyusup_menang" | "sfx_chat" | "sfx_error" | "sfx_gabung"
  | "sfx_giliranmu" | "sfx_hitung_mundur" | "sfx_kartu_flip" | "sfx_keluar_room" | "sfx_klik" | "sfx_mulai"
  | "sfx_poin" | "sfx_pop" | "sfx_tersingkir" | "sfx_tick_kritis" | "sfx_vote_masuk" | "sfx_vote_stempel"
  | "sfx_waktu_habis" | "sting_bukan_penyusup" | "sting_kartu_dibagikan" | "sting_penyusup_tertangkap"
  | "sting_reveal_penyusup";

export type FormatAudio = "ogg" | "mp3";

export const latar = (n: NamaLatar) => new URL(`./assets/background/${n}.svg`, import.meta.url).href;
export const ikon = (n: NamaIkon) => new URL(`./assets/ikon/ic_${n}.svg`, import.meta.url).href;
export const ui = (n: NamaUi) => new URL(`./assets/ui/${n}.svg`, import.meta.url).href;

export function avatar(indeks: number, status: StatusAvatar = "normal"): string {
  const id = KARAKTER[((indeks % KARAKTER.length) + KARAKTER.length) % KARAKTER.length];
  const nama = status === "normal" ? id : `${id}_${status}`;
  return new URL(`./assets/karakter/avatar_${nama}.svg`, import.meta.url).href;
}

export const audioBgm = (n: NamaBgm, f: FormatAudio) => new URL(`./assets/audio/bgm/${n}.${f}`, import.meta.url).href;
export const audioSfx = (n: NamaSfx, f: FormatAudio) => new URL(`./assets/audio/sfx/${n}.${f}`, import.meta.url).href;
