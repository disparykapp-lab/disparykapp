-- =========================================================
-- DisparYK — 0045: Inventaris barang (merchandise promosi)
-- Jalankan setelah 0044.
--
-- Mendata barang (mis. merchandise divisi promosi) beserta keluar-masuknya.
--   inventaris_barang  — satu baris per jenis barang (+ 1 foto, keterangan opsional).
--                        Stok TIDAK diisi langsung: selalu hasil jumlah catatan
--                        masuk dikurangi keluar, supaya tiap angka bisa dilacak.
--   inventaris_mutasi  — catatan barang masuk / keluar (jumlah, tanggal,
--                        untuk siapa / dari mana, keterangan opsional).
--   inventaris_log     — log CRUD otomatis (trigger): siapa menambah, mengubah,
--                        menghapus, memulihkan barang & catatan, kapan, dan
--                        nilai sebelum → sesudah.
--
-- Akses diatur per divisi lewat centang "Inventaris" di Kelola > Divisi
-- (sama seperti Kalender Konten & Naskah AI); admin selalu bisa.
-- Semua penulisan lewat RPC security definer di bawah — tabel tidak punya
-- policy insert/update/delete untuk klien.
--
-- Foto barang di bucket PUBLIK `inventaris_foto`, folder {user_id}/...
-- (foto merchandise bukan data pribadi; publik = bisa di-cache browser).
-- Foto lama tidak dihapus saat diganti, supaya log "foto diganti" tetap
-- bisa menampilkan foto sebelumnya.
-- =========================================================

alter table divisi
  add column if not exists fitur_inventaris boolean not null default false;

-- admin, atau pegawai aktif yang divisinya dicentang
create or replace function bisa_inventaris() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    left join divisi d on d.id = p.divisi_id
    where p.id = auth.uid()
      and p.aktif
      and (p.role = 'admin' or coalesce(d.fitur_inventaris, false))
  );
$$;

-- ---------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------

create table if not exists inventaris_barang (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(nama) between 2 and 80),
  kategori text check (kategori is null or length(kategori) between 1 and 40),
  satuan text not null default 'pcs' check (length(satuan) between 1 and 20),
  stok integer not null default 0 check (stok >= 0),
  stok_minimum integer not null default 0 check (stok_minimum between 0 and 1000000),
  keterangan text check (keterangan is null or length(keterangan) between 1 and 500),
  foto_path text,
  dibuat_oleh uuid references profiles(id) on delete set null,
  dibuat_at timestamptz not null default now(),
  diubah_at timestamptz not null default now(),
  dihapus_at timestamptz
);
-- nama tidak boleh kembar di antara barang yang belum dihapus
create unique index if not exists inventaris_barang_nama_aktif
  on inventaris_barang (lower(nama)) where dihapus_at is null;

create table if not exists inventaris_mutasi (
  id uuid primary key default gen_random_uuid(),
  -- urutan pencatatan (naik terus) — penentu urutan di hari yang sama
  urut bigint generated always as identity,
  barang_id uuid not null references inventaris_barang(id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'keluar')),
  jumlah integer not null check (jumlah between 1 and 1000000),
  tanggal date not null,
  -- keluar: untuk siapa / acara apa; masuk: dari mana
  pihak text check (pihak is null or length(pihak) between 1 and 100),
  keterangan text check (keterangan is null or length(keterangan) between 1 and 500),
  user_id uuid references profiles(id) on delete set null,
  dibuat_at timestamptz not null default now(),
  diubah_at timestamptz,
  diubah_oleh uuid references profiles(id) on delete set null
);
create index if not exists idx_inventaris_mutasi_barang on inventaris_mutasi (barang_id, tanggal, urut);
create index if not exists idx_inventaris_mutasi_tanggal on inventaris_mutasi (tanggal);

