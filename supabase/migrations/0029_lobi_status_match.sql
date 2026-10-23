-- =========================================================
-- DisparYK — 0029: Lobi Coret Tebak menampilkan status match
-- Jalankan setelah 0028.
--
-- game_daftar_lobi() sebelumnya hanya mengembalikan room publik yang masih
-- MENUNGGU. Sekarang juga:
--   * room publik yang SEDANG MAIN (memilih / menggambar / reveal), selama
--     masih ada penghuni yang online — supaya kelihatan di lobi beserta
--     ronde & siapa yang sedang menggambar;
--   * room yang DIIKUTI pengguna sendiri (termasuk privat), supaya bisa
--     kembali ke match yang sempat ditinggal (detak terakhir < 3 jam).
-- Data per room ditambah: status, giliran, total giliran, penggambar,
-- saya_anggota, serta skor & status online tiap pemain (untuk detail room).
-- Kata jawaban tetap TIDAK pernah ikut dikirim.
-- =========================================================

create or replace function game_daftar_lobi() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(baris order by saya desc, urut_status, dibuat_at desc), '[]'::jsonb)
  from (
    select
      exists (select 1 from game_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif) as saya,
      case r.status when 'menunggu' then 0 else 1 end as urut_status,
      r.dibuat_at,
      jsonb_build_object(
        'id', r.id, 'kode', r.kode, 'tema', r.tema, 'waktu_gambar', r.waktu_gambar,
        'jumlah_ronde', r.jumlah_ronde, 'maks_pemain', r.maks_pemain, 'publik', r.publik,
        'status', r.status, 'giliran_ke', r.giliran_ke,
        'total_giliran', coalesce(array_length(r.urutan, 1), 0),
        'host_id', r.host_id,
        'host_nama', (select nama from profiles where id = r.host_id),
        'penggambar_nama', (select nama from profiles where id = r.penggambar_id),
        'saya_anggota', exists (select 1 from game_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif),
        'pemain', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'user_id', p.user_id, 'nama', pr.nama, 'foto_url', pr.foto_url,
            'skor', p.skor, 'online', game_online(r.id, p.user_id)
          ) order by p.skor desc, p.bergabung_at), '[]'::jsonb)
          from game_pemain p join profiles pr on pr.id = p.user_id
          where p.room_id = r.id and p.aktif
        )
      ) as baris
    from game_room r
    where auth.uid() is not null
      and r.status <> 'selesai'
      and (
        (
          exists (select 1 from game_pemain p where p.room_id = r.id and p.user_id = auth.uid() and p.aktif)
          and r.diperbarui_at > now() - interval '3 hours'
        )
        or (
          r.publik
          and exists (
            select 1 from game_kehadiran k
            where k.room_id = r.id and k.terakhir_aktif > now() - interval '40 seconds'
          )
        )
      )
    order by r.dibuat_at desc
    limit 40
  ) x;
$$;
