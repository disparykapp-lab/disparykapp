// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALIS_A, ALIS_B, BIBIR_DALAM, BIBIR_LUAR, MATA_A, MATA_B, OVAL, kendaliMata, kendaliRamping, letakStiker, petakanBalik, susunWajah } from "../src/lib/wajah/geometri.ts";
import { STIKER, rasioStiker, urlStiker } from "../src/lib/wajah/stiker.ts";

/** wajah tiruan tegak di tengah (koordinat ternormalisasi kamera, belum dicermin) */
function titikTiruan(miring = 0) {
  const p = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i: number, x: number, y: number) => {
    // putar terhadap pusat (0.5, 0.5) untuk mensimulasikan kepala miring
    const dx = x - 0.5;
    const dy = y - 0.5;
    p[i] = { x: 0.5 + dx * Math.cos(miring) - dy * Math.sin(miring), y: 0.5 + dx * Math.sin(miring) + dy * Math.cos(miring) };
  };
  set(468, 0.4, 0.42); // iris kanan pemilik wajah → kiri di gambar kamera
  set(473, 0.6, 0.42);
  set(10, 0.5, 0.2);
  set(152, 0.5, 0.8);
  set(4, 0.5, 0.55);
  set(234, 0.28, 0.45);
  set(454, 0.72, 0.45);
  set(50, 0.37, 0.57);
  set(280, 0.63, 0.57);
  for (const [i, x, y] of [[132, 0.3, 0.6], [58, 0.33, 0.68], [172, 0.36, 0.74], [361, 0.7, 0.6], [288, 0.67, 0.68], [397, 0.64, 0.74]] as const) set(i, x, y);
  return p;
}

test("kontur wajah lengkap & tidak tumpang tindih indeks", () => {
  assert.equal(OVAL.length, 36);
  assert.equal(BIBIR_LUAR.length, 20);
  assert.equal(BIBIR_DALAM.length, 20);
  assert.equal(MATA_A.length + MATA_B.length, 32);
  assert.equal(ALIS_A.length + ALIS_B.length, 20);
  for (const k of [OVAL, BIBIR_LUAR, BIBIR_DALAM, MATA_A, MATA_B, ALIS_A, ALIS_B]) assert.equal(new Set(k).size, k.length);
});

test("susunWajah: dicerminkan seperti selfie, ukuran & arah atas benar", () => {
  const w = susunWajah(titikTiruan(), 1000, 1000, true)!;
  assert.ok(w);
  assert.equal(Math.round(w.mataKiri.x), 400);
  assert.equal(Math.round(w.mataKanan.x), 600);
  assert.equal(Math.round(w.dahi.y), 200);
  assert.equal(Math.round(w.lebar), 440);
  assert.equal(Math.round(w.tinggi), 600);
  assert.equal(Math.round(w.jarakMata), 200);
  assert.ok(Math.abs(w.sudut) < 1e-9);
  assert.ok(Math.abs(w.atas.x) < 1e-9 && Math.abs(w.atas.y + 1) < 1e-9, "atas = ke atas layar");
  assert.equal(susunWajah([], 10, 10, true), null);
});

test("kepala miring: sudut & arah atas ikut miring (stiker ikut miring)", () => {
  const w = susunWajah(titikTiruan(0.3), 1000, 1000, false)!;
  assert.ok(Math.abs(w.sudut - 0.3) < 1e-6, `${w.sudut}`);
  assert.ok(Math.abs(Math.hypot(w.atas.x, w.atas.y) - 1) < 1e-9);
  // dicerminkan → kemiringan terbalik
  const c = susunWajah(titikTiruan(0.3), 1000, 1000, true)!;
  assert.ok(Math.abs(c.sudut + 0.3) < 1e-6);
});

test("mata besar: piksel dekat pusat mata mengambil dari titik lebih dekat (diperbesar)", () => {
  const w = susunWajah(titikTiruan(), 1000, 1000, true)!;
  const k = kendaliMata(w, 1);
  assert.equal(k.length, 2);
  const p = { x: w.mataKiri.x + 30, y: w.mataKiri.y };
  const q = petakanBalik(p, [], k);
  assert.ok(q.x < p.x && q.x > w.mataKiri.x, `sumber ${q.x} lebih dekat ke pusat ${w.mataKiri.x}`);
  const jauh = { x: w.mataKiri.x, y: w.mataKiri.y + 200 };
  assert.deepEqual(petakanBalik(jauh, [], k), jauh, "di luar radius tidak berubah");
  assert.deepEqual(kendaliMata(w, 0), []);
});

