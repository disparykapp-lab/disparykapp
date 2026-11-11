-- =========================================================
-- DisparYK — 0043: Izin/Sakit beberapa hari sekaligus (rentang tanggal)
-- Jalankan setelah 0042.
--
-- Pegawai memilih tanggal mulai–selesai sekali saja (seperti memilih tanggal tiket);
-- setiap hari kerja (Senin–Jumat) di rentang itu otomatis tercatat izin di tabel
-- absensi, termasuk hari-hari yang akan datang — tidak perlu mengisi izin tiap hari.
--
--   izin_pegawai     — satu baris per pengajuan (rentang, keterangan, bukti).
--   absensi.izin_id  — hari izin milik pengajuan mana.
--   simpan_izin()    — buat / ubah pengajuan (rentang bisa diperpendek/diperpanjang).
--   batal_izin()     — batalkan pengajuan; hari izinnya dihapus.
--
-- Kalau ternyata masuk kerja di hari izin: Absen Masuk seperti biasa. absen_masuk()
-- (0002) memang sudah menimpa baris izin yang belum punya jam masuk; trigger di bawah
-- melepas hari itu dari izin (keterangan & bukti izin dikosongkan), jadi statusnya
-- murni hadir/telat. Hari izin lain di rentang yang sama tetap izin.
-- =========================================================

create table if not exists izin_pegawai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mulai date not null,
  selesai date not null,
  catatan text not null check (length(btrim(catatan)) between 3 and 500),
  bukti_url text,
  dibuat_at timestamptz not null default now(),
  diubah_at timestamptz not null default now(),
  constraint izin_pegawai_rentang check (selesai >= mulai and selesai - mulai < 30)
);
create index if not exists idx_izin_pegawai_user on izin_pegawai(user_id, mulai);
alter table izin_pegawai enable row level security;

-- baca: pemilik & admin; tulis hanya lewat simpan_izin() / batal_izin()
drop policy if exists izin_pegawai_select on izin_pegawai;
create policy izin_pegawai_select on izin_pegawai for select to authenticated
  using (user_id = auth.uid() or is_admin());

alter table absensi add column if not exists izin_id uuid references izin_pegawai(id) on delete set null;
create index if not exists idx_absensi_izin on absensi(izin_id) where izin_id is not null;

-- ---------------------------------------------------------
-- Buat / ubah pengajuan izin
-- ---------------------------------------------------------

