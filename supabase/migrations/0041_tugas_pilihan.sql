-- =========================================================
-- DisparYK — 0041: Pilihan tambahan untuk Tugas dari Admin
-- Jalankan setelah 0040.
--
-- Saklar baru di form tugas (semua boleh dimatikan):
--   perlu_cek   — "Selesai" dari pegawai jadi "diperiksa"; admin Setujui (→ selesai)
--                 atau Minta revisi (→ revisi + catatan_admin) lewat periksa_tugas().
--   mendesak    — tugas ditandai penting: paling atas & tampil di Beranda pegawai.
--   kuota       — tugas sukarela: pegawai sasaran menekan "Ambil tugas" (ambil_tugas),
--                 siapa cepat dia dapat sampai kuota terisi. Baris progres untuk tugas
--                 berkuota hanya bisa dibuat lewat RPC itu.
--   wajib_baca  — pegawai menekan "Sudah saya baca" (tabel tugas_dibaca).
--   langkah     — daftar langkah [{id, teks}]; centangan pegawai di
--                 tugas_progres.langkah_selesai (id langkah).
--   arsip_hari  — tugas tersembunyi dari pegawai N hari setelah deadline lewat.
--   ingatkan    — kartu pengingat di Beranda kalau deadline < 24 jam & belum selesai.
--   tanya_jawab — pegawai bisa bertanya, admin menjawab (tabel tugas_tanya, per pegawai).
--   disematkan_at — pin dari admin: tugas tetap paling atas (sematan terbaru dulu) di
--                 daftar admin & pegawai; null = tidak disematkan. Hanya admin yang bisa
--                 mengubahnya (policy update tugas 0020: admin saja).
-- =========================================================

alter table tugas
  add column if not exists perlu_cek boolean not null default false,
  add column if not exists mendesak boolean not null default false,
  add column if not exists kuota int,
  add column if not exists kuota_terisi int not null default 0,
  add column if not exists wajib_baca boolean not null default false,
  add column if not exists langkah jsonb not null default '[]'::jsonb,
  add column if not exists arsip_hari int,
  add column if not exists ingatkan boolean not null default true,
  add column if not exists tanya_jawab boolean not null default true,
  add column if not exists disematkan_at timestamptz;

alter table tugas drop constraint if exists tugas_kuota_valid;
alter table tugas add constraint tugas_kuota_valid check (kuota is null or kuota between 1 and 500);
alter table tugas drop constraint if exists tugas_arsip_valid;
alter table tugas add constraint tugas_arsip_valid check (arsip_hari is null or arsip_hari between 1 and 365);

alter table tugas_progres
  add column if not exists langkah_selesai text[] not null default '{}',
  add column if not exists catatan_admin text,
  add column if not exists diperiksa_at timestamptz;

alter table tugas_progres drop constraint if exists tugas_progres_status_check;
alter table tugas_progres add constraint tugas_progres_status_check
  check (status in ('belum', 'selesai', 'kendala', 'diperiksa', 'revisi'));

-- ---------------------------------------------------------
-- Validasi daftar langkah
-- ---------------------------------------------------------

create or replace function cek_langkah_tugas() returns trigger
language plpgsql as $$
declare
  x jsonb;
begin
  if jsonb_typeof(new.langkah) <> 'array' then raise exception 'Daftar langkah tidak valid.'; end if;
  if jsonb_array_length(new.langkah) > 30 then raise exception 'Maksimal 30 langkah per tugas.'; end if;
  for x in select value from jsonb_array_elements(new.langkah) loop
    if jsonb_typeof(x) <> 'object' or coalesce(x ->> 'id', '') !~ '^[a-z0-9]{1,20}$'
       or length(btrim(coalesce(x ->> 'teks', ''))) not between 1 and 300 then
      raise exception 'Setiap langkah harus berisi teks (maks. 300 huruf).';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_cek_langkah_tugas on tugas;
create trigger trg_cek_langkah_tugas
  before insert or update of langkah on tugas
  for each row execute function cek_langkah_tugas();

-- ---------------------------------------------------------
-- Status progres pegawai: alur "perlu dicek admin"
-- ---------------------------------------------------------

-- Pegawai tidak bisa menyetujui tugasnya sendiri: kalau tugas perlu dicek, status
-- "selesai" yang baru dipilih berubah jadi "diperiksa"; "revisi" dan catatan admin
-- hanya dari admin (periksa_tugas).
create or replace function atur_status_progres() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_perlu_cek boolean;
  v_berubah boolean := tg_op = 'INSERT' or new.status is distinct from old.status;
begin
  if is_admin() then return new; end if;
  select perlu_cek into v_perlu_cek from tugas where id = new.tugas_id;
  if v_berubah then
    if new.status = 'revisi' then raise exception 'Status revisi hanya bisa diberikan admin.'; end if;
    if coalesce(v_perlu_cek, false) and new.status = 'selesai' then new.status := 'diperiksa'; end if;
    if not coalesce(v_perlu_cek, false) and new.status = 'diperiksa' then new.status := 'selesai'; end if;
  end if;
  if tg_op = 'INSERT' then
    new.catatan_admin := null;
    new.diperiksa_at := null;
  else
    new.catatan_admin := old.catatan_admin;
    new.diperiksa_at := old.diperiksa_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_atur_status_progres on tugas_progres;
create trigger trg_atur_status_progres
  before insert or update on tugas_progres
  for each row execute function atur_status_progres();

