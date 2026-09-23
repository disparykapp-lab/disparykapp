-- Bukti penerimaan berupa tanda tangan tamu undangan saat petugas menandai
-- tugas "Selesai". Gambar tanda tangan disimpan di storage privat, dan bisa
-- dilihat baik oleh petugas yang mengambilnya maupun admin (lewat signed URL
-- sementara) — policy select di bawah sudah mengizinkan keduanya.

alter table undangan add column if not exists tanda_tangan_url text;

insert into storage.buckets (id, name, public)
values ('tanda_tangan', 'tanda_tangan', false)
on conflict (id) do nothing;

drop policy if exists tanda_tangan_insert on storage.objects;
drop policy if exists tanda_tangan_update on storage.objects;
drop policy if exists tanda_tangan_select on storage.objects;

-- Petugas hanya boleh unggah/ubah ke folder {auth.uid()}/... miliknya sendiri
create policy tanda_tangan_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tanda_tangan' and (storage.foldername(name))[1] = auth.uid()::text);

create policy tanda_tangan_update on storage.objects
  for update to authenticated
  using (bucket_id = 'tanda_tangan' and (storage.foldername(name))[1] = auth.uid()::text);

-- Select dibatasi ke pemilik/admin saja (bukan buat ditampilkan di admin,
-- sekadar jaga-jaga kalau suatu saat dibutuhkan untuk audit).
create policy tanda_tangan_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tanda_tangan'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
