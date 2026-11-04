-- =========================================================
-- DisparYK — 0035: Twibbon foto absen bisa diganti admin
-- Jalankan setelah 0001-0031. Tidak bergantung pada migrasi game Siapa Penyusup
-- (0032-0034), jadi boleh dijalankan sebelum/sesudahnya.
--
-- Bingkai foto absen tadinya file tetap `public/twibbon.png`. Sekarang admin
-- bisa mengunggah penggantinya lewat Kelola → Twibbon Foto Absen.
--
-- File disimpan di bucket PUBLIK `twibbon` (kamera absen semua pegawai harus
-- bisa memuatnya). Hanya admin yang boleh mengunggah/menghapus. Nama file yang
-- sedang dipakai dicatat di pengaturan.twibbon_path; null = pakai bawaan.
--
-- Ketentuan file (juga dicek di aplikasi sebelum diunggah):
--   PNG transparan, rasio 3:4 potret (disarankan 1080 × 1440 px,
--   minimal 600 × 800 px), maks. 2 MB, area wajah di tengah transparan.
-- =========================================================

alter table pengaturan add column if not exists twibbon_path text;

alter table pengaturan drop constraint if exists pengaturan_twibbon_path_valid;
alter table pengaturan add constraint pengaturan_twibbon_path_valid
  check (twibbon_path is null or twibbon_path ~ '^[A-Za-z0-9._-]+\.png$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('twibbon', 'twibbon', true, 2097152, array['image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists twibbon_select on storage.objects;
drop policy if exists twibbon_insert on storage.objects;
drop policy if exists twibbon_update on storage.objects;
drop policy if exists twibbon_delete on storage.objects;

create policy twibbon_select on storage.objects
  for select to authenticated using (bucket_id = 'twibbon');
create policy twibbon_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'twibbon' and is_admin());
create policy twibbon_update on storage.objects
  for update to authenticated using (bucket_id = 'twibbon' and is_admin());
create policy twibbon_delete on storage.objects
  for delete to authenticated using (bucket_id = 'twibbon' and is_admin());
