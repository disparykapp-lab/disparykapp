-- =========================================================
-- DisparYK — 0001: skema tabel, RLS, fungsi helper, seed data
-- Jalankan di Supabase SQL Editor secara berurutan (0001, 0002, 0003).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- TABEL
-- ---------------------------------------------------------

create table if not exists divisi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  divisi_id uuid references divisi(id) on delete set null,
  jabatan text,
  foto_url text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catatan: profiles.id TIDAK diberi foreign key ke auth.users karena admin
-- boleh mendaftarkan email pegawai (whitelist) SEBELUM pegawai itu pernah
-- login. Begitu pegawai login Google pertama kali, fungsi klaim_profil()
-- di bawah akan menyamakan profiles.id dengan auth.uid() miliknya.

create table if not exists pengaturan (
  id int primary key default 1,
  kantor_lat double precision,
  kantor_lng double precision,
  radius_meter int not null default 100,
  akurasi_maks_meter int not null default 100,
  jam_masuk time not null default '08:00',
  jam_pulang time not null default '16:00',
  timezone text not null default 'Asia/Jakarta',
  constraint pengaturan_singleton check (id = 1)
);

create table if not exists absensi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tanggal date not null,

  masuk_at timestamptz,
  masuk_lat double precision,
  masuk_lng double precision,
  masuk_akurasi double precision,
  masuk_mode text check (masuk_mode in ('kantor', 'luar')),
  masuk_foto_path text,
  masuk_catatan text,
  masuk_alamat text,
  masuk_ip text,

  keluar_at timestamptz,
  keluar_lat double precision,
  keluar_lng double precision,
  keluar_akurasi double precision,
  keluar_mode text check (keluar_mode in ('kantor', 'luar')),
  keluar_foto_path text,
  keluar_catatan text,
  keluar_alamat text,
  keluar_ip text,

  status text not null default 'hadir' check (status in ('hadir', 'telat', 'dinas_luar')),
  ditandai boolean not null default false,
  alasan_tanda text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, tanggal)
);

create table if not exists konten (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  platform text not null check (platform in ('instagram', 'tiktok', 'facebook', 'youtube', 'twitter', 'website')),
  tanggal_tayang date not null,
  jam_tayang time,
  status text not null default 'ide' check (status in ('ide', 'draft', 'dijadwalkan', 'tayang', 'batal')),
  pic_user_id uuid references profiles(id) on delete set null,
  divisi_id uuid references divisi(id) on delete set null,
  aset_url text,
  dibuat_oleh uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- FUNGSI HELPER
-- ---------------------------------------------------------

create or replace function is_admin() returns boolean
language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Menyamakan id baris profil pra-daftar (whitelist) dengan auth.uid()
-- pengguna yang baru saja login Google, dicocokkan lewat email.
create or replace function klaim_profil() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null or v_email = '' then
    return;
  end if;

  if exists (select 1 from profiles where id = v_uid) then
    return;
  end if;

  update profiles
    set id = v_uid
    where lower(email) = v_email
      and id <> v_uid
      and not exists (select 1 from profiles p2 where p2.id = v_uid);
end;
$$;

-- Mencegah pengguna biasa mengubah kolom role/aktif miliknya sendiri.
create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteksi_profil on profiles;
create trigger trg_proteksi_profil
  before update on profiles
  for each row execute function proteksi_profil();

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_konten_updated_at on konten;
create trigger trg_konten_updated_at
  before update on konten
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table divisi enable row level security;
alter table profiles enable row level security;
alter table pengaturan enable row level security;
alter table absensi enable row level security;
alter table konten enable row level security;

-- divisi: semua yang login boleh baca; hanya admin ubah
create policy divisi_select on divisi for select to authenticated using (true);
create policy divisi_insert on divisi for insert to authenticated with check (is_admin());
create policy divisi_update on divisi for update to authenticated using (is_admin());
create policy divisi_delete on divisi for delete to authenticated using (is_admin());

-- pengaturan: semua yang login boleh baca; hanya admin ubah
create policy pengaturan_select on pengaturan for select to authenticated using (true);
create policy pengaturan_update on pengaturan for update to authenticated using (is_admin());

-- profiles: semua yang login boleh baca (dipakai untuk menampilkan nama
-- PIC konten, rekan divisi, dsb — mirip direktori pegawai internal).
-- Update hanya baris sendiri (role/aktif dijaga trigger) atau admin.
create policy profiles_select_all on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid() or is_admin());
create policy profiles_insert_admin on profiles for insert to authenticated with check (is_admin());
create policy profiles_delete_admin on profiles for delete to authenticated using (is_admin());

-- absensi: user baca baris sendiri; admin baca semua.
-- TIDAK ADA policy insert/update untuk role authenticated — penulisan
-- HANYA lewat RPC SECURITY DEFINER (absen_masuk / absen_pulang) di 0002.
create policy absensi_select on absensi for select to authenticated using (user_id = auth.uid() or is_admin());

-- konten: semua yang login boleh baca; admin & PIC boleh ubah; admin boleh insert/hapus
create policy konten_select on konten for select to authenticated using (true);
create policy konten_insert on konten for insert to authenticated with check (is_admin());
create policy konten_update on konten for update to authenticated using (is_admin() or pic_user_id = auth.uid());
create policy konten_delete on konten for delete to authenticated using (is_admin());

-- ---------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------

insert into divisi (nama) values
  ('Sekretariat'),
  ('Bidang Pengembangan Destinasi Pariwisata'),
  ('Bidang Pemasaran Pariwisata'),
  ('Bidang Ekonomi Kreatif'),
  ('Kelompok Jabatan Fungsional')
on conflict do nothing;

insert into pengaturan (id, kantor_lat, kantor_lng, radius_meter, akurasi_maks_meter, jam_masuk, jam_pulang, timezone)
values (1, null, null, 100, 100, '08:00', '16:00', 'Asia/Jakarta')
on conflict (id) do nothing;

-- PENTING: isi kantor_lat / kantor_lng lewat menu "Kelola > Pengaturan Kantor"
-- (atau UPDATE manual) sebelum absensi mode "Di Kantor" bisa dipakai.
