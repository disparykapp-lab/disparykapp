// Stiker AR kamera absen (murni: data SVG + aturan letak). Digambar mengikuti
// posisi, ukuran, & kemiringan kepala — lihat letakStiker() di geometri.ts.
import type { Jangkar } from "./geometri.ts";

export interface Stiker {
  id: string;
  label: string;
  jangkar: Jangkar;
  /** lebar stiker relatif terhadap lebar wajah ("wajah") atau jarak kedua mata ("mata") */
  dasar: "wajah" | "mata";
  lebar: number;
  /** geser pusat jangkar ke arah atas kepala, relatif tinggi wajah (dahi–dagu) */
  geserAtas: number;
  /** titik di dalam gambar stiker (0 = atas, 1 = bawah) yang diletakkan di jangkar */
  pivotY: number;
  svg: string;
}

const MAROON = "#8e1e3c";
const EMAS = "#e2b04a";
const EMAS_TUA = "#b8862b";

const kacamataHitam = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120">
<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2f3a"/><stop offset="1" stop-color="#120c10"/></linearGradient></defs>
<g id="l"><path d="M14 36 Q16 22 36 21 L128 20 Q148 20 146 40 Q141 84 106 95 Q64 106 34 88 Q14 72 14 36Z" fill="url(#k)" stroke="${EMAS}" stroke-width="5"/>
<path d="M34 36 L74 33" stroke="#fff" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/></g>
<use href="#l" transform="translate(320 0) scale(-1 1)"/>
<path d="M144 34 Q160 24 176 34" fill="none" stroke="${EMAS}" stroke-width="6" stroke-linecap="round"/>
<path d="M14 34 L2 30 M306 34 L318 30" stroke="${EMAS}" stroke-width="6" stroke-linecap="round"/></svg>`;

const kacamataBulat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120">
<g fill="#ffe7d6" fill-opacity=".14" stroke="${EMAS_TUA}" stroke-width="7"><circle cx="80" cy="56" r="47"/><circle cx="240" cy="56" r="47"/></g>
<path d="M127 50 Q160 34 193 50" fill="none" stroke="${EMAS_TUA}" stroke-width="6" stroke-linecap="round"/>
<path d="M33 48 L6 42 M287 48 L314 42" stroke="${EMAS_TUA}" stroke-width="6" stroke-linecap="round"/>
<path d="M56 36 Q66 28 80 27 M216 36 Q226 28 240 27" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/></svg>`;

const topiPesta = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250">
<defs><clipPath id="c"><path d="M100 26 L178 226 Q100 246 22 226Z"/></clipPath></defs>
<path d="M100 26 L178 226 Q100 246 22 226Z" fill="${MAROON}"/>
<g clip-path="url(#c)" stroke="${EMAS}" stroke-width="16"><path d="M0 120 L200 80 M0 170 L200 130 M0 220 L200 180"/></g>
<g fill="#fff"><circle cx="86" cy="104" r="5"/><circle cx="118" cy="150" r="5"/><circle cx="74" cy="196" r="5"/><circle cx="134" cy="206" r="5"/></g>
<path d="M22 226 Q100 246 178 226" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
<circle cx="100" cy="24" r="20" fill="${EMAS}"/><circle cx="94" cy="18" r="6" fill="#fff" fill-opacity=".6"/></svg>`;

const mahkota = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset="1" stop-color="${EMAS_TUA}"/></linearGradient></defs>
<path d="M14 140 L8 44 L64 92 L120 18 L176 92 L232 44 L226 140Z" fill="url(#g)" stroke="#8a5f17" stroke-width="5" stroke-linejoin="round"/>
<rect x="14" y="122" width="212" height="26" rx="8" fill="url(#g)" stroke="#8a5f17" stroke-width="5"/>
<circle cx="120" cy="104" r="13" fill="${MAROON}" stroke="#fff" stroke-width="3"/><circle cx="62" cy="114" r="9" fill="#2f7fd1" stroke="#fff" stroke-width="3"/><circle cx="178" cy="114" r="9" fill="#2f7fd1" stroke="#fff" stroke-width="3"/>
<g fill="#fff8e1"><circle cx="8" cy="40" r="9"/><circle cx="120" cy="14" r="10"/><circle cx="232" cy="40" r="9"/></g></svg>`;

