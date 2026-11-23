-- =========================================================
-- DisparYK — 0047: Foto di Koreksi Absensi (Super Admin)
-- Jalankan setelah 0046.
--
-- Super admin bisa menambah/mengganti/menghapus foto masuk & pulang saat
-- mengoreksi absensi (dari kamera atau galeri).
--
--   1. Storage: super admin boleh mengunggah ke bucket `absensi` di folder
--      pegawai mana pun (sebelumnya hanya ke folder miliknya sendiri).
--   2. super_admin_set_absensi mendapat 3 parameter baru:
--        p_ubah_foto        — true = kolom foto ikut ditulis; false/tidak
--                             dikirim = foto lama dibiarkan (seperti dulu,
--                             supaya aplikasi versi lama tidak menghapus foto).
--        p_masuk_foto_path  — path foto masuk (null = tanpa foto)
--        p_keluar_foto_path — path foto pulang (null = tanpa foto)
--      Path harus berada di folder pegawai itu dan filenya sudah ada di
--      Storage. Foto hanya bisa disimpan kalau jamnya juga diisi.
--      Path foto sebelumnya ikut dicatat di log_super_admin.
--
-- File foto lama yang diganti TIDAK dihapus; ikut terhapus oleh retensi foto
-- (pengaturan.retensi_foto_hari) seperti foto absen lainnya.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Storage
-- ---------------------------------------------------------
drop policy if exists absensi_foto_insert_super_admin on storage.objects;
create policy absensi_foto_insert_super_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'absensi' and is_super_admin());

-- ---------------------------------------------------------
-- 2. super_admin_set_absensi dengan foto
-- ---------------------------------------------------------
-- Versi lama (16 parameter) dihapus dulu: kalau dibiarkan, ada dua fungsi
-- dengan nama sama dan PostgREST tidak bisa memilih salah satunya.
drop function if exists super_admin_set_absensi(
  uuid, date,
  timestamptz, text, double precision, text, double precision, double precision,
  timestamptz, text, double precision, text, double precision, double precision,
  text, text
);

create or replace function super_admin_set_absensi(
  p_user_id uuid,
  p_tanggal date,
  p_masuk_at timestamptz,
  p_masuk_mode text,
  p_masuk_akurasi double precision,
  p_masuk_ip text,
  p_masuk_lat double precision,
  p_masuk_lng double precision,
  p_keluar_at timestamptz,
  p_keluar_mode text,
  p_keluar_akurasi double precision,
  p_keluar_ip text,
  p_keluar_lat double precision,
  p_keluar_lng double precision,
  p_status text,
  p_catatan_klarifikasi text default null,
  p_ubah_foto boolean default false,
  p_masuk_foto_path text default null,
  p_keluar_foto_path text default null
) returns absensi
language plpgsql security definer set search_path = public as $$
declare
  v_lama absensi%rowtype;
  v_hasil absensi%rowtype;
  v_ubah_foto boolean := coalesce(p_ubah_foto, false);
  v_path text;
  v_detail jsonb;
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa mengubah absensi secara langsung.';
  end if;

  if p_user_id is null or p_tanggal is null then
    raise exception 'Pegawai dan tanggal wajib diisi.';
  end if;

  if p_status is null or p_status not in ('hadir', 'telat', 'dinas_luar', 'izin') then
    raise exception 'Status tidak valid.';
  end if;

  if p_masuk_mode is not null and p_masuk_mode not in ('kantor', 'luar') then
    raise exception 'Mode masuk tidak valid.';
  end if;

  if p_keluar_mode is not null and p_keluar_mode not in ('kantor', 'luar') then
    raise exception 'Mode pulang tidak valid.';
  end if;

  if v_ubah_foto then
    if p_masuk_foto_path is not null and p_masuk_at is null then
      raise exception 'Foto masuk hanya bisa disimpan kalau jam masuk diisi.';
    end if;
    if p_keluar_foto_path is not null and p_keluar_at is null then
      raise exception 'Foto pulang hanya bisa disimpan kalau jam pulang diisi.';
    end if;
    foreach v_path in array array[p_masuk_foto_path, p_keluar_foto_path] loop
      continue when v_path is null;
      if v_path not like p_user_id::text || '/%' or position('..' in v_path) > 0 then
        raise exception 'Foto harus berada di folder pegawai ini.';
      end if;
      if not exists (select 1 from storage.objects where bucket_id = 'absensi' and name = v_path) then
        raise exception 'File foto tidak ditemukan. Unggah ulang fotonya.';
      end if;
    end loop;
  end if;

  select * into v_lama from absensi where user_id = p_user_id and tanggal = p_tanggal;

  insert into absensi (
    user_id, tanggal,
    masuk_at, masuk_mode, masuk_akurasi, masuk_ip, masuk_lat, masuk_lng, masuk_foto_path,
    keluar_at, keluar_mode, keluar_akurasi, keluar_ip, keluar_lat, keluar_lng, keluar_foto_path,
    status, catatan_klarifikasi
  ) values (
    p_user_id, p_tanggal,
    p_masuk_at, p_masuk_mode, p_masuk_akurasi, p_masuk_ip, p_masuk_lat, p_masuk_lng,
    case when v_ubah_foto then p_masuk_foto_path end,
    p_keluar_at, p_keluar_mode, p_keluar_akurasi, p_keluar_ip, p_keluar_lat, p_keluar_lng,
    case when v_ubah_foto then p_keluar_foto_path end,
    p_status, p_catatan_klarifikasi
  )
  on conflict (user_id, tanggal) do update set
    masuk_at = excluded.masuk_at,
    masuk_mode = excluded.masuk_mode,
    masuk_akurasi = excluded.masuk_akurasi,
    masuk_ip = excluded.masuk_ip,
    masuk_lat = excluded.masuk_lat,
    masuk_lng = excluded.masuk_lng,
    masuk_foto_path = case when v_ubah_foto then excluded.masuk_foto_path else absensi.masuk_foto_path end,
    keluar_at = excluded.keluar_at,
    keluar_mode = excluded.keluar_mode,
    keluar_akurasi = excluded.keluar_akurasi,
    keluar_ip = excluded.keluar_ip,
    keluar_lat = excluded.keluar_lat,
    keluar_lng = excluded.keluar_lng,
    keluar_foto_path = case when v_ubah_foto then excluded.keluar_foto_path else absensi.keluar_foto_path end,
    status = excluded.status,
    catatan_klarifikasi = excluded.catatan_klarifikasi,
    updated_at = now()
  returning * into v_hasil;

  v_detail := to_jsonb(v_hasil);
  if v_lama.id is not null
     and (v_lama.masuk_foto_path is distinct from v_hasil.masuk_foto_path
          or v_lama.keluar_foto_path is distinct from v_hasil.keluar_foto_path) then
    v_detail := v_detail || jsonb_build_object(
      'foto_sebelumnya', jsonb_build_object(
        'masuk', v_lama.masuk_foto_path,
        'keluar', v_lama.keluar_foto_path
      )
    );
  end if;

  insert into log_super_admin (oleh_user_id, aksi, detail)
  values (auth.uid(), 'set_absensi', v_detail);

  return v_hasil;
end;
$$;

revoke execute on function super_admin_set_absensi(
  uuid, date,
  timestamptz, text, double precision, text, double precision, double precision,
  timestamptz, text, double precision, text, double precision, double precision,
  text, text, boolean, text, text
) from public, anon;
grant execute on function super_admin_set_absensi(
  uuid, date,
  timestamptz, text, double precision, text, double precision, double precision,
  timestamptz, text, double precision, text, double precision, double precision,
  text, text, boolean, text, text
) to authenticated;
