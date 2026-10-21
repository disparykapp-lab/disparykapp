-- =========================================================
-- DisparYK — 0027: Ucapan ulang tahun
-- Jalankan setelah 0001-0026.
--
-- Di beranda: kalau hari ini ulang tahun pengguna sendiri, tampil kartu
-- animasi + daftar ucapan yang masuk. Kalau hari ini ulang tahun rekan
-- SEDIVISI, tampil kartu pengingat dengan kolom kirim ucapan langsung.
-- Deteksi "hari ini ulang tahun siapa" dihitung di klien dari
-- profiles.tanggal_lahir yang sudah ada (bandingkan bulan+tanggal saja,
-- bukan tahun) — tidak perlu kolom/fungsi baru untuk itu.
-- =========================================================

create table if not exists ucapan_ulang_tahun (
  id uuid primary key default gen_random_uuid(),
  dari_user_id uuid not null references profiles(id) on delete cascade,
  untuk_user_id uuid not null references profiles(id) on delete cascade,
  tanggal date not null,
  pesan text not null,
  created_at timestamptz not null default now(),
  unique (dari_user_id, untuk_user_id, tanggal)
);

alter table ucapan_ulang_tahun enable row level security;

-- Baca: siapa saja yang login (mirip profiles/divisi/konten — internal trust,
-- bukan data rahasia). Tulis: cuma sebagai diri sendiri, tidak ke diri sendiri,
-- pesan tidak boleh kosong. unique(dari, untuk, tanggal) mencegah spam ucapan
-- berkali-kali ke orang yang sama di hari yang sama.
create policy ucapan_ulang_tahun_select on ucapan_ulang_tahun for select to authenticated using (true);
create policy ucapan_ulang_tahun_insert on ucapan_ulang_tahun for insert to authenticated
  with check (dari_user_id = auth.uid() and dari_user_id <> untuk_user_id and length(btrim(pesan)) > 0);