create table if not exists inventaris_log (
  id bigint generated always as identity primary key,
  aksi text not null check (aksi in (
    'barang_tambah', 'barang_ubah', 'barang_hapus', 'barang_pulihkan',
    'mutasi_tambah', 'mutasi_ubah', 'mutasi_hapus'
  )),
  barang_id uuid references inventaris_barang(id) on delete set null,
  mutasi_id uuid,
  nama_barang text not null,
  -- untuk aksi mutasi_*: masuk / keluar (memudahkan saring)
  jenis text check (jenis is null or jenis in ('masuk', 'keluar')),
  sebelum jsonb,
  sesudah jsonb,
  user_id uuid references profiles(id) on delete set null,
  dibuat_at timestamptz not null default now()
);
create index if not exists idx_inventaris_log_waktu on inventaris_log (id desc);
create index if not exists idx_inventaris_log_barang on inventaris_log (barang_id, id desc);

alter table inventaris_barang enable row level security;
alter table inventaris_mutasi enable row level security;
alter table inventaris_log enable row level security;

drop policy if exists inventaris_barang_select on inventaris_barang;
drop policy if exists inventaris_mutasi_select on inventaris_mutasi;
drop policy if exists inventaris_log_select on inventaris_log;
create policy inventaris_barang_select on inventaris_barang for select to authenticated using (bisa_inventaris());
create policy inventaris_mutasi_select on inventaris_mutasi for select to authenticated using (bisa_inventaris());
create policy inventaris_log_select on inventaris_log for select to authenticated using (bisa_inventaris());

-- ---------------------------------------------------------
-- Log CRUD otomatis
-- ---------------------------------------------------------

create or replace function _inventaris_log_barang() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_lama jsonb;
  v_baru jsonb;
  v_sebelum jsonb := '{}'::jsonb;
  v_sesudah jsonb := '{}'::jsonb;
  v_aksi text;
  k text;
