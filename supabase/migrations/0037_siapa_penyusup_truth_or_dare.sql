-- =========================================================
-- DisparYK — 0037: Siapa Penyusup — Truth or Dare untuk yang kalah
-- Jalankan setelah 0034. Butuh Edge Function `penyusup-tod` (pakai secret
-- OPENAI_API_KEY yang sama dengan Naskah AI); tanpa function itu pilihan
-- cadangan di bawah yang dipakai, jadi game tetap jalan.
--
-- Alur di layar akhir (tampilannya sama persis di layar semua pemain):
--   1. penyusup_tod(room): putaran 1 dibuat otomatis saat game selesai. Server
--      memilih korban dari pihak yang kalah (penyusup atau pemandu) yang masih
--      di room, lalu Truth/Dare. Kalau yang kalah lebih dari satu, layar
--      menampilkan roda nama dulu (daftar `calon` dari server, urutannya tetap).
--   2. Edge Function penyusup-tod: penyusup_tod_klaim (hanya service_role)
--      memastikan cuma satu pemanggilan OpenAI per putaran, lalu
--      penyusup_tod_simpan (hanya service_role) menyimpan 3 pilihan. Hasil AI
--      yang kosong/kurang/mengandung kata terlarang diganti pilihan cadangan.
--   3. penyusup_tod(room, ke): "Putar Lagi" — boleh berkali-kali, oleh pemain
--      mana pun. Putaran baru hanya dibuat kalau `ke` sama dengan putaran yang
--      sedang tampil dan pilihannya sudah siap (dua orang menekan bersamaan =
--      satu putaran). Korban berikutnya: yang paling jarang kena lebih dulu,
--      tidak pernah orang yang sama dua kali berturut-turut (kecuali tinggal 1).
--   4. penyusup_tod_cadangan (klien): kalau function tidak ada/gagal, pilihan
--      cadangan dipakai setelah 12 dtk (atau 40 dtk kalau AI macet).
-- Semua disimpan di penyusup_room.tod (ikut Realtime + detak), per game_ke.
-- =========================================================

alter table penyusup_room add column if not exists tod jsonb;

-- versi awal (belum dirilis) memakai tanda tangan lain; buang supaya tidak ambigu
drop function if exists penyusup_tod(uuid);
drop function if exists penyusup_tod_simpan(uuid, int, jsonb);
drop function if exists _penyusup_tod_cadangan(text);

/** 3 pilihan cadangan acak; yang ada di `p_hindari` (sudah dipakai putaran lain) dipilih paling akhir. */
create or replace function _penyusup_tod_cadangan(p_jenis text, p_hindari jsonb default '[]') returns jsonb
language sql volatile set search_path = public as $$
  select jsonb_agg(t) from (
    select t from unnest(case when p_jenis = 'truth' then array[
      'Apa alasan paling ngarang yang pernah kamu pakai buat izin atau telat?',
      'Pernah pura-pura paham instruksi padahal bingung total? Ceritakan yang paling parah.',
      'Siapa di room ini yang paling kamu curigai jadi penyusup di kehidupan nyata, dan kenapa?',
      'Aplikasi apa yang paling sering kamu buka diam-diam pas jam kerja?',
      'Kalau bisa tukar tugas seminggu dengan satu orang di room ini, pilih siapa dan kenapa?',
      'Momen paling malu apa yang pernah kamu alami waktu presentasi atau rapat?',
      'Kebiasaan aneh apa yang kamu lakukan kalau lagi sendirian di ruangan?',
      'Kalau hidupmu jadi film, apa judulnya dan siapa di room ini pemeran pendukungnya?',
      'Chat siapa di room ini yang paling sering kamu baca tapi lupa kamu balas?',
      'Makanan apa yang paling sering kamu beli tapi malu ngakuinnya?'
    ] else array[
      'Umumkan pemenang game tadi dengan gaya MC acara resmi selama 20 detik.',
      'Promosikan satu benda di dekatmu seperti sales di TV selama 30 detik.',
      'Tirukan cara bicara salah satu pemain di room ini, yang lain menebak siapa.',
      'Ucapkan "Penyusupnya bukan aku!" dengan tiga ekspresi: sedih, marah, lalu sok cool.',
      'Jadi pemandu wisata dadakan: jelaskan tempatmu sekarang seolah destinasi wisata terkenal.',
      'Nyanyikan reff lagu apa saja, tapi liriknya diganti kata "penyusup".',
      'Beri pujian super lebay ke setiap pemain di room ini, masing-masing satu kalimat.',
      'Diam seperti patung selama 15 detik; kalau ketawa, ulangi dari awal.',
      'Bacakan petunjuk yang kamu berikan di game tadi dengan gaya pembaca berita.',
      'Peragakan cara kamu menyapa atasan kalau datang telat, dengan gaya sinetron.'
    ] end) t
    order by coalesce(p_hindari, '[]'::jsonb) ? t, random()
    limit 3
  ) x;
$$;

