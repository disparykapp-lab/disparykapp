-- =========================================================
-- DisparYK — 0032: Game "Siapa Penyusup?" — skema, room & lobi
-- Jalankan setelah 0001-0031. Butuh game_normal() dari 0028.
--
-- Mini-game tebak kata: sebagian besar pemain (Pemandu) dapat kata yang sama,
-- 1-3 Penyusup dapat kata yang mirip tapi beda; petunjuk bergiliran -> diskusi
-- -> voting. Mode Satu Divisi atau Antar Divisi, 4-12 pemain.
-- Migrasi ini membuat SELURUH tabel + RLS + realtime + bank kata, dan RPC untuk
-- room & lobi. Mesin fase permainan, vote, dan skor ada di 0033.
--
-- Tabel terpisah dari game_room milik Coret Tebak (prefiks penyusup_), supaya
-- fungsi & constraint Coret Tebak tidak tersentuh.
--
-- Prinsip keamanan:
--   * Kata & peran tidak pernah disimpan di penyusup_room / penyusup_pemain
--     sebelum game selesai: Realtime mengirim SELURUH baris setiap UPDATE.
--     Pasangan kata + daftar penyusup ada di penyusup_rahasia (tanpa policy);
--     tiap pemain hanya bisa membaca kartunya sendiri (penyusup_kartu).
--   * penyusup_kartu.peran_terlihat hanya diisi kalau setting "penyusup tahu
--     perannya" aktif — dan saat itu untuk SEMUA pemain, supaya penyusup tidak
--     bisa menyimpulkan perannya dari kartu yang kosong.
--   * Vote hanya bisa dibaca pemiliknya; hasil dihitung server.
--   * Semua tulis lewat fungsi SECURITY DEFINER (tidak ada policy insert/update/
--     delete). Fungsi internal berawalan "_penyusup_" dicabut hak EXECUTE-nya.
--   * Waktu dari server (now()); klien memanggil penyusup_detak() berkala.
-- =========================================================

-- ---------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------

create table if not exists penyusup_kategori (
  id text primary key,
  nama text not null,
  ikon text not null,
  urutan int not null default 0
);

create table if not exists penyusup_pasangan (
  id bigserial primary key,
  kategori_id text not null references penyusup_kategori(id) on delete cascade,
  kata_a text not null,
  kata_b text not null,
  aktif boolean not null default true,
  unique (kategori_id, kata_a, kata_b)
);

create table if not exists penyusup_room (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  host_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('satu_divisi', 'antar_divisi')),
  divisi_id uuid references divisi(id) on delete set null,   -- hanya untuk mode satu_divisi
  privat boolean not null default true,
  kategori_id text references penyusup_kategori(id) on delete set null,  -- null = acak
  jumlah_penyusup int not null default 0 check (jumlah_penyusup between 0 and 3),  -- 0 = otomatis
  waktu_petunjuk int not null default 30 check (waktu_petunjuk between 15 and 60),
  waktu_diskusi int not null default 90 check (waktu_diskusi between 30 and 180),
  waktu_voting int not null default 30 check (waktu_voting between 15 and 60),
  penyusup_tahu boolean not null default false,
  tebakan_terakhir boolean not null default false,
  status text not null default 'menunggu' check (status in (
    'menunggu', 'bagikan', 'petunjuk', 'diskusi', 'voting', 'hasil_vote', 'tebakan_terakhir', 'selesai'
  )),
  game_ke int not null default 0,
  ronde int not null default 0,
  urutan uuid[] not null default '{}',        -- urutan giliran petunjuk ronde ini
  giliran_ke int not null default 0,
  giliran_user_id uuid references profiles(id) on delete set null,
  fase_mulai timestamptz,
  fase_berakhir timestamptz,
  hasil_vote jsonb,                           -- diisi saat fase hasil_vote
  akhir jsonb,                                -- diisi saat selesai (kata, penyusup, skor)
  dibuat_at timestamptz not null default now(),
  diperbarui_at timestamptz not null default now()
);

