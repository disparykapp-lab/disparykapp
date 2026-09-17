-- Perbaikan: policy RLS bucket 'avatar' sempat hilang dari database (kemungkinan
-- terhapus saat bucket dihapus & dibuat ulang lewat Supabase Dashboard), sehingga
-- semua upload foto profil ditolak RLS. Migrasi ini idempotent (aman dijalankan
-- ulang) supaya kalau project di-setup dari nol, policy ini pasti ada.

drop policy if exists avatar_insert on storage.objects;
drop policy if exists avatar_update on storage.objects;
drop policy if exists avatar_delete on storage.objects;

create policy avatar_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatar_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatar_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);
