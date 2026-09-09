# DisparYK App — Spesifikasi Pembangunan Aplikasi

Aplikasi web internal untuk **Dinas Pariwisata Kota Yogyakarta**: **absensi berbasis lokasi + foto** (anti-manipulasi) dan **kalender konten** media sosial, dalam satu aplikasi.

Dokumen ini adalah instruksi untuk membangun aplikasi **dari nol**. Ikuti urutan build di bagian akhir. Tulis semua teks antarmuka dalam **Bahasa Indonesia yang sederhana** (target pengguna termasuk pegawai senior/orang tua — hindari istilah teknis di layar).

---

## 1. Tujuan & Prinsip

- **Absensi yang sulit dimanipulasi.** Ini prioritas utama. Semua aturan penting divalidasi di **server**, bukan hanya di browser.
- **Sederhana untuk dipakai.** Buka aplikasi → satu-dua ketukan → selesai. Tombol besar, tulisan jelas, alur pendek.
- **Gratis dulu.** Pakai layanan tier gratis: GitHub, Render, Supabase (Auth + Database + Storage).
- **UI/UX sederhana tapi rapi & modern.** Bersih, kontras baik, tidak membingungkan.

---

## 2. Tech Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| Frontend | **React + Vite + TypeScript**, styling **Tailwind CSS** | Ringan, cepat, mudah di-deploy sebagai static site |
| Autentikasi | **Supabase Auth** (Google) | Login Google + kelola akun tanpa server sendiri |
| Database | **Supabase Postgres** | Gratis, sekalian tempat logika server via fungsi RPC |
| Penyimpanan foto | **Supabase Storage** (bucket privat) | Foto absen aman, hanya bisa dilihat pemilik & admin |
| Logika server (validasi) | **Postgres RPC function** (`SECURITY DEFINER`) | Geofence & waktu dihitung di server, tidak bisa diakali client |
| Hosting frontend | **Render (Static Site)** | Static site di Render **tidak "tidur"** (beda dengan Web Service gratis) |
| Repo & deploy | **GitHub** → auto-deploy ke Render | Push = deploy |

**Kenapa tanpa backend server terpisah?** Semua logika sensitif (cek jarak ke kantor, waktu server, aturan absen) ditaruh di **fungsi Postgres RPC** di Supabase. Frontend hanya memanggil fungsi itu. Jadi tidak ada server Node/Flask yang perlu di-maintain, dan Render cukup menyajikan file statis (hemat + tidak tidur).

---

## 3. Peran (Role)

Dua peran, disimpan di kolom `role` tabel `profiles`:

- **`admin`** — kelola pegawai, atur lokasi kantor & jam kerja, kelola divisi, lihat semua absensi + foto + peta, buat/atur kalender konten, ekspor rekap.
- **`user`** — absen masuk/pulang, lihat riwayat & rekap **milik sendiri**, lihat kalender konten, tandai konten miliknya selesai.

Admin pertama dibuat manual lewat SQL (lihat bagian Deploy).

---

## 4. Divisi (Bidang)

Divisi **tidak boleh di-hardcode** — simpan di tabel `divisi` dan bisa diedit admin.

> ⚠️ **Wajib dikonfirmasi ke Dispar Kota Yogyakarta.** Struktur di bawah adalah **default umum** untuk Dinas Pariwisata dan bisa berbeda dengan SOTK terbaru. Admin harus menyesuaikan lewat menu "Kelola Divisi".

Seed awal (silakan ganti sesuai kenyataan di lapangan):

1. Sekretariat
2. Bidang Pengembangan Destinasi Pariwisata
3. Bidang Pemasaran Pariwisata
4. Bidang Ekonomi Kreatif
5. Kelompok Jabatan Fungsional

---

## 5. Autentikasi (Login Google)

