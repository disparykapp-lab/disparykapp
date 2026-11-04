-- =========================================================
-- DisparYK — 0034: Siapa Penyusup — bank kata umum
-- Jalankan setelah 0033.
--
-- Bank kata 0032 (dari paket aset, bank_kata.json) banyak memakai nama khas
-- Jogja (Geplak, Yangko, Mie Lethek, Jathilan, Sekaten, Tebing Breksi, …) yang
-- tidak dikenal semua anak magang dari berbagai daerah. Diganti dengan benda &
-- tempat sehari-hari yang dikenal di seluruh Indonesia: 6 kategori, 75 pasangan.
--
-- Kategori & pasangan lama tidak dihapus, hanya dinonaktifkan (riwayat tetap
-- utuh, dan menjalankan ulang 0032 tidak menghidupkannya lagi). Pasangan yang
-- memuat kata dari penyusup_kata_terlarang sengaja dihindari (mis. Kucing/Anjing:
-- "anjing" ada di daftar itu, jadi petunjuk & chat yang wajar akan tertolak).
-- Tambah pasangan kapan saja:
--   insert into penyusup_pasangan (kategori_id, kata_a, kata_b) values ('hewan', '...', '...');
-- =========================================================

alter table penyusup_kategori add column if not exists aktif boolean not null default true;

-- ---------------------------------------------------------
-- Nonaktifkan bank kata lama
-- ---------------------------------------------------------

update penyusup_kategori set aktif = false where id in ('wisata_jogja', 'kuliner', 'budaya', 'kantor_magang', 'pariwisata_umum');
update penyusup_pasangan set aktif = false where kategori_id in ('wisata_jogja', 'kuliner', 'budaya', 'kantor_magang', 'pariwisata_umum');
-- room yang masih menunggu dengan kategori lama jadi "Acak"
update penyusup_room set kategori_id = null where kategori_id in ('wisata_jogja', 'kuliner', 'budaya', 'kantor_magang', 'pariwisata_umum');

-- ---------------------------------------------------------
-- Bank kata baru
-- ---------------------------------------------------------

insert into penyusup_kategori (id, nama, ikon, urutan, aktif) values
  ('makanan', 'Makanan & Minuman', 'poin', 1, true),
  ('benda_rumah', 'Benda di Rumah', 'kunci', 2, true),
  ('hewan', 'Hewan', 'pemain', 3, true),
  ('tempat', 'Tempat', 'pemandu', 4, true),
  ('kantor_sekolah', 'Kantor & Sekolah', 'absensi', 5, true),
  ('kendaraan', 'Kendaraan', 'main', 6, true)
on conflict (id) do update set nama = excluded.nama, ikon = excluded.ikon, urutan = excluded.urutan, aktif = true;

insert into penyusup_pasangan (kategori_id, kata_a, kata_b) values
  -- makanan
  ('makanan', 'Nasi Goreng', 'Mie Goreng'),
  ('makanan', 'Bakso', 'Mie Ayam'),
  ('makanan', 'Teh', 'Kopi'),
  ('makanan', 'Es Teh', 'Es Jeruk'),
  ('makanan', 'Roti', 'Kue'),
  ('makanan', 'Tahu', 'Tempe'),
  ('makanan', 'Martabak', 'Pizza'),
  ('makanan', 'Ayam Goreng', 'Ayam Bakar'),
  ('makanan', 'Soto', 'Sop'),
  ('makanan', 'Kerupuk', 'Keripik'),
  ('makanan', 'Es Krim', 'Es Buah'),
  ('makanan', 'Semangka', 'Melon'),
  ('makanan', 'Jeruk', 'Lemon'),
  -- benda_rumah
  ('benda_rumah', 'Sendok', 'Garpu'),
  ('benda_rumah', 'Piring', 'Mangkuk'),
  ('benda_rumah', 'Gelas', 'Cangkir'),
  ('benda_rumah', 'Kasur', 'Sofa'),
  ('benda_rumah', 'Bantal', 'Guling'),
  ('benda_rumah', 'Kipas Angin', 'AC'),
  ('benda_rumah', 'Televisi', 'Radio'),
  ('benda_rumah', 'Lemari', 'Rak'),
  ('benda_rumah', 'Sapu', 'Pel'),
  ('benda_rumah', 'Handuk', 'Selimut'),
  ('benda_rumah', 'Kunci', 'Gembok'),
  ('benda_rumah', 'Payung', 'Jas Hujan'),
  ('benda_rumah', 'Jam Dinding', 'Jam Tangan'),
  ('benda_rumah', 'Sikat Gigi', 'Sisir'),
  -- hewan
  ('hewan', 'Kucing', 'Kelinci'),
  ('hewan', 'Ayam', 'Bebek'),
  ('hewan', 'Sapi', 'Kerbau'),
  ('hewan', 'Kambing', 'Domba'),
  ('hewan', 'Harimau', 'Singa'),
  ('hewan', 'Kuda', 'Zebra'),
  ('hewan', 'Nyamuk', 'Lalat'),
  ('hewan', 'Cicak', 'Kadal'),
  ('hewan', 'Lumba-lumba', 'Hiu'),
  ('hewan', 'Burung', 'Kelelawar'),
  ('hewan', 'Kura-kura', 'Penyu'),
  ('hewan', 'Gajah', 'Badak'),
  ('hewan', 'Kupu-kupu', 'Capung'),
  -- tempat
  ('tempat', 'Pantai', 'Danau'),
  ('tempat', 'Gunung', 'Bukit'),
  ('tempat', 'Pasar', 'Supermarket'),
  ('tempat', 'Sekolah', 'Kampus'),
  ('tempat', 'Rumah Sakit', 'Puskesmas'),
  ('tempat', 'Bandara', 'Stasiun'),
  ('tempat', 'Terminal', 'Pelabuhan'),
  ('tempat', 'Restoran', 'Warung'),
  ('tempat', 'Hotel', 'Apartemen'),
  ('tempat', 'Perpustakaan', 'Toko Buku'),
  ('tempat', 'Kebun Binatang', 'Taman'),
  ('tempat', 'Pom Bensin', 'Bengkel'),
  ('tempat', 'Bioskop', 'Mal'),
  -- kantor_sekolah
  ('kantor_sekolah', 'Laptop', 'Komputer'),
  ('kantor_sekolah', 'Pulpen', 'Pensil'),
  ('kantor_sekolah', 'Spidol', 'Kapur Tulis'),
  ('kantor_sekolah', 'Map', 'Amplop'),
  ('kantor_sekolah', 'Lem', 'Selotip'),
  ('kantor_sekolah', 'Printer', 'Mesin Fotokopi'),
  ('kantor_sekolah', 'Rapat', 'Seminar'),
  ('kantor_sekolah', 'Papan Tulis', 'Proyektor'),
  ('kantor_sekolah', 'Meja', 'Kursi'),
  ('kantor_sekolah', 'Tas', 'Koper'),
  ('kantor_sekolah', 'Lift', 'Tangga'),
  ('kantor_sekolah', 'Email', 'Surat'),
  -- kendaraan
  ('kendaraan', 'Motor', 'Sepeda'),
  ('kendaraan', 'Mobil', 'Truk'),
  ('kendaraan', 'Bus', 'Kereta'),
  ('kendaraan', 'Pesawat', 'Helikopter'),
  ('kendaraan', 'Kapal', 'Perahu'),
  ('kendaraan', 'Taksi', 'Ojek'),
  ('kendaraan', 'Ambulans', 'Mobil Pemadam'),
  ('kendaraan', 'Bensin', 'Solar'),
  ('kendaraan', 'Helm', 'Sabuk Pengaman'),
  ('kendaraan', 'Lampu Merah', 'Zebra Cross')
