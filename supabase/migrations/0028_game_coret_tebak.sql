-- =========================================================
-- DisparYK — 0028: Game "Coret Tebak" (tebak gambar multipemain)
-- Jalankan setelah 0001-0027.
--
-- Alur: Lobi -> buat/gabung room -> ruang tunggu -> tiap pemain bergiliran
-- (pilih kata 10 dtk -> menggambar 60/90/120 dtk -> reveal 6 dtk) sebanyak
-- jumlah ronde -> podium.
--
-- Prinsip keamanan:
--   * Kata jawaban disimpan di game_rahasia yang cuma bisa dibaca PENGGAMBAR
--     yang sedang giliran. Penebak tidak pernah menerima kata sebelum reveal.
--   * Semua perubahan state lewat fungsi SECURITY DEFINER (tidak ada policy
--     insert/update/delete untuk klien). Fungsi internal berawalan "_game_"
--     dicabut hak EXECUTE-nya dari klien.
--   * Waktu ditentukan server (now()). Klien memanggil game_detak() berkala;
--     fungsi itu yang memajukan fase saat tenggat lewat, jadi permainan tetap
--     jalan walau penggambar menutup tab.
--   * Tebakan benar & "hampir benar" hanya terlihat oleh pengirimnya sendiri
--     (RLS), supaya jawaban tidak bocor ke pemain lain.
--
-- Coretan kanvas TIDAK disimpan di database: dikirim lewat Realtime Broadcast
-- (channel "coret-tebak:<room_id>") langsung antar-klien.
-- =========================================================

-- ---------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------

create table if not exists game_kata (
  id bigserial primary key,
  tema text not null,
  kata text not null,
  unique (tema, kata)
);

create table if not exists game_room (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  host_id uuid not null references profiles(id) on delete cascade,
  tema text not null,
  waktu_gambar int not null check (waktu_gambar in (60, 90, 120)),
  jumlah_ronde int not null check (jumlah_ronde between 1 and 5),
  maks_pemain int not null check (maks_pemain between 2 and 10),
  publik boolean not null default true,
  status text not null default 'menunggu'
    check (status in ('menunggu', 'memilih', 'menggambar', 'reveal', 'selesai')),
  urutan uuid[] not null default '{}',
  giliran_ke int not null default 0,
  penggambar_id uuid references profiles(id) on delete set null,
  petunjuk text,
  kata_terungkap text,
  fase_mulai timestamptz,
  fase_berakhir timestamptz,
  dibuat_at timestamptz not null default now(),
  diperbarui_at timestamptz not null default now()
);

create table if not exists game_rahasia (
  room_id uuid primary key references game_room(id) on delete cascade,
  pilihan text[] not null default '{}',
  kata text,
  urutan_petunjuk int[] not null default '{}',
  petunjuk_terbuka int not null default 0,
  terpakai text[] not null default '{}'
);