- **Login utama: Google** (Supabase Auth provider Google). Pengguna tekan "Masuk dengan Google", pilih akun, selesai. Cocok untuk pengguna senior karena tidak perlu ingat password.
- **Reset password lewat Google:** karena login memakai akun Google, **tidak ada password terpisah** yang perlu diingat/di-reset di aplikasi. Kalau lupa akses, pemulihan dilakukan lewat Google (bukan tanggung jawab aplikasi). Ini memenuhi permintaan "reset password pakai Google".
- **Whitelist akun:** hanya email yang sudah didaftarkan admin (ada di tabel `profiles`) yang boleh masuk. Saat pertama login Google, cek apakah email terdaftar:
  - Terdaftar → buat/isi sesi, arahkan ke Beranda.
  - Tidak terdaftar → tampilkan pesan "Akun kamu belum didaftarkan. Hubungi admin." lalu logout.
- (Opsional, jika diminta nanti) email + password sebagai cadangan, memakai email reset bawaan Supabase.

---

## 6. Model Data (Database)

Semua tabel pakai RLS (Row Level Security) **ON**. Penulisan ke tabel absensi **hanya** lewat RPC.

### 6.1 `divisi`
| kolom | tipe | ket |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| nama | text not null | |
| aktif | boolean default true | |
| created_at | timestamptz default now() | |

### 6.2 `profiles`
| kolom | tipe | ket |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| nama | text not null | |
| email | text not null unique | |
| role | text not null default 'user' | 'admin' \| 'user' |
| divisi_id | uuid FK → divisi.id | |
| jabatan | text | opsional |
| foto_url | text | avatar opsional |
| aktif | boolean default true | pegawai nonaktif tak bisa absen |
| created_at | timestamptz default now() | |

### 6.3 `pengaturan` (satu baris konfigurasi kantor)
| kolom | tipe | ket |
|---|---|---|
| id | int PK default 1 (constraint hanya 1 baris) | |
| kantor_lat | double precision | koordinat kantor |
| kantor_lng | double precision | |
| radius_meter | int default 100 | radius geofence |
| akurasi_maks_meter | int default 100 | tolak GPS kalau akurasi lebih buruk dari ini |
| jam_masuk | time default '08:00' | untuk status telat |
| jam_pulang | time default '16:00' | |
| timezone | text default 'Asia/Jakarta' | WIB |

### 6.4 `absensi` (satu baris per pegawai per hari)
| kolom | tipe | ket |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| tanggal | date not null | tanggal WIB |
| **masuk_at** | timestamptz | **diisi server** (`now()`) |
| masuk_lat / masuk_lng | double precision | |
| masuk_akurasi | double precision | meter |
| masuk_mode | text | 'kantor' \| 'luar' |
| masuk_foto_path | text | path di Storage |
| masuk_catatan | text | wajib jika mode 'luar' |
| masuk_alamat | text | hasil reverse-geocode (opsional) |
| masuk_ip | text | dicatat untuk audit |
| **keluar_at** | timestamptz | diisi server |
| keluar_lat / keluar_lng / keluar_akurasi / keluar_mode / keluar_foto_path / keluar_catatan / keluar_alamat / keluar_ip | — | sama seperti masuk |
| status | text | 'hadir' \| 'telat' \| 'dinas_luar' |
| ditandai | boolean default false | true jika mencurigakan (perlu ditinjau admin) |
| alasan_tanda | text | mis. "akurasi rendah", "IP tidak cocok" |
| created_at / updated_at | timestamptz | |

**Constraint:** `UNIQUE(user_id, tanggal)`.

### 6.5 `konten` (kalender konten)
| kolom | tipe | ket |
|---|---|---|
| id | uuid PK | |
| judul | text not null | |
| deskripsi | text | caption/ide |
| platform | text | 'instagram' \| 'tiktok' \| 'facebook' \| 'youtube' \| 'twitter' \| 'website' |
| tanggal_tayang | date not null | |
| jam_tayang | time | opsional |
| status | text default 'ide' | 'ide' \| 'draft' \| 'dijadwalkan' \| 'tayang' \| 'batal' |
| pic_user_id | uuid FK → profiles.id | penanggung jawab |
| divisi_id | uuid FK → divisi.id | |
| aset_url | text | link Canva/Drive |
| dibuat_oleh | uuid FK → profiles.id | |
| created_at / updated_at | timestamptz | |

