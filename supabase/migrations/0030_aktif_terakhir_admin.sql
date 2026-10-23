-- =========================================================
-- DisparYK — 0030: "Login terakhir" admin jadi "terakhir aktif"
-- Jalankan setelah 0023.
--
-- auth.users.last_sign_in_at hanya berubah saat benar-benar login (tombol
-- Google). Admin yang tidak pernah logout tetap memakai sesi lama yang
-- diperpanjang otomatis (token di-refresh tiap dibuka), jadi tanggalnya
-- tertahan di login pertama. Sekarang diambil yang paling baru dari:
--   * last_sign_in_at (login lewat Google), dan
--   * auth.sessions.updated_at / refreshed_at (sesi diperpanjang = aplikasi
--     dibuka lagi).
-- Kolom last_sign_in_at tetap dikirim; kolom baru terakhir_aktif yang dipakai
-- tampilan. Ganti tipe kembalian = fungsi lama harus di-drop dulu.
-- =========================================================

drop function if exists super_admin_login_admin();

create function super_admin_login_admin()
returns table (
  user_id uuid,
  nama text,
  email text,
  last_sign_in_at timestamptz,
  terakhir_aktif timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa melihat info login admin.';
  end if;

  return query
    select
      p.id,
      p.nama,
      p.email,
      u.last_sign_in_at,
      greatest(
        u.last_sign_in_at,
        (select max(greatest(s.updated_at, s.refreshed_at at time zone 'UTC'))
           from auth.sessions s where s.user_id = p.id)
      ) as terakhir_aktif
    from profiles p
    left join auth.users u on u.id = p.id
    where p.role = 'admin'
    order by 5 desc nulls last;
end;
$$;

revoke execute on function super_admin_login_admin() from public, anon;
grant execute on function super_admin_login_admin() to authenticated;
