import { useEffect } from "react";
import { audioBgm, audioSfx, type FormatAudio, type NamaBgm, type NamaSfx } from "./aset";

// Musik latar & efek suara dari file audio (synth gamelan slendro, bebas lisensi),
// diputar lewat Web Audio supaya BGM berulang tanpa jeda. OGG utama, MP3 untuk
// Safari. Satu tombol speaker mengatur keduanya; pilihan disimpan per perangkat.

const KUNCI = "siapa-penyusup:suara";

// Volume dari Referensi/manifest_aset.json
const VOLUME_BGM: Record<NamaBgm, number> = { bgm_lobby: 0.45, bgm_diskusi: 0.4, bgm_voting: 0.5 };
const VOLUME_SFX: Record<NamaSfx, number> = {
  jingle_pemandu_menang: 0.8,
  jingle_penyusup_menang: 0.8,
  sfx_chat: 0.5,
  sfx_error: 0.5,
  sfx_gabung: 0.6,
  sfx_giliranmu: 0.7,
  sfx_hitung_mundur: 0.7,
  sfx_kartu_flip: 0.7,
  sfx_keluar_room: 0.6,
  sfx_klik: 0.7,
  sfx_mulai: 0.8,
  sfx_poin: 0.6,
  sfx_pop: 0.6,
  sfx_tersingkir: 0.7,
  sfx_tick_kritis: 0.6,
  sfx_vote_masuk: 0.5,
  sfx_vote_stempel: 0.8,
  sfx_waktu_habis: 0.7,
  sting_bukan_penyusup: 0.7,
  sting_kartu_dibagikan: 0.8,
  sting_penyusup_tertangkap: 0.8,
  sting_reveal_penyusup: 0.8,
};

/** Momen penting: musik latar diturunkan ke 30% selama efek ini berbunyi. */
const SFX_PENTING = new Set<NamaSfx>([
  "jingle_pemandu_menang",
  "jingle_penyusup_menang",
  "sting_bukan_penyusup",
  "sting_kartu_dibagikan",
  "sting_penyusup_tertangkap",
  "sting_reveal_penyusup",
  "sfx_mulai",
  "sfx_tersingkir",
  "sfx_waktu_habis",
]);
const BGM_SAAT_DUCK = 0.3;

export function suaraNyala(): boolean {
  try {
    return localStorage.getItem(KUNCI) !== "0";
  } catch {
    return true;
  }
}

const pendengar = new Set<(nyala: boolean) => void>();

export function aturSuara(nyala: boolean) {
  try {
    localStorage.setItem(KUNCI, nyala ? "1" : "0");
  } catch {
    // penyimpanan diblokir (mode privat) — abaikan
  }
  pendengar.forEach((f) => f(nyala));
}

export function dengarSuara(f: (nyala: boolean) => void): () => void {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}

let ctx: AudioContext | null = null;
let gainBgm: GainNode | null = null;
let format: FormatAudio | null = null;
const cache = new Map<string, Promise<AudioBuffer>>();

/** BGM yang diminta layar sekarang (null = hening) dan yang sedang berbunyi. */
let bgmDiminta: NamaBgm | null = null;
let bgmJalan: { nama: NamaBgm; sumber: AudioBufferSourceNode; gain: GainNode } | null = null;
let timerDuck: number | undefined;

function konteks(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  gainBgm = ctx.createGain();
  gainBgm.connect(ctx.destination);
  return ctx;
}

function formatAudio(): FormatAudio {
  if (!format) {
    try {
      format = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "mp3";
    } catch {
      format = "mp3";
    }
  }
  return format;
}