---

## 7. Fitur Absensi (INTI — anti-manipulasi)

### 7.1 Alur pengguna
Layar **Beranda** menampilkan status hari ini dan dua tombol besar:
- 🟢 **Absen Masuk** (aktif jika belum absen masuk hari ini)
- 🟠 **Absen Pulang** (aktif jika sudah masuk & belum pulang)

Saat tombol ditekan:
1. **Pilih mode:** "Di Kantor" atau "Dinas Luar". Jika "Dinas Luar" → wajib isi **catatan** (ke mana / keperluan).
2. **Ambil lokasi** dengan `navigator.geolocation.getCurrentPosition` opsi `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }`. Ambil `latitude`, `longitude`, `accuracy`.
3. **Ambil foto langsung (live):** buka kamera dengan `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`, tampilkan pratinjau, tombol "Ambil Foto" menangkap 1 frame ke `<canvas>`.
   - **Larang unggah dari galeri.** Jangan gunakan `<input type="file">`. Foto **harus** dari stream kamera saat itu.
   - **Watermark** di canvas sebelum diunggah: tumpuk nama pegawai, tanggal-jam (dari perangkat, hanya untuk tampilan), dan koordinat di pojok foto. (Data resmi tetap dari server.)
4. **Unggah foto** ke Supabase Storage bucket `absensi`, path `{user_id}/{tanggal}/{masuk|keluar}-{uuid}.jpg`.
5. **Panggil RPC** `absen_masuk(...)` / `absen_pulang(...)` dengan lat, lng, akurasi, mode, catatan, foto_path.
6. Tampilkan layar sukses besar: "✅ Absen masuk berhasil pukul 07:58" + alamat + peta kecil. Kalau gagal, pesan jelas ("Lokasi kamu terlalu jauh dari kantor. Kalau memang dinas luar, pilih 'Dinas Luar'.").

### 7.2 Validasi di SERVER (fungsi RPC) — bagian terpenting
Buat fungsi `SECURITY DEFINER` (jalan dengan hak elevated, tapi baca `auth.uid()` untuk tahu siapa pemanggil). Contoh `absen_masuk`:

