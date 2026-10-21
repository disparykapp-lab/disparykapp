-- =========================================================
-- DisparYK — 0024: Naskah liputan dibuat AI
-- Jalankan setelah 0001-0023.
--
-- Fitur: pegawai mengisi kolom-kolom terstruktur (bukan prompt bebas),
-- lalu Edge Function "naskah-ai" (lihat README) merangkainya jadi prompt
-- dan memanggil OpenAI dengan API key yang disimpan sebagai secret di
-- Supabase — TIDAK PERNAH dikirim ke browser. Hasilnya disimpan di
-- tabel ini sebagai riwayat + log siapa yang membuat naskah apa.
--
-- Akses diatur per-divisi (sama seperti fitur_kalender_konten) lewat
-- centang di Kelola > Divisi; admin selalu bisa akses.
-- =========================================================

alter table divisi
  add column if not exists fitur_naskah_ai boolean not null default false;

create table if not exists naskah_ai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  jenis_acara text,
  nama_acara text,
  lokasi text,
  tanggal date,
  narasumber text,
  poin_penting text not null,
  gaya text not null default 'berita',
  panjang text not null default 'sedang',
  platform_tujuan text,

  model text not null default 'gpt-4o-mini',
  hasil text not null,

  created_at timestamptz not null default now()
);

create index if not exists naskah_ai_user_id_idx on naskah_ai (user_id, created_at desc);

alter table naskah_ai enable row level security;

-- Baca: pemilik baris atau admin (supaya admin bisa lihat log siapa membuat apa).
-- Tulis: cuma lewat insert baris milik sendiri, lewat Edge Function + klien
-- yang sudah lolos pengecekan fitur_naskah_ai/admin. Tidak ada update/delete —
-- ini log, bukan draft yang bisa diubah.
create policy naskah_ai_select on naskah_ai for select to authenticated using (user_id = auth.uid() or is_admin());
create policy naskah_ai_insert on naskah_ai for insert to authenticated with check (user_id = auth.uid());
