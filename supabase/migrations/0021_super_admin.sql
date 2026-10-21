-- =========================================================
-- DisparYK — 0021: Tingkatan "super admin"
-- Jalankan setelah 0001-0020.
--
-- Tujuan: tandai satu/lebih akun admin sebagai "super admin" TANPA
-- mengubah apa pun yang terlihat di aplikasi sekarang — role tetap
-- 'admin' seperti biasa (jadi semua pengecekan role === "admin" yang
-- sudah ada di aplikasi tidak terpengaruh), cuma menambah satu kolom
-- penanda yang bisa dipakai nanti untuk fitur khusus super admin.
-- =========================================================

alter table profiles
  add column if not exists super_admin boolean not null default false;

-- Lindungi kolom super_admin seperti role/aktif (lihat proteksi_profil()
-- di 0001_schema.sql): pengguna biasa tidak bisa mengubah super_admin
-- miliknya sendiri lewat aplikasi. Dikecualikan saat auth.uid() kosong
-- (dijalankan langsung lewat SQL Editor / koneksi database, bukan lewat
-- aplikasi) supaya admin tetap bisa mengatur status super admin manual.
create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
  end if;

  if auth.uid() is not null and not is_admin() then
    new.super_admin := old.super_admin;
  end if;

  return new;
end;
$$;