```sql
create or replace function absen_masuk(
  p_lat double precision,
  p_lng double precision,
  p_akurasi double precision,
  p_mode text,             -- 'kantor' | 'luar'
  p_catatan text,
  p_foto_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cfg pengaturan%rowtype;
  v_jarak double precision;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_ditandai boolean := false;
  v_alasan text := null;
  v_status text := 'hadir';
begin
  if v_user is null then raise exception 'Belum login'; end if;
  -- pegawai harus aktif
  if not exists (select 1 from profiles where id = v_user and aktif) then
    raise exception 'Akun tidak aktif';
  end if;
  -- belum absen masuk hari ini
  if exists (select 1 from absensi where user_id = v_user and tanggal = v_today and masuk_at is not null) then
    raise exception 'Kamu sudah absen masuk hari ini';
  end if;

  select * into v_cfg from pengaturan where id = 1;

  -- 1) TOLAK GPS yang tidak meyakinkan (kemungkinan lokasi IP/palsu)
  if p_akurasi is null or p_akurasi > v_cfg.akurasi_maks_meter then
    raise exception 'Lokasi kurang akurat. Aktifkan GPS/izin lokasi presisi, lalu coba lagi.';
  end if;

  -- 2) GEOFENCE dihitung di server (haversine, meter)
  v_jarak := 6371000 * acos(
      least(1, greatest(-1,
        sin(radians(v_cfg.kantor_lat)) * sin(radians(p_lat)) +
        cos(radians(v_cfg.kantor_lat)) * cos(radians(p_lat)) *
        cos(radians(p_lng - v_cfg.kantor_lng))
      )));

  if p_mode = 'kantor' then
    if v_jarak > v_cfg.radius_meter then
      raise exception 'Lokasi terlalu jauh dari kantor (% m). Pilih "Dinas Luar" bila memang di luar.', round(v_jarak);
    end if;
  elsif p_mode = 'luar' then
    if p_catatan is null or length(btrim(p_catatan)) < 5 then
      raise exception 'Isi keterangan dinas luar dulu.';
    end if;
    v_status := 'dinas_luar';
  else
    raise exception 'Mode tidak dikenal';
  end if;

  -- 3) status telat (waktu SERVER, bukan waktu perangkat)
  if v_status = 'hadir'
     and (now() at time zone 'Asia/Jakarta')::time > v_cfg.jam_masuk then
    v_status := 'telat';
  end if;

  -- upsert baris hari ini; masuk_at = now() SERVER
  insert into absensi(id, user_id, tanggal, masuk_at, masuk_lat, masuk_lng,
    masuk_akurasi, masuk_mode, masuk_catatan, masuk_foto_path, status, ditandai, alasan_tanda)
  values (gen_random_uuid(), v_user, v_today, now(), p_lat, p_lng,
    p_akurasi, p_mode, p_catatan, p_foto_path, v_status, v_ditandai, v_alasan)
  on conflict (user_id, tanggal) do update
    set masuk_at = excluded.masuk_at, masuk_lat = excluded.masuk_lat,
        masuk_lng = excluded.masuk_lng, masuk_akurasi = excluded.masuk_akurasi,
        masuk_mode = excluded.masuk_mode, masuk_catatan = excluded.masuk_catatan,
        masuk_foto_path = excluded.masuk_foto_path, status = excluded.status,
        updated_at = now();

  return jsonb_build_object('ok', true, 'jarak_m', round(v_jarak), 'status', v_status);
end $$;
```

`absen_pulang` mirip: isi kolom `keluar_*`, syaratkan sudah ada `masuk_at`, hitung ulang geofence untuk mode 'kantor'.

**Kenapa ini sulit dimanipulasi:**
- **Waktu absen = waktu server** (`now()`), bukan jam HP. Ubah jam HP tidak berpengaruh.
- **Jarak ke kantor dihitung di server** dari radius yang diatur admin. Client tidak bisa "bilang" dia di kantor.
- **Akurasi GPS dibatasi.** Lokasi kasar (indikasi lokasi berbasis IP / bukan GPS asli) ditolak.
- **Foto wajib live dari kamera**, bukan unggah galeri.
- **1 absen/hari** dijaga `UNIQUE(user_id, tanggal)`.
- **IP & jejak audit** dicatat; admin bisa meninjau entri yang `ditandai`.

### 7.3 Batasan jujur (WAJIB dicantumkan ke pemberi tugas)
Aplikasi **web** tidak bisa 100% mencegah pemalsuan lokasi. GPS browser masih bisa diakali lewat DevTools, ekstensi fake-GPS, atau HP yang di-root. Yang kita lakukan adalah **mempersulit** dan **mendeteksi**:
- Batas akurasi + tolak lokasi kasar.
- (Opsional, kuat) Bandingkan lokasi GPS dengan lokasi IP di server; jika beda jauh → `ditandai` untuk ditinjau admin.
- Foto live sebagai bukti + audit trail.

Untuk jaminan lebih tinggi diperlukan aplikasi **native** (Android) dengan deteksi mock-location & device attestation. Cantumkan ini sebagai catatan; jangan menjanjikan "anti-palsu total".

---

## 8. Fitur Rekap Absensi