function muat(c: AudioContext, url: string): Promise<AudioBuffer> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Gagal memuat audio (${r.status})`);
        return r.arrayBuffer();
      })
      .then((data) => c.decodeAudioData(data));
    // gagal (mis. sinyal putus) — boleh dicoba lagi lain kali
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

function hentikanBgm() {
  if (!bgmJalan) return;
  try {
    bgmJalan.sumber.stop();
  } catch {
    // belum sempat mulai — abaikan
  }
  bgmJalan.sumber.disconnect();
  bgmJalan.gain.disconnect();
  bgmJalan = null;
}

async function mulaiBgm() {
  const nama = bgmDiminta;
  if (!nama || !suaraNyala() || document.hidden) {
    hentikanBgm();
    return;
  }
  if (bgmJalan?.nama === nama) return;
  const c = konteks();
  if (!c || !gainBgm) return;

  let buffer: AudioBuffer;
  try {
    buffer = await muat(c, audioBgm(nama, formatAudio()));
  } catch {
    return;
  }
  // selama mengunduh, layar bisa sudah pindah atau suara dimatikan
  if (bgmDiminta !== nama || !suaraNyala() || document.hidden || bgmJalan?.nama === nama) return;
  hentikanBgm();

  const sumber = c.createBufferSource();
  sumber.buffer = buffer;
  sumber.loop = true;
  const gain = c.createGain();
  gain.gain.value = VOLUME_BGM[nama];
  sumber.connect(gain).connect(gainBgm);
  sumber.start();
  bgmJalan = { nama, sumber, gain };
}

/** Ganti musik latar (null = hening). Musik yang sama tidak diulang dari awal. */
export function putarBgm(nama: NamaBgm | null) {
  bgmDiminta = nama;
  void mulaiBgm();
}

function turunkanBgm(detik: number) {
  if (!ctx || !gainBgm) return;
  gainBgm.gain.setTargetAtTime(BGM_SAAT_DUCK, ctx.currentTime, 0.05);
  window.clearTimeout(timerDuck);
  timerDuck = window.setTimeout(() => {
    if (ctx && gainBgm) gainBgm.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
  }, detik * 1000);
}

export function sfx(nama: NamaSfx) {
  if (!suaraNyala()) return;
  const c = konteks();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  muat(c, audioSfx(nama, formatAudio()))
    .then((buffer) => {
      const sumber = c.createBufferSource();
      sumber.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = VOLUME_SFX[nama];
      sumber.connect(gain).connect(c.destination);
      sumber.start();
      if (SFX_PENTING.has(nama)) turunkanBgm(buffer.duration);
    })
    .catch(() => {});
}

/** Unduh & decode lebih awal supaya efek pertama tidak terlambat berbunyi. */
export function siapkanSfx(daftar: NamaSfx[]) {
  const c = konteks();
  if (!c) return;
  for (const nama of daftar) muat(c, audioSfx(nama, formatAudio())).catch(() => {});
}

/**
 * Dipasang sekali di halaman game. Browser baru mengizinkan suara setelah
 * interaksi, jadi AudioContext dilanjutkan pada ketukan/tombol pertama. Audio
 * berhenti saat tab disembunyikan dan saat keluar dari game.
 */
export function useAudioGame() {
  useEffect(() => {
    const onGestur = () => {
      const c = konteks();
      if (c && c.state !== "running") void c.resume();
      void mulaiBgm();
    };
    const onTampil = () => {
      if (document.hidden) {
        void ctx?.suspend();
      } else {
        void ctx?.resume();
        void mulaiBgm();
      }
    };
    const berhentiDengar = dengarSuara((nyala) => (nyala ? void mulaiBgm() : hentikanBgm()));

    document.addEventListener("pointerdown", onGestur);
    document.addEventListener("keydown", onGestur);
    document.addEventListener("visibilitychange", onTampil);
    siapkanSfx(["sfx_klik", "sfx_pop"]);

    return () => {
      berhentiDengar();
      document.removeEventListener("pointerdown", onGestur);
      document.removeEventListener("keydown", onGestur);
      document.removeEventListener("visibilitychange", onTampil);
      window.clearTimeout(timerDuck);
      if (gainBgm) {
        gainBgm.gain.cancelScheduledValues(0);
        gainBgm.gain.value = 1;
      }
      bgmDiminta = null;
      hentikanBgm();
      void ctx?.suspend();
    };
  }, []);
}

/** Musik latar untuk satu layar. */
export function useBgm(nama: NamaBgm | null) {
  useEffect(() => {
    putarBgm(nama);
  }, [nama]);
}