create table if not exists penyusup_pemain (
  room_id uuid not null references penyusup_room(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  divisi_id uuid references divisi(id) on delete set null,   -- divisi saat bergabung
  avatar smallint not null check (avatar between 0 and 7),
  siap boolean not null default false,
  hafal boolean not null default false,
  hidup boolean not null default true,
  sudah_vote boolean not null default false,
  aktif boolean not null default true,
  dikeluarkan boolean not null default false,
  skor int not null default 0,
  bergabung_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists penyusup_rahasia (
  room_id uuid primary key references penyusup_room(id) on delete cascade,
  pasangan_id bigint references penyusup_pasangan(id) on delete set null,
  kata_pemandu text,
  kata_penyusup text,
  penyusup_ids uuid[] not null default '{}',
  terpakai bigint[] not null default '{}'     -- pasangan yang sudah dipakai di room ini
);

create table if not exists penyusup_kartu (
  room_id uuid not null references penyusup_room(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  game_ke int not null,
  kata text not null,
  peran_terlihat text check (peran_terlihat in ('pemandu', 'penyusup')),
  primary key (room_id, user_id)
);

create table if not exists penyusup_petunjuk (
  id bigserial primary key,
  room_id uuid not null references penyusup_room(id) on delete cascade,
  game_ke int not null,
  ronde int not null,
  user_id uuid not null references profiles(id) on delete cascade,
  teks text not null,
  lewat boolean not null default false,
  dibuat_at timestamptz not null default now()
);

create table if not exists penyusup_chat (
  id bigserial primary key,
  room_id uuid not null references penyusup_room(id) on delete cascade,
  game_ke int not null,
  ronde int not null,
  user_id uuid not null references profiles(id) on delete cascade,
  teks text not null,
  dibuat_at timestamptz not null default now()
);

create table if not exists penyusup_vote (
  room_id uuid not null references penyusup_room(id) on delete cascade,
  game_ke int not null,
  ronde int not null,
  voter_id uuid not null references profiles(id) on delete cascade,
  target_id uuid references profiles(id) on delete set null,   -- null = lewati
  diubah_at timestamptz not null default now(),
  primary key (room_id, game_ke, ronde, voter_id)
);

-- Detak kehadiran dipisah dari penyusup_pemain supaya update tiap beberapa detik
-- tidak membanjiri Realtime (tabel ini sengaja tidak masuk publikasi realtime).
create table if not exists penyusup_kehadiran (
  room_id uuid not null references penyusup_room(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  terakhir_aktif timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists penyusup_log (
  id bigserial primary key,
  room_id uuid not null references penyusup_room(id) on delete cascade,
  jenis text not null,
  user_id uuid references profiles(id) on delete set null,
  data jsonb,
  dibuat_at timestamptz not null default now()
);

-- Skor per pemain per game, untuk papan skor. Tetap ada walau room dihapus.
create table if not exists penyusup_skor (
  id bigserial primary key,
  room_id uuid references penyusup_room(id) on delete set null,
  game_ke int not null,
  user_id uuid not null references profiles(id) on delete cascade,
  divisi_id uuid references divisi(id) on delete set null,
  mode text not null check (mode in ('satu_divisi', 'antar_divisi')),
  peran text not null check (peran in ('pemandu', 'penyusup')),
  menang boolean not null,
  poin int not null,
  dibuat_at timestamptz not null default now()
);

-- Kata yang ditolak di chat & petunjuk (dicocokkan per kata setelah game_normal).
-- Tambah kapan saja: insert into penyusup_kata_terlarang (kata) values ('...');
create table if not exists penyusup_kata_terlarang (
  kata text primary key
);

-- Percobaan kode room yang salah, untuk membatasi tebak-tebak kode.
create table if not exists penyusup_gabung_gagal (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  dibuat_at timestamptz not null default now()
);

create index if not exists penyusup_room_lobi_idx on penyusup_room (privat, status);
create index if not exists penyusup_petunjuk_room_idx on penyusup_petunjuk (room_id, game_ke, ronde, id);
create index if not exists penyusup_chat_room_idx on penyusup_chat (room_id, game_ke, id);
create index if not exists penyusup_log_room_idx on penyusup_log (room_id, id);
create index if not exists penyusup_skor_waktu_idx on penyusup_skor (dibuat_at);
create index if not exists penyusup_gabung_gagal_idx on penyusup_gabung_gagal (user_id, dibuat_at);

-- ---------------------------------------------------------
-- Fungsi bantu (dipakai policy, aman dipanggil klien)
-- ---------------------------------------------------------

-- Pernah bergabung di room ini (termasuk yang sudah keluar / dikeluarkan, supaya
-- klien masih menerima perubahan barisnya sendiri, mis. saat dikeluarkan host).
create or replace function penyusup_anggota(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from penyusup_pemain where room_id = p_room and user_id = auth.uid());
$$;

create or replace function penyusup_online(p_room uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from penyusup_kehadiran
    where room_id = p_room and user_id = p_user and terakhir_aktif > now() - interval '40 seconds'
  );
$$;

-- ---------------------------------------------------------
-- Fungsi internal
-- ---------------------------------------------------------

-- 5 huruf tanpa O/0/I/1 yang mudah tertukar
create or replace function _penyusup_kode_baru() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_huruf text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_kode text;
begin
  loop
    v_kode := '';
    for i in 1..5 loop
      v_kode := v_kode || substr(v_huruf, 1 + floor(random() * length(v_huruf))::int, 1);
    end loop;
    exit when not exists (select 1 from penyusup_room where kode = v_kode);
  end loop;
  return v_kode;
end;
$$;

-- Avatar bawaan kalau pemain belum memilih: selalu sama untuk user yang sama.
create or replace function _penyusup_avatar_default(p_user uuid) returns smallint
language sql immutable as $$
  select (abs(hashtext(p_user::text)::bigint) % 8)::smallint;
$$;

-- Mengandung kata terlarang? (per kata setelah dinormalkan: "Bang-sat!" ikut tertangkap)
create or replace function _penyusup_kasar(p_teks text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from unnest(string_to_array(game_normal(p_teks), ' ')) as t(kata)
    join penyusup_kata_terlarang k on k.kata = t.kata
  ) or exists (
    select 1 from penyusup_kata_terlarang k where k.kata = replace(game_normal(p_teks), ' ', '')
  );
$$;

-- Host pindah ke pemain aktif yang paling lama di room (utamakan yang online).
create or replace function _penyusup_pindah_host(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lama uuid;
  v_baru uuid;
begin
  select host_id into v_lama from penyusup_room where id = p_room;
  select p.user_id into v_baru from penyusup_pemain p
  where p.room_id = p_room and p.aktif
  order by penyusup_online(p_room, p.user_id) desc, p.bergabung_at
  limit 1;
  if v_baru is null or v_baru = v_lama then return; end if;
  update penyusup_room set host_id = v_baru, diperbarui_at = now() where id = p_room;
  insert into penyusup_log (room_id, jenis, user_id, data)
  values (p_room, 'host', v_baru, jsonb_build_object('dari', v_lama));
end;
$$;

-- Menandai pemain yang keluar. Di tengah permainan ia sekaligus tersingkir
-- (perannya tidak diungkap); di lobi / layar akhir cukup tidak aktif.
create or replace function _penyusup_lepas_pemain(p_room uuid, p_user uuid, p_jenis text, p_data jsonb default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  select status into v_status from penyusup_room where id = p_room;
  update penyusup_pemain set
    aktif = false,
    siap = false,
    dikeluarkan = dikeluarkan or p_jenis = 'dikeluarkan',
    hidup = case when v_status in ('menunggu', 'selesai') then hidup else false end
  where room_id = p_room and user_id = p_user and aktif;
  if not found then return false; end if;
  delete from penyusup_kehadiran where room_id = p_room and user_id = p_user;
  insert into penyusup_log (room_id, jenis, user_id, data) values (p_room, p_jenis, p_user, p_data);
  return true;
end;
$$;

-- Pemain tanpa detak > 60 dtk dianggap keluar; room kosong dihapus; host yang
-- offline digantikan. Mengembalikan false kalau room sudah tidak ada.
create or replace function _penyusup_rapikan_pemain(p_room uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_user uuid;
begin
  select * into r from penyusup_room where id = p_room;
  if not found then return false; end if;

  for v_user in
    select p.user_id from penyusup_pemain p
    left join penyusup_kehadiran k on k.room_id = p.room_id and k.user_id = p.user_id
    where p.room_id = p_room and p.aktif
      and coalesce(k.terakhir_aktif, '-infinity'::timestamptz) < now() - interval '60 seconds'
  loop
    perform _penyusup_lepas_pemain(p_room, v_user, 'keluar', jsonb_build_object('alasan', 'terputus'));
  end loop;

  if not exists (select 1 from penyusup_pemain where room_id = p_room and aktif) then
    delete from penyusup_room where id = p_room;
    return false;
  end if;

  if not exists (select 1 from penyusup_pemain where room_id = p_room and user_id = r.host_id and aktif)
     or not penyusup_online(p_room, r.host_id) then
    perform _penyusup_pindah_host(p_room);
  end if;
  return true;
end;
$$;

-- Memajukan state room. Aman dipanggil berkali-kali (idempoten).
-- Versi 0032 hanya merapikan pemain & host; 0033 menambah mesin fase permainan.
create or replace function _penyusup_maju(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from penyusup_room where id = p_room for update;
  if not found then return; end if;
  perform _penyusup_rapikan_pemain(p_room);
end;
$$;

-- ---------------------------------------------------------
-- RPC untuk klien
-- ---------------------------------------------------------

create or replace function penyusup_buat_room(
  p_mode text,
  p_kategori text,
  p_jumlah_penyusup int,
  p_waktu_petunjuk int,
  p_waktu_diskusi int,
  p_waktu_voting int,
  p_penyusup_tahu boolean,
  p_tebakan_terakhir boolean,
  p_privat boolean,
  p_avatar int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_divisi uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  select divisi_id into v_divisi from profiles where id = v_user and aktif;
  if not found then raise exception 'Akun tidak aktif.'; end if;

  if p_mode is null or p_mode not in ('satu_divisi', 'antar_divisi') then raise exception 'Mode room tidak dikenal.'; end if;
  if p_mode = 'satu_divisi' and v_divisi is null then
    raise exception 'Kamu belum punya divisi, jadi tidak bisa membuat room Satu Divisi.';
  end if;
  if p_kategori is not null and not exists (select 1 from penyusup_kategori where id = p_kategori) then
    raise exception 'Kategori kata tidak dikenal.';
  end if;
  if p_jumlah_penyusup is null or p_jumlah_penyusup not between 0 and 3 then raise exception 'Jumlah penyusup harus otomatis atau 1-3.'; end if;
  if p_waktu_petunjuk is null or p_waktu_petunjuk not between 15 and 60 then raise exception 'Waktu petunjuk harus 15-60 detik.'; end if;
  if p_waktu_diskusi is null or p_waktu_diskusi not between 30 and 180 then raise exception 'Waktu diskusi harus 30-180 detik.'; end if;
  if p_waktu_voting is null or p_waktu_voting not between 15 and 60 then raise exception 'Waktu voting harus 15-60 detik.'; end if;
  if p_avatar is not null and p_avatar not between 0 and 7 then raise exception 'Avatar tidak dikenal.'; end if;

  -- bersih-bersih room yang sudah lama tidak dipakai (skor tetap tersimpan)
  delete from penyusup_room where diperbarui_at < now() - interval '1 day';
  delete from penyusup_gabung_gagal where dibuat_at < now() - interval '1 day';

  insert into penyusup_room (
    kode, host_id, mode, divisi_id, privat, kategori_id, jumlah_penyusup,
    waktu_petunjuk, waktu_diskusi, waktu_voting, penyusup_tahu, tebakan_terakhir
  ) values (
    _penyusup_kode_baru(), v_user, p_mode, case when p_mode = 'satu_divisi' then v_divisi end,
    coalesce(p_privat, true), p_kategori, p_jumlah_penyusup,
    p_waktu_petunjuk, p_waktu_diskusi, p_waktu_voting,
    coalesce(p_penyusup_tahu, false), coalesce(p_tebakan_terakhir, false)
  ) returning id into v_id;

  insert into penyusup_pemain (room_id, user_id, divisi_id, avatar)
  values (v_id, v_user, v_divisi, coalesce(p_avatar, _penyusup_avatar_default(v_user)));
  insert into penyusup_kehadiran (room_id, user_id) values (v_id, v_user);
  insert into penyusup_log (room_id, jenis, user_id) values (v_id, 'gabung', v_user);
  return v_id;
end;
$$;

-- Mengembalikan {ok, room_id} atau {ok: false, pesan}. Kegagalan yang dihitung
-- untuk batas percobaan TIDAK memakai raise, karena raise me-rollback catatannya.
create or replace function penyusup_gabung(p_kode text, p_avatar int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_divisi uuid;
  v_kode text := upper(btrim(coalesce(p_kode, '')));
  r penyusup_room%rowtype;
  p penyusup_pemain%rowtype;
  v_jumlah int;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  select divisi_id into v_divisi from profiles where id = v_user and aktif;
  if not found then raise exception 'Akun tidak aktif.'; end if;
  if p_avatar is not null and p_avatar not between 0 and 7 then raise exception 'Avatar tidak dikenal.'; end if;

  if (select count(*) from penyusup_gabung_gagal
      where user_id = v_user and dibuat_at > now() - interval '10 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'pesan', 'Terlalu banyak kode yang salah. Coba lagi beberapa menit lagi.');
  end if;

  select * into r from penyusup_room where kode = v_kode for update;
  if not found then
    insert into penyusup_gabung_gagal (user_id) values (v_user);
    return jsonb_build_object('ok', false, 'pesan', 'Room dengan kode itu tidak ditemukan.');
  end if;

  select * into p from penyusup_pemain where room_id = r.id and user_id = v_user;
  if found then
    if p.dikeluarkan then
      return jsonb_build_object('ok', false, 'pesan', 'Kamu sudah dikeluarkan dari room ini oleh host.');
    end if;
    -- pemain lama kembali (reload halaman / sempat keluar). Kalau permainan sudah
    -- berjalan, ia sudah tersingkir saat keluar dan kembali sebagai penonton.
    if not p.aktif then
      update penyusup_pemain set aktif = true where room_id = r.id and user_id = v_user;
      insert into penyusup_log (room_id, jenis, user_id) values (r.id, 'gabung', v_user);
    end if;
  else
    -- divisi room terhapus (null) = tidak ada yang bisa masuk lagi, termasuk user tanpa divisi
    if r.mode = 'satu_divisi' and (r.divisi_id is null or r.divisi_id is distinct from v_divisi) then
      return jsonb_build_object('ok', false, 'pesan', format(
        'Room ini khusus divisi %s.', coalesce((select nama from divisi where id = r.divisi_id), 'lain')));
    end if;
    if r.status <> 'menunggu' then
      return jsonb_build_object('ok', false, 'pesan', 'Permainan di room ini sudah berjalan.');
    end if;
    select count(*) into v_jumlah from penyusup_pemain pm
    where pm.room_id = r.id and pm.aktif and penyusup_online(r.id, pm.user_id);
    if v_jumlah >= 12 then
      return jsonb_build_object('ok', false, 'pesan', 'Room sudah penuh (12 pemain).');
    end if;
    insert into penyusup_pemain (room_id, user_id, divisi_id, avatar)
    values (r.id, v_user, v_divisi, coalesce(p_avatar, _penyusup_avatar_default(v_user)));
    insert into penyusup_log (room_id, jenis, user_id) values (r.id, 'gabung', v_user);
  end if;

  insert into penyusup_kehadiran (room_id, user_id, terakhir_aktif) values (r.id, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();
  update penyusup_room set diperbarui_at = now() where id = r.id;

  return jsonb_build_object('ok', true, 'room_id', r.id);
end;
$$;

create or replace function penyusup_keluar(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  perform 1 from penyusup_room where id = p_room for update;
  if not found then return; end if;
  if not _penyusup_lepas_pemain(p_room, v_user, 'keluar') then return; end if;
  -- room kosong dihapus, host yang keluar digantikan
  perform _penyusup_maju(p_room);
end;
$$;

create or replace function penyusup_keluarkan(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r penyusup_room%rowtype;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id is distinct from v_user then raise exception 'Hanya host yang bisa mengeluarkan pemain.'; end if;
  if p_user is null or p_user = v_user then raise exception 'Host tidak bisa mengeluarkan dirinya sendiri.'; end if;
  if not _penyusup_lepas_pemain(p_room, p_user, 'dikeluarkan', jsonb_build_object('oleh', v_user)) then
    raise exception 'Pemain itu sudah tidak ada di room.';
  end if;
  update penyusup_room set diperbarui_at = now() where id = p_room;
  perform _penyusup_maju(p_room);
end;
$$;

create or replace function penyusup_siap(p_room uuid, p_siap boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  select status into v_status from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if v_status <> 'menunggu' then raise exception 'Permainan sudah berjalan.'; end if;
  update penyusup_pemain set siap = coalesce(p_siap, false)
  where room_id = p_room and user_id = auth.uid() and aktif;
  if not found then raise exception 'Kamu bukan pemain di room ini.'; end if;
end;
$$;

create or replace function penyusup_pilih_avatar(p_room uuid, p_avatar int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if p_avatar is null or p_avatar not between 0 and 7 then raise exception 'Avatar tidak dikenal.'; end if;
  select status into v_status from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if v_status not in ('menunggu', 'selesai') then raise exception 'Avatar hanya bisa diganti di lobi.'; end if;
  update penyusup_pemain set avatar = p_avatar where room_id = p_room and user_id = auth.uid() and aktif;
  if not found then raise exception 'Kamu bukan pemain di room ini.'; end if;
end;
$$;

-- Detak kehadiran + pemicu kemajuan state. Mengembalikan jam server supaya klien
-- bisa mengoreksi selisih jam perangkatnya (hitung mundur tetap akurat).
create or replace function penyusup_detak(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from penyusup_pemain where room_id = p_room and user_id = auth.uid() and aktif) then
    raise exception 'Kamu bukan pemain di room ini.';
  end if;
  insert into penyusup_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, auth.uid(), now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();
  perform _penyusup_maju(p_room);
  return jsonb_build_object('sekarang', now());
end;
$$;

-- Daftar untuk layar Gabung Room: room yang sedang diikuti sendiri (untuk kembali),
-- plus room publik yang menunggu & masih berpenghuni online. Room Satu Divisi
-- hanya tampil untuk divisi yang sama. Kata & peran tidak pernah ikut.
create or replace function penyusup_daftar_room() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(baris order by saya_anggota desc, dibuat_at desc), '[]'::jsonb)
  from (
    select
      r.dibuat_at,
      exists (select 1 from penyusup_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif) as saya_anggota,
      jsonb_build_object(
        'id', r.id, 'kode', r.kode, 'mode', r.mode, 'privat', r.privat, 'status', r.status,
        'divisi_nama', (select nama from divisi where id = r.divisi_id),
        'host_nama', (select nama from profiles where id = r.host_id),
        'jumlah_pemain', (
          select count(*) from penyusup_pemain p
          where p.room_id = r.id and p.aktif and penyusup_online(r.id, p.user_id)
        ),
        'saya_anggota', exists (
          select 1 from penyusup_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif
        )
      ) as baris
    from penyusup_room r
    where auth.uid() is not null
      and (
        (
          exists (select 1 from penyusup_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif)
          and r.diperbarui_at > now() - interval '3 hours'
        )
        or (
          not r.privat
          and r.status = 'menunggu'
          and (r.mode = 'antar_divisi' or r.divisi_id = (select divisi_id from profiles where id = auth.uid()))
          and not exists (
            select 1 from penyusup_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.dikeluarkan
          )
          and exists (
            select 1 from penyusup_kehadiran k
            where k.room_id = r.id and k.terakhir_aktif > now() - interval '40 seconds'
          )
        )
      )
    order by r.dibuat_at desc
    limit 30
  ) x;
$$;

-- ---------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------

revoke execute on function _penyusup_kode_baru() from public, anon, authenticated;
revoke execute on function _penyusup_kasar(text) from public, anon, authenticated;
revoke execute on function _penyusup_pindah_host(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_lepas_pemain(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function _penyusup_rapikan_pemain(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_maju(uuid) from public, anon, authenticated;

revoke execute on function penyusup_buat_room(text, text, int, int, int, int, boolean, boolean, boolean, int) from public, anon;
revoke execute on function penyusup_gabung(text, int) from public, anon;
revoke execute on function penyusup_keluar(uuid) from public, anon;
revoke execute on function penyusup_keluarkan(uuid, uuid) from public, anon;
revoke execute on function penyusup_siap(uuid, boolean) from public, anon;
revoke execute on function penyusup_pilih_avatar(uuid, int) from public, anon;
revoke execute on function penyusup_detak(uuid) from public, anon;
revoke execute on function penyusup_daftar_room() from public, anon;

grant execute on function penyusup_buat_room(text, text, int, int, int, int, boolean, boolean, boolean, int) to authenticated;
grant execute on function penyusup_gabung(text, int) to authenticated;
grant execute on function penyusup_keluar(uuid) to authenticated;
grant execute on function penyusup_keluarkan(uuid, uuid) to authenticated;
grant execute on function penyusup_siap(uuid, boolean) to authenticated;
grant execute on function penyusup_pilih_avatar(uuid, int) to authenticated;
grant execute on function penyusup_detak(uuid) to authenticated;
grant execute on function penyusup_daftar_room() to authenticated;

-- ---------------------------------------------------------
-- RLS (baca saja; semua tulis lewat fungsi di atas)
-- ---------------------------------------------------------

alter table penyusup_kategori enable row level security;
alter table penyusup_pasangan enable row level security;        -- tanpa policy: bank kata rahasia
alter table penyusup_room enable row level security;
alter table penyusup_pemain enable row level security;
alter table penyusup_rahasia enable row level security;         -- tanpa policy
alter table penyusup_kartu enable row level security;
alter table penyusup_petunjuk enable row level security;
alter table penyusup_chat enable row level security;
alter table penyusup_vote enable row level security;
alter table penyusup_kehadiran enable row level security;
alter table penyusup_log enable row level security;
alter table penyusup_skor enable row level security;
alter table penyusup_kata_terlarang enable row level security;  -- tanpa policy
alter table penyusup_gabung_gagal enable row level security;    -- tanpa policy

drop policy if exists penyusup_kategori_select on penyusup_kategori;
create policy penyusup_kategori_select on penyusup_kategori for select to authenticated using (true);

-- anggota, atau room publik yang boleh dimasuki (Satu Divisi: divisi yang sama)
drop policy if exists penyusup_room_select on penyusup_room;
create policy penyusup_room_select on penyusup_room for select to authenticated
  using (
    penyusup_anggota(id)
    or (not privat and (mode = 'antar_divisi' or divisi_id = (select p.divisi_id from profiles p where p.id = auth.uid())))
  );

-- subquery ke penyusup_room ikut terkena RLS-nya: pemain terlihat kalau room-nya terlihat
drop policy if exists penyusup_pemain_select on penyusup_pemain;
create policy penyusup_pemain_select on penyusup_pemain for select to authenticated
  using (penyusup_anggota(room_id) or exists (select 1 from penyusup_room r where r.id = room_id));

drop policy if exists penyusup_kehadiran_select on penyusup_kehadiran;
create policy penyusup_kehadiran_select on penyusup_kehadiran for select to authenticated
  using (penyusup_anggota(room_id) or exists (select 1 from penyusup_room r where r.id = room_id));

drop policy if exists penyusup_kartu_select on penyusup_kartu;
create policy penyusup_kartu_select on penyusup_kartu for select to authenticated
  using (user_id = auth.uid());

drop policy if exists penyusup_petunjuk_select on penyusup_petunjuk;
create policy penyusup_petunjuk_select on penyusup_petunjuk for select to authenticated
  using (penyusup_anggota(room_id));

drop policy if exists penyusup_chat_select on penyusup_chat;
create policy penyusup_chat_select on penyusup_chat for select to authenticated
  using (penyusup_anggota(room_id));

drop policy if exists penyusup_vote_select on penyusup_vote;
create policy penyusup_vote_select on penyusup_vote for select to authenticated
  using (voter_id = auth.uid());

drop policy if exists penyusup_log_select on penyusup_log;
create policy penyusup_log_select on penyusup_log for select to authenticated
  using (penyusup_anggota(room_id));

drop policy if exists penyusup_skor_select on penyusup_skor;
create policy penyusup_skor_select on penyusup_skor for select to authenticated using (true);

-- ---------------------------------------------------------
-- Realtime (perubahan tabel dikirim ke klien; RLS tetap berlaku).
-- Kartu, rahasia, vote, dan kehadiran sengaja TIDAK dimasukkan.
-- ---------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publikasi supabase_realtime tidak ada; aktifkan Realtime di dashboard.';
    return;
  end if;
  foreach t in array array['penyusup_room', 'penyusup_pemain', 'penyusup_petunjuk', 'penyusup_chat', 'penyusup_log'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------
-- Kata terlarang (daftar awal; dicocokkan per kata utuh, jadi "asuransi" tidak kena "asu")
-- ---------------------------------------------------------

insert into penyusup_kata_terlarang (kata) values
  ('anjing'), ('anjir'), ('asu'), ('bajingan'), ('bangsat'), ('bego'), ('goblok'), ('goblog'),
  ('jancok'), ('jancuk'), ('kampret'), ('keparat'), ('kontol'), ('lonte'), ('memek'), ('ngentot'),
  ('ngewe'), ('pantek'), ('pepek'), ('perek'), ('taik'), ('tolol'), ('bacot'), ('cok'), ('jembut')
on conflict (kata) do nothing;

-- ---------------------------------------------------------
-- Bank kata (dari aset-game-sumber/siapa-penyusup/Referensi/bank_kata.json).
-- Tiap pasangan a/b mirip tapi beda; server mengacak sisi mana yang jadi kata
-- Pemandu. Tambah kapan saja: insert into penyusup_pasangan (kategori_id, kata_a, kata_b) ...
-- ---------------------------------------------------------

insert into penyusup_kategori (id, nama, ikon, urutan) values
  ('wisata_jogja', 'Destinasi Wisata', 'pemandu', 1),
  ('kuliner', 'Kuliner', 'poin', 2),
  ('budaya', 'Seni & Budaya', 'penyusup', 3),
  ('kantor_magang', 'Dunia Magang', 'absensi', 4),
  ('pariwisata_umum', 'Pariwisata', 'kartu_kata', 5)
on conflict (id) do update set nama = excluded.nama, ikon = excluded.ikon, urutan = excluded.urutan;

insert into penyusup_pasangan (kategori_id, kata_a, kata_b) values
  ('wisata_jogja', 'Malioboro', 'Pasar Beringharjo'),
  ('wisata_jogja', 'Candi Prambanan', 'Candi Borobudur'),
  ('wisata_jogja', 'Keraton', 'Taman Sari'),
  ('wisata_jogja', 'Pantai Parangtritis', 'Pantai Indrayanti'),
  ('wisata_jogja', 'Tugu Jogja', 'Titik Nol Kilometer'),
  ('wisata_jogja', 'Gunung Merapi', 'Gunung Merbabu'),
  ('wisata_jogja', 'Goa Pindul', 'Goa Jomblang'),
  ('wisata_jogja', 'Alun-Alun Kidul', 'Alun-Alun Utara'),
  ('wisata_jogja', 'Kaliurang', 'Kalibiru'),
  ('wisata_jogja', 'Hutan Pinus Mangunan', 'Kebun Buah Mangunan'),
  ('wisata_jogja', 'Tebing Breksi', 'Candi Ijo'),
  ('wisata_jogja', 'Bukit Bintang', 'Puncak Becici'),
  ('kuliner', 'Gudeg', 'Opor Ayam'),
  ('kuliner', 'Bakpia', 'Onde-onde'),
  ('kuliner', 'Sate Klathak', 'Sate Kambing'),
  ('kuliner', 'Wedang Ronde', 'Wedang Uwuh'),
  ('kuliner', 'Angkringan', 'Warung Burjo'),
  ('kuliner', 'Kopi Joss', 'Kopi Tubruk'),
  ('kuliner', 'Mie Lethek', 'Bakmi Jawa'),
  ('kuliner', 'Nasi Kucing', 'Nasi Bungkus'),
  ('kuliner', 'Geplak', 'Yangko'),
  ('kuliner', 'Jadah Tempe', 'Tahu Bacem'),
  ('budaya', 'Wayang Kulit', 'Wayang Orang'),
  ('budaya', 'Batik Tulis', 'Batik Cap'),
  ('budaya', 'Gamelan', 'Angklung'),
  ('budaya', 'Blangkon', 'Peci'),
  ('budaya', 'Keris', 'Tombak'),
  ('budaya', 'Tari Serimpi', 'Tari Bedhaya'),
  ('budaya', 'Becak', 'Andong'),
  ('budaya', 'Kebaya', 'Beskap'),
  ('budaya', 'Sekaten', 'Grebeg'),
  ('budaya', 'Jathilan', 'Reog'),
  ('kantor_magang', 'Absensi', 'Presensi'),
  ('kantor_magang', 'Laptop', 'Komputer'),
  ('kantor_magang', 'Rapat', 'Briefing'),
  ('kantor_magang', 'Fotokopi', 'Scan'),
  ('kantor_magang', 'Stempel', 'Tanda Tangan'),
  ('kantor_magang', 'Surat Tugas', 'Surat Undangan'),
  ('kantor_magang', 'Lanyard', 'ID Card'),
  ('kantor_magang', 'Printer', 'Mesin Fotokopi'),
  ('kantor_magang', 'Pantry', 'Kantin'),
  ('kantor_magang', 'Laporan Harian', 'Logbook'),
  ('kantor_magang', 'Seragam', 'Batik Kantor'),
  ('kantor_magang', 'Lembur', 'Piket'),
  ('pariwisata_umum', 'Pemandu Wisata', 'Agen Travel'),
  ('pariwisata_umum', 'Homestay', 'Hotel'),
  ('pariwisata_umum', 'Brosur', 'Spanduk'),
  ('pariwisata_umum', 'Tiket Masuk', 'Karcis Parkir'),
  ('pariwisata_umum', 'Oleh-oleh', 'Suvenir'),
  ('pariwisata_umum', 'Kamera', 'Drone'),
  ('pariwisata_umum', 'Peta', 'Kompas'),
  ('pariwisata_umum', 'Bus Pariwisata', 'Mobil Travel'),
  ('pariwisata_umum', 'Festival', 'Pameran'),
  ('pariwisata_umum', 'Paspor', 'Visa')
on conflict (kategori_id, kata_a, kata_b) do nothing;
