# DisparYK

Aplikasi web internal **Dinas Pariwisata Kota Yogyakarta**: absensi berbasis lokasi + foto (anti-manipulasi) dan kalender konten media sosial, dalam satu aplikasi.

Spesifikasi lengkap ada di [`disparyk-app-spec.md`](./disparyk-app-spec.md). Dokumen ini adalah panduan menjalankan & men-deploy aplikasinya.

## Tech Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS v4
- **Landing page:** GSAP (ScrollTrigger, Flip) + Lenis, lazy-loaded
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
   11. `0011_perbaikan_policy_avatar.sql` — pastikan ulang policy RLS bucket `avatar` (jaga-jaga
       kalau sempat hilang, mis. karena bucket dihapus & dibuat ulang lewat Dashboard).
   12. `0012_pendaftaran_mandiri.sql` — fungsi `daftar_mandiri` untuk halaman pendaftaran
       tersembunyi `/daftar` (akun baru nonaktif sampai disetujui admin).
   13. `0013_perbaikan_endpoint_hapus_foto.sql` — perbaiki endpoint Storage API yang salah
       bentuk di `bersihkan_foto_lama()` (0007) sehingga pembersihan foto otomatis gagal
       terus dengan "Bucket not found".
   14. `0014_distribusi_undangan.sql` — tabel `undangan` untuk fitur pembagian tugas
       penyebaran undangan (menu Kelola → Distribusi Undangan / pegawai → Tugas Undangan),
       sudah berisi 451 baris seed data dari daftar undangan WJNC.
   15. `0015_perbaikan_tugas_undangan.sql` — hapus kolom `bukti_url` (tidak dipakai) dan
       tambah kolom `lokasi_pengantaran` yang boleh diisi admin maupun pegawai (PIC), beda
       dari `lokasi_parkir` yang tetap khusus admin.
   16. `0016_tanda_tangan_undangan.sql` — kolom `tanda_tangan_url` di `undangan` + bucket
       storage privat `tanda_tangan`, dipakai sebagai bukti penerimaan (tanda tangan tamu
       undangan) saat petugas menandai tugas "Selesai"; tidak ditampilkan di halaman admin,
       admin cuma lihat progresnya.
   17. `0017_wajib_absen.sql` — kolom `profiles.wajib_absen` (default true) untuk mengatur
       pegawai wajib absen atau tidak; yang tidak wajib tidak dihitung "tidak absen" di
       rekap dan tidak ikut peringkat kerajinan. Hanya admin yang bisa mengubahnya.
   18. `0018_tim_undangan.sql` — tabel `tim` & `tim_anggota` dan kolom `undangan.pic_tim_id`,
       supaya undangan bisa ditugaskan ke satu tim (gabungan beberapa pegawai, rencana
       pemakaian 2 orang per tim) selain ke satu pegawai; anggota tim yang ditugaskan boleh
       ikut mengubah status/lokasi/tanda tangan baris itu.
   19. `0019_landing_page.sql` — tabel `landing_konten` (isi landing page publik dalam JSON,
       satu baris per bagian) dan bucket Storage publik `landing` untuk foto landing. Pengunjung
       tanpa login boleh membaca; hanya admin yang boleh menulis.
   20. `0021_super_admin.sql` — kolom `profiles.super_admin` (default `false`), penanda
       tambahan di atas role "admin" biasa. Set lewat SQL Editor:
       `update profiles set super_admin = true where email = '...';` (tidak perlu mematikan
       trigger seperti langkah "Buat admin pertama" di bawah).
   21. `0022_kontrol_super_admin.sql` — menu **Kelola → Super Admin** (cuma tampil untuk akun
       `super_admin = true`, lihat poin di atas): koreksi bebas data absensi siapa saja
       (jam, status, mode, GPS, IP — menggantikan koreksi manual lewat SQL Editor), kelola
       siapa saja yang jadi super admin, dan log aktivitas super admin. Semua lewat RPC yang
       dicek `is_super_admin()` di sisi database, dan tiap aksi tercatat di tabel
       `log_super_admin`. Tidak mengubah tampilan akun super admin di mata admin lain —
       role-nya tetap terlihat "Admin" biasa.
   22. `0023_login_admin.sql` — tab "Log Aktivitas" di menu Super Admin menampilkan juga waktu
       login terakhir tiap admin (diambil dari `auth.users.last_sign_in_at` bawaan Supabase
       Auth lewat RPC `super_admin_login_admin`, bukan tabel/trigger baru).
   23. `0027_ucapan_ulang_tahun.sql` — tabel `ucapan_ulang_tahun`. Di beranda: kalau hari ini
       ulang tahun pengguna sendiri (dari `profiles.tanggal_lahir` yang sudah ada), tampil
       kartu animasi + daftar ucapan yang masuk; kalau hari ini ulang tahun rekan **sedivisi**,
       tampil kartu pengingat dengan kolom kirim ucapan langsung (satu ucapan per orang per
       hari, dicegah lewat constraint unik).
   24. `0028_game_coret_tebak.sql` — game tebak gambar multipemain "Coret Tebak" (lihat bagian
       **Game Coret Tebak** di bawah). Membuat tabel `game_*`, fungsi RPC `game_*`, bank kata 7
       tema, dan menambahkan tabel game ke publikasi Realtime.
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

