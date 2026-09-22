-- Penyesuaian fitur distribusi undangan:
-- 1. Hapus kolom bukti_url — tidak dipakai, cukup catatan saja.
-- 2. Tambah kolom lokasi_pengantaran (alamat/lokasi tujuan pengantaran surat,
--    BEDA dari lokasi_parkir yang sudah ada sebelumnya untuk parkir tamu hari-H)
--    — kolom ini boleh diisi admin MAUPUN petugas (PIC), makanya sengaja
--    TIDAK dimasukkan ke daftar proteksi di bawah.

alter table undangan drop column if exists bukti_url;
alter table undangan add column if not exists lokasi_pengantaran text;

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
  end if;
  new.diperbarui_oleh := auth.uid();
  new.diperbarui_at := now();
  return new;
end;
$$;
