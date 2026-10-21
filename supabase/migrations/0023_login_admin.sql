-- =========================================================
-- DisparYK — 0023: Info login terakhir admin (khusus super admin)
-- Jalankan setelah 0001-0022.
--
-- auth.users.last_sign_in_at sudah otomatis diisi Supabase Auth setiap
-- login berhasil — tidak perlu tabel/trigger baru untuk mencatatnya.
-- Fungsi ini cuma menjembatani data itu ke akun super admin lewat RPC
-- SECURITY DEFINER, karena skema auth tidak diekspos langsung lewat
-- PostgREST (dan memang tidak boleh — di sana ada kolom sensitif lain
-- seperti password terenkripsi).
-- =========================================================

create or replace function super_admin_login_admin()
returns table (
  user_id uuid,
  nama text,
  email text,
  last_sign_in_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'Hanya super admin yang bisa melihat info login admin.';
  end if;

  return query
    select p.id, p.nama, p.email, u.last_sign_in_at
    from profiles p
    left join auth.users u on u.id = p.id
    where p.role = 'admin'
    order by u.last_sign_in_at desc nulls last;
end;
$$;
