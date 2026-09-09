-- =========================================================
-- DisparYK — 0002: RPC absensi (absen_masuk / absen_pulang)
-- Jalankan setelah 0001_schema.sql
--
-- Semua aturan penting (waktu, jarak ke kantor, akurasi GPS, satu kali
-- per hari) divalidasi DI SINI, bukan di frontend, supaya tidak bisa
-- diakali lewat DevTools/console browser.
-- =========================================================

create or replace function client_ip() returns text
language sql stable as $$
  select coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    null
  );
$$;

create or replace function jarak_meter(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 6371000 * acos(
    least(1, greatest(-1,
      sin(radians(lat1)) * sin(radians(lat2)) +
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
    ))
  );
$$;

-- ---------------------------------------------------------
-- ABSEN MASUK
-- ---------------------------------------------------------
create or replace function absen_masuk(
  p_lat double precision,
  p_lng double precision,
  p_akurasi double precision,
  p_mode text,
  p_catatan text,
  p_foto_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cfg pengaturan%rowtype;
  v_jarak double precision := null;
  v_today date;
  v_status text := 'hadir';
begin
  if v_user is null then
    raise exception 'Belum login';
  end if;

  if not exists (select 1 from profiles where id = v_user and aktif) then
    raise exception 'Akun tidak aktif';
  end if;

  select * into v_cfg from pengaturan where id = 1;
  v_today := (now() at time zone coalesce(v_cfg.timezone, 'Asia/Jakarta'))::date;

  if exists (
    select 1 from absensi where user_id = v_user and tanggal = v_today and masuk_at is not null
  ) then
    raise exception 'Kamu sudah absen masuk hari ini';
  end if;

  if p_akurasi is null or p_akurasi > v_cfg.akurasi_maks_meter then
    raise exception 'Lokasi kurang akurat. Aktifkan GPS/izin lokasi presisi, lalu coba lagi.';
  end if;

  if p_mode = 'kantor' then
    if v_cfg.kantor_lat is null or v_cfg.kantor_lng is null then
      raise exception 'Titik lokasi kantor belum diatur admin. Hubungi admin.';
    end if;
    v_jarak := jarak_meter(v_cfg.kantor_lat, v_cfg.kantor_lng, p_lat, p_lng);
    if v_jarak > v_cfg.radius_meter then
      raise exception 'Lokasi terlalu jauh dari kantor (% m). Pilih "Dinas Luar" bila memang di luar.', round(v_jarak);
    end if;
  elsif p_mode = 'luar' then
    if p_catatan is null or length(btrim(p_catatan)) < 5 then
      raise exception 'Isi keterangan dinas luar dulu.';
    end if;
    v_status := 'dinas_luar';
  else
    raise exception 'Mode tidak dikenal';
  end if;

  if v_status = 'hadir'
     and (now() at time zone coalesce(v_cfg.timezone, 'Asia/Jakarta'))::time > v_cfg.jam_masuk then
    v_status := 'telat';
  end if;

  insert into absensi (
    user_id, tanggal, masuk_at, masuk_lat, masuk_lng, masuk_akurasi,
    masuk_mode, masuk_catatan, masuk_foto_path, masuk_ip, status
  ) values (
    v_user, v_today, now(), p_lat, p_lng, p_akurasi,
    p_mode, p_catatan, p_foto_path, client_ip(), v_status
  )
  on conflict (user_id, tanggal) do update
    set masuk_at = excluded.masuk_at,
        masuk_lat = excluded.masuk_lat,
        masuk_lng = excluded.masuk_lng,
        masuk_akurasi = excluded.masuk_akurasi,
        masuk_mode = excluded.masuk_mode,
        masuk_catatan = excluded.masuk_catatan,
        masuk_foto_path = excluded.masuk_foto_path,
        masuk_ip = excluded.masuk_ip,
        status = excluded.status,
        updated_at = now()
    where absensi.masuk_at is null;

  return jsonb_build_object('ok', true, 'jarak_m', round(coalesce(v_jarak, 0)), 'status', v_status);
end;
$$;

-- ---------------------------------------------------------
-- ABSEN PULANG
-- ---------------------------------------------------------
create or replace function absen_pulang(
  p_lat double precision,
  p_lng double precision,
  p_akurasi double precision,
  p_mode text,
  p_catatan text,
  p_foto_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cfg pengaturan%rowtype;
  v_jarak double precision := null;
  v_today date;
  v_baris absensi%rowtype;
begin
  if v_user is null then
    raise exception 'Belum login';
  end if;

  if not exists (select 1 from profiles where id = v_user and aktif) then
    raise exception 'Akun tidak aktif';
  end if;

  select * into v_cfg from pengaturan where id = 1;
  v_today := (now() at time zone coalesce(v_cfg.timezone, 'Asia/Jakarta'))::date;

  select * into v_baris from absensi where user_id = v_user and tanggal = v_today;

  if v_baris.id is null or v_baris.masuk_at is null then
    raise exception 'Kamu belum absen masuk hari ini';
  end if;

  if v_baris.keluar_at is not null then
    raise exception 'Kamu sudah absen pulang hari ini';
  end if;

  if p_akurasi is null or p_akurasi > v_cfg.akurasi_maks_meter then
    raise exception 'Lokasi kurang akurat. Aktifkan GPS/izin lokasi presisi, lalu coba lagi.';
  end if;

  if p_mode = 'kantor' then
    if v_cfg.kantor_lat is null or v_cfg.kantor_lng is null then
      raise exception 'Titik lokasi kantor belum diatur admin. Hubungi admin.';
    end if;
    v_jarak := jarak_meter(v_cfg.kantor_lat, v_cfg.kantor_lng, p_lat, p_lng);
    if v_jarak > v_cfg.radius_meter then
      raise exception 'Lokasi terlalu jauh dari kantor (% m). Pilih "Dinas Luar" bila memang di luar.', round(v_jarak);
    end if;
  elsif p_mode = 'luar' then
    if p_catatan is null or length(btrim(p_catatan)) < 5 then
      raise exception 'Isi keterangan dinas luar dulu.';
    end if;
  else
    raise exception 'Mode tidak dikenal';
  end if;

  update absensi set
    keluar_at = now(),
    keluar_lat = p_lat,
    keluar_lng = p_lng,
    keluar_akurasi = p_akurasi,
    keluar_mode = p_mode,
    keluar_catatan = p_catatan,
    keluar_foto_path = p_foto_path,
    keluar_ip = client_ip(),
    updated_at = now()
  where id = v_baris.id;

  return jsonb_build_object('ok', true, 'jarak_m', round(coalesce(v_jarak, 0)), 'status', v_baris.status);
end;
$$;
