// Geometri wajah dari 478 titik MediaPipe Face Landmarker (murni — diuji di tests/wajah.test.ts).
// Semua titik dihitung di ruang GAMBAR KELUARAN (piksel, sudah dicerminkan seperti
// pratinjau selfie), supaya shader, masker kulit, dan stiker memakai koordinat yang sama.

export interface Titik {
  x: number;
  y: number;
}

// Kontur berurutan (disusun dari FaceLandmarker.FACE_LANDMARKS_* versi 0.10.35).
export const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export const BIBIR_LUAR = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
export const BIBIR_DALAM = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
export const MATA_A = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
export const MATA_B = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const ALIS_A = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
export const ALIS_B = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const IRIS_A = 473;
export const IRIS_B = 468;
const DAHI = 10;
const DAGU = 152;
const HIDUNG = 4;
const PELIPIS_A = 454;
const PELIPIS_B = 234;
const PIPI_A = 280;
const PIPI_B = 50;
/** pasangan titik rahang/pipi bawah kiri-kanan yang ditarik ke dalam saat merampingkan */
const RAHANG: [number, number][] = [
  [361, 132],
  [288, 58],
  [397, 172],
];

export interface Wajah {
  /** semua titik di ruang keluaran (piksel) */
  titik: Titik[];
  /** pusat mata di sisi kiri & kanan GAMBAR */
  mataKiri: Titik;
  mataKanan: Titik;
  /** kemiringan kepala (radian), 0 = tegak */
  sudut: number;
  /** vektor satuan ke arah atas kepala */
  atas: Titik;
  lebar: number;
  tinggi: number;
  jarakMata: number;
  dahi: Titik;
  dagu: Titik;
  hidung: Titik;
  pipiKiri: Titik;
  pipiKanan: Titik;
}

const kurang = (a: Titik, b: Titik): Titik => ({ x: a.x - b.x, y: a.y - b.y });
const jarak = (a: Titik, b: Titik) => Math.hypot(a.x - b.x, a.y - b.y);
const tengah = (a: Titik, b: Titik): Titik => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Titik ternormalisasi (0–1) dari MediaPipe → ruang keluaran piksel (dicerminkan bila `cermin`). */
export function susunWajah(landmark: { x: number; y: number }[], lebarGambar: number, tinggiGambar: number, cermin: boolean): Wajah | null {
  if (landmark.length < 474) return null;
  const titik = landmark.map((p) => ({ x: (cermin ? 1 - p.x : p.x) * lebarGambar, y: p.y * tinggiGambar }));
  const [kiri, kanan] = [titik[IRIS_A], titik[IRIS_B]].sort((a, b) => a.x - b.x);
  const sudut = Math.atan2(kanan.y - kiri.y, kanan.x - kiri.x);
  const atas = { x: Math.sin(sudut), y: -Math.cos(sudut) };
  const [pipiKiri, pipiKanan] = [titik[PIPI_A], titik[PIPI_B]].sort((a, b) => a.x - b.x);
  return {
    titik,
    mataKiri: kiri,
    mataKanan: kanan,
    sudut,
    atas,
    lebar: jarak(titik[PELIPIS_A], titik[PELIPIS_B]),
    tinggi: jarak(titik[DAHI], titik[DAGU]),
    jarakMata: jarak(kiri, kanan),
    dahi: titik[DAHI],
    dagu: titik[DAGU],
    hidung: titik[HIDUNG],
    pipiKiri,
    pipiKanan,
  };
}

export const ambil = (w: Wajah, indeks: number[]) => indeks.map((i) => w.titik[i]);

/**
 * Kendali "geser lokal": isi gambar di sekitar c bergeser sejauh m, meluruh halus
 * (1 − d²/r²)² sampai nol di tepi lingkaran. Tidak melipat gambar selama |m| jauh
 * di bawah 0,65·r (gradien luruhan maksimum ≈ 1,54/r).
 */
export interface KendaliGeser {
  c: Titik;
  m: Titik;
  r: number;
}

export function kendaliRamping(w: Wajah, kekuatan: number): KendaliGeser[] {
  if (kekuatan <= 0) return [];
  // garis tengah wajah: lewat hidung, searah "atas"
  const sumbu = (t: Titik): Titik => {
    const d = kurang(t, w.hidung);
    const s = d.x * w.atas.x + d.y * w.atas.y;
    return { x: w.hidung.x + w.atas.x * s, y: w.hidung.y + w.atas.y * s };
  };
  const hasil: KendaliGeser[] = [];
  RAHANG.forEach(([a, b], i) => {
    for (const idx of [a, b]) {
      const c = w.titik[idx];
      const ke = kurang(sumbu(c), c); // tegak lurus ke garis tengah (mendatar menurut kepala)
      const f = kekuatan * [0.11, 0.11, 0.08][i];
      hasil.push({ c, m: { x: ke.x * f, y: ke.y * f }, r: w.lebar * 0.36 });
    }
  });
  return hasil;
}

/** Kendali "perbesar lokal" untuk mata. */
export interface KendaliSkala {
  c: Titik;
  r: number;
  s: number;
}

export function kendaliMata(w: Wajah, kekuatan: number): KendaliSkala[] {
  if (kekuatan <= 0) return [];
  const r = w.jarakMata * 0.45;
  const s = 0.22 * kekuatan;
  return [
    { c: w.mataKiri, r, s },
    { c: w.mataKanan, r, s },
  ];
}

/** Rumus warp yang sama dengan shader (dipakai tes): posisi sumber untuk piksel keluaran p. */
export function petakanBalik(p: Titik, geser: KendaliGeser[], skala: KendaliSkala[]): Titik {
  let q = { ...p };
  for (const k of geser) {
    const d = kurang(q, k.c);
    const u = (d.x * d.x + d.y * d.y) / (k.r * k.r);
    if (u < 1) {
      const f = (1 - u) * (1 - u);
      q = { x: q.x - f * k.m.x, y: q.y - f * k.m.y };
    }
  }
  for (const k of skala) {
    const d = kurang(q, k.c);
    const r = Math.hypot(d.x, d.y);
    if (r < k.r) {
      const t = r / k.r;
      const g = 1 - t * t;
      const f = 1 - k.s * g * g;
      q = { x: k.c.x + d.x * f, y: k.c.y + d.y * f };
    }
  }
  return q;
}

export type Jangkar = "mata" | "kepala" | "pipi";

/** Posisi, ukuran, & kemiringan stiker (pusat gambar stiker). */
export function letakStiker(w: Wajah, jangkar: Jangkar, lebarRelatif: number, geserAtas: number): { pusat: Titik; lebar: number; sudut: number }[] {
  const lebar = w.lebar * lebarRelatif;
  const geser = (t: Titik, k: number): Titik => ({ x: t.x + w.atas.x * w.tinggi * k, y: t.y + w.atas.y * w.tinggi * k });
  if (jangkar === "mata") return [{ pusat: geser(tengah(w.mataKiri, w.mataKanan), geserAtas), lebar, sudut: w.sudut }];
  if (jangkar === "kepala") return [{ pusat: geser(w.dahi, geserAtas), lebar, sudut: w.sudut }];
  return [w.pipiKiri, w.pipiKanan].map((p) => ({ pusat: geser(p, geserAtas), lebar, sudut: w.sudut }));
}
