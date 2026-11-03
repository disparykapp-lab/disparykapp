-- =========================================================
-- DisparYK — 0033: Siapa Penyusup — mesin permainan, voting, skor
-- Jalankan setelah 0032. Butuh game_normal() & game_jarak() dari 0028.
--
-- Alur satu game:
--   menunggu --host mulai--> bagikan (25 dtk, atau semua pemain online "hafal")
--   -> petunjuk  (bergiliran, waktu_petunjuk per pemain; habis = "(lewat)")
--   -> diskusi   (waktu_diskusi, atau host mempercepat)
--   -> voting    (waktu_voting, atau semua pemain online sudah vote)
--   -> hasil_vote (8 dtk) [-> tebakan_terakhir (15 dtk) kalau aktif & yang
--      tersingkir penyusup]
--   -> cek menang: selesai, atau petunjuk ronde berikutnya (maks 6 ronde;
--      lewat dari itu penyusup menang karena berhasil berbaur).
-- Semua transisi lewat _penyusup_maju() yang dipicu penyusup_detak() dan RPC,
-- jadi permainan tetap jalan walau ada pemain yang menutup tab.
--
-- Skor ditulis sekaligus saat game selesai: kalau skor bertambah per ronde
-- (mis. +30 untuk vote yang tepat), pemain bisa menebak siapa penyusupnya.
-- Pemain yang keluar sebelum game selesai tidak mendapat poin.
-- =========================================================

-- ronde voting yang sudah dilewati dalam keadaan masih hidup (+50/ronde untuk penyusup)
alter table penyusup_pemain add column if not exists ronde_selamat int not null default 0;

-- ---------------------------------------------------------
-- Fungsi internal
-- ---------------------------------------------------------

-- 'pemandu' = semua penyusup tersingkir; 'penyusup' = penyusup hidup >= pemandu hidup;
-- null = permainan berlanjut.
create or replace function _penyusup_cek_menang(p_room uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when h.penyusup = 0 then 'pemandu' when h.penyusup >= h.pemandu then 'penyusup' end
  from (
    select
      count(*) filter (where p.user_id = any (s.penyusup_ids)) as penyusup,
      count(*) filter (where not (p.user_id = any (s.penyusup_ids))) as pemandu
    from penyusup_rahasia s
    left join penyusup_pemain p on p.room_id = s.room_id and p.aktif and p.hidup
    where s.room_id = p_room
  ) h;
$$;

create or replace function _penyusup_selesai(p_room uuid, p_pemenang text, p_alasan text, p_penebak_benar uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  s penyusup_rahasia%rowtype;
begin
  select * into r from penyusup_room where id = p_room;
  select * into s from penyusup_rahasia where room_id = p_room;

  with peserta as (
    select k.user_id, p.divisi_id, p.hidup, p.aktif, p.ronde_selamat,
           case when k.user_id = any (s.penyusup_ids) then 'penyusup' else 'pemandu' end as peran
    from penyusup_kartu k
    join penyusup_pemain p on p.room_id = k.room_id and p.user_id = k.user_id
    where k.room_id = p_room and k.game_ke = r.game_ke
  ),
  vote_tepat as (
    select v.voter_id, count(*) as n
    from penyusup_vote v
    where v.room_id = p_room and v.game_ke = r.game_ke and v.target_id = any (s.penyusup_ids)
    group by v.voter_id
  )
  insert into penyusup_skor (room_id, game_ke, user_id, divisi_id, mode, peran, menang, poin)
  select p_room, r.game_ke, ps.user_id, ps.divisi_id, r.mode, ps.peran,
    ps.aktif and ps.peran = p_pemenang,
    case
      when not ps.aktif then 0
      when ps.peran = 'pemandu' then
        case when p_pemenang = 'pemandu' then 100 + case when ps.hidup then 50 else 0 end else 0 end
        + 30 * coalesce(vt.n, 0)
      else
        case when p_pemenang = 'penyusup' then 300 else 0 end
        + 50 * ps.ronde_selamat
        + case when ps.user_id = p_penebak_benar then 200 else 0 end
    end
  from peserta ps
  left join vote_tepat vt on vt.voter_id = ps.user_id;

  update penyusup_pemain p set skor = p.skor + k.poin
  from penyusup_skor k
  where k.room_id = p_room and k.game_ke = r.game_ke and p.room_id = p_room and p.user_id = k.user_id;

  update penyusup_room set
    status = 'selesai',
    giliran_user_id = null,
    fase_mulai = now(),
    fase_berakhir = null,
    diperbarui_at = now(),
    akhir = jsonb_build_object(
      'pemenang', p_pemenang,
      'alasan', p_alasan,
      'kata_pemandu', s.kata_pemandu,
      'kata_penyusup', s.kata_penyusup,
      'penyusup_ids', to_jsonb(s.penyusup_ids),
      'penebak_benar', p_penebak_benar,
      'skor', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', k.user_id, 'divisi_id', k.divisi_id, 'peran', k.peran, 'menang', k.menang, 'poin', k.poin
        ) order by k.poin desc), '[]'::jsonb)
        from penyusup_skor k where k.room_id = p_room and k.game_ke = r.game_ke
      ),
      'skor_divisi', case when r.mode = 'antar_divisi' then (
        select coalesce(jsonb_agg(jsonb_build_object('divisi_id', x.divisi_id, 'poin', x.poin) order by x.poin desc), '[]'::jsonb)
        from (
          select k.divisi_id, sum(k.poin) as poin from penyusup_skor k
          where k.room_id = p_room and k.game_ke = r.game_ke and k.divisi_id is not null
          group by k.divisi_id
        ) x
      ) else '[]'::jsonb end
    )
  where id = p_room;

  insert into penyusup_log (room_id, jenis, data)
  values (p_room, 'selesai', jsonb_build_object('game_ke', r.game_ke, 'pemenang', p_pemenang, 'alasan', p_alasan));