- **Rekap Mingguan** & **Rekap Bulanan**.
- User: hanya melihat rekap **sendiri**. Admin: bisa pilih pegawai / divisi / semua.
- Tampilkan: jumlah Hadir, Telat, Dinas Luar, Tidak Absen (hari kerja tanpa entri), total jam kerja (keluar − masuk).
- Tabel per hari: tanggal, jam masuk, jam pulang, mode, status, tombol lihat foto & peta (admin).
- **Ekspor**: unduh CSV + tombol "Cetak" (print-friendly). Filter rentang tanggal.
- Implementasi: buat Postgres **view**/fungsi agregasi, panggil dari frontend. Contoh: `rekap_bulanan(p_user, p_bulan, p_tahun)`.

---

## 9. Fitur Kalender Konten

Untuk merencanakan unggahan media sosial Dispar.

- **Tampilan Kalender bulanan**: tiap tanggal menampilkan judul konten + ikon platform + warna status.
- **Tampilan Daftar**: filter platform, status, divisi, PIC.
- **Tambah/Edit konten** (admin & PIC): judul, deskripsi/caption, platform, tanggal & jam tayang, status, PIC, divisi, link aset (Canva/Drive).
- Alur status: `ide → draft → dijadwalkan → tayang` (atau `batal`).
- User biasa: lihat semua konten; boleh mengubah status konten yang PIC-nya dirinya (mis. tandai "tayang").
- (Opsional) badge "konten hari ini" di Beranda.

---

## 10. Panel Admin ("Kelola")

- **Pegawai:** tambah (daftarkan email Google), edit nama/jabatan/divisi/role, aktif/nonaktif.
- **Divisi:** tambah/edit/nonaktif.
- **Pengaturan Kantor:** set titik kantor (bisa "Ambil lokasi saat ini" atau input manual + peta), radius, akurasi maks, jam masuk/pulang.
- **Tinjau Absensi:** daftar entri, filter tanggal/divisi/pegawai, sorot yang `ditandai`, lihat foto + peta + IP.
- **Rekap:** semua pegawai, ekspor.
- **Kalender Konten:** kelola penuh.

---

## 11. Keamanan (RLS & Storage)

Aktifkan RLS di semua tabel. Buat helper:
```sql
create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
```
Ringkasan kebijakan:
- **profiles:** user `select`/`update` baris sendiri (tak boleh ubah `role`/`aktif`); admin penuh.
- **absensi:** user `select` baris sendiri; admin `select` semua. **INSERT/UPDATE langsung DILARANG** untuk semua — penulisan hanya lewat RPC `SECURITY DEFINER`.
- **konten:** semua yang login boleh `select`; `insert`/`update` untuk admin atau PIC-nya sendiri.
- **divisi & pengaturan:** semua `select`; `insert`/`update`/`delete` hanya admin.
- **Storage bucket `absensi` (privat):** kebijakan upload — user hanya boleh menulis ke folder `{auth.uid()}/...`; baca — pemilik & admin. Admin melihat foto via **signed URL**.

---

## 12. Pedoman UI/UX (sederhana tapi keren)

- **Mobile-first** (pegawai absen dari HP), responsif ke desktop.
- **Bahasa Indonesia sederhana**, tanpa istilah teknis. Contoh baik: "Absen Masuk", "Lokasi kamu terlalu jauh dari kantor", "Foto berhasil diambil". Hindari: "geofence", "RPC", "token".
- **Tombol besar, kontras tinggi, font ≥16px.** Aksi utama satu layar penuh.
- **Alur minim langkah**, selalu ada tombol "Kembali" dan status jelas. Ada indikator loading ("Sedang mengambil lokasi…").
- **Navigasi bawah** (ikon + label): Beranda · Kalender · Rekap · (Admin: Kelola).
- **Palet warna** (saran, kalem & rapi):
  - Utama: hijau-teal `#0E7C66` (aksi masuk), oranye `#E4572E` (aksi pulang), biru netral untuk info.
  - Latar `#F7F8FA`, kartu putih, teks `#1F2937`.
  - Nuansa Jogja opsional (aksen cokelat hangat) tapi tetap bersih.
