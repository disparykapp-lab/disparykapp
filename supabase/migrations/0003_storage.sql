-- =========================================================
-- DisparYK — 0003: Storage bucket `absensi` (privat) + kebijakan
-- Jalankan setelah 0001 & 0002.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('absensi', 'absensi', false)
on conflict (id) do nothing;

-- Pengguna hanya boleh mengunggah ke folder {auth.uid()}/... miliknya sendiri
create policy absensi_foto_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'absensi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pemilik foto & admin boleh melihat (dipakai lewat signed URL)
create policy absensi_foto_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'absensi'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
