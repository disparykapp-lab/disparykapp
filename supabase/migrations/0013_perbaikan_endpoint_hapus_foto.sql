-- Perbaikan bug di 0007: endpoint yang dipanggil untuk hapus foto lama salah
-- bentuk. POST ke '/storage/v1/object/remove/{bucket}' BUKAN endpoint yang
-- valid di Storage API — segmen "remove" malah dibaca sebagai nama bucket,
-- sehingga selalu gagal dengan "Bucket not found" walau auth (Vault secret)
-- sudah benar. Endpoint yang benar: HTTP DELETE ke '/storage/v1/object/{bucket}'
-- dengan body {"prefixes": [...]} — persis yang dipakai storage-js .remove().

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
    -- Belum diatur lewat vault.create_secret — lewati saja.
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

  perform net.http_delete(
    url := v_url || '/storage/v1/object/absensi',
    body := jsonb_build_object('prefixes', to_jsonb(v_paths)),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key,
      'Content-Type', 'application/json'
    )
  );
end;
$$;