const telingaKucing = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 150">
<g id="t"><path d="M24 142 Q22 52 62 8 Q112 46 132 120 Q78 112 24 142Z" fill="#3b2a2f"/>
<path d="M46 124 Q48 66 66 36 Q96 66 108 112 Q76 108 46 124Z" fill="#f2a7b8"/></g>
<use href="#t" transform="translate(360 0) scale(-1 1)"/></svg>`;

const blangkon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
<defs><pattern id="b" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#6b4226"/>
<path d="M0 13 Q6.5 4 13 13 T26 13" fill="none" stroke="#d8b06a" stroke-width="2.2"/><circle cx="13" cy="21" r="2.2" fill="#d8b06a"/><circle cx="0" cy="3" r="1.8" fill="#2e1a0e"/><circle cx="26" cy="3" r="1.8" fill="#2e1a0e"/></pattern>
<clipPath id="k"><path d="M12 176 Q6 70 150 22 Q294 70 288 176 Q150 150 12 176Z"/></clipPath></defs>
<path d="M12 176 Q6 70 150 22 Q294 70 288 176 Q150 150 12 176Z" fill="url(#b)"/>
<g clip-path="url(#k)" fill="none" stroke="#2e1a0e" stroke-opacity=".45" stroke-width="5"><path d="M150 22 Q110 90 60 170 M150 22 Q190 90 240 170 M150 22 Q150 100 150 160"/></g>
<path d="M12 176 Q150 150 288 176" fill="none" stroke="#3b2414" stroke-width="16" stroke-linecap="round"/>
<path d="M40 166 Q150 146 260 166" fill="none" stroke="${EMAS}" stroke-width="3" stroke-opacity=".8"/></svg>`;

function bandoBunga(): string {
  const warna = [
    ["#f7b6c8", "#fff1c1"],
    ["#ffffff", "#f6c445"],
    ["#e58aa6", "#fff1c1"],
    ["#fbd3a8", "#e58aa6"],
  ];
  const n = 9;
  let isi = "";
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 22 + t * 316;
    const y = 88 - Math.sin(t * Math.PI) * 58;
    const [kelopak, putik] = warna[i % warna.length];
    const r = i % 2 ? 15 : 19;
    isi += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(i * 23) % 360})">`;
    isi += `<ellipse cx="${-r * 0.9}" cy="${r * 0.35}" rx="${r * 0.5}" ry="${r * 0.22}" fill="#6aa65a" transform="rotate(-30)"/>`;
    for (let k = 0; k < 5; k++) isi += `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.6}" fill="${kelopak}" transform="rotate(${k * 72})"/>`;
    isi += `<circle r="${r * 0.32}" fill="${putik}"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120"><path d="M20 92 Q180 -8 340 92" fill="none" stroke="#7a5a3a" stroke-width="5"/>${isi}</svg>`;
}

const pipiHati = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90">
<path d="M50 84 C18 62 4 42 10 24 C16 6 40 4 50 22 C60 4 84 6 90 24 C96 42 82 62 50 84Z" fill="#f06b8f" fill-opacity=".85"/>
<path d="M26 26 Q30 18 38 18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/></svg>`;

export const STIKER: Stiker[] = [
  { id: "kacamata-hitam", label: "Kacamata hitam", jangkar: "mata", dasar: "mata", lebar: 2.15, geserAtas: 0, pivotY: 0.46, svg: kacamataHitam },
  { id: "kacamata-bulat", label: "Kacamata bulat", jangkar: "mata", dasar: "mata", lebar: 2.1, geserAtas: 0, pivotY: 0.47, svg: kacamataBulat },
  { id: "blangkon", label: "Blangkon", jangkar: "kepala", dasar: "wajah", lebar: 1.18, geserAtas: 0.04, pivotY: 0.86, svg: blangkon },
  { id: "topi-pesta", label: "Topi pesta", jangkar: "kepala", dasar: "wajah", lebar: 0.55, geserAtas: 0.3, pivotY: 0.94, svg: topiPesta },
  { id: "mahkota", label: "Mahkota", jangkar: "kepala", dasar: "wajah", lebar: 0.72, geserAtas: 0.26, pivotY: 0.9, svg: mahkota },
  { id: "telinga-kucing", label: "Telinga kucing", jangkar: "kepala", dasar: "wajah", lebar: 1.25, geserAtas: 0.3, pivotY: 0.92, svg: telingaKucing },
  { id: "bando-bunga", label: "Bando bunga", jangkar: "kepala", dasar: "wajah", lebar: 1.3, geserAtas: 0.12, pivotY: 0.62, svg: bandoBunga() },
  { id: "pipi-hati", label: "Pipi hati", jangkar: "pipi", dasar: "wajah", lebar: 0.17, geserAtas: 0, pivotY: 0.5, svg: pipiHati },
];

export const urlStiker = (s: Stiker) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.svg)}`;

/** Rasio tinggi/lebar dari viewBox SVG. */
export function rasioStiker(s: Stiker): number {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s.svg);
  return m ? Number(m[2]) / Number(m[1]) : 1;
}
