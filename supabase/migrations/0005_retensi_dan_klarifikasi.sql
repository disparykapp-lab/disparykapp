-- =========================================================
-- DisparYK — 0005: Retensi data otomatis, tanda manual admin,
-- dan klarifikasi + bukti dari pegawai
-- Jalankan setelah 0001-0004.
--
-- CATATAN PENTING soal penghapusan foto:
-- Fungsi bersihkan_foto_lama() menghapus baris di storage.objects
-- lewat SQL biasa. Ini membuat foto langsung TIDAK BISA diakses lagi
-- lewat aplikasi (signed URL gagal dibuat), yang secara fungsional
-- sudah "menghilangkan" foto tersebut dari sisi pengguna. Tapi ini
-- TIDAK menjamin byte file-nya langsung terhapus dari backend
-- penyimpanan Supabase (idealnya lewat Storage API, bukan SQL
-- langsung) — untuk skala pemakaian kantor kecil dengan foto JPEG
-- kompres, ini cukup memadai dan jauh lebih sederhana daripada
-- memanggil Storage API dari dalam database.
-- =========================================================

-- ---------------------------------------------------------
-- Kolom baru
-- ---------------------------------------------------------

alter table pengaturan
  add column if not exists retensi_foto_hari int not null default 3,
  add column if not exists retensi_absensi_bulan int not null default 3;

alter table absensi
  add column if not exists catatan_klarifikasi text,
  add column if not exists bukti_url text;

-- ---------------------------------------------------------
-- Fungsi pembersihan otomatis
-- ---------------------------------------------------------

create or replace function bersihkan_foto_lama() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hari int;
  v_batas timestamptz;
begin
  select coalesce(retensi_foto_hari, 3) into v_hari from pengaturan where id = 1;
  v_batas := now() - (v_hari || ' days')::interval;

  update absensi
    set masuk_foto_path = null
    where masuk_foto_path is not null and created_at < v_batas;

  update absensi
    set keluar_foto_path = null
    where keluar_foto_path is not null and created_at < v_batas;

  delete from storage.objects
    where bucket_id = 'absensi' and created_at < v_batas;
end;
$$;

create or replace function bersihkan_absensi_lama() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_bulan int;
begin
  select coalesce(retensi_absensi_bulan, 3) into v_bulan from pengaturan where id = 1;

  delete from absensi
    where tanggal < (current_date - (v_bulan || ' months')::interval);
end;
$$;

-- ---------------------------------------------------------
-- Jadwalkan lewat pg_cron (jalan tiap hari jam 01:00 & 01:10 UTC,
-- sekitar 08:00 & 08:10 WIB). Aktifkan dulu extension-nya kalau
-- belum: Database > Extensions > cari "pg_cron" > Enable.
-- ---------------------------------------------------------

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'bersihkan-foto-lama',
  '0 1 * * *',
  $$select bersihkan_foto_lama();$$
) where not exists (select 1 from cron.job where jobname = 'bersihkan-foto-lama');

select cron.schedule(
  'bersihkan-absensi-lama',
  '10 1 * * *',
  $$select bersihkan_absensi_lama();$$
) where not exists (select 1 from cron.job where jobname = 'bersihkan-absensi-lama');

-- ---------------------------------------------------------
-- RPC: admin menandai/membatalkan tanda pada satu baris absensi
-- ---------------------------------------------------------

create or replace function tandai_absensi(p_id uuid, p_ditandai boolean, p_alasan text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Hanya admin yang bisa menandai absensi';
  end if;

  update absensi
    set ditandai = p_ditandai,
        alasan_tanda = case when p_ditandai then nullif(btrim(coalesce(p_alasan, '')), '') else null end
    where id = p_id;

  if not found then
    raise exception 'Data absensi tidak ditemukan';
  end if;
end;
$$;

-- ---------------------------------------------------------
-- RPC: pegawai mengirim keterangan + link bukti untuk absen
-- miliknya sendiri pada tanggal tertentu (mis. surat sakit di
-- Google Drive)
-- ---------------------------------------------------------

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

  if p_catatan is null or length(btrim(p_catatan)) < 3 then
    raise exception 'Isi keterangan dulu (minimal 3 huruf).';
  end if;

  update absensi
    set catatan_klarifikasi = btrim(p_catatan),
        bukti_url = nullif(btrim(coalesce(p_bukti_url, '')), '')
    where user_id = v_user and tanggal = p_tanggal;

  if not found then
    raise exception 'Data absen tidak ditemukan untuk tanggal ini.';
  end if;
end;
$$;
