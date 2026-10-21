-- =========================================================
-- DisparYK — 0026: Pertanyaan wawancara dibuat AI (slide kedua di Naskah AI)
-- Jalankan setelah 0001-0025.
--
-- Fitur Naskah AI sekarang punya dua mode yang berbagi satu tabel riwayat:
--   - 'naskah'     : naskah liputan (sudah ada sejak 0024)
--   - 'pertanyaan' : daftar pertanyaan wawancara untuk liputan
-- Dibedakan lewat kolom `tipe`. `jumlah_pertanyaan` cuma relevan untuk
-- tipe 'pertanyaan' (nullable). Edge Function naskah-ai (kode yang sama,
-- di-deploy ulang) menangani dua mode ini lewat field `tipe` di payload.
-- =========================================================

alter table naskah_ai
  add column if not exists tipe text not null default 'naskah' check (tipe in ('naskah', 'pertanyaan')),
  add column if not exists jumlah_pertanyaan int;
