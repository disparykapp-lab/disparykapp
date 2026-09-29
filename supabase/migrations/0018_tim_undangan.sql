-- Tim (gabungan pegawai) untuk distribusi undangan — rencana pemakaian:
-- 1 tim = 2 orang, tapi tidak dibatasi teknis di database supaya fleksibel.
-- Undangan bisa ditugaskan ke 1 pegawai (pic_user_id, sudah ada) ATAU ke
-- 1 tim (pic_tim_id, baru) — keduanya saling meniadakan (trigger di bawah
-- otomatis mengosongkan salah satunya kalau yang lain diisi).

create table if not exists tim (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  created_at timestamptz not null default now()
);

create table if not exists tim_anggota (
  tim_id uuid not null references tim(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (tim_id, user_id)
);

alter table undangan add column if not exists pic_tim_id uuid references tim(id) on delete set null;
create index if not exists idx_undangan_pic_tim on undangan(pic_tim_id);

alter table tim enable row level security;
alter table tim_anggota enable row level security;

-- Semua yang login boleh lihat (dipakai buat menampilkan nama tim & anggota
-- di daftar tugas pegawai maupun dashboard admin). Ubah/hapus hanya admin.
create policy tim_select on tim for select to authenticated using (true);
create policy tim_insert_admin on tim for insert to authenticated with check (is_admin());
create policy tim_update_admin on tim for update to authenticated using (is_admin());
create policy tim_delete_admin on tim for delete to authenticated using (is_admin());

create policy tim_anggota_select on tim_anggota for select to authenticated using (true);
create policy tim_anggota_insert_admin on tim_anggota for insert to authenticated with check (is_admin());
create policy tim_anggota_delete_admin on tim_anggota for delete to authenticated using (is_admin());

-- Perbarui proteksi_undangan(): tambahkan pic_tim_id ke daftar kolom yang
-- cuma boleh diubah admin (sejajar dengan pic_user_id yang sudah dilindungi
-- sejak 0014), dan pastikan pic_user_id & pic_tim_id saling meniadakan
-- kalau salah satunya diisi baru (jaga-jaga di level trigger, bukan cuma
-- aplikasi) supaya undangan tidak pernah "double PIC".
create or replace function proteksi_undangan() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.kategori := old.kategori;
    new.sub_kelompok := old.sub_kelompok;
    new.nomor := old.nomor;
    new.nama := old.nama;
    new.lokasi_parkir := old.lokasi_parkir;
    new.pic_user_id := old.pic_user_id;
    new.pic_tim_id := old.pic_tim_id;
  end if;

  if new.pic_user_id is distinct from old.pic_user_id and new.pic_user_id is not null then
    new.pic_tim_id := null;
  elsif new.pic_tim_id is distinct from old.pic_tim_id and new.pic_tim_id is not null then
    new.pic_user_id := null;
  end if;

  new.diperbarui_oleh := auth.uid();
  new.diperbarui_at := now();
  return new;
end;
$$;

-- Update policy: pegawai anggota tim yang ditugaskan juga boleh mengubah
-- baris itu (status/catatan/lokasi_pengantaran/tanda_tangan_url), sama
-- seperti PIC perorangan.
drop policy if exists undangan_update on undangan;
create policy undangan_update on undangan for update to authenticated
  using (
    is_admin()
    or pic_user_id = auth.uid()
    or (
      pic_tim_id is not null
      and exists (
        select 1 from tim_anggota ta
        where ta.tim_id = undangan.pic_tim_id and ta.user_id = auth.uid()
      )
    )
  );