create or replace function simpan_izin(
  p_id uuid,
  p_mulai date,
  p_selesai date,
  p_catatan text,
  p_bukti_url text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_hari_ini date := tanggal_kantor(now());
  v_id uuid := p_id;
  v_catatan text := btrim(coalesce(p_catatan, ''));
  v_bukti text := nullif(btrim(coalesce(p_bukti_url, '')), '');
  v_lain izin_pegawai%rowtype;
  v_hari date;
begin
  if v_user is null then raise exception 'Belum login'; end if;
  if not exists (select 1 from profiles where id = v_user and aktif) then raise exception 'Akun tidak aktif'; end if;
  if length(v_catatan) < 3 then raise exception 'Isi keterangan dulu (minimal 3 huruf).'; end if;
  if length(v_catatan) > 500 then raise exception 'Keterangan maksimal 500 huruf.'; end if;
  if p_mulai is null or p_selesai is null or p_selesai < p_mulai then
    raise exception 'Pilih tanggal mulai dan selesai izin.';
  end if;
  if p_selesai - p_mulai >= 30 then raise exception 'Izin paling lama 30 hari sekali pengajuan.'; end if;
  if p_mulai < v_hari_ini - 60 then raise exception 'Tanggal izin paling lama 60 hari ke belakang.'; end if;
  if p_selesai > v_hari_ini + 60 then raise exception 'Tanggal izin paling jauh 60 hari ke depan.'; end if;
  if not exists (
    select 1 from generate_series(p_mulai, p_selesai, interval '1 day') g where extract(isodow from g) < 6
  ) then
    raise exception 'Tanggal yang dipilih hanya Sabtu/Minggu — tidak ada hari kerja yang perlu izin.';
  end if;

  -- satu pengajuan diproses bergantian per pegawai (cek tumpang-tindih tidak balapan)
  perform pg_advisory_xact_lock(hashtext('izin_pegawai:' || v_user::text));

  if v_id is not null then
    perform 1 from izin_pegawai where id = v_id and user_id = v_user for update;
    if not found then raise exception 'Izin tidak ditemukan.'; end if;
  end if;

  select * into v_lain from izin_pegawai
  where user_id = v_user and id is distinct from v_id and mulai <= p_selesai and selesai >= p_mulai
  order by mulai
  limit 1;
  if found then
    raise exception 'Sebagian tanggal sudah ada di izin lain (% – %). Ubah izin itu saja.',
      to_char(v_lain.mulai, 'DD/MM/YYYY'), to_char(v_lain.selesai, 'DD/MM/YYYY');
  end if;

  if v_id is null then
    insert into izin_pegawai (user_id, mulai, selesai, catatan, bukti_url)
    values (v_user, p_mulai, p_selesai, v_catatan, v_bukti)
    returning id into v_id;
  else
    update izin_pegawai
    set mulai = p_mulai, selesai = p_selesai, catatan = v_catatan, bukti_url = v_bukti, diubah_at = now()
    where id = v_id;
    -- hari yang keluar dari rentang baru (dan belum dipakai absen) tidak izin lagi
    delete from absensi
    where izin_id = v_id and masuk_at is null and status = 'izin'
      and (tanggal < p_mulai or tanggal > p_selesai);
  end if;

  -- tiap hari kerja di rentang: buat baris izin; hari yang sudah absen tidak disentuh,
  -- izin satu hari versi lama (tanpa izin_id) di tanggal itu diambil alih
  for v_hari in
    select g::date from generate_series(p_mulai, p_selesai, interval '1 day') g where extract(isodow from g) < 6
  loop
    insert into absensi (user_id, tanggal, status, catatan_klarifikasi, bukti_url, izin_id)
    values (v_user, v_hari, 'izin', v_catatan, v_bukti, v_id)
    on conflict (user_id, tanggal) do update
      set catatan_klarifikasi = excluded.catatan_klarifikasi,
          bukti_url = excluded.bukti_url,
          izin_id = excluded.izin_id,
          updated_at = now()
      where absensi.masuk_at is null and absensi.status = 'izin';
  end loop;

  return v_id;
end;
$$;

-- ---------------------------------------------------------
-- Batalkan pengajuan izin
-- ---------------------------------------------------------

create or replace function batal_izin(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Belum login'; end if;
  if not exists (select 1 from profiles where id = v_user and aktif) then raise exception 'Akun tidak aktif'; end if;
  perform 1 from izin_pegawai where id = p_id and user_id = v_user for update;
  if not found then raise exception 'Izin tidak ditemukan.'; end if;
  delete from absensi where izin_id = p_id and masuk_at is null and status = 'izin';
  delete from izin_pegawai where id = p_id;
end;
$$;

-- ---------------------------------------------------------
-- Absen di hari izin: hari itu lepas dari izin
-- ---------------------------------------------------------

-- Hanya saat pegawai sendiri absen masuk (absen_masuk mengisi masuk_at di baris izin).
-- Perubahan oleh super admin (super_admin_set_absensi) tidak disentuh.
create or replace function lepas_izin_saat_absen() returns trigger
language plpgsql as $$
begin
  if old.status = 'izin' and old.masuk_at is null and new.masuk_at is not null
     and new.user_id = auth.uid() then
    new.izin_id := null;
    new.catatan_klarifikasi := null;
    new.bukti_url := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lepas_izin_saat_absen on absensi;
create trigger trg_lepas_izin_saat_absen
  before update on absensi
  for each row execute function lepas_izin_saat_absen();
