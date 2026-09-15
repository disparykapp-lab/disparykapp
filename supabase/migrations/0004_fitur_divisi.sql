-- =========================================================
-- DisparYK — 0004: Hak akses fitur per divisi
-- Jalankan setelah 0001-0003. Aman dijalankan di database yang sudah
-- ada datanya (hanya menambah kolom baru, tidak mengubah data lama).
--
-- Admin bisa menentukan divisi mana saja yang boleh memakai fitur
-- Kalender Konten lewat menu Kelola > Divisi (dicentang per divisi).
-- Admin (role='admin') selalu punya akses penuh terlepas dari
-- pengaturan ini — kolom ini hanya membatasi pegawai biasa.
-- =========================================================

alter table divisi
  add column if not exists fitur_kalender_konten boolean not null default false;
