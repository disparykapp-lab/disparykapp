// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { EFEK, URUTAN_EFEK, adalahTingkat, blurKanvas, cssHalus, cssWarna, pakaiWajah, terapkanWarna, type Efek } from "../src/lib/efekKamera.ts";

const piksel = (...rgb: number[]) => {
  const d = new Uint8ClampedArray((rgb.length / 3) * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) d.set([rgb[i], rgb[i + 1], rgb[i + 2], 255], j);
  return d;
};
const efek = (lain: Partial<Efek>): Efek => ({ ...EFEK.asli, ...lain });

test("Asli = tanpa filter, piksel tidak berubah", () => {
  assert.equal(cssWarna(EFEK.asli), "none");
  const d = piksel(10, 120, 250);
  terapkanWarna(d, EFEK.asli);
  assert.deepEqual([...d], [10, 120, 250, 255]);
});

test("string CSS pratinjau berurutan sama dengan rumus kanvas", () => {
  assert.equal(cssWarna(EFEK.natural), "brightness(1.04) contrast(0.98) saturate(1.05) sepia(0.04)");
  assert.equal(cssHalus(EFEK.glowing), "brightness(1.07) contrast(0.96) saturate(1.08) sepia(0.08) blur(4px)");
});

test("brightness & contrast mengikuti spesifikasi CSS", () => {
  const d = piksel(100, 100, 100, 250, 250, 250);
  terapkanWarna(d, efek({ terang: 1.1 }));
  assert.deepEqual([d[0], d[4]], [110, 255], "250 × 1.1 dijepit ke 255");
  const k = piksel(64, 64, 64);
  terapkanWarna(k, efek({ kontras: 0.5 }));
  assert.equal(k[0], 96, "(0.251 − 0.5) × 0.5 + 0.5 ≈ 0.375");
});

test("saturate: abu-abu tetap abu-abu, warna makin tajam", () => {
  const abu = piksel(128, 128, 128);
  terapkanWarna(abu, efek({ jenuh: 1.5 }));
  assert.deepEqual([abu[0], abu[1], abu[2]], [128, 128, 128]);
  const merah = piksel(200, 100, 100);
  terapkanWarna(merah, efek({ jenuh: 1.5 }));
  assert.ok(merah[0] > 200 && merah[1] < 100, "merah lebih merah");
});

test("sepia (hangat): biru turun, merah naik", () => {
  const d = piksel(120, 120, 120);
  terapkanWarna(d, efek({ hangat: 0.5 }));
  assert.ok(d[0] > d[2], `r ${d[0]} > b ${d[2]}`);
});

test("efek bertingkat makin cerah, alpha tetap", () => {
  const rata = (e: Efek) => {
    const d = piksel(90, 80, 70, 160, 140, 120, 30, 30, 30);
    terapkanWarna(d, e);
    assert.ok([d[3], d[7], d[11]].every((a) => a === 255));
    return (d[0] + d[1] + d[2] + d[4] + d[5] + d[6] + d[8] + d[9] + d[10]) / 9;
  };
  const [a, n, g, c] = URUTAN_EFEK.map((t) => rata(EFEK[t]));
  assert.ok(a < n && n < g && g <= c, `${a} < ${n} < ${g} ≤ ${c}`);
});

test("blur kanvas setara blur pratinjau sesuai skala", () => {
  // pratinjau 1 px video = 0,5 px layar; kanvas 1 px video = 0,7 px kanvas → 4 px layar = 5,6 px kanvas
  assert.equal(blurKanvas(EFEK.glowing, 0.5, 0.7).toFixed(1), "5.6");
  assert.equal(blurKanvas(EFEK.asli, 0.5, 0.7), 0);
});

test("pilihan tersimpan divalidasi", () => {
  assert.equal(adalahTingkat("glowing"), true);
  assert.equal(adalahTingkat("cantik-banget"), false);
  assert.equal(adalahTingkat(null), false);
});

test("tingkat efek wajah naik bertahap; Asli tanpa efek wajah", () => {
  assert.equal(pakaiWajah(EFEK.asli), false);
  for (const t of ["natural", "glowing", "cantik"] as const) assert.equal(pakaiWajah(EFEK[t]), true, t);
  assert.ok(EFEK.cantik.wajah.ramping > EFEK.glowing.wajah.ramping && EFEK.glowing.wajah.ramping > EFEK.natural.wajah.ramping);
  assert.ok(Object.values(EFEK.cantik.wajah).every((v) => v <= 1));
});

test("efek warna tetap ringan supaya foto layak verifikasi", () => {
  for (const t of URUTAN_EFEK) {
    const e = EFEK[t];
    assert.ok(e.halus <= 0.45 && e.blurPx <= 5 && e.terang <= 1.12 && e.hangat <= 0.12, t);
  }
});
