-- =========================================================
-- DisparYK — 0038: Siapa Penyusup — host bisa mengubah pengaturan room di lobi
-- Jalankan setelah 0034.
--
-- Setelah "Main Lagi" (atau sebelum game pertama), host bisa mengganti mode,
-- kategori kata, jumlah penyusup, waktu tiap fase, dan aturan lain tanpa
-- membuat room baru. Validasinya sama dengan penyusup_buat_room (0034), plus:
--   - hanya host, hanya saat status 'menunggu' (di lobi);
--   - pindah ke Satu Divisi ditolak kalau ada pemain dari divisi lain.
-- Pemain lain mendapat kabar lewat penyusup_log jenis 'pengaturan'.
-- =========================================================

create or replace function penyusup_ubah_pengaturan(
  p_room uuid,
  p_mode text,
  p_kategori text,
  p_jumlah_penyusup int,
  p_waktu_petunjuk int,
  p_waktu_diskusi int,
  p_waktu_voting int,
  p_penyusup_tahu boolean,
  p_tebakan_terakhir boolean,
  p_privat boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r penyusup_room%rowtype;
  v_divisi uuid;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id <> v_user then raise exception 'Hanya host yang bisa mengubah pengaturan.'; end if;
  if r.status <> 'menunggu' then raise exception 'Pengaturan hanya bisa diubah di lobi, sebelum game dimulai.'; end if;

  if p_mode is null or p_mode not in ('satu_divisi', 'antar_divisi') then raise exception 'Mode room tidak dikenal.'; end if;
  if p_kategori is not null and not exists (select 1 from penyusup_kategori where id = p_kategori and aktif) then
    raise exception 'Kategori kata tidak dikenal.';
  end if;
  if p_jumlah_penyusup is null or p_jumlah_penyusup not between 0 and 3 then raise exception 'Jumlah penyusup harus otomatis atau 1-3.'; end if;
  if p_waktu_petunjuk is null or p_waktu_petunjuk not between 15 and 60 then raise exception 'Waktu petunjuk harus 15-60 detik.'; end if;
  if p_waktu_diskusi is null or p_waktu_diskusi not between 30 and 180 then raise exception 'Waktu diskusi harus 30-180 detik.'; end if;
  if p_waktu_voting is null or p_waktu_voting not between 15 and 60 then raise exception 'Waktu voting harus 15-60 detik.'; end if;

  if p_mode = 'satu_divisi' then
    select divisi_id into v_divisi from profiles where id = v_user;
    if v_divisi is null then
      raise exception 'Kamu belum punya divisi, jadi room tidak bisa dijadikan Satu Divisi.';
    end if;
    if exists (select 1 from penyusup_pemain where room_id = p_room and aktif and divisi_id is distinct from v_divisi) then
      raise exception 'Ada pemain dari divisi lain di room ini, jadi tidak bisa diubah ke Satu Divisi.';
    end if;
  end if;

  update penyusup_room set
    mode = p_mode,
    divisi_id = case when p_mode = 'satu_divisi' then v_divisi end,
    privat = coalesce(p_privat, true),
    kategori_id = p_kategori,
    jumlah_penyusup = p_jumlah_penyusup,
    waktu_petunjuk = p_waktu_petunjuk,
    waktu_diskusi = p_waktu_diskusi,
    waktu_voting = p_waktu_voting,
    penyusup_tahu = coalesce(p_penyusup_tahu, false),
    tebakan_terakhir = coalesce(p_tebakan_terakhir, false),
    diperbarui_at = now()
  where id = p_room;

  insert into penyusup_log (room_id, jenis, user_id) values (p_room, 'pengaturan', v_user);
end;
$$;
