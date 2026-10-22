// Efek suara pendek dibuat langsung dengan WebAudio (tanpa file audio), bisa
// dimatikan lewat tombol speaker. Pilihan disimpan per perangkat.

const KUNCI = "coret-tebak:suara";
let ctx: AudioContext | null = null;

export function suaraNyala(): boolean {
  try {
    return localStorage.getItem(KUNCI) !== "0";
  } catch {
    return true;
  }
}

export function aturSuara(nyala: boolean) {
  try {
    localStorage.setItem(KUNCI, nyala ? "1" : "0");
  } catch {
    // penyimpanan diblokir (mode privat) — abaikan
  }
}

function nada(frek: number, mulai: number, durasi: number, tipe: OscillatorType = "sine", volume = 0.18) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipe;
  osc.frequency.value = frek;
  const t0 = ctx.currentTime + mulai;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durasi);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durasi + 0.02);
}

export type JenisSuara = "benar" | "hampir" | "salah" | "giliran" | "habis" | "menang" | "gabung";

export function bunyikan(jenis: JenisSuara) {
  if (!suaraNyala()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    return;
  }
  switch (jenis) {
    case "benar":
      nada(660, 0, 0.12, "triangle");
      nada(990, 0.1, 0.22, "triangle");
      break;
    case "hampir":
      nada(520, 0, 0.12, "sine", 0.12);
      nada(560, 0.1, 0.12, "sine", 0.12);
      break;
    case "salah":
      nada(220, 0, 0.08, "square", 0.04);
      break;
    case "giliran":
      nada(523, 0, 0.12);
      nada(659, 0.1, 0.12);
      nada(784, 0.2, 0.2);
      break;
    case "habis":
      nada(330, 0, 0.18, "sawtooth", 0.06);
      nada(247, 0.16, 0.3, "sawtooth", 0.06);
      break;
    case "menang":
      [523, 659, 784, 1047].forEach((f, i) => nada(f, i * 0.12, 0.25, "triangle"));
      break;
    case "gabung":
      nada(880, 0, 0.08, "sine", 0.08);
      break;
  }
}

export function getar(ms = 40) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // tidak didukung — abaikan
  }
}