- **Umpan balik jelas**: layar sukses besar dengan centang; kegagalan dengan penjelasan + solusi.
- Aksesibilitas: kontras cukup, area sentuh ≥44px.

---

## 13. Variabel Lingkungan (Frontend)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Jangan taruh service_role key di frontend. Semua kewenangan lebih diselesaikan lewat RLS + RPC.

---

## 14. Langkah Deploy

**Supabase**
1. Buat project. Catat URL + anon key.
2. Auth → Providers → aktifkan **Google**. Buat OAuth Client di Google Cloud Console (Consent screen + Credentials), isi **Authorized redirect URI** dengan callback Supabase (`https://<ref>.supabase.co/auth/v1/callback`) dan tambahkan URL aplikasi Render ke **Site URL / Redirect URLs** di Supabase Auth settings.
3. Jalankan migrasi SQL: buat tabel, RLS, fungsi `is_admin`, RPC `absen_masuk`/`absen_pulang`, fungsi rekap.
4. Buat bucket Storage `absensi` (privat) + policy-nya.
5. Seed `divisi`, seed 1 baris `pengaturan` (isi koordinat kantor asli), lalu buat admin pertama:
   - Login Google sekali dengan email admin (biar ada di `auth.users`), lalu `insert`/`update` baris `profiles` dengan `role='admin'`.

**GitHub → Render**
6. Push repo ke GitHub.
7. Render → **New → Static Site**, connect repo. Build command `npm install && npm run build`, publish directory `dist`. Tambah env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
8. Tambahkan domain Render ke Redirect URLs Supabase & Authorized origins Google.

---

## 15. Urutan Build (untuk Codex)

1. Setup project React+Vite+TS+Tailwind + Supabase client + routing + guard (redirect ke login jika belum masuk).
2. Login Google + cek whitelist `profiles` + logout.
3. Migrasi SQL: semua tabel + RLS + `is_admin` + seed divisi & pengaturan.
4. RPC `absen_masuk` & `absen_pulang` (dengan semua validasi bagian 7.2).
5. Halaman Beranda: status hari ini + tombol Masuk/Pulang.
6. Alur absen: pilih mode → ambil lokasi → kamera live + watermark → upload Storage → panggil RPC → layar sukses/gagal.
7. Riwayat + Rekap mingguan/bulanan + ekspor CSV/print.
8. Panel Admin: pegawai, divisi, pengaturan kantor (dengan peta), tinjau absensi (foto+peta+flag).
9. Kalender Konten: kalender + daftar + tambah/edit + status.
10. Poles UI/UX (bagian 12), pesan error ramah, loading state, responsif.

---

## 16. Kriteria Diterima (Acceptance)

- [ ] Login hanya berhasil untuk email terdaftar; login Google berjalan.
- [ ] Absen di luar radius dengan mode "Di Kantor" **ditolak server**.
- [ ] Mode "Dinas Luar" tanpa catatan **ditolak**; dengan catatan → tercatat sebagai dinas luar.
- [ ] Lokasi berakurasi buruk **ditolak**.
- [ ] Waktu tercatat = waktu server (ubah jam HP tidak mengubah hasil).
- [ ] Foto wajib dari kamera live; tidak ada opsi unggah galeri.
- [ ] Tidak bisa absen masuk dua kali dalam sehari.
- [ ] Pulang hanya bisa setelah masuk.
- [ ] User hanya melihat data sendiri; admin melihat semua + foto + peta.
- [ ] Rekap mingguan & bulanan benar + bisa diekspor.
- [ ] Kalender konten: buat/edit/ubah status berjalan sesuai role.
- [ ] Semua teks UI Bahasa Indonesia sederhana; tombol besar & jelas.
- [ ] Catatan batasan pemalsuan lokasi web dicantumkan di dokumentasi/README.
