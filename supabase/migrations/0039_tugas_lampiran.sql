-- =========================================================
-- DisparYK — 0039: Lampiran pengerjaan tugas (file, gambar, lagu, link)
-- Jalankan setelah 0001-0038 (cukup setelah 0020_tugas).
--
-- Saat mengerjakan tugas dari admin, pegawai bisa melampirkan bukti: file
-- dokumen/arsip, gambar (dikompres dulu di HP), lagu/audio, dan link.
-- Daftar lampiran disimpan di tugas_progres.lampiran (jsonb), ikut tombol
-- Simpan progres yang sudah ada:
--   [{ "jenis": "file"|"gambar"|"audio", "nama", "path", "ukuran", "tipe" },
--    { "jenis": "link", "nama", "url" }]
--
-- File ada di bucket PRIVAT `tugas_lampiran`, folder {user_id}/{tugas_id}/...
-- Pegawai hanya bisa mengunggah ke tugas yang ditujukan kepadanya, dan hanya
-- pemilik & admin yang bisa membuka (lewat signed URL) atau menghapusnya.
-- Maks. 20 MB per file; jenis file dibatasi daftar di bawah (sama dengan
-- src/lib/tugasLampiranMeta.ts).
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tugas_lampiran', 'tugas_lampiran', false, 20971520, array[
  -- dokumen & arsip
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/vnd.rar',
  'application/x-7z-compressed',
  -- gambar
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  -- lagu / audio
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/webm'
])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tugas_lampiran_insert on storage.objects;
drop policy if exists tugas_lampiran_select on storage.objects;
drop policy if exists tugas_lampiran_delete on storage.objects;

-- unggah hanya ke folder sendiri, untuk tugas aktif yang memang ditujukan ke pegawai ini
create policy tugas_lampiran_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tugas_lampiran'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from tugas t
      where t.id::text = (storage.foldername(name))[2] and t.aktif and tugas_untuk_saya(t)
    )
  );

create policy tugas_lampiran_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tugas_lampiran'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy tugas_lampiran_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tugas_lampiran'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- ---------------------------------------------------------
-- Daftar lampiran per progres + validasinya
-- ---------------------------------------------------------

alter table tugas_progres add column if not exists lampiran jsonb not null default '[]'::jsonb;

-- Isi dari aplikasi tidak dipercaya begitu saja: file harus ada di folder
-- {user_id}/{tugas_id}/ milik baris ini, link harus http(s).
create or replace function cek_lampiran_tugas() returns trigger
language plpgsql as $$
declare
  x jsonb;
begin
  if jsonb_typeof(new.lampiran) <> 'array' then raise exception 'Lampiran tidak valid.'; end if;
  if jsonb_array_length(new.lampiran) > 8 then raise exception 'Maksimal 8 lampiran per tugas.'; end if;
  for x in select value from jsonb_array_elements(new.lampiran) loop
    if jsonb_typeof(x) <> 'object' or length(coalesce(x ->> 'nama', '')) not between 1 and 255 then
      raise exception 'Lampiran tidak valid.';
    end if;
    if x ->> 'jenis' = 'link' then
      if coalesce(x ->> 'url', '') !~* '^https?://\S+$' or length(x ->> 'url') > 2000 then
        raise exception 'Link lampiran harus diawali http:// atau https://.';
      end if;
    elsif x ->> 'jenis' in ('file', 'gambar', 'audio') then
      if coalesce(x ->> 'path', '') not like new.user_id::text || '/' || new.tugas_id::text || '/%'
         or x ->> 'path' like '%..%' then
        raise exception 'Lampiran file tidak valid.';
      end if;
    else
      raise exception 'Jenis lampiran tidak dikenal.';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_cek_lampiran_tugas on tugas_progres;
create trigger trg_cek_lampiran_tugas
  before insert or update of lampiran on tugas_progres
  for each row execute function cek_lampiran_tugas();
