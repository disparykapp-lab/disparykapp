// Efek kecantikan kamera absen (murni — diuji di tests/efekKamera.test.ts).
// Dua jalur: (1) efek wajah ala TikTok lewat titik wajah MediaPipe + WebGL
// (lib/wajah/*) — kulit saja yang dihaluskan, bibir & pipi merona, wajah tirus,
// mata besar; (2) cadangan untuk HP yang tidak mampu: filter CSS pada <video>
// dengan rumus yang sama persis di kanvas. Warna global (terang/kontras/jenuh/
// hangat) memakai rumus yang sama di kedua jalur.

export type TingkatEfek = "asli" | "natural" | "glowing" | "cantik";

export interface Efek {
  label: string;
  ket: string;
  /** urutan sama dengan filter CSS */
  terang: number;
  kontras: number;
  jenuh: number;
  hangat: number;
  /** lapisan lembut (soft-focus) di atas foto: blur (px di layar) & kekuatannya — dipakai bila HP tidak mendukung efek wajah */
  blurPx: number;
  halus: number;
  /** efek berbasis titik wajah (MediaPipe), 0–1: haluskan kulit saja, cerahkan kulit, warna bibir, rona pipi, rampingkan wajah, besarkan mata */
  wajah: { kulit: number; cerahKulit: number; bibir: number; rona: number; ramping: number; mataBesar: number };
}

const TANPA_WAJAH = { kulit: 0, cerahKulit: 0, bibir: 0, rona: 0, ramping: 0, mataBesar: 0 };

export const EFEK: Record<TingkatEfek, Efek> = {
  asli: { label: "Asli", ket: "Tanpa efek", terang: 1, kontras: 1, jenuh: 1, hangat: 0, blurPx: 0, halus: 0, wajah: TANPA_WAJAH },
  natural: {
    label: "Natural",
    ket: "Kulit halus, sedikit lebih cerah",
    terang: 1.04,
    kontras: 0.98,
    jenuh: 1.05,
    hangat: 0.04,
    blurPx: 3,
    halus: 0.25,
    wajah: { kulit: 0.6, cerahKulit: 0.3, bibir: 0.15, rona: 0.1, ramping: 0, mataBesar: 0 },
  },
  glowing: {
    label: "Glowing",
    ket: "Kulit mulus, bibir & pipi merona",
    terang: 1.07,
    kontras: 0.96,
    jenuh: 1.08,
    hangat: 0.08,
    blurPx: 4,
    halus: 0.4,
    wajah: { kulit: 0.8, cerahKulit: 0.5, bibir: 0.4, rona: 0.35, ramping: 0.25, mataBesar: 0.2 },
  },
  cantik: {
    label: "Cantik",
    ket: "Ala TikTok: wajah tirus, mata besar, kulit mulus",
    terang: 1.08,
    kontras: 0.95,
    jenuh: 1.08,
    hangat: 0.08,
    blurPx: 4,
    halus: 0.4,
    wajah: { kulit: 0.9, cerahKulit: 0.55, bibir: 0.5, rona: 0.4, ramping: 1, mataBesar: 1 },
  },
};

export const URUTAN_EFEK: TingkatEfek[] = ["asli", "natural", "glowing", "cantik"];

/** Tingkat ini butuh pendeteksi wajah? */
export const pakaiWajah = (e: Efek) => Object.values(e.wajah).some((v) => v > 0);

export function adalahTingkat(x: unknown): x is TingkatEfek {
  return typeof x === "string" && x in EFEK;
}

/** Filter CSS warna untuk pratinjau (tanpa blur). */
export function cssWarna(e: Efek): string {
  if (e.terang === 1 && e.kontras === 1 && e.jenuh === 1 && e.hangat === 0) return "none";
  return `brightness(${e.terang}) contrast(${e.kontras}) saturate(${e.jenuh}) sepia(${e.hangat})`;
}

/** Filter CSS untuk lapisan lembut pratinjau: warna yang sama + blur. */
export function cssHalus(e: Efek): string {
  const w = cssWarna(e);
  return `${w === "none" ? "" : `${w} `}blur(${e.blurPx}px)`;
}

type Matriks = [number, number, number, number, number, number, number, number, number];

function matriksJenuh(s: number): Matriks {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
}

function matriksSepia(a: number): Matriks {
  const b = 1 - a;
  return [
    0.393 + 0.607 * b, 0.769 - 0.769 * b, 0.189 - 0.189 * b,
    0.349 - 0.349 * b, 0.686 + 0.314 * b, 0.168 - 0.168 * b,
    0.272 - 0.272 * b, 0.534 - 0.534 * b, 0.131 + 0.869 * b,
  ];
}

const jepit = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Terapkan brightness → contrast → saturate → sepia (sama dengan cssWarna)
 * langsung ke piksel RGBA (0–255), di tempat. Tiap langkah dijepit 0–1 seperti CSS.
 */
export function terapkanWarna(data: Uint8ClampedArray, e: Efek): void {
  if (cssWarna(e) === "none") return;
  const js = matriksJenuh(e.jenuh);
  const sp = matriksSepia(e.hangat);
  // tabel 256 nilai untuk brightness+contrast (per kanal, sama untuk R/G/B)
  const tabel = new Float32Array(256);
  for (let i = 0; i < 256; i++) tabel[i] = jepit((jepit((i / 255) * e.terang) - 0.5) * e.kontras + 0.5);
  for (let i = 0; i < data.length; i += 4) {
    const r0 = tabel[data[i]];
    const g0 = tabel[data[i + 1]];
    const b0 = tabel[data[i + 2]];
    const r1 = jepit(js[0] * r0 + js[1] * g0 + js[2] * b0);
    const g1 = jepit(js[3] * r0 + js[4] * g0 + js[5] * b0);
    const b1 = jepit(js[6] * r0 + js[7] * g0 + js[8] * b0);
    data[i] = Math.round(jepit(sp[0] * r1 + sp[1] * g1 + sp[2] * b1) * 255);
    data[i + 1] = Math.round(jepit(sp[3] * r1 + sp[4] * g1 + sp[5] * b1) * 255);
    data[i + 2] = Math.round(jepit(sp[6] * r1 + sp[7] * g1 + sp[8] * b1) * 255);
  }
}

/**
 * Blur di kanvas setara blur CSS pratinjau: pratinjau ditampilkan dengan skala
 * `skalaTampil` (px layar per px video), kanvas dengan `skalaKanvas`.
 */
export function blurKanvas(e: Efek, skalaTampil: number, skalaKanvas: number): number {
  if (!e.blurPx || skalaTampil <= 0) return 0;
  return (e.blurPx / skalaTampil) * skalaKanvas;
}
