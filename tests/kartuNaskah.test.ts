// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bungkusTeks,
  formatTanggalPanjang,
  isiKartuNaskah,
  labelGayaNaskah,
  namaBerkasNaskah,
  ukuranHurufIsi,
} from "../src/lib/kartuNaskah.ts";

const ukur = (s: string) => Array.from(s).length * 10; // 10 px per huruf

test("bungkusTeks: memotong per kata sesuai lebar", () => {
  assert.deepEqual(bungkusTeks("satu dua tiga empat lima", 90, ukur), ["satu dua", "tiga", "empat", "lima"]);
  assert.deepEqual(bungkusTeks("satu dua tiga", 1000, ukur), ["satu dua tiga"]);
  assert.deepEqual(bungkusTeks("  spasi   ganda  ", 1000, ukur), ["spasi ganda"]);
  assert.deepEqual(bungkusTeks("", 100, ukur), []);
});

test("bungkusTeks: kata kepanjangan dipotong per huruf, emoji utuh", () => {
  assert.deepEqual(bungkusTeks("lihat https://contoh.id/abc", 60, ukur), ["lihat", "https:", "//cont", "oh.id/", "abc"]);
  const hasil = bungkusTeks("😀😀😀😀", 20, ukur);
  assert.deepEqual(hasil, ["😀😀", "😀😀"]);
});

test("labelGayaNaskah", () => {
  assert.equal(labelGayaNaskah("naskah", "siaran_pers"), "Siaran pers");
  assert.equal(labelGayaNaskah("naskah", "voice_over"), "Voice-over");
  assert.equal(labelGayaNaskah("naskah", "aneh"), "Naskah");
  assert.equal(labelGayaNaskah("pertanyaan", "santai"), "Wawancara · Santai");
});

test("formatTanggalPanjang", () => {
  assert.equal(formatTanggalPanjang("2026-11-16"), "16 November 2026");
  assert.equal(formatTanggalPanjang("2026-01-05"), "5 Januari 2026");
  assert.equal(formatTanggalPanjang("besok"), "besok");
});

const dasar = { tipe: "naskah", gaya: "berita", nama_acara: null, jenis_acara: null, lokasi: null, tanggal: null, hasil: "" };

test("isiKartuNaskah: naskah biasa → paragraf, jeda tunggal, markdown dibuang", () => {
  const isi = isiKartuNaskah({
    ...dasar,
    nama_acara: " Festival Kuliner ",
    lokasi: "Malioboro",
    tanggal: "2026-11-16",
    hasil: "**Yogyakarta** — Ribuan warga hadir.\n\n\n\nAcara ditutup pukul 21.00.\n",
  });
  assert.equal(isi.judul, "Festival Kuliner");
  assert.equal(isi.meta, "Malioboro · 16 November 2026");
  assert.equal(isi.label, "Berita");
  assert.deepEqual(isi.blok, [
    { jenis: "teks", teks: "Yogyakarta — Ribuan warga hadir." },
    { jenis: "jeda" },
    { jenis: "teks", teks: "Acara ditutup pukul 21.00." },
  ]);
});

test("isiKartuNaskah: tanpa nama acara pakai jenis acara; tanpa lokasi/tanggal → meta null", () => {
  const isi = isiKartuNaskah({ ...dasar, jenis_acara: "Pameran", hasil: "Isi." });
  assert.equal(isi.judul, "Pameran");
  assert.equal(isi.meta, null);
  assert.equal(isiKartuNaskah({ ...dasar, hasil: "Isi." }).judul, null);
});

test("isiKartuNaskah: pertanyaan wawancara → bernomor", () => {
  const isi = isiKartuNaskah({ ...dasar, tipe: "pertanyaan", gaya: "formal", hasil: "1. Apa kabar?\n2. **Bagaimana** acaranya?\n\nSemoga membantu." });
  assert.deepEqual(isi.blok, [
    { jenis: "nomor", no: 1, teks: "Apa kabar?" },
    { jenis: "jeda" },
    { jenis: "nomor", no: 2, teks: "Bagaimana acaranya?" },
    { jenis: "jeda" },
    { jenis: "teks", teks: "Semoga membantu." },
  ]);
});

test("ukuranHurufIsi mengecil untuk naskah panjang", () => {
  assert.equal(ukuranHurufIsi([{ jenis: "teks", teks: "a".repeat(500) }]), 38);
  assert.equal(ukuranHurufIsi([{ jenis: "teks", teks: "a".repeat(1200) }]), 34);
  assert.equal(ukuranHurufIsi([{ jenis: "teks", teks: "a".repeat(2600) }]), 30);
});

test("namaBerkasNaskah", () => {
  assert.equal(namaBerkasNaskah({ tipe: "naskah", nama_acara: "Festival Kuliner Malioboro 2026!", jenis_acara: null }), "naskah-festival-kuliner-malioboro-2026.png");
  assert.equal(namaBerkasNaskah({ tipe: "pertanyaan", nama_acara: null, jenis_acara: "Wawancara Kadis" }), "pertanyaan-wawancara-kadis.png");
  assert.equal(namaBerkasNaskah({ tipe: "naskah", nama_acara: "Café Ñandú", jenis_acara: null }), "naskah-cafe-nandu.png");
  assert.equal(namaBerkasNaskah({ tipe: "naskah", nama_acara: "  ", jenis_acara: null }), "naskah.png");
});
