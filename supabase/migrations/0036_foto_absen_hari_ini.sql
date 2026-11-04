-- =========================================================
-- DisparYK — 0036: Pegawai bisa melihat foto absennya sendiri, hanya hari itu
-- Jalankan setelah 0001-0035 (cukup setelah 0003).
--
-- Foto masuk/pulang hari ini tampil di kartu "Status Hari Ini" di Beranda.
-- Sebelumnya policy absensi_foto_select (0003) membolehkan pemilik membuka
-- SEMUA fotonya. Sekarang pemilik hanya bisa membuka (membuat signed URL) foto
-- yang diunggah hari ini menurut zona waktu kantor (pengaturan.timezone).
-- Mulai pukul 00.00 besoknya fotonya tidak bisa dibuka lagi oleh pemiliknya.
--
-- File TIDAK dihapus: admin tetap bisa melihat di Tinjau/Foto Absensi sampai
-- retensi foto habis (pengaturan.retensi_foto_hari).
--
-- Tanggal foto diambil dari storage.objects.created_at (diisi server saat
-- unggah), bukan dari nama folder yang ditentukan aplikasi.
-- =========================================================

create or replace function tanggal_kantor(p_waktu timestamptz) returns date
language sql stable set search_path = public as $$
  select (p_waktu at time zone coalesce((select timezone from pengaturan where id = 1), 'Asia/Jakarta'))::date;
$$;

drop policy if exists absensi_foto_select on storage.objects;
create policy absensi_foto_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'absensi'
    and (
      is_admin()
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and tanggal_kantor(created_at) = tanggal_kantor(now())
      )
    )
  );
