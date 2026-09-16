-- =========================================================
-- DisparYK — 0009: Pegawai biasa bisa tambah & hapus konten sendiri
-- Jalankan setelah 0001-0008.
--
-- Sebelumnya hanya admin yang boleh insert/delete konten (pegawai
-- biasa cuma boleh select + update status kontennya sendiri kalau
-- jadi PIC). Sekarang siapa pun yang login (yang divisinya sudah
-- diizinkan pakai fitur Kalender Konten) boleh menambah konten baru,
-- dan boleh menghapus/mengedit penuh konten yang dia buat sendiri
-- atau yang PIC-nya dia. Admin tetap bisa kelola konten siapa pun.
-- =========================================================

drop policy if exists konten_insert on konten;
create policy konten_insert on konten
  for insert to authenticated
  with check (dibuat_oleh = auth.uid());

drop policy if exists konten_update on konten;
create policy konten_update on konten
  for update to authenticated
  using (is_admin() or pic_user_id = auth.uid() or dibuat_oleh = auth.uid());

drop policy if exists konten_delete on konten;
create policy konten_delete on konten
  for delete to authenticated
  using (is_admin() or pic_user_id = auth.uid() or dibuat_oleh = auth.uid());
