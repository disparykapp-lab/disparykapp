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

## Kriteria diterima

Lihat checklist lengkap di bagian 16 [`disparyk-app-spec.md`](./disparyk-app-spec.md#16-kriteria-diterima-acceptance). Semua item sudah diimplementasikan: validasi geofence/akurasi/waktu di server, larangan unggah galeri, satu absen/hari, isolasi data per role, rekap + ekspor, dan kalender konten dengan alur status sesuai peran.
