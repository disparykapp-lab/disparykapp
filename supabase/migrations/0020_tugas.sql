-- Tugas umum dari admin untuk pegawai (selain Tugas Undangan).
--
-- Setiap tugas bisa ditujukan ke:
--   'semua'    → semua pegawai
--   'divisi'   → pegawai di divisi tertentu (divisi_ids)
--   'personal' → pegawai tertentu (user_ids)
-- Deadline, waktu mulai tampil, dan nama pembuat semuanya opsional. Tugas bisa
-- dimatikan (aktif = false) tanpa dihapus; tugas nonaktif, atau yang waktu
-- mulainya belum tiba, tidak terlihat pegawai.
-- Status pengerjaan disimpan per pegawai di tugas_progres.

create table if not exists tugas (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (length(trim(judul)) > 0),
  deskripsi text,
  aktif boolean not null default true,
  sasaran text not null default 'semua' check (sasaran in ('semua', 'divisi', 'personal')),
  divisi_ids uuid[] not null default '{}',
  user_ids uuid[] not null default '{}',
  mulai_at timestamptz,
  deadline_at timestamptz,
  tampilkan_pembuat boolean not null default true,
  dibuat_oleh uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tugas_aktif on tugas(aktif);

create table if not exists tugas_progres (
  tugas_id uuid not null references tugas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'belum' check (status in ('belum', 'selesai', 'kendala')),
  catatan text,
  diperbarui_at timestamptz not null default now(),
  primary key (tugas_id, user_id)
);

create index if not exists idx_tugas_progres_user on tugas_progres(user_id);

-- Pembuat diisi otomatis dari akun yang login (tidak bisa dipalsukan dari aplikasi).
create or replace function isi_pembuat_tugas() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.dibuat_oleh := auth.uid();
  else
    new.dibuat_oleh := old.dibuat_oleh;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_isi_pembuat_tugas on tugas;
create trigger trg_isi_pembuat_tugas
  before insert or update on tugas
  for each row execute function isi_pembuat_tugas();

-- Apakah pegawai yang login termasuk sasaran tugas ini?
create or replace function tugas_untuk_saya(t tugas) returns boolean
language sql stable security definer set search_path = public as $$
  select t.sasaran = 'semua'
      or (t.sasaran = 'personal' and auth.uid() = any(t.user_ids))
      or (t.sasaran = 'divisi' and exists (
            select 1 from profiles p
            where p.id = auth.uid() and p.divisi_id = any(t.divisi_ids)
          ));
$$;

alter table tugas enable row level security;
alter table tugas_progres enable row level security;

drop policy if exists tugas_select on tugas;
create policy tugas_select on tugas for select to authenticated
  using (is_admin() or (aktif and (mulai_at is null or mulai_at <= now()) and tugas_untuk_saya(tugas)));
drop policy if exists tugas_insert_admin on tugas;
create policy tugas_insert_admin on tugas for insert to authenticated with check (is_admin());
drop policy if exists tugas_update_admin on tugas;
create policy tugas_update_admin on tugas for update to authenticated using (is_admin());
drop policy if exists tugas_delete_admin on tugas;
create policy tugas_delete_admin on tugas for delete to authenticated using (is_admin());

-- Pegawai hanya melihat & mengubah progresnya sendiri, dan hanya untuk tugas
-- aktif yang memang ditujukan kepadanya. Admin melihat semuanya.
drop policy if exists tugas_progres_select on tugas_progres;
create policy tugas_progres_select on tugas_progres for select to authenticated
  using (is_admin() or user_id = auth.uid());
drop policy if exists tugas_progres_insert on tugas_progres;
create policy tugas_progres_insert on tugas_progres for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from tugas t where t.id = tugas_id and t.aktif and tugas_untuk_saya(t))
  );
drop policy if exists tugas_progres_update on tugas_progres;
create policy tugas_progres_update on tugas_progres for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from tugas t where t.id = tugas_id and t.aktif and tugas_untuk_saya(t))
  );
drop policy if exists tugas_progres_delete_admin on tugas_progres;
create policy tugas_progres_delete_admin on tugas_progres for delete to authenticated using (is_admin());

-- Saklar menu Tugas Undangan di halaman Tugas pegawai (bisa dimatikan admin
-- setelah acara selesai, tanpa menghapus datanya).
alter table pengaturan add column if not exists fitur_tugas_undangan boolean not null default true;