on conflict (kategori_id, kata_a, kata_b) do update set aktif = true;

-- ---------------------------------------------------------
-- Buat room hanya menerima kategori yang aktif (selain itu sama dengan 0032)
-- ---------------------------------------------------------

create or replace function penyusup_buat_room(
  p_mode text,
  p_kategori text,
  p_jumlah_penyusup int,
  p_waktu_petunjuk int,
  p_waktu_diskusi int,
  p_waktu_voting int,
  p_penyusup_tahu boolean,
  p_tebakan_terakhir boolean,
  p_privat boolean,
  p_avatar int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_divisi uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'Belum login.'; end if;
  select divisi_id into v_divisi from profiles where id = v_user and aktif;
  if not found then raise exception 'Akun tidak aktif.'; end if;

  if p_mode is null or p_mode not in ('satu_divisi', 'antar_divisi') then raise exception 'Mode room tidak dikenal.'; end if;
  if p_mode = 'satu_divisi' and v_divisi is null then
    raise exception 'Kamu belum punya divisi, jadi tidak bisa membuat room Satu Divisi.';
  end if;
  if p_kategori is not null and not exists (select 1 from penyusup_kategori where id = p_kategori and aktif) then
    raise exception 'Kategori kata tidak dikenal.';
  end if;
  if p_jumlah_penyusup is null or p_jumlah_penyusup not between 0 and 3 then raise exception 'Jumlah penyusup harus otomatis atau 1-3.'; end if;
  if p_waktu_petunjuk is null or p_waktu_petunjuk not between 15 and 60 then raise exception 'Waktu petunjuk harus 15-60 detik.'; end if;
  if p_waktu_diskusi is null or p_waktu_diskusi not between 30 and 180 then raise exception 'Waktu diskusi harus 30-180 detik.'; end if;
  if p_waktu_voting is null or p_waktu_voting not between 15 and 60 then raise exception 'Waktu voting harus 15-60 detik.'; end if;
  if p_avatar is not null and p_avatar not between 0 and 7 then raise exception 'Avatar tidak dikenal.'; end if;

  -- bersih-bersih room yang sudah lama tidak dipakai (skor tetap tersimpan)
  delete from penyusup_room where diperbarui_at < now() - interval '1 day';
  delete from penyusup_gabung_gagal where dibuat_at < now() - interval '1 day';

  insert into penyusup_room (
    kode, host_id, mode, divisi_id, privat, kategori_id, jumlah_penyusup,
    waktu_petunjuk, waktu_diskusi, waktu_voting, penyusup_tahu, tebakan_terakhir
  ) values (
    _penyusup_kode_baru(), v_user, p_mode, case when p_mode = 'satu_divisi' then v_divisi end,
    coalesce(p_privat, true), p_kategori, p_jumlah_penyusup,
    p_waktu_petunjuk, p_waktu_diskusi, p_waktu_voting,
    coalesce(p_penyusup_tahu, false), coalesce(p_tebakan_terakhir, false)
  ) returning id into v_id;

  insert into penyusup_pemain (room_id, user_id, divisi_id, avatar)
  values (v_id, v_user, v_divisi, coalesce(p_avatar, _penyusup_avatar_default(v_user)));
  insert into penyusup_kehadiran (room_id, user_id) values (v_id, v_user);
  insert into penyusup_log (room_id, jenis, user_id) values (v_id, 'gabung', v_user);
  return v_id;
end;
$$;