create table if not exists game_pemain (
  room_id uuid not null references game_room(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  skor int not null default 0,
  sudah_benar boolean not null default false,
  poin_giliran int not null default 0,
  aktif boolean not null default true,
  bergabung_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Detak kehadiran dipisah dari game_pemain supaya update tiap beberapa detik
-- tidak membanjiri Realtime (tabel ini sengaja tidak masuk publikasi realtime).
create table if not exists game_kehadiran (
  room_id uuid not null references game_room(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  terakhir_aktif timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists game_tebakan (
  id bigserial primary key,
  room_id uuid not null references game_room(id) on delete cascade,
  giliran_ke int not null,
  user_id uuid not null references profiles(id) on delete cascade,
  teks text not null,
  hasil text not null check (hasil in ('salah', 'hampir', 'benar')),
  dibuat_at timestamptz not null default now()
);

create table if not exists game_log (
  id bigserial primary key,
  room_id uuid not null references game_room(id) on delete cascade,
  jenis text not null,
  user_id uuid references profiles(id) on delete set null,
  data jsonb,
  dibuat_at timestamptz not null default now()
);

create index if not exists game_room_lobi_idx on game_room (publik, status);
create index if not exists game_tebakan_room_idx on game_tebakan (room_id, giliran_ke);
create index if not exists game_log_room_idx on game_log (room_id, id);

-- ---------------------------------------------------------
-- Fungsi bantu (aman dipanggil klien)
-- ---------------------------------------------------------

create or replace function game_anggota(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from game_pemain where room_id = p_room and user_id = auth.uid());
$$;

create or replace function game_online(p_room uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from game_kehadiran
    where room_id = p_room and user_id = p_user and terakhir_aktif > now() - interval '40 seconds'
  );
$$;

-- huruf kecil, tanda baca dibuang, spasi dirapikan ("Kupu-kupu!" -> "kupu kupu")
create or replace function game_normal(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(regexp_replace(lower(coalesce(t, '')), '[-_]', ' ', 'g'), '[^a-z0-9 ]', '', 'g'),
    '\s+', ' ', 'g'
  ));
$$;

-- jarak Levenshtein sederhana (kata pendek, cukup tanpa ekstensi fuzzystrmatch)
create or replace function game_jarak(a text, b text) returns int
language plpgsql immutable as $$
declare
  la int := length(a);
  lb int := length(b);
  sebelum int[];
  kini int[];
  biaya int;
begin
  if la = 0 then return lb; end if;
  if lb = 0 then return la; end if;
  sebelum := array(select generate_series(0, lb));
  for i in 1..la loop
    kini := array[i];
    for j in 1..lb loop
      biaya := case when substr(a, i, 1) = substr(b, j, 1) then 0 else 1 end;
      kini := kini || least(kini[j] + 1, sebelum[j + 1] + 1, sebelum[j] + biaya);
    end loop;
    sebelum := kini;
  end loop;
  return sebelum[lb + 1];
end;
$$;

-- pola petunjuk: huruf yang belum dibuka jadi "_", spasi antarkata tetap spasi
create or replace function game_pola(p_kata text, p_buka int[]) returns text
language sql immutable as $$
  select string_agg(
    case
      when substr(p_kata, i, 1) = ' ' then ' '
      when i = any (coalesce(p_buka, '{}')) then substr(p_kata, i, 1)
      else '_'
    end, '' order by i)
  from generate_series(1, length(p_kata)) i;
$$;

-- ---------------------------------------------------------
-- Transisi fase (INTERNAL — dipanggil fungsi lain yang sudah mengunci room)
-- ---------------------------------------------------------

create or replace function _game_selesai(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update game_room set
    status = 'selesai', penggambar_id = null, petunjuk = null,
    fase_mulai = now(), fase_berakhir = null, diperbarui_at = now()
  where id = p_room;
  update game_rahasia set kata = null, pilihan = '{}' where room_id = p_room;
  insert into game_log (room_id, jenis) values (p_room, 'selesai');
end;
$$;

create or replace function _game_mulai_giliran(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
  v_total int;
  v_calon uuid;
  v_pilihan text[];
  v_terpakai text[];
begin
  select * into r from game_room where id = p_room;
  v_total := coalesce(array_length(r.urutan, 1), 0);

  -- lewati giliran milik pemain yang sudah keluar atau tidak online
  loop
    exit when r.giliran_ke >= v_total;
    v_calon := r.urutan[r.giliran_ke + 1];
    exit when exists (select 1 from game_pemain where room_id = p_room and user_id = v_calon and aktif)
      and game_online(p_room, v_calon);
    r.giliran_ke := r.giliran_ke + 1;
  end loop;

  if r.giliran_ke >= v_total then
    update game_room set giliran_ke = r.giliran_ke where id = p_room;
    perform _game_selesai(p_room);
    return;
  end if;

  select terpakai into v_terpakai from game_rahasia where room_id = p_room;
  v_pilihan := array(
    select k.kata from game_kata k
    where k.tema = r.tema and not (k.kata = any (coalesce(v_terpakai, '{}')))
    order by random() limit 3
  );
  if coalesce(array_length(v_pilihan, 1), 0) < 3 then
    v_pilihan := array(select k.kata from game_kata k where k.tema = r.tema order by random() limit 3);
  end if;

  insert into game_rahasia (room_id, pilihan) values (p_room, v_pilihan)
  on conflict (room_id) do update
    set pilihan = excluded.pilihan, kata = null, urutan_petunjuk = '{}', petunjuk_terbuka = 0;

  update game_pemain set sudah_benar = false, poin_giliran = 0 where room_id = p_room;

  update game_room set
    giliran_ke = r.giliran_ke,
    penggambar_id = v_calon,
    status = 'memilih',
    petunjuk = null,
    kata_terungkap = null,
    fase_mulai = now(),
    fase_berakhir = now() + interval '10 seconds',
    diperbarui_at = now()
  where id = p_room;

  insert into game_log (room_id, jenis, user_id) values (p_room, 'giliran', v_calon);
end;
$$;

create or replace function _game_mulai_menggambar(p_room uuid, p_kata text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_waktu int;
  v_posisi int[];
begin
  select waktu_gambar into v_waktu from game_room where id = p_room;
  v_posisi := array(
    select i from generate_series(1, length(p_kata)) i
    where substr(p_kata, i, 1) <> ' ' order by random()
  );

  update game_rahasia set
    kata = p_kata, urutan_petunjuk = v_posisi, petunjuk_terbuka = 0,
    terpakai = array_append(terpakai, p_kata)
  where room_id = p_room;

  update game_room set
    status = 'menggambar',
    petunjuk = game_pola(p_kata, '{}'),
    fase_mulai = now(),
    fase_berakhir = now() + make_interval(secs => v_waktu),
    diperbarui_at = now()
  where id = p_room;
end;
$$;

create or replace function _game_reveal(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
  v_kata text;
  v_penebak int;
  v_benar int;
begin
  select * into r from game_room where id = p_room;
  select kata into v_kata from game_rahasia where room_id = p_room;

  select count(*), count(*) filter (where p.sudah_benar) into v_penebak, v_benar
  from game_pemain p
  where p.room_id = p_room and p.aktif and p.user_id is distinct from r.penggambar_id
    and (p.sudah_benar or game_online(p_room, p.user_id));

  -- bonus penggambar kalau semua penebak benar
  if v_penebak > 0 and v_benar = v_penebak and r.penggambar_id is not null then
    update game_pemain set skor = skor + 100, poin_giliran = poin_giliran + 100
    where room_id = p_room and user_id = r.penggambar_id;
  end if;

  update game_room set
    status = 'reveal',
    kata_terungkap = v_kata,
    petunjuk = v_kata,
    fase_mulai = now(),
    fase_berakhir = now() + interval '6 seconds',
    diperbarui_at = now()
  where id = p_room;

  insert into game_log (room_id, jenis, user_id, data)
  values (p_room, 'reveal', r.penggambar_id, jsonb_build_object('kata', v_kata, 'benar', v_benar));
end;
$$;

create or replace function _game_lanjut(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update game_room set giliran_ke = giliran_ke + 1 where id = p_room;
  perform _game_mulai_giliran(p_room);
end;
$$;

create or replace function _game_buka_petunjuk(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
  s game_rahasia%rowtype;
  v_huruf int;
  v_maks int;
  v_porsi numeric;
  v_target int;
begin
  select * into r from game_room where id = p_room;
  select * into s from game_rahasia where room_id = p_room;
  if s.kata is null then return; end if;

  v_huruf := coalesce(array_length(s.urutan_petunjuk, 1), 0);
  v_maks := case when v_huruf <= 3 then 0 when v_huruf <= 5 then 1 else 2 end;
  v_porsi := extract(epoch from (now() - r.fase_mulai))
    / nullif(extract(epoch from (r.fase_berakhir - r.fase_mulai)), 0);
  v_target := case
    when v_maks = 0 then 0
    when v_maks = 1 then case when v_porsi >= 0.6 then 1 else 0 end
    else case when v_porsi >= 0.75 then 2 when v_porsi >= 0.5 then 1 else 0 end
  end;

  if v_target > s.petunjuk_terbuka then
    update game_rahasia set petunjuk_terbuka = v_target where room_id = p_room;
    update game_room set petunjuk = game_pola(s.kata, s.urutan_petunjuk[1:v_target]), diperbarui_at = now()
    where id = p_room;
  end if;
end;
$$;

-- Memajukan fase kalau tenggatnya lewat. Aman dipanggil berkali-kali (idempoten).
create or replace function _game_maju(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
  s game_rahasia%rowtype;
  v_penggambar_ada boolean;
  v_online int;
  v_penebak int;
  v_benar int;
  v_host_baru uuid;
begin
  select * into r from game_room where id = p_room for update;
  if not found then return; end if;

  -- host pergi tanpa menekan "Keluar": wewenang host pindah ke pemain online berikutnya
  if r.status in ('menunggu', 'selesai') and not game_online(p_room, r.host_id) then
    select p.user_id into v_host_baru from game_pemain p
    where p.room_id = p_room and p.aktif and game_online(p_room, p.user_id)
    order by p.bergabung_at limit 1;
    if v_host_baru is not null then
      update game_room set host_id = v_host_baru, diperbarui_at = now() where id = p_room;
    end if;
    return;
  end if;

  if r.status not in ('memilih', 'menggambar', 'reveal') then return; end if;

  select count(*) into v_online from game_pemain p
  where p.room_id = p_room and p.aktif and game_online(p_room, p.user_id);
  if v_online < 2 then
    perform _game_selesai(p_room);
    return;
  end if;

  v_penggambar_ada := exists (select 1 from game_pemain where room_id = p_room and user_id = r.penggambar_id and aktif)
    and game_online(p_room, r.penggambar_id);

  if r.status = 'memilih' then
    if not v_penggambar_ada then
      perform _game_lanjut(p_room);
    elsif now() >= r.fase_berakhir then
      select * into s from game_rahasia where room_id = p_room;
      perform _game_mulai_menggambar(p_room, s.pilihan[1 + floor(random() * array_length(s.pilihan, 1))::int]);
    end if;

  elsif r.status = 'menggambar' then
    select count(*), count(*) filter (where p.sudah_benar) into v_penebak, v_benar
    from game_pemain p
    where p.room_id = p_room and p.aktif and p.user_id <> r.penggambar_id
      and (p.sudah_benar or game_online(p_room, p.user_id));

    if not v_penggambar_ada or now() >= r.fase_berakhir or (v_penebak > 0 and v_benar = v_penebak) then
      perform _game_reveal(p_room);
    else
      perform _game_buka_petunjuk(p_room);
    end if;

  elsif r.status = 'reveal' and now() >= r.fase_berakhir then
    perform _game_lanjut(p_room);
  end if;
end;
$$;

-- ---------------------------------------------------------
-- RPC untuk klien
-- ---------------------------------------------------------

create or replace function game_buat_room(
  p_tema text, p_waktu int, p_ronde int, p_maks int, p_publik boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_huruf text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_kode text;
  v_id uuid;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  if not exists (select 1 from profiles where id = v_user and aktif) then raise exception 'Akun tidak aktif.'; end if;
  if not exists (select 1 from game_kata where tema = p_tema) then raise exception 'Tema tidak dikenal.'; end if;
  if p_waktu not in (60, 90, 120) then raise exception 'Waktu menggambar harus 60, 90, atau 120 detik.'; end if;
  if p_ronde not between 1 and 5 then raise exception 'Jumlah ronde harus 1-5.'; end if;
  if p_maks not between 2 and 10 then raise exception 'Maksimal pemain harus 2-10.'; end if;

  -- bersih-bersih room yang sudah lama tidak dipakai
  delete from game_room where diperbarui_at < now() - interval '1 day';

  loop
    v_kode := '';
    for i in 1..5 loop
      v_kode := v_kode || substr(v_huruf, 1 + floor(random() * length(v_huruf))::int, 1);
    end loop;
    exit when not exists (select 1 from game_room where kode = v_kode);
  end loop;

  insert into game_room (kode, host_id, tema, waktu_gambar, jumlah_ronde, maks_pemain, publik)
  values (v_kode, v_user, p_tema, p_waktu, p_ronde, p_maks, coalesce(p_publik, true))
  returning id into v_id;

  insert into game_pemain (room_id, user_id) values (v_id, v_user);
  insert into game_kehadiran (room_id, user_id) values (v_id, v_user);
  insert into game_log (room_id, jenis, user_id) values (v_id, 'gabung', v_user);
  return v_id;
end;
$$;

create or replace function game_gabung(p_kode text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r game_room%rowtype;
  v_jumlah int;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  if not exists (select 1 from profiles where id = v_user and aktif) then raise exception 'Akun tidak aktif.'; end if;

  select * into r from game_room where kode = upper(btrim(coalesce(p_kode, ''))) for update;
  if not found then raise exception 'Room dengan kode itu tidak ditemukan.'; end if;

  if exists (select 1 from game_pemain where room_id = r.id and user_id = v_user) then
    -- pemain lama kembali (reload halaman / sempat keluar)
    update game_pemain set aktif = true where room_id = r.id and user_id = v_user and not aktif;
    if found then
      insert into game_log (room_id, jenis, user_id) values (r.id, 'gabung', v_user);
    end if;
  else
    if r.status <> 'menunggu' then raise exception 'Permainan di room ini sudah berjalan.'; end if;
    select count(*) into v_jumlah from game_pemain p
    where p.room_id = r.id and p.aktif and game_online(r.id, p.user_id);
    if v_jumlah >= r.maks_pemain then raise exception 'Room sudah penuh.'; end if;
    insert into game_pemain (room_id, user_id) values (r.id, v_user);
    insert into game_log (room_id, jenis, user_id) values (r.id, 'gabung', v_user);
  end if;

  insert into game_kehadiran (room_id, user_id, terakhir_aktif) values (r.id, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();

  return r.id;
end;
$$;

create or replace function game_keluar(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r game_room%rowtype;
  v_host_baru uuid;
begin
  select * into r from game_room where id = p_room for update;
  if not found then return; end if;

  update game_pemain set aktif = false where room_id = p_room and user_id = v_user and aktif;
  if not found then return; end if;
  delete from game_kehadiran where room_id = p_room and user_id = v_user;
  insert into game_log (room_id, jenis, user_id) values (p_room, 'keluar', v_user);

  if not exists (select 1 from game_pemain where room_id = p_room and aktif) then
    delete from game_room where id = p_room;
    return;
  end if;

  if r.host_id = v_user then
    select user_id into v_host_baru from game_pemain
    where room_id = p_room and aktif order by bergabung_at limit 1;
    update game_room set host_id = v_host_baru, diperbarui_at = now() where id = p_room;
  end if;

  -- kalau yang keluar adalah penggambar, giliran langsung berakhir
  perform _game_maju(p_room);
end;
$$;

create or replace function game_mulai(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r game_room%rowtype;
  v_pemain uuid[];
  v_urutan uuid[] := '{}';
begin
  select * into r from game_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id <> v_user then raise exception 'Hanya host yang bisa memulai permainan.'; end if;
  if r.status <> 'menunggu' then raise exception 'Permainan sudah berjalan.'; end if;

  update game_kehadiran set terakhir_aktif = now() where room_id = p_room and user_id = v_user;
  -- pemain yang sudah menutup tab sebelum mulai tidak diikutkan
  update game_pemain p set aktif = false
  where p.room_id = p_room and p.aktif and not game_online(p_room, p.user_id);

  v_pemain := array(select user_id from game_pemain where room_id = p_room and aktif order by random());
  if coalesce(array_length(v_pemain, 1), 0) < 2 then raise exception 'Minimal 2 pemain untuk mulai.'; end if;

  for i in 1..r.jumlah_ronde loop
    v_urutan := v_urutan || v_pemain;
  end loop;

  delete from game_tebakan where room_id = p_room;
  delete from game_log where room_id = p_room and jenis not in ('gabung', 'keluar');
  update game_pemain set skor = 0, sudah_benar = false, poin_giliran = 0 where room_id = p_room;
  update game_rahasia set terpakai = '{}' where room_id = p_room;

  update game_room set urutan = v_urutan, giliran_ke = 0, kata_terungkap = null, diperbarui_at = now()
  where id = p_room;
  insert into game_log (room_id, jenis, user_id) values (p_room, 'mulai', v_user);

  perform _game_mulai_giliran(p_room);
end;
$$;

create or replace function game_pilih_kata(p_room uuid, p_indeks int) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
  s game_rahasia%rowtype;
begin
  select * into r from game_room where id = p_room for update;
  if not found or r.status <> 'memilih' or r.penggambar_id is distinct from auth.uid() then
    raise exception 'Bukan giliranmu memilih kata.';
  end if;
  select * into s from game_rahasia where room_id = p_room;
  if p_indeks is null or p_indeks < 1 or p_indeks > coalesce(array_length(s.pilihan, 1), 0) then
    raise exception 'Pilihan kata tidak valid.';
  end if;
  perform _game_mulai_menggambar(p_room, s.pilihan[p_indeks]);
end;
$$;

create or replace function game_tebak(p_room uuid, p_teks text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_teks text := left(btrim(coalesce(p_teks, '')), 60);
  r game_room%rowtype;
  s game_rahasia%rowtype;
  p game_pemain%rowtype;
  v_tebak text;
  v_kunci text;
  v_jarak int;
  v_total numeric;
  v_sisa numeric;
  v_pertama boolean;
  v_poin int;
begin
  if v_teks = '' then return jsonb_build_object('hasil', 'kosong'); end if;

  select * into r from game_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  select * into p from game_pemain where room_id = p_room and user_id = v_user;
  if not found or not p.aktif then raise exception 'Kamu bukan pemain di room ini.'; end if;

  insert into game_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();

  if r.status <> 'menggambar' or now() >= r.fase_berakhir then
    perform _game_maju(p_room);
    return jsonb_build_object('hasil', 'tutup');
  end if;
  if r.penggambar_id = v_user then return jsonb_build_object('hasil', 'penggambar'); end if;
  if p.sudah_benar then return jsonb_build_object('hasil', 'sudah'); end if;

  select * into s from game_rahasia where room_id = p_room;
  v_tebak := game_normal(v_teks);
  v_kunci := game_normal(s.kata);

  if v_tebak = v_kunci or replace(v_tebak, ' ', '') = replace(v_kunci, ' ', '') then
    v_total := extract(epoch from (r.fase_berakhir - r.fase_mulai));
    v_sisa := greatest(0, extract(epoch from (r.fase_berakhir - now())));
    v_pertama := not exists (select 1 from game_pemain where room_id = p_room and sudah_benar);
    v_poin := 100 + floor(300 * v_sisa / nullif(v_total, 0))::int + case when v_pertama then 50 else 0 end;

    update game_pemain set skor = skor + v_poin, poin_giliran = v_poin, sudah_benar = true
    where room_id = p_room and user_id = v_user;
    update game_pemain set skor = skor + 50, poin_giliran = poin_giliran + 50
    where room_id = p_room and user_id = r.penggambar_id;

    insert into game_tebakan (room_id, giliran_ke, user_id, teks, hasil)
    values (p_room, r.giliran_ke, v_user, v_teks, 'benar');
    insert into game_log (room_id, jenis, user_id, data)
    values (p_room, 'benar', v_user, jsonb_build_object('poin', v_poin, 'pertama', v_pertama));

    perform _game_maju(p_room);  -- semua sudah benar -> giliran selesai lebih awal
    return jsonb_build_object('hasil', 'benar', 'poin', v_poin);
  end if;

  v_jarak := game_jarak(replace(v_tebak, ' ', ''), replace(v_kunci, ' ', ''));
  if (length(v_kunci) >= 4 and v_jarak = 1) or (length(v_kunci) >= 8 and v_jarak = 2) then
    insert into game_tebakan (room_id, giliran_ke, user_id, teks, hasil)
    values (p_room, r.giliran_ke, v_user, v_teks, 'hampir');
    return jsonb_build_object('hasil', 'hampir');
  end if;

  insert into game_tebakan (room_id, giliran_ke, user_id, teks, hasil)
  values (p_room, r.giliran_ke, v_user, v_teks, 'salah');
  return jsonb_build_object('hasil', 'salah');
end;
$$;

-- Detak kehadiran + pemicu kemajuan fase. Mengembalikan jam server supaya klien
-- bisa mengoreksi selisih jam perangkatnya (hitung mundur tetap akurat).
create or replace function game_detak(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not game_anggota(p_room) then raise exception 'Kamu bukan pemain di room ini.'; end if;
  insert into game_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, auth.uid(), now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();
  perform _game_maju(p_room);
  return jsonb_build_object('sekarang', now());
end;
$$;

-- Daftar lobi: room publik yang menunggu & masih punya penghuni online.
-- Dihitung di server (now()) supaya tidak bergantung jam perangkat pengguna.
create or replace function game_daftar_lobi() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(baris order by dibuat_at desc), '[]'::jsonb)
  from (
    select r.dibuat_at, jsonb_build_object(
      'id', r.id, 'kode', r.kode, 'tema', r.tema, 'waktu_gambar', r.waktu_gambar,
      'jumlah_ronde', r.jumlah_ronde, 'maks_pemain', r.maks_pemain,
      'host_nama', (select nama from profiles where id = r.host_id),
      'pemain', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', p.user_id, 'nama', pr.nama, 'foto_url', pr.foto_url) order by p.bergabung_at), '[]'::jsonb)
        from game_pemain p join profiles pr on pr.id = p.user_id
        where p.room_id = r.id and p.aktif and game_online(r.id, p.user_id)
      )
    ) as baris
    from game_room r
    where auth.uid() is not null and r.publik and r.status = 'menunggu'
      and exists (
        select 1 from game_kehadiran k
        where k.room_id = r.id and k.terakhir_aktif > now() - interval '40 seconds'
      )
    order by r.dibuat_at desc
    limit 30
  ) x;
$$;

create or replace function game_main_lagi(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r game_room%rowtype;
begin
  select * into r from game_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id <> auth.uid() then raise exception 'Hanya host yang bisa memulai ulang.'; end if;
  if r.status <> 'selesai' then raise exception 'Permainan belum selesai.'; end if;

  update game_room set
    status = 'menunggu', urutan = '{}', giliran_ke = 0, penggambar_id = null,
    petunjuk = null, kata_terungkap = null, fase_mulai = null, fase_berakhir = null,
    diperbarui_at = now()
  where id = p_room;
  update game_pemain set sudah_benar = false, poin_giliran = 0 where room_id = p_room;
end;
$$;

-- ---------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------

revoke execute on function _game_selesai(uuid) from public, anon, authenticated;
revoke execute on function _game_mulai_giliran(uuid) from public, anon, authenticated;
revoke execute on function _game_mulai_menggambar(uuid, text) from public, anon, authenticated;
revoke execute on function _game_reveal(uuid) from public, anon, authenticated;
revoke execute on function _game_lanjut(uuid) from public, anon, authenticated;
revoke execute on function _game_buka_petunjuk(uuid) from public, anon, authenticated;
revoke execute on function _game_maju(uuid) from public, anon, authenticated;

revoke execute on function game_buat_room(text, int, int, int, boolean) from public, anon;
revoke execute on function game_gabung(text) from public, anon;
revoke execute on function game_keluar(uuid) from public, anon;
revoke execute on function game_mulai(uuid) from public, anon;
revoke execute on function game_pilih_kata(uuid, int) from public, anon;
revoke execute on function game_tebak(uuid, text) from public, anon;
revoke execute on function game_detak(uuid) from public, anon;
revoke execute on function game_main_lagi(uuid) from public, anon;
revoke execute on function game_daftar_lobi() from public, anon;

grant execute on function game_buat_room(text, int, int, int, boolean) to authenticated;
grant execute on function game_gabung(text) to authenticated;
grant execute on function game_keluar(uuid) to authenticated;
grant execute on function game_mulai(uuid) to authenticated;
grant execute on function game_pilih_kata(uuid, int) to authenticated;
grant execute on function game_tebak(uuid, text) to authenticated;
grant execute on function game_detak(uuid) to authenticated;
grant execute on function game_main_lagi(uuid) to authenticated;
grant execute on function game_daftar_lobi() to authenticated;

-- ---------------------------------------------------------
-- RLS (baca saja; semua tulis lewat fungsi di atas)
-- ---------------------------------------------------------

alter table game_kata enable row level security;      -- tanpa policy: klien tidak bisa membaca bank kata
alter table game_room enable row level security;
alter table game_rahasia enable row level security;
alter table game_pemain enable row level security;
alter table game_kehadiran enable row level security;
alter table game_tebakan enable row level security;
alter table game_log enable row level security;

drop policy if exists game_room_select on game_room;
create policy game_room_select on game_room for select to authenticated
  using (publik or game_anggota(id));

drop policy if exists game_rahasia_select on game_rahasia;
create policy game_rahasia_select on game_rahasia for select to authenticated
  using (exists (
    select 1 from game_room r
    where r.id = room_id and r.penggambar_id = auth.uid() and r.status in ('memilih', 'menggambar')
  ));

drop policy if exists game_pemain_select on game_pemain;
create policy game_pemain_select on game_pemain for select to authenticated
  using (game_anggota(room_id) or exists (select 1 from game_room r where r.id = room_id and r.publik));

drop policy if exists game_kehadiran_select on game_kehadiran;
create policy game_kehadiran_select on game_kehadiran for select to authenticated
  using (game_anggota(room_id) or exists (select 1 from game_room r where r.id = room_id and r.publik));

drop policy if exists game_tebakan_select on game_tebakan;
create policy game_tebakan_select on game_tebakan for select to authenticated
  using (game_anggota(room_id) and (hasil = 'salah' or user_id = auth.uid()));

drop policy if exists game_log_select on game_log;
create policy game_log_select on game_log for select to authenticated
  using (game_anggota(room_id));

-- ---------------------------------------------------------
-- Realtime (perubahan tabel dikirim ke klien; RLS tetap berlaku)
-- ---------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publikasi supabase_realtime tidak ada; aktifkan Realtime di dashboard.';
    return;
  end if;
  foreach t in array array['game_room', 'game_pemain', 'game_tebakan', 'game_log'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------
-- Bank kata (bisa ditambah kapan saja: insert into game_kata (tema, kata) ...)
-- ---------------------------------------------------------

insert into game_kata (tema, kata)
select tema, kata from (values
  ('umum', array['rumah','mobil','payung','kursi','meja','bola','jam','kunci','lampu','pintu',
    'jendela','buku','sepatu','topi','kacamata','gunting','pensil','tas','gelas','piring',
    'sendok','bintang','bulan','matahari','awan','pelangi','pohon','bunga','kapal','pesawat',
    'sepeda','televisi','telepon','hadiah','balon','roti','kue','es krim','gitar','sapu']),
  ('jogja', array['tugu','becak','andong','keraton','blangkon','batik','gudeg','wayang','gamelan',
    'malioboro','taman sari','bakpia','angkringan','kopi joss','lurik','keris','gunungan',
    'beringin','alun alun','merapi','kuda','sepeda onthel','kotagede','perak','gerobak',
    'tumpeng','payung kertas','topeng','benteng','pasar']),
  ('kuliner', array['gudeg','sate','bakso','mie ayam','nasi goreng','soto','martabak','es teh',
    'kopi','pisang goreng','tahu','tempe','kerupuk','rujak','gado gado','pecel','lontong',
    'ketupat','siomay','roti bakar','es campur','jagung bakar','telur','ayam goreng','ikan bakar',
    'donat','pizza','burger','semangka','nanas']),
  ('hewan', array['kucing','anjing','gajah','jerapah','harimau','singa','monyet','kelinci','ayam',
    'bebek','sapi','kambing','kuda','ular','kupu kupu','ikan','burung','kura kura','katak',
    'semut','lebah','laba laba','buaya','zebra','penguin','lumba lumba','gurita','kepiting',
    'siput','kelelawar']),
  ('wisata', array['candi','pantai','gunung','museum','kamera','peta','koper','tiket','hotel',
    'pesawat','kapal','tenda','ransel','kompas','air terjun','danau','goa','taman','bianglala',
    'paspor','perahu','mercusuar','kebun binatang','bus','kereta api','pemandu','topi pantai',
    'kacamata hitam','pasir','ombak']),
  ('kantor', array['laptop','komputer','printer','meja','kursi','kalender','stapler','gunting',
    'pulpen','map','kertas','rapat','kopi','jam dinding','telepon','stempel','amplop','lemari',
    'papan tulis','proyektor','kalkulator','penggaris','lift','tangga','dasi','kartu nama',
    'sidik jari','tas kerja','kipas angin','dispenser']),
  ('aktivitas', array['berenang','bersepeda','berlari','menari','menyanyi','memasak','membaca',
    'menulis','tidur','memancing','mendaki','sepak bola','voli','bulu tangkis','yoga','melukis',
    'memotret','berkemah','berbelanja','menyapu','mencuci','menyetir','berkebun','main gitar',
    'lompat tali','panahan','tenis meja','senam','jalan santai','naik kuda'])
) as daftar(tema, kumpulan), unnest(kumpulan) as kata
on conflict (tema, kata) do nothing;
