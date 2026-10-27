-- =========================================================
-- DisparYK — 0031: Bucket foto bukti izin/sakit
-- Jalankan setelah 0001-0030.
--
-- Bukti keterangan (surat dokter, surat izin, dll.) sekarang diunggah sebagai
-- foto langsung dari aplikasi, bukan link Google Drive. Foto dikompres di HP
-- (JPEG, sisi terpanjang maks. 1600 px) sebelum diunggah.
--
-- Bucket PRIVAT: surat dokter termasuk data pribadi. Pegawai hanya bisa
-- mengunggah/menghapus di folder {auth.uid()}/... miliknya, dan yang bisa
-- melihat hanya pemiliknya sendiri serta admin (lewat signed URL sementara).
--
-- Kolom absensi.bukti_url tidak berubah: untuk foto yang diunggah isinya
-- "storage:bukti_izin/<path>"; link lama (https://...) tetap berfungsi.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti_izin', 'bukti_izin', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bukti_izin_insert on storage.objects;
drop policy if exists bukti_izin_delete on storage.objects;
drop policy if exists bukti_izin_select on storage.objects;

create policy bukti_izin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bukti_izin' and (storage.foldername(name))[1] = auth.uid()::text);

create policy bukti_izin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'bukti_izin' and (storage.foldername(name))[1] = auth.uid()::text);

create policy bukti_izin_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bukti_izin'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
