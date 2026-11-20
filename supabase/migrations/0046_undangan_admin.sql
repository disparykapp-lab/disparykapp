-- =========================================================
-- DisparYK — 0046: Pendaftaran admin lewat link undangan
-- Jalankan setelah 0045.
--
-- Admin membuat link sekali pakai di Kelola > Pegawai > Tambah > tab "Admin",
-- lalu membagikannya. Orang yang membuka link cukup masuk dengan akun Google
-- (Gmail) — tanpa tanggal lahir, asal sekolah, tanggal magang, foto, atau
-- persetujuan lagi — dan akunnya langsung dibuat sebagai admin aktif.
--
--   undangan_admin       — satu baris per link (kode acak 32 heksa).
--   buat_undangan_admin  — admin membuat link (berlaku 7 hari).
--   batal_undangan_admin — admin membatalkan link yang belum dipakai.
--   cek_undangan_admin   — status link (boleh tanpa login, untuk halaman /daftar-admin).
--   daftar_admin         — pendaftar yang sudah login Google memakai link-nya.
--
-- Link mati setelah satu pendaftaran berhasil, dibatalkan, lewat 7 hari, atau
-- kalau admin pembuatnya sudah bukan admin aktif lagi. Email yang sudah punya
-- akun tidak bisa memakai link ini (ubah perannya lewat Kelola Pegawai), dan
-- link-nya tetap utuh untuk orang yang dituju.
-- =========================================================

create table if not exists undangan_admin (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- untuk siapa link ini (opsional, membantu admin melacak)
  catatan text check (catatan is null or length(catatan) between 1 and 100),
  dibuat_oleh uuid references profiles(id) on delete set null,
  dibuat_at timestamptz not null default now(),
  berlaku_sampai timestamptz not null default now() + interval '7 days',
  dipakai_oleh uuid references profiles(id) on delete set null,
  dipakai_email text,
  dipakai_at timestamptz,
  dibatalkan_at timestamptz
);
create index if not exists idx_undangan_admin_dibuat on undangan_admin (dibuat_at desc);

alter table undangan_admin enable row level security;

-- hanya admin yang bisa melihat daftar link; tulis hanya lewat RPC di bawah
drop policy if exists undangan_admin_select on undangan_admin;
create policy undangan_admin_select on undangan_admin for select to authenticated using (is_admin());

-- ---------------------------------------------------------
-- Status satu link (dipakai cek_undangan_admin & daftar_admin)
-- ---------------------------------------------------------

create or replace function _status_undangan_admin(u undangan_admin) returns text
language sql stable security definer set search_path = public as $$
  select case
    when u.id is null then 'tidak_ada'
    when u.dibatalkan_at is not null then 'dibatalkan'
    when u.dipakai_at is not null then 'dipakai'
    when not exists (
      select 1 from profiles p where p.id = u.dibuat_oleh and p.role = 'admin' and p.aktif
    ) then 'tidak_berlaku'
    when u.berlaku_sampai <= now() then 'kedaluwarsa'
    else 'berlaku'
  end;
$$;

-- ---------------------------------------------------------
-- RPC admin
-- ---------------------------------------------------------

create or replace function buat_undangan_admin(p_catatan text) returns undangan_admin
language plpgsql security definer set search_path = public as $$
declare
  v_catatan text := nullif(regexp_replace(btrim(coalesce(p_catatan, '')), '\s+', ' ', 'g'), '');
  v_baris undangan_admin;
begin
  if not is_admin() then
    raise exception 'Hanya admin yang bisa membuat link pendaftaran admin.';
  end if;
  if length(v_catatan) > 100 then
    raise exception 'Catatan maksimal 100 huruf.';
  end if;
  insert into undangan_admin (catatan, dibuat_oleh)
  values (v_catatan, auth.uid())
  returning * into v_baris;
  return v_baris;
end;
$$;

