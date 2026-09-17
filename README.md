# DisparYK

Aplikasi web internal **Dinas Pariwisata Kota Yogyakarta**: absensi berbasis lokasi + foto (anti-manipulasi) dan kalender konten media sosial, dalam satu aplikasi.

Spesifikasi lengkap ada di [`disparyk-app-spec.md`](./disparyk-app-spec.md). Dokumen ini adalah panduan menjalankan & men-deploy aplikasinya.

## Tech Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS v4
- **Auth, Database, Storage:** Supabase (Auth Google, Postgres, Storage)
- **Logika sensitif** (jarak ke kantor, waktu absen, aturan telat): fungsi Postgres RPC `SECURITY DEFINER` — **bukan** di frontend
- **Hosting:** Render (Static Site), auto-deploy dari GitHub

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

## Setup Supabase (sekali di awal)

1. Buat project di [supabase.com](https://supabase.com). Catat **Project URL** dan **anon public key** (Settings → API).
2. **Auth → Providers → Google**: aktifkan, isi Client ID/Secret dari Google Cloud Console (buat OAuth Client, Authorized redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`).
3. **Auth → URL Configuration**: tambahkan URL aplikasi (lokal `http://localhost:5173` dan domain Render nanti) ke **Site URL** / **Redirect URLs**.
4. Buka **SQL Editor**, jalankan berurutan isi file di `supabase/migrations/`:
   1. `0001_schema.sql` — tabel, RLS, fungsi helper, seed divisi & pengaturan
   2. `0002_rpc_absensi.sql` — fungsi `absen_masuk` / `absen_pulang`
   3. `0003_storage.sql` — bucket privat `absensi` + kebijakan akses foto
   4. `0004_fitur_divisi.sql` — kolom hak akses fitur per divisi (mis. Kalender Konten)
   5. `0005_retensi_dan_klarifikasi.sql` — retensi data otomatis, RPC tandai absensi &
      klarifikasi pegawai. **Butuh extension `pg_cron`** (Database → Extensions → cari
      "pg_cron" → Enable, kalau belum aktif) supaya `create extension pg_cron` di file ini
      berhasil. Kalau extension ini tidak tersedia di plan/region kamu, jalankan bagian lain
      file ini dulu (skip dua blok `select cron.schedule(...)` di paling bawah) — pembersihan
      otomatis tidak akan jalan, tapi fitur lain (tandai, klarifikasi) tetap berfungsi.
   6. `0006_klarifikasi_izin.sql` — status "izin" + perbaikan klarifikasi untuk hari tanpa
      absen sama sekali.
   7. `0007_hapus_foto_via_storage_api.sql` — perbaikan pembersihan foto (Supabase memblokir
      penghapusan langsung lewat SQL biasa; versi ini lewat Storage API via `pg_net`).
      **Setelah menjalankan file ini**, isi dua secret berikut **langsung di SQL Editor**
      (jangan pernah commit nilai aslinya ke git):
      ```sql
      select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
      select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
      ```
      Project URL & service_role key ada di **Settings → API** (service_role key yang
      **secret**, bukan anon key). Tanpa dua secret ini, pembersihan foto otomatis
      diam-diam tidak melakukan apa-apa (tidak error, cuma belum aktif).
   8. `0008_kelola_foto_absensi.sql` — policy hapus foto manual (admin) + RPC pendukungnya,
      dipakai menu *Kelola → Foto Absensi*.
   9. `0009_konten_untuk_user.sql` — pegawai biasa (bukan cuma admin) boleh menambah konten
      baru, dan boleh mengedit/menghapus konten yang dia buat sendiri atau yang PIC-nya dia.
   10. `0010_profil_karyawan.sql` — kolom profil (tanggal lahir, asal sekolah, masa magang) +
       bucket Storage publik `avatar` untuk foto profil.
5. **Isi koordinat kantor asli** lewat menu *Kelola → Pengaturan Kantor* di aplikasi (atau `update pengaturan set kantor_lat=..., kantor_lng=... where id=1;`) — absen mode "Di Kantor" tidak akan berfungsi sebelum ini diisi.
6. **Buat admin pertama:**
   - Login sekali ke aplikasi pakai akun Google admin (supaya baris muncul di `auth.users`).
   - Login pertama akan ditolak ("belum didaftarkan") — itu wajar, karena `profiles` masih kosong.
   - Di SQL Editor, jadikan admin lewat email (matikan trigger `trg_proteksi_profil`
     sementara — trigger ini menolak perubahan `role` yang tidak datang dari sesi
     login, jadi query dari SQL Editor perlu bypass sesaat):
     ```sql
     alter table profiles disable trigger trg_proteksi_profil;

     insert into profiles (id, nama, email, role)
     select id, 'Nama Admin', email, 'admin'
     from auth.users
     where email = 'admin@email-asli.com'
     on conflict (email) do update set id = excluded.id, role = 'admin';

     alter table profiles enable trigger trg_proteksi_profil;
     ```
   - Login ulang di aplikasi — sekarang masuk sebagai admin.
   - Pegawai berikutnya **tidak perlu langkah SQL manual**: admin cukup mendaftarkan email mereka lewat *Kelola → Pegawai*, lalu pegawai tinggal "Masuk dengan Google". (Baris profil yang didaftarkan admin otomatis "diklaim" oleh akun Google yang cocok emailnya saat login pertama — lihat fungsi `klaim_profil()` di `0001_schema.sql`.)

## Deploy ke Render

1. Push repo ini ke GitHub.
2. Render → **New → Static Site**, hubungkan repo.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Setelah dapat domain Render, tambahkan ke **Redirect URLs** Supabase Auth dan **Authorized JavaScript origins/redirect URIs** di Google Cloud Console OAuth Client.

Static Site di Render memakai tier gratis dan **tidak tidur** (beda dari Web Service gratis).

## Struktur proyek

```
src/
  components/     # KameraLive (kamera live+watermark), Guard, BottomNav, dll
  contexts/       # AuthContext (login Google, whitelist, sesi)
  lib/            # supabase client, RPC absensi, rekap, konten, tanggal
  pages/          # Beranda, Absen, Rekap, Kalender, KontenForm
  pages/admin/    # Kelola: Pegawai, Divisi, Pengaturan, Tinjau Absensi
  types/          # tipe tabel database
supabase/migrations/  # SQL: skema, RLS, RPC, storage (jalankan berurutan)
```

## Catatan penting: batasan anti-pemalsuan lokasi

Aplikasi ini **mempersulit dan mendeteksi** kecurangan absen, bukan mencegahnya 100%:

- Waktu absen dicatat oleh **server** (`now()` Postgres), bukan jam HP — mengubah jam HP tidak berpengaruh.
- Jarak ke kantor dihitung **di server** dari titik & radius yang diatur admin — client tidak bisa mengklaim "di kantor" begitu saja.
- Akurasi GPS dibatasi; lokasi kasar (indikasi lokasi dari IP, bukan GPS asli) ditolak.
- Foto **wajib** diambil langsung dari kamera (`getUserMedia`) dengan watermark nama/waktu/koordinat — tidak ada opsi unggah dari galeri.
- Satu entri per pegawai per hari (`UNIQUE(user_id, tanggal)`).
- IP pemanggil dicatat untuk jejak audit; admin bisa meninjau lewat *Kelola → Tinjau Absensi*.

Namun aplikasi **web** tetap bisa diakali lewat DevTools browser, ekstensi fake-GPS, atau HP yang di-root — ini keterbatasan yang melekat pada platform web dan **tidak bisa dijanjikan "anti-palsu total"**. Untuk jaminan lebih tinggi, dibutuhkan aplikasi native (Android) dengan deteksi mock-location & device attestation — di luar cakupan versi ini.

## Catatan penting: retensi data otomatis

Supaya penyimpanan gratis tidak penuh, data lama **dihapus otomatis dan permanen** lewat
penjadwal database (`pg_cron`, lihat `0005_retensi_dan_klarifikasi.sql`):

- **Foto absen**: dihapus setelah `retensi_foto_hari` hari (default 3 hari).
- **Data absensi** (baris lengkap): dihapus setelah `retensi_absensi_bulan` bulan (default 3
  bulan). Aplikasi menampilkan peringatan di halaman Kelola mulai 7 hari sebelum data pertama
  kena hapus — ekspor Excel dari menu Rekap sebelum itu kalau datanya masih dibutuhkan.

Kedua angka ini bisa diubah admin lewat *Kelola → Pengaturan Kantor*. **Penghapusan tidak bisa
dibatalkan** — tidak ada cadangan otomatis di luar aplikasi.

## Kriteria diterima

Lihat checklist lengkap di bagian 16 [`disparyk-app-spec.md`](./disparyk-app-spec.md#16-kriteria-diterima-acceptance). Semua item sudah diimplementasikan: validasi geofence/akurasi/waktu di server, larangan unggah galeri, satu absen/hari, isolasi data per role, rekap + ekspor, dan kalender konten dengan alur status sesuai peran.
