-- =========================================================
-- DisparYK — 0006: Perbaikan klarifikasi untuk hari TIDAK ABSEN
-- Jalankan setelah 0001-0005.
--
-- Masalah: kirim_klarifikasi_absensi() versi lama hanya bisa
-- meng-UPDATE baris absensi yang SUDAH ADA. Padahal kasus paling
-- umum (sakit/izin) justru terjadi pada hari pegawai TIDAK absen
-- sama sekali — belum ada barisnya. Versi baru ini meng-INSERT baris
-- baru berstatus 'izin' kalau belum ada, atau hanya menambahkan
-- keterangan+bukti tanpa mengubah status kalau barisnya sudah ada
-- (mis. hari itu pegawai sempat absen dinas luar lalu ingin menambah
-- catatan).
-- =========================================================

-- Tambahkan 'izin' ke daftar status yang diperbolehkan (cari nama
-- constraint check yang sesungguhnya, supaya tidak bergantung pada
-- nama otomatis yang mungkin berbeda).
do $$
declare
  v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'absensi'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%hadir%';

  if v_conname is not null then
    execute format('alter table absensi drop constraint %I', v_conname);
  end if;
end $$;

alter table absensi
  add constraint absensi_status_check check (status in ('hadir', 'telat', 'dinas_luar', 'izin'));

create or replace function kirim_klarifikasi_absensi(
  p_tanggal date,
  p_catatan text,
  p_bukti_url text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Belum login';
  end if;

  if not exists (select 1 from profiles where id = v_user and aktif) then
    raise exception 'Akun tidak aktif';
  end if;

  if p_catatan is null or length(btrim(p_catatan)) < 3 then
    raise exception 'Isi keterangan dulu (minimal 3 huruf).';
  end if;

  if p_tanggal > (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Tidak bisa memberi keterangan untuk tanggal di masa depan.';
  end if;

  insert into absensi (user_id, tanggal, status, catatan_klarifikasi, bukti_url)
  values (
    v_user, p_tanggal, 'izin',
    btrim(p_catatan), nullif(btrim(coalesce(p_bukti_url, '')), '')
  )
  on conflict (user_id, tanggal) do update
    set catatan_klarifikasi = excluded.catatan_klarifikasi,
        bukti_url = excluded.bukti_url,
        updated_at = now();
end;
$$;
