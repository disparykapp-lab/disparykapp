-- Pengaturan per pegawai: wajib absen atau tidak.
-- Pegawai yang TIDAK wajib absen tetap boleh absen, tapi tidak dihitung
-- "tidak absen" di rekap dan tidak ikut peringkat kerajinan. Default: wajib.

alter table profiles add column if not exists wajib_absen boolean not null default true;

-- Hanya admin yang boleh mengubah wajib_absen (pegawai tidak boleh mengubah
-- miliknya sendiri) — trigger proteksi_profil() versi 0010 + kolom baru.
create or replace function proteksi_profil() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    new.role := old.role;
    new.aktif := old.aktif;
    new.wajib_absen := old.wajib_absen;
    new.tanggal_mulai_magang := old.tanggal_mulai_magang;
    new.tanggal_selesai_magang := old.tanggal_selesai_magang;
  end if;
  return new;
end;
$$;
