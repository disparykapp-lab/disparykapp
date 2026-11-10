// Jalankan: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAKS_LAMPIRAN,
  MAKS_UKURAN_FILE,
  TIPE_PER_EKSTENSI,
  cekFileLampiran,
  jenisDariTipe,
  judulLink,
  namaFileAman,
  perluKompres,
  rapikanLink,
  tipeKonten,
} from "../src/lib/tugasLampiranMeta.ts";

test("jenis file lampiran yang diterima & tipenya", () => {
  assert.equal(tipeKonten("Laporan.PDF"), "application/pdf");
  assert.equal(tipeKonten("rekap.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(tipeKonten("arsip.rar"), "application/vnd.rar");
  assert.equal(tipeKonten("foto.HEIC"), "image/heic");
  assert.equal(tipeKonten("jingle.mp3"), "audio/mpeg");
  assert.equal(tipeKonten("rekaman.m4a"), "audio/mp4");
  for (const nama of ["virus.exe", "halaman.html", "logo.svg", "skrip.js", "tanpa-ekstensi", ".mp3"]) {
    assert.equal(tipeKonten(nama), null, nama);
  }
});

test("pengelompokan lampiran & gambar mana yang dikompres", () => {
  assert.equal(jenisDariTipe("image/png"), "gambar");
  assert.equal(jenisDariTipe("audio/mpeg"), "audio");
  assert.equal(jenisDariTipe("application/zip"), "file");
  assert.ok(perluKompres("image/jpeg") && perluKompres("image/png") && perluKompres("image/heic"));
  assert.ok(!perluKompres("image/gif"), "GIF tidak digambar ulang supaya animasinya tetap");
  assert.ok(!perluKompres("audio/mpeg") && !perluKompres("application/pdf"));
});

test("cek file sebelum diunggah", () => {
  assert.equal(cekFileLampiran("tugas.docx", 2_000_000, 0), null);
  assert.match(cekFileLampiran("tugas.docx", 2_000_000, MAKS_LAMPIRAN)!, /Maksimal 8 lampiran/);
  assert.match(cekFileLampiran("aplikasi.exe", 1000, 0)!, /belum didukung/);
  assert.match(cekFileLampiran("video-lagu.wav", MAKS_UKURAN_FILE + 1, 0)!, /terlalu besar .*maksimal 20,0 MB/);
  assert.equal(cekFileLampiran("pas.mp3", MAKS_UKURAN_FILE, 0), null, "tepat 20 MB masih boleh");
});

test("nama file aman untuk path Storage", () => {
  assert.equal(namaFileAman("Laporan Akhir (final) v2.PDF"), "Laporan-Akhir-final-v2.pdf");
  assert.equal(namaFileAman("Lagu Daerah – Gundul² Pacul.mp3"), "Lagu-Daerah-Gundul2-Pacul.mp3");
  assert.equal(namaFileAman("../../rahasia.txt"), "rahasia.txt");
  assert.equal(namaFileAman("📷.jpg"), "lampiran.jpg");
  assert.ok(namaFileAman(`${"a".repeat(200)}.zip`).length <= 64);
  assert.match(namaFileAman("a/b\\c..d.pdf"), /^[A-Za-z0-9_-]+\.pdf$/);
});

test("link lampiran dirapikan & yang berbahaya ditolak", () => {
  assert.equal(rapikanLink("  drive.google.com/file/d/abc  "), "https://drive.google.com/file/d/abc");
  assert.equal(rapikanLink("http://contoh.id"), "http://contoh.id");
  assert.equal(rapikanLink("https://youtu.be/xyz?t=10"), "https://youtu.be/xyz?t=10");
  for (const buruk of ["", "halo", "javascript:alert(1)", "ftp://server.id/a", "data:text/html,hai", "https://exa mple.com"]) {
    assert.equal(rapikanLink(buruk), null, buruk);
  }
  assert.equal(judulLink("https://www.canva.com/design/ABC/edit"), "canva.com/design/ABC/edit");
  assert.equal(judulLink("https://drive.google.com/"), "drive.google.com");
});

test("aturan di migrasi 0039 sama dengan aplikasi", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0039_tugas_lampiran.sql", import.meta.url), "utf8");
  const bucket = sql.match(/values \('tugas_lampiran', 'tugas_lampiran', false, (\d+), array\[([\s\S]*?)\]\)/);
  assert.ok(bucket, "insert bucket ditemukan");
  assert.equal(Number(bucket[1]), MAKS_UKURAN_FILE);
  const diBucket = new Set([...bucket[2].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  assert.deepEqual([...new Set(Object.values(TIPE_PER_EKSTENSI))].sort(), [...diBucket].sort(), "tipe bucket = tipe yang dikirim aplikasi");
  assert.ok(sql.includes(`jsonb_array_length(new.lampiran) > ${MAKS_LAMPIRAN}`), "batas jumlah lampiran sama");
  assert.ok(!diBucket.has("image/svg+xml") && !diBucket.has("text/html"), "tidak menerima jenis yang bisa menjalankan skrip");
});