## Landing page publik

- Alamat utama (`/`) sekarang adalah **landing page** publik, bukan dashboard. Dashboard pegawai pindah ke `/beranda` (perlu login).
- Desain mengikuti referensi Roamly (`roamly-landing-spec.md`), dengan isi Dinas Pariwisata Kota Yogyakarta. Animasi memakai GSAP (ScrollTrigger, Flip) dan Lenis; chunk-nya dimuat terpisah (lazy) supaya aplikasi absensi tidak ikut mengunduhnya.
- **Admin mengubah isi landing** lewat *Kelola → Landing Page*: foto, judul, teks, destinasi, gaya wisata, agenda, berita terkini, testimoni, newsletter, dan footer. Tiap bagian bisa disembunyikan. Foto diperkecil otomatis ke WebP (maks. 1600 px) sebelum diunggah.
- Bagian paket/agenda, berita, dan testimoni **disembunyikan dulu** sampai admin mengisi data aslinya. Jangan mengisi testimoni fiktif.
- Wishlist destinasi tersimpan di localStorage perangkat (tidak ke database).
- Form newsletter hanya validasi di browser; email **tidak** disimpan atau dikirim ke mana pun.
- Pengaturan gerak: kalau pengguna mengaktifkan *reduced motion*, animasi dimatikan dan konten tetap tampil.
- **Cuaca (opsional per destinasi):** halaman detail destinasi bisa menampilkan prakiraan cuaca 3 hari dari [API publik BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) (`api.bmkg.go.id/publik/prakiraan-cuaca`, gratis, tanpa API key, CORS diizinkan) kalau admin mengisi kode wilayah kelurahannya di item destinasi. Dipanggil langsung dari browser pengunjung (bukan lewat server kita) dan dicache di `sessionStorage` 1 jam. Kalau kode belum diisi atau BMKG gagal dihubungi, widget-nya cukup disembunyikan.

Sumber foto bawaan: belum ada. Setiap foto memakai gradien placeholder sampai admin mengunggah foto asli (berlisensi) lewat editor. Pastikan foto yang diunggah bukan hasil hotlink.

## Fitur Naskah AI (opsional)

Menu **Naskah AI** (`/naskah-ai`) punya dua slide — geser ke kanan atau tekan tab di atas untuk
pindah:
- **📝 Naskah**: naskah liputan lewat kolom-kolom terstruktur (jenis acara, lokasi, poin
  kegiatan, gaya naskah, dst — bukan prompt bebas).
- **🎤 Pertanyaan Wawancara**: daftar pertanyaan wawancara siap pakai dari topik + narasumber.

Keduanya dirangkai jadi prompt dan dikirim ke OpenAI oleh **Edge Function**, bukan langsung dari
browser. Ini **wajib** supaya API key OpenAI tidak pernah sampai ke kode yang bisa dibaca
pengunjung (jangan pernah taruh API key AI apa pun di variabel `VITE_...` — itu ikut ter-bundle
ke JS publik).

Setup (sekali di awal, opsional — kalau tidak di-setup, menunya sendiri hanya muncul untuk
divisi yang diaktifkan lewat *Kelola → Divisi*, jadi aman dibiarkan kalau belum dipakai):

1. Jalankan berurutan di SQL Editor: `0024_naskah_ai.sql`, `0025_riwayat_naskah_ai_bersama.sql`,
   `0026_pertanyaan_wawancara_ai.sql` (kolom `divisi.fitur_naskah_ai`, tabel riwayat `naskah_ai`
   dengan kolom `tipe`, dan RPC `super_admin_hapus_naskah_ai`).
2. Deploy Edge Function `supabase/functions/naskah-ai/index.ts` (satu function menangani kedua
   slide lewat field `tipe` di payload — kalau sudah pernah deploy untuk fitur Naskah, **deploy
   ulang** dengan isi file yang terbaru supaya slide Pertanyaan Wawancara ikut berfungsi):
   - **Lewat Dashboard** (tidak perlu install apa pun): Supabase Dashboard → **Edge Functions** →
     *Create a new function* (atau buka function `naskah-ai` yang sudah ada → Edit) → tempel isi
     file `supabase/functions/naskah-ai/index.ts` → Deploy.
   - **Atau lewat CLI**: `supabase functions deploy naskah-ai`.
