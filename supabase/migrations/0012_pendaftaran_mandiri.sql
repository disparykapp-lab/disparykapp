-- Pendaftaran mandiri lewat halaman tersembunyi /daftar.
-- Akun yang mendaftar dibuat NONAKTIF (aktif = false); admin harus menyetujuinya
-- lewat Kelola > Pegawai > "Aktifkan" sebelum akun itu bisa login/absen.
-- Penulisan ke profiles memakai fungsi SECURITY DEFINER karena RLS hanya
-- mengizinkan admin meng-insert profil.

create or replace function daftar_mandiri(
  p_nama text,
  p_tanggal_lahir date,
  p_asal_sekolah text,
  p_tanggal_mulai_magang date,
  p_tanggal_selesai_magang date,
  p_divisi_id uuid,
  p_foto_url text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null or v_email = '' then
    raise exception 'Harus login dengan Google dulu.';
  end if;

  if exists (select 1 from profiles where id = v_uid or lower(email) = v_email) then
    raise exception 'Email ini sudah terdaftar. Kalau belum bisa masuk, tunggu admin mengaktifkan akun kamu.';
  end if;

  if length(trim(coalesce(p_nama, ''))) < 2 or length(p_nama) > 100 then
    raise exception 'Nama harus 2-100 karakter.';
  end if;
  if p_tanggal_lahir is null or p_tanggal_lahir < date '1940-01-01' or p_tanggal_lahir >= current_date then
    raise exception 'Tanggal lahir tidak valid.';
  end if;
  if length(trim(coalesce(p_asal_sekolah, ''))) < 2 or length(p_asal_sekolah) > 150 then
    raise exception 'Asal sekolah/kampus harus 2-150 karakter.';
  end if;
  if p_tanggal_mulai_magang is null or p_tanggal_selesai_magang is null
     or p_tanggal_selesai_magang < p_tanggal_mulai_magang then
    raise exception 'Tanggal selesai magang tidak boleh sebelum tanggal mulai.';
  end if;
  if not exists (select 1 from divisi where id = p_divisi_id and aktif) then
    raise exception 'Divisi tidak valid.';
  end if;
  if p_foto_url is null or position('/avatar/' || v_uid::text || '/' in p_foto_url) = 0 then
    raise exception 'Foto profil wajib diunggah.';
  end if;

  insert into profiles (
    id, nama, email, role, divisi_id, foto_url, aktif,
    tanggal_lahir, asal_sekolah, tanggal_mulai_magang, tanggal_selesai_magang
  ) values (
    v_uid, trim(p_nama), v_email, 'user', p_divisi_id, p_foto_url, false,
    p_tanggal_lahir, trim(p_asal_sekolah), p_tanggal_mulai_magang, p_tanggal_selesai_magang
  );
end;
$$;

grant execute on function daftar_mandiri(text, date, text, date, date, uuid, text) to authenticated;