create or replace function periksa_tugas(p_tugas uuid, p_user uuid, p_setuju boolean, p_catatan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Hanya admin yang bisa memeriksa tugas.'; end if;
  if not p_setuju and length(btrim(coalesce(p_catatan, ''))) = 0 then
    raise exception 'Tulis apa yang perlu direvisi.';
  end if;
  update tugas_progres
  set status = case when p_setuju then 'selesai' else 'revisi' end,
      catatan_admin = nullif(btrim(coalesce(p_catatan, '')), ''),
      diperiksa_at = now()
  where tugas_id = p_tugas and user_id = p_user;
  if not found then raise exception 'Progres pegawai ini tidak ditemukan.'; end if;
end;
$$;

-- ---------------------------------------------------------
-- Kuota sukarela
-- ---------------------------------------------------------

-- tugas berkuota: progres hanya lewat ambil_tugas (supaya kuota tidak terlewati)
drop policy if exists tugas_progres_insert on tugas_progres;
create policy tugas_progres_insert on tugas_progres for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from tugas t where t.id = tugas_id and t.aktif and t.kuota is null and tugas_untuk_saya(t))
  );

create or replace function ambil_tugas(p_tugas uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t tugas%rowtype;
begin
  if auth.uid() is null then raise exception 'Belum login.'; end if;
  select * into t from tugas where id = p_tugas for update;
  if not found or not t.aktif or (t.mulai_at is not null and t.mulai_at > now()) or not tugas_untuk_saya(t) then
    raise exception 'Tugas tidak ditemukan.';
  end if;
  if t.kuota is null then raise exception 'Tugas ini bukan tugas sukarela.'; end if;
  if exists (select 1 from tugas_progres where tugas_id = p_tugas and user_id = auth.uid()) then return; end if;
  if t.kuota_terisi >= t.kuota then raise exception 'Kuota tugas ini sudah penuh.'; end if;
  insert into tugas_progres (tugas_id, user_id, status) values (p_tugas, auth.uid(), 'belum');
  update tugas set kuota_terisi = kuota_terisi + 1 where id = p_tugas;
end;
$$;

-- batal ambil: hanya selama belum dikerjakan (status belum, tanpa lampiran)
create or replace function lepas_tugas(p_tugas uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p tugas_progres%rowtype;
begin
  perform 1 from tugas where id = p_tugas for update;
  select * into p from tugas_progres where tugas_id = p_tugas and user_id = auth.uid();
  if not found then return; end if;
  if p.status <> 'belum' or jsonb_array_length(p.lampiran) > 0 then
    raise exception 'Tugas yang sudah dikerjakan tidak bisa dilepas.';
  end if;
  delete from tugas_progres where tugas_id = p_tugas and user_id = auth.uid();
  update tugas set kuota_terisi = greatest(kuota_terisi - 1, 0) where id = p_tugas;
end;
$$;

-- ---------------------------------------------------------
-- Arsip otomatis: tersembunyi dari pegawai N hari setelah deadline
-- ---------------------------------------------------------

drop policy if exists tugas_select on tugas;
create policy tugas_select on tugas for select to authenticated
  using (
    is_admin()
    or (
      aktif
      and (mulai_at is null or mulai_at <= now())
      and tugas_untuk_saya(tugas)
      and (arsip_hari is null or deadline_at is null or deadline_at + make_interval(days => arsip_hari) > now())
    )
  );

-- ---------------------------------------------------------
-- Konfirmasi dibaca
-- ---------------------------------------------------------

create table if not exists tugas_dibaca (
  tugas_id uuid not null references tugas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  dibaca_at timestamptz not null default now(),
  primary key (tugas_id, user_id)
);
alter table tugas_dibaca enable row level security;

drop policy if exists tugas_dibaca_select on tugas_dibaca;
drop policy if exists tugas_dibaca_insert on tugas_dibaca;
create policy tugas_dibaca_select on tugas_dibaca for select to authenticated
  using (is_admin() or user_id = auth.uid());
create policy tugas_dibaca_insert on tugas_dibaca for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from tugas t where t.id = tugas_id and t.aktif and tugas_untuk_saya(t))
  );

-- ---------------------------------------------------------
-- Tanya-jawab per tugas (satu percakapan per pegawai, terlihat pegawai itu & admin)
-- ---------------------------------------------------------

create table if not exists tugas_tanya (
  id bigserial primary key,
  tugas_id uuid not null references tugas(id) on delete cascade,
  -- pemilik percakapan (pegawai yang bertanya)
  user_id uuid not null references profiles(id) on delete cascade,
  pengirim_id uuid references profiles(id) on delete set null,
  isi text not null check (length(btrim(isi)) between 1 and 1000),
  dibuat_at timestamptz not null default now()
);
create index if not exists idx_tugas_tanya on tugas_tanya(tugas_id, user_id, dibuat_at);
alter table tugas_tanya enable row level security;

-- pengirim selalu akun yang login (tidak bisa dipalsukan dari aplikasi)
create or replace function isi_pengirim_tanya() returns trigger
language plpgsql as $$
begin
  new.pengirim_id := auth.uid();
  new.dibuat_at := now();
  return new;
end;
$$;
drop trigger if exists trg_isi_pengirim_tanya on tugas_tanya;
create trigger trg_isi_pengirim_tanya before insert on tugas_tanya
  for each row execute function isi_pengirim_tanya();

drop policy if exists tugas_tanya_select on tugas_tanya;
drop policy if exists tugas_tanya_insert on tugas_tanya;
create policy tugas_tanya_select on tugas_tanya for select to authenticated
  using (is_admin() or user_id = auth.uid());
create policy tugas_tanya_insert on tugas_tanya for insert to authenticated
  with check (
    is_admin()
    or (
      user_id = auth.uid()
      and exists (select 1 from tugas t where t.id = tugas_id and t.aktif and t.tanya_jawab and tugas_untuk_saya(t))
    )
  );
