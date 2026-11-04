// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import {
  KETENTUAN_TWIBBON,
  cekFileTwibbon,
  cekTransparansi,
  formatUkuranFile,
  hitungTransparansi,
  ukuranUnggahTwibbon,
} from "../src/lib/twibbonMeta.ts";

const png = (lebar: number, tinggi: number, ukuranByte = 500 * 1024) => ({ tipe: "image/png", ukuranByte, lebar, tinggi });

test("ukuran twibbon yang benar lolos", () => {
  assert.deepEqual(cekFileTwibbon(png(1080, 1440)), []);
  assert.deepEqual(cekFileTwibbon(png(600, 800)), []);
  assert.deepEqual(cekFileTwibbon(png(1000, 1350)), [], "ukuran twibbon bawaan");
  assert.deepEqual(cekFileTwibbon(png(3000, 4000)), [], "besar tetap boleh, nanti dikecilkan");
});

test("ukuran twibbon media sosial & landscape ditolak karena rasionya", () => {
  for (const [l, t] of [
    [1080, 1080],
    [1080, 1350],
    [1080, 1920],
    [1440, 1080],
  ]) {
    const masalah = cekFileTwibbon(png(l, t));
    assert.equal(masalah.length, 1, `${l}×${t}`);
    assert.match(masalah[0], /3:4/);
  }
});

test("format, ukuran file, dan resolusi minimal dicek", () => {
  assert.match(cekFileTwibbon({ ...png(1080, 1440), tipe: "image/jpeg" })[0], /PNG/);
  assert.match(cekFileTwibbon(png(1080, 1440, 3 * 1024 * 1024))[0], /maksimal 2,0 MB/);
  assert.match(cekFileTwibbon(png(450, 600))[0], /minimal 600 × 800/);
  assert.equal(cekFileTwibbon({ tipe: "image/jpeg", ukuranByte: 5e6, lebar: 300, tinggi: 300 }).length, 4);
});

test("format ukuran file", () => {
  assert.equal(formatUkuranFile(200), "1 KB");
  assert.equal(formatUkuranFile(812 * 1024), "812 KB");
  assert.equal(formatUkuranFile(2 * 1024 * 1024), "2,0 MB");
});

test("gambar besar dikecilkan ke ukuran saran, kecil dibiarkan", () => {
  assert.deepEqual(ukuranUnggahTwibbon(3000, 4000), { lebar: 1080, tinggi: 1440 });
  assert.deepEqual(ukuranUnggahTwibbon(1000, 1350), { lebar: 1000, tinggi: 1350 });
  assert.deepEqual(ukuranUnggahTwibbon(1200, 1620), { lebar: 1067, tinggi: 1440 });
});

/** RGBA buatan: ornamen (alpha 255) di mana `isi(x, y)` true, selebihnya transparan. */
function gambar(lebar: number, tinggi: number, isi: (x: number, y: number) => boolean) {
  const rgba = new Uint8ClampedArray(lebar * tinggi * 4);
  for (let y = 0; y < tinggi; y++) for (let x = 0; x < lebar; x++) rgba[(y * lebar + x) * 4 + 3] = isi(x, y) ? 255 : 0;
  return rgba;
}

test("bingkai dengan lubang di tengah lolos cek transparansi", () => {
  // pita ornamen 15% atas & bawah
  const rgba = gambar(120, 160, (_x, y) => y < 24 || y >= 136);
  const t = hitungTransparansi(rgba, 120, 160);
  assert.equal(t.wajah, 1);
  assert.ok(Math.abs(t.ornamen - 0.3) < 0.01);
  assert.deepEqual(cekTransparansi(t), []);
});

test("gambar tanpa latar transparan / kosong ditolak", () => {
  const penuh = hitungTransparansi(gambar(120, 160, () => true), 120, 160);
  assert.equal(penuh.wajah, 0);
  assert.match(cekTransparansi(penuh)[0], /0% transparan/);

  const kosong = hitungTransparansi(gambar(120, 160, () => false), 120, 160);
  assert.match(cekTransparansi(kosong)[0], /hampir seluruhnya transparan/);

  // logo besar menutupi tengah
  const logo = hitungTransparansi(gambar(120, 160, (x, y) => x > 40 && x < 80 && y > 50 && y < 100), 120, 160);
  assert.equal(cekTransparansi(logo).length, 1);
});

test("batas bucket di migrasi 0035 sama dengan ketentuan di aplikasi", () => {
  const sql = readFileSync("supabase/migrations/0035_twibbon.sql", "utf8");
  const m = sql.match(/values \('twibbon', 'twibbon', true, (\d+), array\['([^']+)'\]\)/);
  assert.ok(m, "insert bucket twibbon ditemukan");
  assert.equal(Number(m[1]), KETENTUAN_TWIBBON.ukuranMaksByte);
  assert.equal(m[2], KETENTUAN_TWIBBON.tipe);
});

/** Dekode PNG RGBA 8-bit non-interlaced (cukup untuk twibbon bawaan). */
function bacaPng(buf: Buffer) {
  let o = 8;
  let lebar = 0;
  let tinggi = 0;
  const idat: Buffer[] = [];
  while (o < buf.length) {
    const panjang = buf.readUInt32BE(o);
    const jenis = buf.toString("ascii", o + 4, o + 8);
    const isi = buf.subarray(o + 8, o + 8 + panjang);
    if (jenis === "IHDR") {
      lebar = isi.readUInt32BE(0);
      tinggi = isi.readUInt32BE(4);
      assert.deepEqual([isi[8], isi[9], isi[12]], [8, 6, 0], "PNG RGBA 8-bit non-interlaced");
    }
    if (jenis === "IDAT") idat.push(isi);
    o += 12 + panjang;
  }
  const mentah = inflateSync(Buffer.concat(idat));
  const baris = lebar * 4;
  const rgba = new Uint8ClampedArray(tinggi * baris);
  for (let y = 0; y < tinggi; y++) {
    const filter = mentah[y * (baris + 1)];
    for (let i = 0; i < baris; i++) {
      const kiri = i >= 4 ? rgba[y * baris + i - 4] : 0;
      const atas = y > 0 ? rgba[(y - 1) * baris + i] : 0;
      const kiriAtas = i >= 4 && y > 0 ? rgba[(y - 1) * baris + i - 4] : 0;
      let v = mentah[y * (baris + 1) + 1 + i];
      if (filter === 1) v += kiri;
      else if (filter === 2) v += atas;
      else if (filter === 3) v += (kiri + atas) >> 1;
      else if (filter === 4) {
        const p = kiri + atas - kiriAtas;
        const [pa, pb, pc] = [Math.abs(p - kiri), Math.abs(p - atas), Math.abs(p - kiriAtas)];
        v += pa <= pb && pa <= pc ? kiri : pb <= pc ? atas : kiriAtas;
      }
      rgba[y * baris + i] = v;
    }
  }
  return { lebar, tinggi, rgba };
}

test("twibbon bawaan memenuhi ketentuannya sendiri", () => {
  const file = readFileSync("public/twibbon.png");
  const { lebar, tinggi, rgba } = bacaPng(file);
  assert.deepEqual(cekFileTwibbon({ tipe: "image/png", ukuranByte: file.length, lebar, tinggi }), []);
  assert.deepEqual(cekTransparansi(hitungTransparansi(rgba, lebar, tinggi)), []);
});
