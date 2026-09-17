-- =========================================================
-- DisparYK — 0010: Profil pegawai (foto, tanggal lahir, sekolah,
-- masa magang) + bucket Storage untuk foto profil
-- Jalankan setelah 0001-0009.
-- =========================================================

alter table profiles
  add column if not exists tanggal_lahir date,
  add column if not exists asal_sekolah text,
  add column if not exists tanggal_mulai_magang date,
  add column if not exists tanggal_selesai_magang date;

-- Masa magang hanya boleh diatur admin (mirip role/aktif) — pegawai
-- boleh mengubah foto/nama/tanggal lahir/asal sekolah miliknya
-- sendiri, tapi tidak boleh mengubah tanggal magangnya sendiri.
create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
    new.tanggal_mulai_magang := old.tanggal_mulai_magang;
    new.tanggal_selesai_magang := old.tanggal_selesai_magang;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Bucket Storage `avatar` (publik — foto profil bukan data rahasia,
-- beda dengan foto absensi yang privat)
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatar', 'avatar', true)
on conflict (id) do nothing;

create policy avatar_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatar_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatar_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

-- Catatan: tidak perlu policy SELECT — bucket publik dilayani lewat
-- endpoint /object/public/... yang tidak melewati RLS.
