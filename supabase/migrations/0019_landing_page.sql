-- =========================================================
-- DisparYK — 0019: Landing page publik yang bisa diedit admin.
-- Setiap bagian landing disimpan sebagai satu baris (kunci = nama bagian,
-- isi = JSON). Pengunjung tanpa login boleh membaca; hanya admin yang
-- boleh menulis. Foto landing disimpan di bucket Storage `landing` (publik).
-- Jalankan setelah 0001-0018.
-- =========================================================

create table if not exists landing_konten (
  kunci text primary key,
  isi jsonb not null default '{}'::jsonb,
  tampil boolean not null default true,
  diperbarui_at timestamptz not null default now(),
  diperbarui_oleh uuid references profiles(id) on delete set null
);

alter table landing_konten enable row level security;

create policy landing_konten_select on landing_konten
  for select to anon, authenticated using (true);
create policy landing_konten_insert on landing_konten
  for insert to authenticated with check (is_admin());
create policy landing_konten_update on landing_konten
  for update to authenticated using (is_admin()) with check (is_admin());
create policy landing_konten_delete on landing_konten
  for delete to authenticated using (is_admin());

-- Bucket publik untuk foto landing.
insert into storage.buckets (id, name, public)
values ('landing', 'landing', true)
on conflict (id) do nothing;

create policy landing_foto_select on storage.objects
  for select to anon, authenticated using (bucket_id = 'landing');
create policy landing_foto_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'landing' and is_admin());
create policy landing_foto_update on storage.objects
  for update to authenticated using (bucket_id = 'landing' and is_admin());
create policy landing_foto_delete on storage.objects
  for delete to authenticated using (bucket_id = 'landing' and is_admin());
