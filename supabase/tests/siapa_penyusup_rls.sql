-- =========================================================
-- Uji keamanan "Siapa Penyusup?" — jalankan MANUAL di Supabase SQL Editor
-- setelah migrasi 0032. Tidak mengubah data: semuanya di dalam transaksi yang
-- di-rollback di akhir. Butuh minimal 2 profil aktif.
--
-- Hasil: kalau ada yang bocor, skrip berhenti dengan pesan "GAGAL: ...".
-- Kalau semua aman, muncul NOTICE "OK: ..." untuk tiap bagian.
-- =========================================================

begin;

-- ---------- data uji (sebagai pemilik database) ----------
select set_config('uji.a', (select id::text from profiles where aktif order by created_at, id limit 1), true);
select set_config('uji.b', (select id::text from profiles where aktif order by created_at, id offset 1 limit 1), true);
select set_config('uji.room', gen_random_uuid()::text, true);

insert into penyusup_room (id, kode, host_id, mode, privat, status, game_ke)
values (current_setting('uji.room')::uuid, 'UJ' || substr(md5(random()::text), 1, 3), current_setting('uji.a')::uuid,
        'antar_divisi', true, 'petunjuk', 1);
insert into penyusup_pemain (room_id, user_id, avatar) values
  (current_setting('uji.room')::uuid, current_setting('uji.a')::uuid, 0),
  (current_setting('uji.room')::uuid, current_setting('uji.b')::uuid, 1);
insert into penyusup_rahasia (room_id, kata_pemandu, kata_penyusup, penyusup_ids)
values (current_setting('uji.room')::uuid, 'Gudeg', 'Opor Ayam', array[current_setting('uji.b')::uuid]);
insert into penyusup_kartu (room_id, user_id, game_ke, kata) values
  (current_setting('uji.room')::uuid, current_setting('uji.a')::uuid, 1, 'Gudeg'),
  (current_setting('uji.room')::uuid, current_setting('uji.b')::uuid, 1, 'Opor Ayam');
insert into penyusup_vote (room_id, game_ke, ronde, voter_id, target_id) values
  (current_setting('uji.room')::uuid, 1, 1, current_setting('uji.a')::uuid, current_setting('uji.b')::uuid),
  (current_setting('uji.room')::uuid, 1, 1, current_setting('uji.b')::uuid, current_setting('uji.a')::uuid);

-- ---------- sebagai pemain A ----------
-- (dua setelan: versi lama auth.uid() membaca claim.sub, versi baru membaca claims)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('uji.a'), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub', current_setting('uji.a'), true);
set local role authenticated;

do $$
declare
  v_room uuid := current_setting('uji.room')::uuid;
  n int;
begin
  if auth.uid() is distinct from current_setting('uji.a')::uuid then raise exception 'GAGAL: simulasi login A tidak jalan'; end if;

  select count(*) into n from penyusup_kartu where room_id = v_room;
  if n <> 1 then raise exception 'GAGAL: A melihat % kartu (harus 1, miliknya sendiri)', n; end if;
  if exists (select 1 from penyusup_kartu where user_id <> auth.uid()) then raise exception 'GAGAL: kartu pemain lain terbaca'; end if;

  if exists (select 1 from penyusup_rahasia) then raise exception 'GAGAL: penyusup_rahasia terbaca klien'; end if;
  if exists (select 1 from penyusup_pasangan) then raise exception 'GAGAL: bank kata terbaca klien'; end if;
  if exists (select 1 from penyusup_kata_terlarang) then raise exception 'GAGAL: daftar kata terlarang terbaca klien'; end if;
  if exists (select 1 from penyusup_gabung_gagal) then raise exception 'GAGAL: catatan gabung gagal terbaca klien'; end if;

  select count(*) into n from penyusup_vote where room_id = v_room;
  if n <> 1 then raise exception 'GAGAL: A melihat % vote (harus 1, miliknya sendiri)', n; end if;

  if not exists (select 1 from penyusup_room where id = v_room) then raise exception 'GAGAL: anggota tidak bisa melihat room-nya'; end if;
  if exists (select 1 from penyusup_room r where r.id = v_room and to_jsonb(r)::text ~* '(gudeg|opor)') then
    raise exception 'GAGAL: baris penyusup_room memuat kata rahasia';
  end if;
  if exists (select 1 from penyusup_pemain p where p.room_id = v_room and to_jsonb(p)::text ~* '(gudeg|opor|penyusup|pemandu)') then
    raise exception 'GAGAL: baris penyusup_pemain memuat kata/peran';
  end if;

  -- klien tidak bisa menulis langsung ke tabel
  begin
    insert into penyusup_log (room_id, jenis) values (v_room, 'palsu');
    raise exception 'GAGAL: klien bisa insert langsung ke penyusup_log';
  exception when insufficient_privilege then null;
  end;
  update penyusup_room set host_id = auth.uid(), status = 'selesai' where id = v_room;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'GAGAL: klien bisa update penyusup_room langsung'; end if;
  update penyusup_pemain set skor = 9999 where room_id = v_room;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'GAGAL: klien bisa update penyusup_pemain langsung'; end if;

  -- fungsi internal tidak boleh dipanggil klien
  begin
    perform _penyusup_maju(v_room);
    raise exception 'GAGAL: klien bisa memanggil _penyusup_maju';
  exception when insufficient_privilege then null;
  end;

  raise notice 'OK: pemain A hanya melihat kartu & vote miliknya; data rahasia tertutup; tulis langsung ditolak';
end $$;

-- ---------- sebagai user lain yang bukan anggota ----------
reset role;
select set_config('uji.c', gen_random_uuid()::text, true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('uji.c'), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub', current_setting('uji.c'), true);
set local role authenticated;

do $$
declare
  v_room uuid := current_setting('uji.room')::uuid;
begin
  if exists (select 1 from penyusup_room where id = v_room) then raise exception 'GAGAL: room privat terlihat oleh non-anggota'; end if;
  if exists (select 1 from penyusup_pemain where room_id = v_room) then raise exception 'GAGAL: pemain room privat terlihat oleh non-anggota'; end if;
  if exists (select 1 from penyusup_kartu where room_id = v_room) then raise exception 'GAGAL: kartu terlihat oleh non-anggota'; end if;
  raise notice 'OK: non-anggota tidak melihat room privat, pemain, maupun kartu';
end $$;

reset role;
rollback;
