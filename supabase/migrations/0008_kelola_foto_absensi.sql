-- =========================================================
-- DisparYK — 0008: Admin bisa hapus foto absen manual
-- Jalankan setelah 0001-0007.
--
-- Menghapus foto lewat SQL langsung diblokir Supabase (lihat catatan
-- di 0007). Cara yang benar untuk hapus manual dari aplikasi: pakai
-- Storage API resmi lewat client SDK
-- (`supabase.storage.from('absensi').remove([path])`), yang tetap
-- tunduk pada RLS storage.objects seperti biasa — makanya perlu
-- policy DELETE baru di bawah ini (sebelumnya cuma ada INSERT/SELECT).
-- =========================================================

create policy absensi_foto_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'absensi' and is_admin());

-- RPC: setelah file foto berhasil dihapus lewat Storage API, kosongkan
-- juga referensinya di baris absensi (penulisan ke absensi tetap
-- hanya lewat RPC, konsisten dengan tabel lain).
create or replace function hapus_foto_absensi(p_id uuid, p_jenis text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Hanya admin yang bisa menghapus foto absensi';
  end if;

  if p_jenis = 'masuk' then
    update absensi set masuk_foto_path = null where id = p_id;
  elsif p_jenis = 'keluar' then
    update absensi set keluar_foto_path = null where id = p_id;
  else
    raise exception 'Jenis foto tidak dikenal';
  end if;

  if not found then
    raise exception 'Data absensi tidak ditemukan';
  end if;
end;
$$;
