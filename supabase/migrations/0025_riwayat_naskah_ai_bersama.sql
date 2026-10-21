-- =========================================================
-- DisparYK — 0025: Riwayat Naskah AI jadi bersama + super admin bisa hapus
-- Jalankan setelah 0001-0024.
--
-- Sebelumnya (0024): tiap pegawai cuma lihat riwayat naskahnya sendiri,
-- admin lihat semua. Sekarang riwayatnya BERSAMA — siapa pun yang login
-- bisa lihat semua naskah yang pernah dibuat (sama seperti profiles/divisi/
-- konten yang juga bisa dibaca semua pengguna login di skema ini), supaya
-- satu tim bisa saling lihat & pakai naskah yang sudah dibuat rekannya.
--
-- Penghapusan tetap dibatasi: cuma super admin yang bisa menghapus baris
-- riwayat siapa saja, lewat RPC super_admin_hapus_naskah_ai (tercatat ke
-- log_super_admin, sama seperti super_admin_hapus_absensi).
-- =========================================================

drop policy if exists naskah_ai_select on naskah_ai;
create policy naskah_ai_select on naskah_ai for select to authenticated using (true);

create or replace function super_admin_hapus_naskah_ai(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row naskah_ai%rowtype;
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa menghapus riwayat naskah AI.';
  end if;

  select * into v_row from naskah_ai where id = p_id;
  if not found then
    raise exception 'Riwayat naskah tidak ditemukan.';
  end if;

  delete from naskah_ai where id = p_id;

  insert into log_super_admin (oleh_user_id, aksi, detail)
  values (auth.uid(), 'hapus_naskah_ai', to_jsonb(v_row));
end;
$$;
