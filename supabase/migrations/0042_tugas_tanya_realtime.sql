-- =========================================================
-- DisparYK — 0042: Tanya-jawab tugas tampil langsung (Realtime / websocket)
-- Jalankan setelah 0041.
--
-- Pesan baru di tugas_tanya dikirim ke aplikasi lewat Supabase Realtime
-- (postgres_changes), jadi pegawai & admin tidak perlu memuat ulang halaman.
-- Realtime tetap memakai RLS tugas_tanya_select (0041): pegawai hanya menerima
-- pesan di percakapannya sendiri, admin menerima semua.
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publikasi supabase_realtime tidak ada; aktifkan Realtime di dashboard.';
    return;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tugas_tanya'
  ) then
    alter publication supabase_realtime add table public.tugas_tanya;
  end if;
end $$;
