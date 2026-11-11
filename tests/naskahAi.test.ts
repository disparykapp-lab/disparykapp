// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitungKata, hitungPoin, judulRiwayat, pecahPertanyaan, tambahPoin, tanpaMarkdown } from "../src/lib/naskahAiTeks.ts";

test("hitung kata & poin di kotak cerita", () => {
  assert.equal(hitungKata(""), 0);
  assert.equal(hitungKata("  Festival budaya\n dibuka  "), 3);
  assert.equal(hitungPoin("- Dibuka jam 9\n\n- \n- 200 pengunjung\nTari tradisional"), 3);
});

test("chip cepat menambah poin di baris baru tanpa menumpuk baris kosong", () => {
  assert.equal(tambahPoin("", "Dibuka jam"), "- Dibuka jam");
  assert.equal(tambahPoin("- Dibuka jam 9", "Dihadiri"), "- Dibuka jam 9\n- Dihadiri");
  assert.equal(tambahPoin("- Dibuka jam 9\n\n  ", "Kutipan"), "- Dibuka jam 9\n- Kutipan");
});

test("pertanyaan wawancara dipecah per nomor: pembuka, lanjutan baris, penutup", () => {
  const p = pecahPertanyaan(
    "Berikut 3 pertanyaan:\n\n1. **Apa latar belakang** acara ini?\n2) Berapa target pengunjung, dan bagaimana\nstrategi menjangkau anak muda?\n**3.** Apa rencana ke depan?\n\nCatatan: sesuaikan urutan."
  );
  assert.deepEqual(p, {
    pembuka: "Berikut 3 pertanyaan:",
    daftar: [
      "Apa latar belakang acara ini?",
      "Berapa target pengunjung, dan bagaimana strategi menjangkau anak muda?",
      "Apa rencana ke depan?",
    ],
    penutup: "Catatan: sesuaikan urutan.",
  });
  // nomor dipisah baris kosong tetap satu daftar
  assert.equal(pecahPertanyaan("1. Satu?\n\n2. Dua?\n\n3. Tiga?")?.daftar.length, 3);
  // teks biasa / satu nomor saja → tampilkan apa adanya
  assert.equal(pecahPertanyaan("Naskah biasa tanpa nomor."), null);
  assert.equal(pecahPertanyaan("1. Hanya satu"), null);
});

test("judul riwayat & teks tanpa markdown", () => {
  assert.equal(judulRiwayat({ nama_acara: "Jogja Cultural Week", jenis_acara: "Festival", poin_penting: "-" }), "Jogja Cultural Week");
  assert.equal(judulRiwayat({ nama_acara: " ", jenis_acara: "Festival", poin_penting: "-" }), "Festival");
  assert.equal(judulRiwayat({ nama_acara: null, jenis_acara: null, poin_penting: "\n- Dibuka jam 09.00 oleh Kepala Dinas\n- 200 orang" }), "Dibuka jam 09.00 oleh Kepala Dinas");
  assert.equal(judulRiwayat({ nama_acara: null, jenis_acara: null, poin_penting: "- " }), "Tanpa judul");
  assert.ok(judulRiwayat({ nama_acara: null, jenis_acara: null, poin_penting: "x".repeat(80) }).endsWith("…"));
  assert.equal(tanpaMarkdown("1. **Apa** kabar?"), "1. Apa kabar?");
});