create or replace function batal_undangan_admin(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Hanya admin yang bisa membatalkan link.';
  end if;
  update undangan_admin
    set dibatalkan_at = now()
    where id = p_id and dipakai_at is null and dibatalkan_at is null;
  if not found then
    raise exception 'Link ini sudah dipakai atau sudah dibatalkan.';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- Halaman /daftar-admin/:kode
-- ---------------------------------------------------------

-- Boleh dipanggil tanpa login: hanya status + nama pengundang, tanpa data lain.
create or replace function cek_undangan_admin(p_kode text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_baris undangan_admin;
  v_pembuat text;
begin
  if p_kode is null or p_kode !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('status', 'tidak_ada');
  end if;
  select * into v_baris from undangan_admin where kode = p_kode;
  if not found then
    return jsonb_build_object('status', 'tidak_ada');
  end if;
  select nama into v_pembuat from profiles where id = v_baris.dibuat_oleh;
  return jsonb_build_object(
    'status', _status_undangan_admin(v_baris),
    'pembuat', v_pembuat,
    'berlaku_sampai', v_baris.berlaku_sampai,
    -- pemakainya sendiri yang membuka lagi link-nya → tampilkan "berhasil", bukan "sudah dipakai"
    'dipakai_saya', v_baris.dipakai_oleh is not null and v_baris.dipakai_oleh = auth.uid()
  );
end;
$$;

create or replace function daftar_admin(p_kode text, p_nama text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_nama text := regexp_replace(btrim(coalesce(p_nama, '')), '\s+', ' ', 'g');
  v_baris undangan_admin;
  v_status text;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Masuk dengan akun Google dulu.';
  end if;
  if p_kode is null or p_kode !~ '^[0-9a-f]{32}$' then
    raise exception 'Link pendaftaran tidak dikenal. Minta link baru ke admin.';
  end if;

  -- kunci baris: dua orang yang menekan bersamaan tidak bisa sama-sama memakai link
  select * into v_baris from undangan_admin where kode = p_kode for update;
  if not found then
    raise exception 'Link pendaftaran tidak dikenal. Minta link baru ke admin.';
  end if;
  if v_baris.dipakai_oleh = v_uid then
    return; -- sudah terdaftar lewat link ini (mis. tombol ditekan dua kali)
  end if;

  v_status := _status_undangan_admin(v_baris);
  if v_status = 'dibatalkan' then
    raise exception 'Link ini sudah dibatalkan admin. Minta link baru.';
  elsif v_status = 'dipakai' then
    raise exception 'Link ini sudah dipakai untuk mendaftar. Satu link hanya berlaku sekali — minta link baru.';
  elsif v_status = 'tidak_berlaku' then
    raise exception 'Link ini tidak berlaku lagi karena pembuatnya sudah bukan admin. Minta link baru.';
  elsif v_status = 'kedaluwarsa' then
    raise exception 'Link ini sudah kedaluwarsa. Minta link baru ke admin.';
  end if;

  if exists (select 1 from profiles where id = v_uid or lower(email) = v_email) then
    raise exception 'Email % sudah terdaftar di DisparYK. Untuk menjadikannya admin, minta admin mengubah perannya di Kelola Pegawai.', v_email;
  end if;
  if length(v_nama) < 2 or length(v_nama) > 100 then
    raise exception 'Nama harus 2–100 huruf.';
  end if;

  insert into profiles (id, nama, email, role, aktif)
  values (v_uid, v_nama, v_email, 'admin', true);

  update undangan_admin
    set dipakai_oleh = v_uid, dipakai_email = v_email, dipakai_at = now()
    where id = v_baris.id;
end;
$$;

revoke execute on function _status_undangan_admin(undangan_admin) from public, anon, authenticated;
revoke execute on function buat_undangan_admin(text) from public, anon;
revoke execute on function batal_undangan_admin(uuid) from public, anon;
revoke execute on function daftar_admin(text, text) from public, anon;
grant execute on function buat_undangan_admin(text) to authenticated;
grant execute on function batal_undangan_admin(uuid) to authenticated;
grant execute on function daftar_admin(text, text) to authenticated;
grant execute on function cek_undangan_admin(text) to anon, authenticated;