begin
  v_baru := jsonb_build_object(
    'nama', new.nama, 'kategori', new.kategori, 'satuan', new.satuan,
    'stok_minimum', new.stok_minimum, 'keterangan', new.keterangan, 'foto_path', new.foto_path
  );

  if tg_op = 'INSERT' then
    insert into inventaris_log (aksi, barang_id, nama_barang, sesudah, user_id)
    values ('barang_tambah', new.id, new.nama, v_baru, auth.uid());
    return new;
  end if;

  if old.dihapus_at is null and new.dihapus_at is not null then
    insert into inventaris_log (aksi, barang_id, nama_barang, sebelum, user_id)
    values ('barang_hapus', new.id, new.nama, v_baru || jsonb_build_object('stok', old.stok), auth.uid());
    return new;
  end if;
  if old.dihapus_at is not null and new.dihapus_at is null then
    insert into inventaris_log (aksi, barang_id, nama_barang, sesudah, user_id)
    values ('barang_pulihkan', new.id, new.nama, v_baru || jsonb_build_object('stok', new.stok), auth.uid());
    return new;
  end if;

  -- ubah: simpan hanya kolom yang berubah. Perubahan stok saja (hasil catatan
  -- masuk/keluar) tidak dicatat di sini — sudah tercatat sebagai mutasi.
  v_lama := jsonb_build_object(
    'nama', old.nama, 'kategori', old.kategori, 'satuan', old.satuan,
    'stok_minimum', old.stok_minimum, 'keterangan', old.keterangan, 'foto_path', old.foto_path
  );
  foreach k in array array['nama', 'kategori', 'satuan', 'stok_minimum', 'keterangan', 'foto_path'] loop
    if v_lama -> k is distinct from v_baru -> k then
      v_sebelum := v_sebelum || jsonb_build_object(k, v_lama -> k);
      v_sesudah := v_sesudah || jsonb_build_object(k, v_baru -> k);
    end if;
  end loop;
  if v_sesudah = '{}'::jsonb then
    return new;
  end if;
  insert into inventaris_log (aksi, barang_id, nama_barang, sebelum, sesudah, user_id)
  values ('barang_ubah', new.id, new.nama, v_sebelum, v_sesudah, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_inventaris_log_barang on inventaris_barang;
create trigger trg_inventaris_log_barang
  after insert or update on inventaris_barang
  for each row execute function _inventaris_log_barang();

create or replace function _inventaris_log_mutasi() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_nama text;
  v_satuan text;
  v_id_barang uuid := case when tg_op = 'DELETE' then old.barang_id else new.barang_id end;
  v_lama jsonb;
  v_baru jsonb;
  v_sebelum jsonb := '{}'::jsonb;
  v_sesudah jsonb := '{}'::jsonb;
  k text;
begin
  select nama, satuan into v_nama, v_satuan from inventaris_barang where id = v_id_barang;
  -- barang ikut terhapus permanen (cascade) → tidak ada yang perlu dicatat
  if v_nama is null then
    return null;
  end if;

  if tg_op <> 'INSERT' then
    v_lama := jsonb_build_object(
      'jenis', old.jenis, 'jumlah', old.jumlah, 'tanggal', old.tanggal,
      'pihak', old.pihak, 'keterangan', old.keterangan
    );
  end if;
  if tg_op <> 'DELETE' then
    v_baru := jsonb_build_object(
      'jenis', new.jenis, 'jumlah', new.jumlah, 'tanggal', new.tanggal,
      'pihak', new.pihak, 'keterangan', new.keterangan
    );
  end if;

  if tg_op = 'INSERT' then
    insert into inventaris_log (aksi, barang_id, mutasi_id, nama_barang, jenis, sesudah, user_id)
    values ('mutasi_tambah', new.barang_id, new.id, v_nama, new.jenis,
            v_baru || jsonb_build_object('satuan', v_satuan), auth.uid());
  elsif tg_op = 'DELETE' then
    insert into inventaris_log (aksi, barang_id, mutasi_id, nama_barang, jenis, sebelum, user_id)
    values ('mutasi_hapus', old.barang_id, old.id, v_nama, old.jenis,
            v_lama || jsonb_build_object('satuan', v_satuan), auth.uid());
  else
    foreach k in array array['jenis', 'jumlah', 'tanggal', 'pihak', 'keterangan'] loop
      if v_lama -> k is distinct from v_baru -> k then
        v_sebelum := v_sebelum || jsonb_build_object(k, v_lama -> k);
        v_sesudah := v_sesudah || jsonb_build_object(k, v_baru -> k);
      end if;
    end loop;
    if v_sesudah <> '{}'::jsonb then
      insert into inventaris_log (aksi, barang_id, mutasi_id, nama_barang, jenis, sebelum, sesudah, user_id)
      values ('mutasi_ubah', new.barang_id, new.id, v_nama, new.jenis,
              v_sebelum || jsonb_build_object('satuan', v_satuan),
              v_sesudah || jsonb_build_object('satuan', v_satuan), auth.uid());
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_inventaris_log_mutasi on inventaris_mutasi;
create trigger trg_inventaris_log_mutasi
  after insert or update or delete on inventaris_mutasi
  for each row execute function _inventaris_log_mutasi();

-- ---------------------------------------------------------
-- Stok = jumlah masuk − keluar. Dihitung ulang setiap ada perubahan catatan,
-- dan saldo berjalan (urut tanggal) tidak boleh minus di titik mana pun —
-- mis. mencatat keluar tanggal 3 padahal barangnya baru masuk tanggal 5.
-- ---------------------------------------------------------

create or replace function _inventaris_hitung_stok(p_barang uuid, p_pesan text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_min integer;
begin
  select coalesce(sum(delta), 0), min(saldo)
    into v_total, v_min
  from (
    select case when jenis = 'masuk' then jumlah else -jumlah end as delta,
           sum(case when jenis = 'masuk' then jumlah else -jumlah end)
             over (order by tanggal, urut) as saldo
    from inventaris_mutasi
    where barang_id = p_barang
  ) x;

  if coalesce(v_min, 0) < 0 then
    raise exception '%', coalesce(p_pesan, 'Stok jadi minus.');
  end if;

  update inventaris_barang set stok = v_total where id = p_barang and stok <> v_total;
  return v_total;
end;
$$;

-- ---------------------------------------------------------
-- RPC: barang
-- ---------------------------------------------------------

create or replace function inventaris_simpan_barang(
  p_id uuid,
  p_nama text,
  p_kategori text,
  p_satuan text,
  p_stok_minimum integer,
  p_keterangan text,
  p_foto_path text,
  p_stok_awal integer default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_lama inventaris_barang%rowtype;
  v_nama text := regexp_replace(btrim(coalesce(p_nama, '')), '\s+', ' ', 'g');
  v_kategori text := nullif(regexp_replace(btrim(coalesce(p_kategori, '')), '\s+', ' ', 'g'), '');
  v_satuan text := coalesce(nullif(regexp_replace(btrim(coalesce(p_satuan, '')), '\s+', ' ', 'g'), ''), 'pcs');
  v_ket text := nullif(btrim(coalesce(p_keterangan, '')), '');
  v_foto text := nullif(btrim(coalesce(p_foto_path, '')), '');
  v_min integer := coalesce(p_stok_minimum, 0);
  v_awal integer := coalesce(p_stok_awal, 0);
begin
  if not bisa_inventaris() then
    raise exception 'Divisi kamu belum diberi akses Inventaris.';
  end if;
  if length(v_nama) < 2 or length(v_nama) > 80 then
    raise exception 'Nama barang 2–80 huruf.';
  end if;
  if length(v_kategori) > 40 then
    raise exception 'Nama kategori maksimal 40 huruf.';
  end if;
  if length(v_satuan) > 20 then
    raise exception 'Satuan maksimal 20 huruf.';
  end if;
  if length(v_ket) > 500 then
    raise exception 'Keterangan maksimal 500 huruf.';
  end if;
  if v_min < 0 or v_min > 1000000 then
    raise exception 'Batas stok menipis tidak valid.';
  end if;
  if v_awal < 0 or v_awal > 1000000 then
    raise exception 'Stok awal tidak valid.';
  end if;

  if v_id is not null then
    select * into v_lama from inventaris_barang where id = v_id for update;
    if not found or v_lama.dihapus_at is not null then
      raise exception 'Barang tidak ditemukan atau sudah dihapus.';
    end if;
  end if;

  -- foto baru harus benar-benar sudah terunggah ke bucket inventaris
  if v_foto is not null and v_foto is distinct from v_lama.foto_path then
    if v_foto like '%..%' or not exists (
      select 1 from storage.objects where bucket_id = 'inventaris_foto' and name = v_foto
    ) then
      raise exception 'Foto barang tidak ditemukan. Pilih ulang fotonya.';
    end if;
  end if;

  if exists (
    select 1 from inventaris_barang
    where lower(nama) = lower(v_nama) and dihapus_at is null and id is distinct from v_id
  ) then
    raise exception 'Sudah ada barang bernama "%". Pakai nama lain atau buka barang itu.', v_nama;
  end if;

  if v_id is null then
    insert into inventaris_barang (nama, kategori, satuan, stok_minimum, keterangan, foto_path, dibuat_oleh)
    values (v_nama, v_kategori, v_satuan, v_min, v_ket, v_foto, auth.uid())
    returning id into v_id;

    if v_awal > 0 then
      insert into inventaris_mutasi (barang_id, jenis, jumlah, tanggal, keterangan, user_id)
      values (v_id, 'masuk', v_awal, tanggal_kantor(now()), 'Stok awal', auth.uid());
      perform _inventaris_hitung_stok(v_id, null);
    end if;
  else
    update inventaris_barang
      set nama = v_nama,
          kategori = v_kategori,
          satuan = v_satuan,
          stok_minimum = v_min,
          keterangan = v_ket,
          foto_path = v_foto,
          diubah_at = now()
      where id = v_id;
  end if;

  return v_id;
end;
$$;

-- hapus = disembunyikan (riwayat & log tetap ada, bisa dipulihkan)
create or replace function inventaris_hapus_barang(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not bisa_inventaris() then
    raise exception 'Divisi kamu belum diberi akses Inventaris.';
  end if;
  update inventaris_barang set dihapus_at = now() where id = p_id and dihapus_at is null;
  if not found then
    raise exception 'Barang tidak ditemukan atau sudah dihapus.';
  end if;
end;
$$;

create or replace function inventaris_pulihkan_barang(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_barang inventaris_barang%rowtype;
begin
  if not bisa_inventaris() then
    raise exception 'Divisi kamu belum diberi akses Inventaris.';
  end if;
  select * into v_barang from inventaris_barang where id = p_id for update;
  if not found then
    raise exception 'Barang tidak ditemukan.';
  end if;
  if v_barang.dihapus_at is null then
    return;
  end if;
  if exists (
    select 1 from inventaris_barang
    where lower(nama) = lower(v_barang.nama) and dihapus_at is null and id <> p_id
  ) then
    raise exception 'Sudah ada barang lain bernama "%". Ganti dulu nama barang itu.', v_barang.nama;
  end if;
  update inventaris_barang set dihapus_at = null, diubah_at = now() where id = p_id;
end;
$$;

-- ---------------------------------------------------------
-- RPC: catatan masuk / keluar
-- Siapa pun yang punya akses boleh mencatat; mengubah/menghapus catatan
-- hanya pencatatnya sendiri atau admin.
-- ---------------------------------------------------------

create or replace function inventaris_simpan_mutasi(
  p_id uuid,
  p_barang_id uuid,
  p_jenis text,
  p_jumlah integer,
  p_tanggal date,
  p_pihak text,
  p_keterangan text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_barang_id uuid := p_barang_id;
  v_lama inventaris_mutasi%rowtype;
  v_barang inventaris_barang%rowtype;
  v_hari_ini date := tanggal_kantor(now());
  v_pihak text := nullif(regexp_replace(btrim(coalesce(p_pihak, '')), '\s+', ' ', 'g'), '');
  v_ket text := nullif(btrim(coalesce(p_keterangan, '')), '');
  v_tersedia integer;
begin
  if not bisa_inventaris() then
    raise exception 'Divisi kamu belum diberi akses Inventaris.';
  end if;
  if p_jenis is null or p_jenis not in ('masuk', 'keluar') then
    raise exception 'Pilih barang masuk atau keluar.';
  end if;
  if p_jumlah is null or p_jumlah < 1 or p_jumlah > 1000000 then
    raise exception 'Jumlah minimal 1.';
  end if;
  if p_tanggal is null or p_tanggal > v_hari_ini then
    raise exception 'Tanggal tidak boleh melewati hari ini.';
  end if;
  if p_tanggal < v_hari_ini - 366 then
    raise exception 'Tanggal paling lama setahun ke belakang.';
  end if;
  if length(v_pihak) > 100 then
    raise exception 'Kolom untuk/dari maksimal 100 huruf.';
  end if;
  if length(v_ket) > 500 then
    raise exception 'Keterangan maksimal 500 huruf.';
  end if;

  if v_id is not null then
    select * into v_lama from inventaris_mutasi where id = v_id for update;
    if not found then
      raise exception 'Catatan tidak ditemukan. Mungkin sudah dihapus.';
    end if;
    if v_lama.user_id is distinct from auth.uid() and not is_admin() then
      raise exception 'Hanya pencatat atau admin yang bisa mengubah catatan ini.';
    end if;
    v_barang_id := v_lama.barang_id; -- catatan tidak bisa dipindah ke barang lain
  end if;

  select * into v_barang from inventaris_barang where id = v_barang_id for update;
  if not found or v_barang.dihapus_at is not null then
    raise exception 'Barang tidak ditemukan atau sudah dihapus.';
  end if;

  -- pesan yang jelas untuk kasus paling umum: keluar melebihi sisa stok
  if p_jenis = 'keluar' then
    v_tersedia := v_barang.stok + case
      when v_lama.id is null then 0
      when v_lama.jenis = 'keluar' then v_lama.jumlah
      else -v_lama.jumlah
    end;
    if p_jumlah > v_tersedia then
      raise exception 'Stok tidak cukup. Sisa % %.', greatest(v_tersedia, 0), v_barang.satuan;
    end if;
  end if;

  if v_id is null then
    insert into inventaris_mutasi (barang_id, jenis, jumlah, tanggal, pihak, keterangan, user_id)
    values (v_barang_id, p_jenis, p_jumlah, p_tanggal, v_pihak, v_ket, auth.uid())
    returning id into v_id;
  else
    update inventaris_mutasi
      set jenis = p_jenis,
          jumlah = p_jumlah,
          tanggal = p_tanggal,
          pihak = v_pihak,
          keterangan = v_ket,
          diubah_at = now(),
          diubah_oleh = auth.uid()
      where id = v_id;
  end if;

  perform _inventaris_hitung_stok(
    v_barang_id,
    'Stok tidak cukup pada tanggal itu — barangnya belum ada sebanyak itu. Cek lagi tanggal atau jumlahnya.'
  );
  return v_id;
end;
$$;

create or replace function inventaris_hapus_mutasi(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lama inventaris_mutasi%rowtype;
  v_barang inventaris_barang%rowtype;
begin
  if not bisa_inventaris() then
    raise exception 'Divisi kamu belum diberi akses Inventaris.';
  end if;
  select * into v_lama from inventaris_mutasi where id = p_id for update;
  if not found then
    raise exception 'Catatan tidak ditemukan. Mungkin sudah dihapus.';
  end if;
  if v_lama.user_id is distinct from auth.uid() and not is_admin() then
    raise exception 'Hanya pencatat atau admin yang bisa menghapus catatan ini.';
  end if;
  select * into v_barang from inventaris_barang where id = v_lama.barang_id for update;
  if v_barang.dihapus_at is not null then
    raise exception 'Barangnya sudah dihapus. Pulihkan barangnya dulu.';
  end if;

  delete from inventaris_mutasi where id = p_id;
  perform _inventaris_hitung_stok(
    v_lama.barang_id,
    'Catatan ini tidak bisa dihapus: sebagian barangnya sudah tercatat keluar, stok jadi minus.'
  );
end;
$$;

revoke execute on function _inventaris_hitung_stok(uuid, text) from public, anon, authenticated;
revoke execute on function _inventaris_log_barang() from public, anon, authenticated;
revoke execute on function _inventaris_log_mutasi() from public, anon, authenticated;
revoke execute on function inventaris_simpan_barang(uuid, text, text, text, integer, text, text, integer) from public, anon;
revoke execute on function inventaris_hapus_barang(uuid) from public, anon;
revoke execute on function inventaris_pulihkan_barang(uuid) from public, anon;
revoke execute on function inventaris_simpan_mutasi(uuid, uuid, text, integer, date, text, text) from public, anon;
revoke execute on function inventaris_hapus_mutasi(uuid) from public, anon;
grant execute on function inventaris_simpan_barang(uuid, text, text, text, integer, text, text, integer) to authenticated;
grant execute on function inventaris_hapus_barang(uuid) to authenticated;
grant execute on function inventaris_pulihkan_barang(uuid) to authenticated;
grant execute on function inventaris_simpan_mutasi(uuid, uuid, text, integer, date, text, text) to authenticated;
grant execute on function inventaris_hapus_mutasi(uuid) to authenticated;

-- ---------------------------------------------------------
-- Foto barang
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inventaris_foto', 'inventaris_foto', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists inventaris_foto_insert on storage.objects;
drop policy if exists inventaris_foto_select on storage.objects;

-- unggah hanya ke folder sendiri & hanya yang punya akses Inventaris
create policy inventaris_foto_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'inventaris_foto'
    and (storage.foldername(name))[1] = auth.uid()::text
    and bisa_inventaris()
  );

create policy inventaris_foto_select on storage.objects
  for select to authenticated
  using (bucket_id = 'inventaris_foto' and bisa_inventaris());