test("wajah tirus: tepi rahang mengambil dari luar (isi wajah bergeser ke dalam)", () => {
  const w = susunWajah(titikTiruan(), 1000, 1000, true)!;
  const k = kendaliRamping(w, 1);
  assert.equal(k.length, 6);
  const rahangKiri = k.find((x) => x.c.x < 500)!;
  const q = petakanBalik(rahangKiri.c, k, []);
  assert.ok(q.x < rahangKiri.c.x, `rahang kiri mengambil dari kiri-luar (${q.x} < ${rahangKiri.c.x})`);
  const hidung = petakanBalik(w.hidung, k, []);
  assert.ok(Math.abs(hidung.x - w.hidung.x) < 3, "hidung hampir tidak bergeser");
  assert.deepEqual(kendaliRamping(w, 0), []);
});

test("warp tidak melipat gambar: urutan piksel sepanjang garis tetap terjaga", () => {
  for (const miring of [0, 0.25]) {
    const w = susunWajah(titikTiruan(miring), 1000, 1000, true)!;
    const geser = kendaliRamping(w, 1);
    const skala = kendaliMata(w, 1);
    for (const y of [420, 560, 600, 680, 740]) {
      let sebelum = -Infinity;
      for (let x = 150; x <= 850; x += 1) {
        const q = petakanBalik({ x, y }, geser, skala);
        assert.ok(q.x > sebelum, `terlipat di (${x}, ${y}) miring ${miring}`);
        sebelum = q.x;
      }
    }
    for (const x of [400, 500, 640]) {
      let sebelum = -Infinity;
      for (let y = 150; y <= 900; y += 1) {
        const q = petakanBalik({ x, y }, geser, skala);
        assert.ok(q.y > sebelum, `terlipat vertikal di (${x}, ${y}) miring ${miring}`);
        sebelum = q.y;
      }
    }
  }
});

test("wajah tirus menarik mendatar (dagu tidak terangkat)", () => {
  const w = susunWajah(titikTiruan(), 1000, 1000, true)!;
  for (const k of kendaliRamping(w, 1)) assert.ok(Math.abs(k.m.y) < 1e-9 && Math.abs(k.m.x) > 0, "tegak lurus garis tengah");
});

test("letak stiker: kacamata di tengah mata, topi di atas dahi, pipi dua sisi", () => {
  const w = susunWajah(titikTiruan(), 1000, 1000, true)!;
  const [kacamata] = letakStiker(w, "mata", 1, 0);
  assert.equal(Math.round(kacamata.pusat.x), 500);
  assert.equal(Math.round(kacamata.pusat.y), 420);
  const [topi] = letakStiker(w, "kepala", 0.5, 0.3);
  assert.equal(Math.round(topi.pusat.y), 200 - 180, "0,3 × tinggi wajah di atas dahi");
  assert.equal(Math.round(topi.lebar), 220);
  const pipi = letakStiker(w, "pipi", 0.17, 0);
  assert.equal(pipi.length, 2);
  assert.ok(pipi[0].pusat.x < pipi[1].pusat.x);
});

test("stiker: id unik, SVG sah dengan viewBox, bisa dijadikan URL gambar", () => {
  assert.equal(new Set(STIKER.map((s) => s.id)).size, STIKER.length);
  assert.ok(STIKER.some((s) => s.id === "blangkon"));
  for (const s of STIKER) {
    assert.match(s.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+">/, s.id);
    assert.ok(s.svg.trim().endsWith("</svg>"), s.id);
    assert.ok(rasioStiker(s) > 0.2 && rasioStiker(s) < 1.5, s.id);
    assert.ok(urlStiker(s).startsWith("data:image/svg+xml"), s.id);
    assert.ok(s.pivotY >= 0 && s.pivotY <= 1, s.id);
  }
});
