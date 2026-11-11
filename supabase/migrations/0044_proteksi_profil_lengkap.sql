-- =========================================================
-- DisparYK — 0044: Kembalikan kunci kolom profil yang hilang sejak 0021
-- Jalankan setelah 0001-0043.
--
-- proteksi_profil() terakhir ditulis ulang di 0022 (urusan super_admin),
-- tapi versi itu disalin dari 0021 yang sudah tidak lagi mengunci kolom dari
-- 0010 & 0017. Akibatnya pegawai biasa bisa mengubah sendiri lewat API
-- (policy profiles_update_self mengizinkan update baris miliknya):
--   - wajib_absen            → menandai dirinya "tidak wajib absen"
--   - tanggal_mulai_magang   → mengubah masa magangnya
--   - tanggal_selesai_magang
-- Kolom-kolom itu hanya boleh diubah admin (Kelola Pegawai). Aturan
-- super_admin dari 0022 tetap sama persis.
-- =========================================================

create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
    new.wajib_absen := old.wajib_absen;
    new.tanggal_mulai_magang := old.tanggal_mulai_magang;
    new.tanggal_selesai_magang := old.tanggal_selesai_magang;
  end if;

  if auth.uid() is not null and not is_super_admin() then
    new.super_admin := old.super_admin;
  end if;

  return new;
end;
$$;
