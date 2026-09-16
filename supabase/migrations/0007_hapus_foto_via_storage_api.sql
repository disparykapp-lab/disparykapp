-- =========================================================
-- DisparYK — 0007: Perbaiki pembersihan foto (pakai Storage API)
-- Jalankan setelah 0001-0006.
--
-- MASALAH: bersihkan_foto_lama() versi lama (0005) menghapus baris
-- storage.objects lewat SQL biasa. Supabase MEMBLOKIR ini secara
-- sengaja lewat trigger storage.protect_delete() — error:
-- "Direct deletion from storage tables is not allowed. Use the
-- Storage API instead." Akibatnya fungsi ini gagal SETIAP KALI
-- dijalankan cron, dan karena satu fungsi = satu transaksi, bahkan
-- langkah "kosongkan masuk_foto_path/keluar_foto_path" ikut batal
-- (rollback) juga. Jadi sebelum migrasi ini, foto TIDAK PERNAH
-- benar-benar dibersihkan otomatis.
--
-- PERBAIKAN: panggil Storage API (endpoint resmi untuk hapus file)
-- lewat extension pg_net, bukan DELETE FROM storage.objects.
--
-- ==> LANGKAH MANUAL WAJIB SETELAH MENJALANKAN FILE INI (jangan
-- simpan service_role key di file migrasi/git — isi langsung di SQL
-- Editor Supabase, sekali saja):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY_DARI_SETTINGS_API>', 'service_role_key');
--
-- (Settings > API > Project URL & service_role key — yang secret,
-- BUKAN anon key). Tanpa dua secret ini, bersihkan_foto_lama() akan
-- diam-diam tidak melakukan apa-apa (aman, tidak error) sampai
-- diisi.
-- =========================================================

create extension if not exists pg_net with schema extensions;

create or replace function bersihkan_foto_lama() returns void
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  v_hari int;
  v_batas timestamptz;
  v_url text;
  v_key text;
  v_paths text[];
begin
  select coalesce(retensi_foto_hari, 3) into v_hari from pengaturan where id = 1;
  v_batas := now() - (v_hari || ' days')::interval;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_key is null then
    -- Belum diatur lewat vault.create_secret (lihat catatan di atas file ini) — lewati saja.
    return;
  end if;

  select array_agg(name) into v_paths
    from storage.objects
    where bucket_id = 'absensi' and created_at < v_batas;

  if v_paths is null or array_length(v_paths, 1) = 0 then
    return;
  end if;

  -- Kosongkan referensi foto di absensi dulu supaya aplikasi berhenti
  -- mencoba menampilkannya, baru minta Storage API menghapus filenya.
  update absensi set masuk_foto_path = null where masuk_foto_path = any(v_paths);
  update absensi set keluar_foto_path = null where keluar_foto_path = any(v_paths);

  perform net.http_post(
    url := v_url || '/storage/v1/object/remove/absensi',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('prefixes', to_jsonb(v_paths))
  );
end;
$$;