/** Putaran baru: pilih korban & Truth/Dare. Dipanggil dari penyusup_tod (baris room sudah dikunci). */
create or replace function _penyusup_tod_baru(p_room uuid, p_ke int, p_riwayat jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_calon uuid[];
  v_terakhir uuid;
  v_korban uuid;
begin
  select * into r from penyusup_room where id = p_room;

  -- semua yang kalah & masih di room, urutan papan skor (sama di semua layar untuk roda nama)
  select coalesce(array_agg((x.v ->> 'user_id')::uuid order by x.n), '{}') into v_calon
  from jsonb_array_elements(r.akhir -> 'skor') with ordinality x(v, n)
  join penyusup_pemain p on p.room_id = p_room and p.user_id = (x.v ->> 'user_id')::uuid and p.aktif
  where x.v ->> 'peran' <> r.akhir ->> 'pemenang';

  if cardinality(v_calon) = 0 then
    return jsonb_build_object('game_ke', r.game_ke, 'ke', p_ke, 'status', 'tidak_ada', 'calon', '[]'::jsonb, 'riwayat', p_riwayat);
  end if;

  -- yang paling jarang kena lebih dulu; jangan orang yang barusan (kecuali tinggal dia)
  v_terakhir := (p_riwayat -> -1 ->> 'korban_id')::uuid;
  select c.k into v_korban
  from (
    select k, (select count(*) from jsonb_array_elements(p_riwayat) e where (e ->> 'korban_id')::uuid = k) as n
    from unnest(v_calon) k
  ) c
  where cardinality(v_calon) = 1 or c.k is distinct from v_terakhir
  order by c.n, random()
  limit 1;

  return jsonb_build_object(
    'game_ke', r.game_ke,
    'ke', p_ke,
    'korban_id', v_korban,
    'jenis', case when random() < 0.5 then 'truth' else 'dare' end,
    'status', 'menunggu_ai',
    'pertanyaan', null,
    'sumber', null,
    'dibuat_at', now(),
    'calon', to_jsonb(v_calon),
    'riwayat', p_riwayat
  );
end;
$$;

-- ---------------------------------------------------------
-- 1 & 3. Putaran pertama (p_ke = 0) / Putar Lagi (p_ke = putaran yang tampil)
-- ---------------------------------------------------------

create or replace function penyusup_tod(p_room uuid, p_ke int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_riwayat jsonb;
  v_tod jsonb;
begin
  if auth.uid() is null then raise exception 'Belum login.'; end if;
  if not penyusup_anggota(p_room) then raise exception 'Kamu bukan pemain di room ini.'; end if;
  select * into r from penyusup_room where id = p_room for update;
  if not found then raise exception 'Room tidak ditemukan.'; end if;
  if r.status <> 'selesai' or r.akhir is null then raise exception 'Permainan belum selesai.'; end if;

  if r.tod is null or (r.tod ->> 'game_ke')::int <> r.game_ke then
    v_tod := _penyusup_tod_baru(p_room, 1, '[]'::jsonb);
  elsif p_ke > 0 and p_ke = (r.tod ->> 'ke')::int and r.tod ->> 'status' = 'siap' then
    v_riwayat := coalesce(r.tod -> 'riwayat', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'ke', r.tod -> 'ke', 'korban_id', r.tod -> 'korban_id', 'jenis', r.tod -> 'jenis',
      'pertanyaan', r.tod -> 'pertanyaan', 'sumber', r.tod -> 'sumber'
    ));
    -- 20 putaran terakhir saja, supaya baris room tidak membengkak
    select jsonb_agg(e order by n) into v_riwayat
    from jsonb_array_elements(v_riwayat) with ordinality x(e, n)
    where n > jsonb_array_length(v_riwayat) - 20;
    v_tod := _penyusup_tod_baru(p_room, p_ke + 1, v_riwayat);
  else
    -- sudah ada, orang lain baru saja memutar, atau pilihan putaran ini belum siap
    return r.tod;
  end if;

  update penyusup_room set tod = v_tod where id = p_room;
  return v_tod;
end;
$$;

-- ---------------------------------------------------------
-- 2. Klaim & simpan hasil AI (hanya Edge Function / service_role)
-- ---------------------------------------------------------

create or replace function penyusup_tod_klaim(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_korban uuid;
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found or r.status <> 'selesai' or r.tod is null or (r.tod ->> 'game_ke')::int <> r.game_ke then return null; end if;
  if not (
    r.tod ->> 'status' = 'menunggu_ai'
    or (r.tod ->> 'status' = 'membuat' and (r.tod ->> 'klaim_at')::timestamptz < now() - interval '40 seconds')
  ) then
    return null;
  end if;

  update penyusup_room set tod = tod || jsonb_build_object('status', 'membuat', 'klaim_at', now()) where id = p_room;
  v_korban := (r.tod ->> 'korban_id')::uuid;

  -- bahan prompt: nama depan saja, kata & petunjuk game ini (game sudah selesai, bukan rahasia lagi)
  return jsonb_build_object(
    'game_ke', r.game_ke,
    'ke', (r.tod ->> 'ke')::int,
    'jenis', r.tod ->> 'jenis',
    'mode', r.mode,
    'pemenang', r.akhir ->> 'pemenang',
    'kata_pemandu', r.akhir ->> 'kata_pemandu',
    'kata_penyusup', r.akhir ->> 'kata_penyusup',
    'korban', (select split_part(btrim(nama), ' ', 1) from profiles where id = v_korban),
    'korban_peran', (select x ->> 'peran' from jsonb_array_elements(r.akhir -> 'skor') x where x ->> 'user_id' = v_korban::text),
    'korban_divisi', (
      select d.nama from penyusup_pemain p join divisi d on d.id = p.divisi_id
      where p.room_id = p_room and p.user_id = v_korban
    ),
    'petunjuk_korban', (
      select coalesce(jsonb_agg(t.teks order by t.dibuat_at), '[]'::jsonb) from penyusup_petunjuk t
      where t.room_id = p_room and t.game_ke = r.game_ke and t.user_id = v_korban and not t.lewat
    ),
    'pemain_lain', (
      select coalesce(jsonb_agg(split_part(btrim(pr.nama), ' ', 1)), '[]'::jsonb)
      from penyusup_pemain p join profiles pr on pr.id = p.user_id
      where p.room_id = p_room and p.aktif and p.user_id <> v_korban
    ),
    -- pilihan putaran sebelumnya di game ini, supaya AI tidak mengulang
    'sudah_dipakai', jsonb_path_query_array(r.tod, '$.riwayat[*].pertanyaan[*]')
  );
end;
$$;

create or replace function penyusup_tod_simpan(p_room uuid, p_game_ke int, p_ke int, p_pertanyaan jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_daftar text[];
  v_hasil jsonb;
  v_sumber text := 'ai';
begin
  select * into r from penyusup_room where id = p_room for update;
  if not found or r.tod is null or (r.tod ->> 'game_ke')::int <> p_game_ke or (r.tod ->> 'ke')::int <> p_ke
     or r.tod ->> 'status' <> 'membuat' then
    return null;
  end if;

  select array_agg(left(btrim(regexp_replace(t, '\s+', ' ', 'g')), 200)) into v_daftar
  from jsonb_array_elements_text(case when jsonb_typeof(p_pertanyaan) = 'array' then p_pertanyaan else '[]'::jsonb end) t
  where btrim(t) <> '';

  if coalesce(array_length(v_daftar, 1), 0) < 3 or exists (select 1 from unnest(v_daftar[1:3]) t where _penyusup_kasar(t)) then
    v_hasil := _penyusup_tod_cadangan(r.tod ->> 'jenis', jsonb_path_query_array(r.tod, '$.riwayat[*].pertanyaan[*]'));
    v_sumber := 'cadangan';
  else
    v_hasil := to_jsonb(v_daftar[1:3]);
  end if;

  update penyusup_room
  set tod = tod || jsonb_build_object('status', 'siap', 'pertanyaan', v_hasil, 'sumber', v_sumber)
  where id = p_room
  returning tod into v_hasil;
  return v_hasil;
end;
$$;

revoke execute on function penyusup_tod_klaim(uuid) from public, anon, authenticated;
revoke execute on function penyusup_tod_simpan(uuid, int, int, jsonb) from public, anon, authenticated;
revoke execute on function _penyusup_tod_baru(uuid, int, jsonb) from public, anon, authenticated;
revoke execute on function _penyusup_tod_cadangan(text, jsonb) from public, anon, authenticated;
grant execute on function penyusup_tod_klaim(uuid) to service_role;
grant execute on function penyusup_tod_simpan(uuid, int, int, jsonb) to service_role;

-- ---------------------------------------------------------
-- 4. Cadangan kalau Edge Function tidak ada / gagal (klien)
-- ---------------------------------------------------------

create or replace function penyusup_tod_cadangan(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r penyusup_room%rowtype;
  v_hasil jsonb;
begin
  if not penyusup_anggota(p_room) then raise exception 'Kamu bukan pemain di room ini.'; end if;
  select * into r from penyusup_room where id = p_room for update;
  if not found or r.tod is null or (r.tod ->> 'game_ke')::int <> r.game_ke then return null; end if;
  if not (
    (r.tod ->> 'status' = 'menunggu_ai' and (r.tod ->> 'dibuat_at')::timestamptz < now() - interval '12 seconds')
    or (r.tod ->> 'status' = 'membuat' and (r.tod ->> 'klaim_at')::timestamptz < now() - interval '40 seconds')
  ) then
    return r.tod;
  end if;

  update penyusup_room
  set tod = tod || jsonb_build_object(
    'status', 'siap',
    'pertanyaan', _penyusup_tod_cadangan(r.tod ->> 'jenis', jsonb_path_query_array(r.tod, '$.riwayat[*].pertanyaan[*]')),
    'sumber', 'cadangan'
  )
  where id = p_room
  returning tod into v_hasil;
  return v_hasil;
end;
$$;
