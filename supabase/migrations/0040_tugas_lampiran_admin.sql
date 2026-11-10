-- =========================================================
-- DisparYK — 0040: Lampiran dari pemberi tugas (admin)
-- Jalankan setelah 0039.
--
-- Selain pegawai (hasil kerja, 0039), admin juga bisa melampirkan materi ke
-- tugasnya: file, gambar (dikompres), lagu, dan link — mis. template, contoh
-- desain, lagu acuan. Daftarnya di tugas.lampiran (bentuk sama dengan 0039).
--
-- File ada di bucket privat yang sama (`tugas_lampiran`), folder
-- materi/{tugas_id}/... Hanya admin yang boleh mengunggah (tugas baru boleh
-- belum ada di database — id-nya dibuat di aplikasi lebih dulu); pegawai yang
-- melihat tugas itu boleh membukanya; menghapus tetap lewat policy admin 0039.
-- =========================================================

-- Validasi daftar lampiran dipakai bersama progres pegawai (0039) & materi admin.
create or replace function _cek_daftar_lampiran(p_lampiran jsonb, p_awalan text) returns void
language plpgsql immutable as $$
declare
  x jsonb;
begin
  if jsonb_typeof(p_lampiran) <> 'array' then raise exception 'Lampiran tidak valid.'; end if;
  if jsonb_array_length(p_lampiran) > 8 then raise exception 'Maksimal 8 lampiran per tugas.'; end if;
  for x in select value from jsonb_array_elements(p_lampiran) loop
    if jsonb_typeof(x) <> 'object' or length(coalesce(x ->> 'nama', '')) not between 1 and 255 then
      raise exception 'Lampiran tidak valid.';
    end if;
    if x ->> 'jenis' = 'link' then
      if coalesce(x ->> 'url', '') !~* '^https?://\S+$' or length(x ->> 'url') > 2000 then
        raise exception 'Link lampiran harus diawali http:// atau https://.';
      end if;
    elsif x ->> 'jenis' in ('file', 'gambar', 'audio') then
      if coalesce(x ->> 'path', '') not like p_awalan || '%' or x ->> 'path' like '%..%' then
        raise exception 'Lampiran file tidak valid.';
      end if;
    else
      raise exception 'Jenis lampiran tidak dikenal.';
    end if;
  end loop;
end;
$$;

-- progres pegawai (0039): aturan sama, kini lewat fungsi bersama
create or replace function cek_lampiran_tugas() returns trigger
language plpgsql as $$
begin
  perform _cek_daftar_lampiran(new.lampiran, new.user_id::text || '/' || new.tugas_id::text || '/');
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Lampiran di tugas itu sendiri
-- ---------------------------------------------------------

alter table tugas add column if not exists lampiran jsonb not null default '[]'::jsonb;

create or replace function cek_lampiran_materi() returns trigger
language plpgsql as $$
begin
  perform _cek_daftar_lampiran(new.lampiran, 'materi/' || new.id::text || '/');
  return new;
end;
$$;

drop trigger if exists trg_cek_lampiran_materi on tugas;
create trigger trg_cek_lampiran_materi
  before insert or update of lampiran on tugas
  for each row execute function cek_lampiran_materi();

-- ---------------------------------------------------------
-- Storage: folder materi/{tugas_id}/
-- ---------------------------------------------------------

drop policy if exists tugas_materi_insert on storage.objects;
drop policy if exists tugas_materi_select on storage.objects;

create policy tugas_materi_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tugas_lampiran' and (storage.foldername(name))[1] = 'materi' and is_admin());

-- pegawai hanya bisa membuka materi tugas yang memang tampil untuknya (sama dengan RLS tugas)
create policy tugas_materi_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tugas_lampiran'
    and (storage.foldername(name))[1] = 'materi'
    and exists (
      select 1 from tugas t
      where t.id::text = (storage.foldername(name))[2]
        and t.aktif and (t.mulai_at is null or t.mulai_at <= now()) and tugas_untuk_saya(t)
    )
  );