3. **Isi API key OpenAI sebagai secret** (bukan di `.env`): Dashboard → **Edge Functions** →
   **Secrets** → tambah `OPENAI_API_KEY` = `sk-...` (ambil dari [platform.openai.com](https://platform.openai.com/api-keys)).
   Lewat CLI: `supabase secrets set OPENAI_API_KEY=sk-...`. Key ini cuma bisa dibaca oleh Edge
   Function di server Supabase, tidak pernah dikirim ke browser pengunjung.
4. Aktifkan lewat *Kelola → Divisi* → centang "Naskah AI" untuk divisi yang boleh memakai (admin selalu bisa akses tanpa perlu dicentang).
5. Pakai model `gpt-4o-mini` (murah, cukup untuk naskah liputan) — hardcoded di Edge Function, ganti baris `model:` di dalamnya kalau mau model lain.

Tiap naskah yang dibuat otomatis tersimpan ke tabel `naskah_ai` (siapa yang membuat, isian
formnya, hasilnya) sebagai riwayat **bersama** — semua pegawai yang bisa akses menu ini saling
melihat riwayat naskah satu sama lain, bukan cuma punya sendiri. Cuma **super admin** yang bisa
menghapus baris riwayat siapa pun, lewat tombol "Hapus" yang muncul khusus untuk mereka; aksi
hapusnya tercatat juga di log super admin (lihat bagian "Kontrol khusus super admin" di atas).

## Game Coret Tebak

Menu **Coret Tebak** di Beranda (`/game`): tebak gambar multipemain 2–10 orang — lobi, buat
room (tema, waktu 60/90/120 dtk, 1–5 ronde, publik/privat), ruang tunggu, pilih kata, menggambar
& menebak, reveal, lalu podium juara. Desain & alurnya mengikuti
`Brief_Aset_Visual_Game_Tebak_Gambar.md`. Gambar aslinya (PNG transparan 2000 px, ±91 MB)
ada di folder `aset-game-sumber/` yang **tidak di-commit** (masuk `.gitignore`); yang dipakai
aplikasi adalah versi WebP kecilnya di `src/features/game/assets/` (dipangkas margin
transparannya dan diperkecil ke ±3× ukuran tampil, total ±0,6 MB). Kalau mengganti gambar,
optimalkan dulu ke WebP dengan ukuran serupa — jangan taruh PNG 2000 px langsung, dan jangan
taruh di `dist/` (folder itu dikosongkan setiap build).

Cara kerjanya (penting kalau mau mengubah):
- **Server yang memegang aturan.** Kata jawaban ada di tabel `game_rahasia` yang cuma bisa
  dibaca penggambar giliran itu; penilaian tebakan, skor, dan pergantian fase semua di fungsi
  SQL `SECURITY DEFINER`. Klien tidak pernah menerima jawaban sebelum reveal.
- **Waktu dari jam server.** Tiap pemain memanggil `game_detak` tiap ~5 dtk; fungsi itu yang
  memajukan fase kalau tenggat lewat, jadi permainan tetap jalan walau penggambar menutup
  tab. Respons detak juga dipakai klien untuk mengoreksi jam HP yang meleset.
- **Coretan kanvas tidak disimpan**: dikirim langsung antar-pemain lewat Realtime Broadcast
  (channel `coret-tebak:<room_id>`). Pemain yang tersambung ulang otomatis meminta gambar
  terbaru ke penggambar. Channel broadcast ini publik, jadi secara teknis pengguna login yang
  usil bisa mengirim coretan palsu — klien hanya menerima coretan dari id penggambar giliran
  itu, dan untuk game internal kantor risiko ini dianggap wajar.
- Kode & aset game dimuat **lazy** (chunk `GamePage`), tidak menambah unduhan awal aplikasi absensi.
- **Musik latar** `src/features/game/assets/backsound_game.mp3` (128 kbps, ±2,4 MB) diputar
  berulang selama di halaman `/game*`, volume 30%. Browser memblokir audio sebelum ada
  interaksi, jadi musik mulai pada ketukan pertama; tombol speaker game mematikan musik
  sekaligus efek suara. Ganti lagunya cukup timpa file itu (jangan taruh di `dist/` — folder
  itu dikosongkan setiap build).
- Bank kata ada di tabel `game_kata` (tema: umum, jogja, kuliner, hewan, wisata, kantor,
  aktivitas) — tambah kata cukup `insert into game_kata (tema, kata) values (...)`.
- Uji logika (normalisasi tebakan, skor, peringkat, transisi fase): `npm test`.

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
  landing/        # Landing page publik (/): bagian-bagian, efek GSAP/Lenis, skema isi
  pages/admin/    # Kelola: Pegawai, Divisi, Pengaturan, Tinjau Absensi, Landing Page
  features/game/  # Game Coret Tebak (lazy): komponen layar, kanvas, logika, aset WebP
  types/          # tipe tabel database
supabase/migrations/  # SQL: skema, RLS, RPC, storage (jalankan berurutan)
tests/            # uji logika murni (npm test, pakai node --test)
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
