-- =========================================================
-- DisparYK — 0022: Kontrol khusus super admin
-- Jalankan setelah 0001-0021 (butuh kolom profiles.super_admin dari 0021).
--
-- Fitur yang ditambahkan, semuanya HANYA bisa dipanggil akun dengan
-- profiles.super_admin = true (dicek di dalam tiap fungsi, bukan cuma
-- lewat RLS, supaya tidak bergantung pada policy yang bisa lupa dipasang):
--   1. super_admin_set_absensi  — buat/ubah baris absensi SIAPA SAJA,
--      bebas (jam masuk/pulang, mode, status, GPS, IP, dst) — ini
--      menggantikan alur manual lewat SQL Editor yang sebelumnya dipakai.
--   2. super_admin_hapus_absensi — hapus satu baris absensi.
--   3. super_admin_set_flag — jadikan/cabut status super admin akun lain.
-- Semua aksi di atas dicatat ke tabel log_super_admin supaya ada jejak
-- siapa mengubah apa, kapan — mengingat kekuatan RPC ini (bisa menulis
-- ulang data kehadiran siapa pun), jejak audit ini wajib ada.
-- =========================================================

-- ---------------------------------------------------------
-- Perbaiki proteksi_profil() dari 0021: kolom super_admin kemarin
-- dijaga pakai is_admin(), padahal itu artinya SEMUA admin biasa bisa
-- menjadikan dirinya sendiri (atau siapa pun) super admin lewat update
-- langsung ke tabel profiles (jalur yang sama dipakai Kelola Pegawai
-- untuk ubah role/aktif) — bukan cuma lewat RPC super_admin_set_flag
-- di bawah. Sekarang kolom ini dijaga pakai is_super_admin(), jadi
-- cuma super admin yang sudah ada yang bisa menambah/mencabut super
-- admin lain, sama persis lewat aplikasi atau lewat RPC.
-- ---------------------------------------------------------
create or replace function is_super_admin() returns boolean
language sql stable as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'admin' and super_admin = true
  );
$$;

create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
  end if;

  if auth.uid() is not null and not is_super_admin() then
    new.super_admin := old.super_admin;
  end if;

  return new;
end;
$$;

create table if not exists log_super_admin (
  id uuid primary key default gen_random_uuid(),
  oleh_user_id uuid references profiles(id) on delete set null,
  aksi text not null,
  detail jsonb,
  dibuat_at timestamptz not null default now()
);

alter table log_super_admin enable row level security;

drop policy if exists log_super_admin_select on log_super_admin;
create policy log_super_admin_select on log_super_admin for select to authenticated using (is_super_admin());
-- Tidak ada policy insert: baris log cuma ditulis lewat fungsi SECURITY
-- DEFINER di bawah, tidak pernah langsung dari klien.

-- ---------------------------------------------------------
-- 1. Buat/ubah baris absensi siapa saja
-- ---------------------------------------------------------
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
  p_catatan_klarifikasi text default null
) returns absensi
language plpgsql security definer set search_path = public as $$
declare
  v_hasil absensi%rowtype;
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

  insert into absensi (
    user_id, tanggal,
    masuk_at, masuk_mode, masuk_akurasi, masuk_ip, masuk_lat, masuk_lng,
    keluar_at, keluar_mode, keluar_akurasi, keluar_ip, keluar_lat, keluar_lng,
    status, catatan_klarifikasi
  ) values (
    p_user_id, p_tanggal,
    p_masuk_at, p_masuk_mode, p_masuk_akurasi, p_masuk_ip, p_masuk_lat, p_masuk_lng,
    p_keluar_at, p_keluar_mode, p_keluar_akurasi, p_keluar_ip, p_keluar_lat, p_keluar_lng,
    p_status, p_catatan_klarifikasi
  )
  on conflict (user_id, tanggal) do update set
    masuk_at = excluded.masuk_at,
    masuk_mode = excluded.masuk_mode,
    masuk_akurasi = excluded.masuk_akurasi,
    masuk_ip = excluded.masuk_ip,
    masuk_lat = excluded.masuk_lat,
    masuk_lng = excluded.masuk_lng,
    keluar_at = excluded.keluar_at,
    keluar_mode = excluded.keluar_mode,
    keluar_akurasi = excluded.keluar_akurasi,
    keluar_ip = excluded.keluar_ip,
    keluar_lat = excluded.keluar_lat,
    keluar_lng = excluded.keluar_lng,
    status = excluded.status,
    catatan_klarifikasi = excluded.catatan_klarifikasi,
    updated_at = now()
  returning * into v_hasil;

  insert into log_super_admin (oleh_user_id, aksi, detail)
  values (auth.uid(), 'set_absensi', to_jsonb(v_hasil));

  return v_hasil;
end;
$$;

-- ---------------------------------------------------------
-- 2. Hapus satu baris absensi
-- ---------------------------------------------------------
create or replace function super_admin_hapus_absensi(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row absensi%rowtype;
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa menghapus baris absensi.';
  end if;

  select * into v_row from absensi where id = p_id;
  if not found then
    raise exception 'Data absensi tidak ditemukan.';
  end if;

  delete from absensi where id = p_id;

  insert into log_super_admin (oleh_user_id, aksi, detail)
  values (auth.uid(), 'hapus_absensi', to_jsonb(v_row));
end;
$$;

-- ---------------------------------------------------------
-- 3. Jadikan/cabut status super admin akun lain
-- ---------------------------------------------------------
create or replace function super_admin_set_flag(p_user_id uuid, p_nilai boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa mengatur status super admin akun lain.';
  end if;

  select role into v_role from profiles where id = p_user_id;
  if v_role is null then
    raise exception 'Pengguna tidak ditemukan.';
  end if;
  if v_role <> 'admin' then
    raise exception 'Status super admin cuma berlaku untuk akun dengan role admin.';
  end if;

  update profiles set super_admin = p_nilai where id = p_user_id;

  insert into log_super_admin (oleh_user_id, aksi, detail)
  values (auth.uid(), 'set_flag_super_admin', jsonb_build_object('target_user_id', p_user_id, 'nilai', p_nilai));
end;
$$;