end;
$$;

-- Giliran petunjuk berikutnya. Pemain yang sudah tidak bermain dilewati diam-diam;
-- yang sedang offline dilewati dengan petunjuk "(lewat)". Habis -> diskusi.
create or replace function _penyusup_giliran_berikut(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_i int;
  v_total int;
  v_calon uuid;
begin
  select * into r from penyusup_room where id = p_room;
  v_total := coalesce(array_length(r.urutan, 1), 0);
  v_i := r.giliran_ke + 1;
  loop
    exit when v_i >= v_total;
    v_calon := r.urutan[v_i + 1];
    if exists (select 1 from penyusup_pemain where room_id = p_room and user_id = v_calon and aktif and hidup) then
      exit when penyusup_online(p_room, v_calon);
      insert into penyusup_petunjuk (room_id, game_ke, ronde, user_id, teks, lewat)
      values (p_room, r.game_ke, r.ronde, v_calon, '(lewat)', true);
    end if;
    v_i := v_i + 1;
  end loop;

  if v_i >= v_total then
    update penyusup_room set
      status = 'diskusi', giliran_ke = v_i, giliran_user_id = null,
      fase_mulai = now(), fase_berakhir = now() + make_interval(secs => r.waktu_diskusi), diperbarui_at = now()
    where id = p_room;
  else
    update penyusup_room set
      giliran_ke = v_i, giliran_user_id = v_calon,
      fase_mulai = now(), fase_berakhir = now() + make_interval(secs => r.waktu_petunjuk), diperbarui_at = now()
    where id = p_room;
  end if;
end;
$$;

-- Ronde baru: urutan giliran diacak dari pemain yang masih hidup.
create or replace function _penyusup_mulai_ronde(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
begin
  select * into r from penyusup_room where id = p_room;
  update penyusup_pemain set sudah_vote = false where room_id = p_room;
  update penyusup_room set
    status = 'petunjuk',
    urutan = array(select user_id from penyusup_pemain where room_id = p_room and aktif and hidup order by random()),
    giliran_ke = -1, giliran_user_id = null, hasil_vote = null, diperbarui_at = now()
  where id = p_room;
  insert into penyusup_log (room_id, jenis, data) values (p_room, 'ronde', jsonb_build_object('game_ke', r.game_ke, 'ronde', r.ronde));
  perform _penyusup_giliran_berikut(p_room);
end;
$$;

create or replace function _penyusup_mulai_voting(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update penyusup_pemain set sudah_vote = false where room_id = p_room;
  update penyusup_room set
    status = 'voting', giliran_user_id = null,
    fase_mulai = now(), fase_berakhir = now() + make_interval(secs => waktu_voting), diperbarui_at = now()
  where id = p_room;
end;
$$;

-- Hitung suara. Suara terbanyak tersingkir; seri di posisi teratas, atau suara
-- "lewati" >= suara terbanyak, berarti tidak ada yang tersingkir. Hanya suara
-- dari & untuk pemain yang masih bermain yang dihitung.
create or replace function _penyusup_hitung_vote(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  s penyusup_rahasia%rowtype;
  v_tally jsonb;
  v_lewati int;
  v_maks int;
  v_jumlah_maks int;
  v_target uuid;
  v_peran text;
begin
  select * into r from penyusup_room where id = p_room;
  select * into s from penyusup_rahasia where room_id = p_room;

  with sah as (
    select v.target_id
    from penyusup_vote v
    join penyusup_pemain pv on pv.room_id = v.room_id and pv.user_id = v.voter_id and pv.aktif and pv.hidup
    left join penyusup_pemain pt on pt.room_id = v.room_id and pt.user_id = v.target_id
    where v.room_id = p_room and v.game_ke = r.game_ke and v.ronde = r.ronde
      and (v.target_id is null or (pt.aktif and pt.hidup))
  )
  select
    coalesce((
      select jsonb_object_agg(t.target_id, t.n)
      from (select target_id, count(*) as n from sah where target_id is not null group by target_id) t
    ), '{}'::jsonb),
    (select count(*) from sah where target_id is null)
  into v_tally, v_lewati;

  select max(value::int) into v_maks from jsonb_each_text(v_tally);
  select count(*) into v_jumlah_maks from jsonb_each_text(v_tally) where value::int = v_maks;

  if v_maks is not null and v_maks > v_lewati and v_jumlah_maks = 1 then
    select key::uuid into v_target from jsonb_each_text(v_tally) where value::int = v_maks;
    v_peran := case when v_target = any (s.penyusup_ids) then 'penyusup' else 'pemandu' end;
    update penyusup_pemain set hidup = false where room_id = p_room and user_id = v_target;
  end if;

  update penyusup_pemain set ronde_selamat = ronde_selamat + 1 where room_id = p_room and aktif and hidup;

  update penyusup_room set
    status = 'hasil_vote',
    fase_mulai = now(),
    fase_berakhir = now() + interval '8 seconds',
    hasil_vote = jsonb_build_object(
      'ronde', r.ronde,
      'tally', v_tally,
      'lewati', v_lewati,
      'seri', v_target is null,
      'tersingkir_id', v_target,
      'peran', v_peran,
      -- kata hanya diungkap kalau yang tertangkap penyusup; kata pemandu tetap rahasia
      'kata', case when v_peran = 'penyusup' then s.kata_penyusup end
    ),
    diperbarui_at = now()
  where id = p_room;

  insert into penyusup_log (room_id, jenis, user_id, data)
  values (p_room, 'hasil_vote', v_target, jsonb_build_object('game_ke', r.game_ke, 'ronde', r.ronde, 'peran', v_peran));
end;
$$;

-- Setelah hasil vote / tebakan terakhir: selesai, atau ronde berikutnya.
create or replace function _penyusup_lanjut(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_pemenang text;
begin
  select * into r from penyusup_room where id = p_room;
  v_pemenang := _penyusup_cek_menang(p_room);
  if v_pemenang = 'pemandu' then
    perform _penyusup_selesai(p_room, 'pemandu', 'semua_tertangkap');
  elsif v_pemenang = 'penyusup' then
    perform _penyusup_selesai(p_room, 'penyusup', 'penyusup_seimbang');
  elsif r.ronde >= 6 then
    perform _penyusup_selesai(p_room, 'penyusup', 'batas_ronde');
  else
    update penyusup_room set ronde = ronde + 1 where id = p_room;
    perform _penyusup_mulai_ronde(p_room);
  end if;
end;
$$;

-- Memajukan state room. Aman dipanggil berkali-kali (idempoten).
-- Menggantikan versi 0032 (yang hanya merapikan pemain & host).
create or replace function _penyusup_maju(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_pemenang text;
  v_tersingkir uuid;
begin
  perform 1 from penyusup_room where id = p_room for update;
  if not found then return; end if;
  if not _penyusup_rapikan_pemain(p_room) then return; end if;

  select * into r from penyusup_room where id = p_room;
  if r.status in ('menunggu', 'selesai') then return; end if;

  -- pemain keluar / terputus bisa langsung menentukan pemenang
  if r.status in ('bagikan', 'petunjuk', 'diskusi', 'voting') then
    v_pemenang := _penyusup_cek_menang(p_room);
    if v_pemenang is not null then
      perform _penyusup_selesai(p_room, v_pemenang, 'pemain_keluar');
      return;
    end if;
  end if;

  if r.status = 'bagikan' then
    if now() >= r.fase_berakhir or not exists (
      select 1 from penyusup_pemain
      where room_id = p_room and aktif and hidup and not hafal and penyusup_online(p_room, user_id)
    ) then
      perform _penyusup_mulai_ronde(p_room);
    end if;

  elsif r.status = 'petunjuk' then
    if r.giliran_user_id is null or not exists (
      select 1 from penyusup_pemain where room_id = p_room and user_id = r.giliran_user_id and aktif and hidup
    ) then
      perform _penyusup_giliran_berikut(p_room);
    elsif now() >= r.fase_berakhir or not penyusup_online(p_room, r.giliran_user_id) then
      insert into penyusup_petunjuk (room_id, game_ke, ronde, user_id, teks, lewat)
      values (p_room, r.game_ke, r.ronde, r.giliran_user_id, '(lewat)', true);
      perform _penyusup_giliran_berikut(p_room);
    end if;

  elsif r.status = 'diskusi' then
    if now() >= r.fase_berakhir then
      perform _penyusup_mulai_voting(p_room);
    end if;

  elsif r.status = 'voting' then
    if now() >= r.fase_berakhir or not exists (
      select 1 from penyusup_pemain
      where room_id = p_room and aktif and hidup and not sudah_vote and penyusup_online(p_room, user_id)
    ) then
      perform _penyusup_hitung_vote(p_room);
    end if;

  elsif r.status = 'hasil_vote' then
    if now() >= r.fase_berakhir then
      v_tersingkir := (r.hasil_vote ->> 'tersingkir_id')::uuid;
      if r.tebakan_terakhir and r.hasil_vote ->> 'peran' = 'penyusup' and penyusup_online(p_room, v_tersingkir) then
        update penyusup_room set
          status = 'tebakan_terakhir', giliran_user_id = v_tersingkir,
          fase_mulai = now(), fase_berakhir = now() + interval '15 seconds', diperbarui_at = now()
        where id = p_room;
      else
        perform _penyusup_lanjut(p_room);
      end if;
    end if;

  elsif r.status = 'tebakan_terakhir' then
    if now() >= r.fase_berakhir or not penyusup_online(p_room, r.giliran_user_id) then
      perform _penyusup_lanjut(p_room);
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------
-- RPC untuk klien
-- ---------------------------------------------------------

create or replace function penyusup_mulai(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r penyusup_room%rowtype;
  v_user_offline uuid;
  v_pemain uuid[];
  v_jumlah int;
  v_jml_penyusup int;
  v_penyusup uuid[];
  v_terpakai bigint[];
  v_pas penyusup_pasangan%rowtype;
  v_kata_pemandu text;
  v_kata_penyusup text;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id is distinct from v_user then raise exception 'Hanya host yang bisa memulai permainan.'; end if;
  if r.status <> 'menunggu' then raise exception 'Permainan sudah berjalan.'; end if;

  update penyusup_kehadiran set terakhir_aktif = now() where room_id = p_room and user_id = v_user;
  perform _penyusup_rapikan_pemain(p_room);
  -- pemain yang sudah menutup tab sebelum mulai tidak diikutkan
  for v_user_offline in
    select user_id from penyusup_pemain where room_id = p_room and aktif and not penyusup_online(p_room, user_id)
  loop
    perform _penyusup_lepas_pemain(p_room, v_user_offline, 'keluar', jsonb_build_object('alasan', 'offline_saat_mulai'));
  end loop;

  v_pemain := array(select user_id from penyusup_pemain where room_id = p_room and aktif order by random());
  v_jumlah := coalesce(array_length(v_pemain, 1), 0);
  if v_jumlah < 4 then raise exception 'Minimal 4 pemain online untuk mulai.'; end if;

  v_jml_penyusup := case when r.jumlah_penyusup = 0 then case when v_jumlah >= 7 then 2 else 1 end else r.jumlah_penyusup end;
  if v_jml_penyusup * 2 >= v_jumlah then
    raise exception 'Jumlah penyusup (%) harus kurang dari setengah jumlah pemain (%).', v_jml_penyusup, v_jumlah;
  end if;
  v_penyusup := v_pemain[1:v_jml_penyusup];

  -- pasangan kata: belum pernah dipakai di room ini; kalau habis, mulai lagi dari awal
  select coalesce(terpakai, '{}') into v_terpakai from penyusup_rahasia where room_id = p_room;
  v_terpakai := coalesce(v_terpakai, '{}');
  select * into v_pas from penyusup_pasangan
  where aktif and (r.kategori_id is null or kategori_id = r.kategori_id) and not (id = any (v_terpakai))
  order by random() limit 1;
  if not found then
    v_terpakai := '{}';
    select * into v_pas from penyusup_pasangan
    where aktif and (r.kategori_id is null or kategori_id = r.kategori_id)
    order by random() limit 1;
  end if;
  if not found then raise exception 'Bank kata untuk kategori ini masih kosong.'; end if;

  -- sisi mana yang jadi kata pemandu diacak
  if random() < 0.5 then
    v_kata_pemandu := v_pas.kata_a; v_kata_penyusup := v_pas.kata_b;
  else
    v_kata_pemandu := v_pas.kata_b; v_kata_penyusup := v_pas.kata_a;
  end if;

  insert into penyusup_rahasia (room_id, pasangan_id, kata_pemandu, kata_penyusup, penyusup_ids, terpakai)
  values (p_room, v_pas.id, v_kata_pemandu, v_kata_penyusup, v_penyusup, array_append(v_terpakai, v_pas.id))
  on conflict (room_id) do update set
    pasangan_id = excluded.pasangan_id, kata_pemandu = excluded.kata_pemandu, kata_penyusup = excluded.kata_penyusup,
    penyusup_ids = excluded.penyusup_ids, terpakai = excluded.terpakai;

  delete from penyusup_kartu where room_id = p_room;
  delete from penyusup_petunjuk where room_id = p_room;
  delete from penyusup_chat where room_id = p_room;
  delete from penyusup_vote where room_id = p_room;

  -- peran hanya ikut di kartu kalau "penyusup tahu perannya" aktif — dan saat itu untuk semua pemain
  insert into penyusup_kartu (room_id, user_id, game_ke, kata, peran_terlihat)
  select p_room, u, r.game_ke + 1,
    case when u = any (v_penyusup) then v_kata_penyusup else v_kata_pemandu end,
    case when r.penyusup_tahu then case when u = any (v_penyusup) then 'penyusup' else 'pemandu' end end
  from unnest(v_pemain) as u;

  update penyusup_pemain set
    hidup = aktif, siap = false, hafal = false, sudah_vote = false, ronde_selamat = 0
  where room_id = p_room;

  update penyusup_room set
    status = 'bagikan', game_ke = game_ke + 1, ronde = 1,
    urutan = '{}', giliran_ke = 0, giliran_user_id = null,
    hasil_vote = null, akhir = null,
    -- ±5 dtk animasi hitung mundur & kartu + 20 dtk untuk menghafal
    fase_mulai = now(), fase_berakhir = now() + interval '25 seconds',
    diperbarui_at = now()
  where id = p_room;

  insert into penyusup_log (room_id, jenis, user_id, data) values (p_room, 'mulai', v_user, jsonb_build_object('game_ke', r.game_ke + 1));
end;
$$;

-- Tombol "Sudah Hafal". Kalau semua pemain online sudah hafal, ronde langsung dimulai.
create or replace function penyusup_hafal(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from penyusup_room where id = p_room and status = 'bagikan' for update;
  if not found then return; end if;
  update penyusup_pemain set hafal = true where room_id = p_room and user_id = auth.uid() and aktif;
  perform _penyusup_maju(p_room);
end;
$$;

-- Mengembalikan {hasil}: ok | bukan_giliran | tutup | kosong | panjang | satu_kata | sama_kata | kasar
create or replace function penyusup_petunjuk(p_room uuid, p_teks text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_teks text := btrim(regexp_replace(coalesce(p_teks, ''), '\s+', ' ', 'g'));
  r penyusup_room%rowtype;
  v_kata text;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.status <> 'petunjuk' or r.giliran_user_id is distinct from v_user then
    return jsonb_build_object('hasil', 'bukan_giliran');
  end if;
  if now() >= r.fase_berakhir then
    perform _penyusup_maju(p_room);
    return jsonb_build_object('hasil', 'tutup');
  end if;

  if v_teks = '' then return jsonb_build_object('hasil', 'kosong'); end if;
  if length(v_teks) > 24 then return jsonb_build_object('hasil', 'panjang'); end if;
  if position(' ' in v_teks) > 0 then return jsonb_build_object('hasil', 'satu_kata'); end if;

  select kata into v_kata from penyusup_kartu where room_id = p_room and user_id = v_user;
  -- hanya yang sama persis yang ditolak; bagian kata ("Prambanan" untuk "Candi Prambanan") boleh
  if game_normal(v_teks) = game_normal(v_kata)
     or replace(game_normal(v_teks), ' ', '') = replace(game_normal(v_kata), ' ', '') then
    return jsonb_build_object('hasil', 'sama_kata');
  end if;
  if _penyusup_kasar(v_teks) then return jsonb_build_object('hasil', 'kasar'); end if;

  insert into penyusup_petunjuk (room_id, game_ke, ronde, user_id, teks)
  values (p_room, r.game_ke, r.ronde, v_user, v_teks);
  insert into penyusup_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();
  perform _penyusup_giliran_berikut(p_room);
  return jsonb_build_object('hasil', 'ok');
end;
$$;

-- Mengembalikan {hasil}: ok | kosong | tutup | tersingkir | terlalu_cepat | kasar
create or replace function penyusup_chat(p_room uuid, p_teks text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_teks text := left(btrim(regexp_replace(coalesce(p_teks, ''), '\s+', ' ', 'g')), 200);
  r penyusup_room%rowtype;
begin
  if v_teks = '' then return jsonb_build_object('hasil', 'kosong'); end if;
  select * into r from penyusup_room where id = p_room;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.status <> 'diskusi' then return jsonb_build_object('hasil', 'tutup'); end if;
  if not exists (select 1 from penyusup_pemain where room_id = p_room and user_id = v_user and aktif and hidup) then
    return jsonb_build_object('hasil', 'tersingkir');
  end if;
  if exists (
    select 1 from penyusup_chat where room_id = p_room and user_id = v_user and dibuat_at > now() - interval '1.5 seconds'
  ) or (
    select count(*) from penyusup_chat where room_id = p_room and user_id = v_user and dibuat_at > now() - interval '1 minute'
  ) >= 20 then
    return jsonb_build_object('hasil', 'terlalu_cepat');
  end if;
  if _penyusup_kasar(v_teks) then return jsonb_build_object('hasil', 'kasar'); end if;

  insert into penyusup_chat (room_id, game_ke, ronde, user_id, teks) values (p_room, r.game_ke, r.ronde, v_user, v_teks);
  insert into penyusup_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();
  return jsonb_build_object('hasil', 'ok');
end;
$$;

-- Host mempercepat diskusi ke voting.
create or replace function penyusup_ke_voting(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id is distinct from auth.uid() then raise exception 'Hanya host yang bisa mempercepat ke voting.'; end if;
  if r.status <> 'diskusi' then return; end if;
  perform _penyusup_mulai_voting(p_room);
end;
$$;

-- p_target null = lewati. Bisa diganti selama waktu voting belum habis.
create or replace function penyusup_vote(p_room uuid, p_target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r penyusup_room%rowtype;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.status <> 'voting' or now() >= r.fase_berakhir then raise exception 'Waktu voting sudah habis.'; end if;
  if not exists (select 1 from penyusup_pemain where room_id = p_room and user_id = v_user and aktif and hidup) then
    raise exception 'Kamu sudah tersingkir, jadi tidak bisa vote.';
  end if;
  if p_target is not null then
    if p_target = v_user then raise exception 'Tidak bisa memilih diri sendiri.'; end if;
    if not exists (select 1 from penyusup_pemain where room_id = p_room and user_id = p_target and aktif and hidup) then
      raise exception 'Pemain itu sudah tidak bermain.';
    end if;
  end if;

  insert into penyusup_vote (room_id, game_ke, ronde, voter_id, target_id)
  values (p_room, r.game_ke, r.ronde, v_user, p_target)
  on conflict (room_id, game_ke, ronde, voter_id) do update set target_id = excluded.target_id, diubah_at = now();
  update penyusup_pemain set sudah_vote = true where room_id = p_room and user_id = v_user;
  insert into penyusup_kehadiran (room_id, user_id, terakhir_aktif) values (p_room, v_user, now())
  on conflict (room_id, user_id) do update set terakhir_aktif = now();

  -- semua sudah vote -> hasil langsung keluar
  perform _penyusup_maju(p_room);
end;
$$;

-- Tebakan terakhir penyusup yang baru tertangkap. Mengembalikan {hasil}: benar | salah | kosong | tutup
create or replace function penyusup_tebak_akhir(p_room uuid, p_teks text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_teks text := left(btrim(coalesce(p_teks, '')), 40);
  r penyusup_room%rowtype;
  v_kunci text;
  v_tebak text;
  v_benar boolean;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.status <> 'tebakan_terakhir' or r.giliran_user_id is distinct from v_user then
    raise exception 'Bukan giliranmu menebak.';
  end if;
  if now() >= r.fase_berakhir then
    perform _penyusup_maju(p_room);
    return jsonb_build_object('hasil', 'tutup');
  end if;
  if v_teks = '' then return jsonb_build_object('hasil', 'kosong'); end if;

  select replace(game_normal(kata_pemandu), ' ', '') into v_kunci from penyusup_rahasia where room_id = p_room;
  v_tebak := replace(game_normal(v_teks), ' ', '');
  -- salah ketik 1 huruf masih diterima untuk kata >= 6 huruf
  v_benar := v_tebak = v_kunci or (length(v_kunci) >= 6 and game_jarak(v_tebak, v_kunci) <= 1);

  insert into penyusup_log (room_id, jenis, user_id, data)
  values (p_room, 'tebakan', v_user, jsonb_build_object('game_ke', r.game_ke, 'benar', v_benar));
  if v_benar then
    perform _penyusup_selesai(p_room, 'penyusup', 'tebakan_benar', v_user);
  else
    perform _penyusup_lanjut(p_room);
  end if;
  return jsonb_build_object('hasil', case when v_benar then 'benar' else 'salah' end);
end;
$$;

-- Host mengembalikan semua pemain ke lobi setelah game selesai.
create or replace function penyusup_main_lagi(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.host_id is distinct from auth.uid() then raise exception 'Hanya host yang bisa memulai ulang.'; end if;
  if r.status <> 'selesai' then raise exception 'Permainan belum selesai.'; end if;

  delete from penyusup_kartu where room_id = p_room;
  delete from penyusup_petunjuk where room_id = p_room;
  delete from penyusup_chat where room_id = p_room;
  delete from penyusup_vote where room_id = p_room;
  update penyusup_pemain set hidup = true, siap = false, hafal = false, sudah_vote = false, ronde_selamat = 0
  where room_id = p_room;
  update penyusup_room set
    status = 'menunggu', ronde = 0, urutan = '{}', giliran_ke = 0, giliran_user_id = null,
    fase_mulai = null, fase_berakhir = null, hasil_vote = null, akhir = null, diperbarui_at = now()
  where id = p_room;
end;
$$;

-- Papan skor: 'minggu' = sejak Senin 00:00 WIB, 'semua' = sepanjang waktu.
-- Per divisi hanya dari game Antar Divisi.
create or replace function penyusup_papan_skor(p_rentang text) returns jsonb
language sql stable security definer set search_path = public as $$
  with batas as (
    select case when p_rentang = 'minggu'
      then date_trunc('week', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
      else '-infinity'::timestamptz end as mulai
  )
  select jsonb_build_object(
    'per_pemain', (
      select coalesce(jsonb_agg(x order by x.poin desc, x.nama), '[]'::jsonb)
      from (
        select s.user_id, p.nama, p.divisi_id, sum(s.poin)::int as poin, count(*)::int as main,
               (count(*) filter (where s.menang))::int as menang
        from penyusup_skor s join profiles p on p.id = s.user_id, batas b
        where s.dibuat_at >= b.mulai
        group by s.user_id, p.nama, p.divisi_id
        order by poin desc, p.nama
        limit 50
      ) x
    ),
    'per_divisi', (
      select coalesce(jsonb_agg(x order by x.poin desc, x.nama), '[]'::jsonb)
      from (
        select d.id as divisi_id, d.nama, sum(s.poin)::int as poin, count(distinct s.user_id)::int as pemain
        from penyusup_skor s join divisi d on d.id = s.divisi_id, batas b
        where s.mode = 'antar_divisi' and s.dibuat_at >= b.mulai
        group by d.id, d.nama
      ) x
    )
  )
  where auth.uid() is not null and p_rentang in ('minggu', 'semua');
$$;

-- ---------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------

revoke execute on function _penyusup_cek_menang(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_selesai(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function _penyusup_giliran_berikut(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_mulai_ronde(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_mulai_voting(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_hitung_vote(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_lanjut(uuid) from public, anon, authenticated;
revoke execute on function _penyusup_maju(uuid) from public, anon, authenticated;

revoke execute on function penyusup_mulai(uuid) from public, anon;
revoke execute on function penyusup_hafal(uuid) from public, anon;
revoke execute on function penyusup_petunjuk(uuid, text) from public, anon;
revoke execute on function penyusup_chat(uuid, text) from public, anon;
revoke execute on function penyusup_ke_voting(uuid) from public, anon;
revoke execute on function penyusup_vote(uuid, uuid) from public, anon;
revoke execute on function penyusup_tebak_akhir(uuid, text) from public, anon;
revoke execute on function penyusup_main_lagi(uuid) from public, anon;
revoke execute on function penyusup_papan_skor(text) from public, anon;

grant execute on function penyusup_mulai(uuid) to authenticated;
grant execute on function penyusup_hafal(uuid) to authenticated;
grant execute on function penyusup_petunjuk(uuid, text) to authenticated;
grant execute on function penyusup_chat(uuid, text) to authenticated;
grant execute on function penyusup_ke_voting(uuid) to authenticated;
grant execute on function penyusup_vote(uuid, uuid) to authenticated;
grant execute on function penyusup_tebak_akhir(uuid, text) to authenticated;
grant execute on function penyusup_main_lagi(uuid) to authenticated;
grant execute on function penyusup_papan_skor(text) to authenticated;
