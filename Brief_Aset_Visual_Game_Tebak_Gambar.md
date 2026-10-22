# Brief Aset Visual dan Alur Game "Coret Tebak" (DisparYK App)

Satu file untuk dua tujuan:
- **Bagian A–E**: dipakai untuk membuat gambar dan aset animasi lewat GPT (generator gambar).
- **Bagian F–H**: diberikan ke Claude Code / Codex bersama aset hasilnya, supaya aset dipasang dan dianimasikan di kode.

> Nama game di file ini, **"Coret Tebak"**, hanya nama sementara. Ganti kalau sudah ada nama resmi (cari-ganti teks `Coret Tebak` dan `coret-tebak`).

---

## Cara pakai (3 langkah)

1. Buka chat baru di GPT. Tempel **Bagian D (STYLE LOCK)** lebih dulu, lalu tempel prompt aset satu per satu dari **Bagian E**. Generate di **satu chat yang sama** supaya gayanya konsisten.
2. Simpan hasilnya dengan **nama file persis** seperti di tabel **Bagian G**, masukkan ke folder `src/features/game/assets/` (atau `public/game/`).
3. Berikan ke Claude Code: file ini, folder aset, dan rencana teknis (`Rencana_Game_Tebak_Gambar_DisparYK.md`). Perintah awal yang disarankan: *"Baca file brief ini dan bangun fitur game sesuai Bagian A–C dan F–H, pakai aset di folder assets. Kalau aset belum ada, pakai placeholder."*

> **Penting:** jangan lampirkan screenshot Gartic.io ke GPT sebagai referensi gaya. Karakter, logo, dan warna mereka punya hak cipta, dan hasilnya bisa terlalu mirip. Deskripsi teks di file ini sudah cukup. Layout fungsional (daftar pemain, kanvas, kolom jawaban) boleh terinspirasi, tetapi seluruh gambar harus orisinal.

---

# BAGIAN A. Alur permainan dan layar

Alur yang diminta, dibagi menjadi 7 layar. Semua aset di Bagian E dipetakan ke layar ini.

| # | Layar | Yang terjadi |
|---|---|---|
| 1 | **Lobi** | Daftar room publik, tombol **Buat Room**, kolom **Masuk dengan kode** |
| 2 | **Pengaturan room** (host) | Pilih **tema**, **waktu menggambar** (60/90/120 dtk), **jumlah ronde** (1–5), **maks pemain** (2–10), **publik/privat**. Tombol Buat |
| 3 | **Ruang tunggu** | Anggota lain masuk (lewat daftar atau kode/link). Daftar pemain terisi, slot kosong bertulis "Kosong". Host menekan **Mulai** (minimal 2 pemain) |
| 4 | **Pilih kata** | Pemain yang mendapat giliran melihat 3 kata dari tema yang dipilih, 10 detik. Pemain lain melihat "Si A sedang memilih kata…" |
| 5 | **Menggambar dan menebak** | Penggambar melukis di kanvas. Penebak mengetik jawaban di kolom bawah. Bilah waktu berjalan. Petunjuk huruf muncul seiring waktu |
| 6 | **Hasil giliran (reveal)** | Jawaban terungkap, daftar siapa yang menebak benar dan poin yang didapat, lalu giliran pemain berikutnya |
| 7 | **Hasil akhir dan juara** | Setelah **semua pemain mendapat giliran menggambar** sebanyak jumlah ronde: podium juara 1–3, daftar skor semua pemain, tombol Main Lagi / Keluar |

### Status jawaban penebak
| Status | Tampilan |
|---|---|
| **Salah** | Teks tebakan muncul di tab **JAWABAN** dengan nama pengirim (terlihat semua pemain) |
| **Hampir benar** | Hanya penebak itu yang melihat pesan "Hampir benar!" dan kolom jawaban bergoyang. Tidak masuk ke tab JAWABAN pemain lain |
| **Benar** | Teks jawaban **tidak ditampilkan** ke pemain lain. Di tab **LOG** muncul "Budi menebak benar!". Di daftar pemain muncul **centang hijau**, skor naik. Si penebak tidak bisa menebak lagi di giliran itu |

### Skor
- **Penebak benar:** `100 + floor(300 × sisa_waktu / total_waktu)`, plus **bonus +50** untuk yang pertama benar.
- **Penggambar:** `+50` per penebak yang benar, plus `+100` kalau semua penebak benar.
- Giliran berakhir lebih awal kalau semua penebak sudah benar.
- Juara = skor tertinggi setelah semua giliran selesai. Skor sama = peringkat sama.

---

# BAGIAN B. Tata letak layar utama (acuan untuk Claude Code)

Layar 5 (menggambar dan menebak) adalah layar terpenting. Susunannya terinspirasi game tebak gambar daring pada umumnya.

### Desktop (≥ 1024 px)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo Coret Tebak]        [🔊 suara] [🔗 bagikan]        [ⓘ] [✕ keluar] │
├───────────────┬──────────────────────────────────────────────────────┤
│ DAFTAR PEMAIN │                    KANVAS 4:3                        │
│ ┌───────────┐ │   (petunjuk huruf  _ _ _ _ _   (7)  di atas kanvas)  │
│ │avatar Nama│ │                                                      │
│ │  120 poin │ │                                                      │
│ ├───────────┤ │   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ bilah waktu                     │
│ │✔ Nama  80 │ ├────────────────────────┬─────────────────────────────┤
│ │✏ Nama  60 │ │ [JAWABAN]              │ [LOG]                       │
│ │ Kosong    │ │ Budi: gelas            │ ⓘ Sari bergabung            │
│ │ Kosong    │ │ Sari: botol            │ ✔ Rina menebak benar!       │
│ │           │ │ [ Jawab di sini… ]     │                             │
└───────────────┴────────────────────────┴─────────────────────────────┘
```
- **Daftar pemain (kiri):** avatar, nama, skor. Lencana peringkat (piala 1/2/3) untuk 3 skor teratas. **✔ hijau** = sudah menebak benar giliran ini. **✏ biru** = sedang menggambar. Slot yang belum terisi bertulis "Kosong" dengan siluet abu-abu.
- **Kanvas (tengah atas):** rasio 4:3. Penggambar melihat toolbar (pensil, penghapus, 3 ukuran, 12 warna, undo, bersihkan) di bawah kanvas. Penebak tidak melihat toolbar.
- **Bilah waktu:** tipis, di bawah kanvas, menyusut dari kanan ke kiri. Berubah merah di 10 detik terakhir.
- **Bawah:** dua tab, **JAWABAN** (tebakan salah, nama pengirim) dan **LOG** (pemain masuk/keluar, "menebak benar").
- **Atas:** logo, tombol suara, bagikan (salin link/kode room), info aturan, keluar.

### Ponsel (< 640 px, prioritas utama karena DisparYK dipakai dari HP)
```
┌───────────────────────┐
│ logo      🔊 🔗 ⓘ ✕   │
│ ✏ Budi menggambar  45s│
│ ▬▬▬▬▬▬▬▬ bilah waktu  │
│ ┌───────────────────┐ │
│ │   KANVAS 4:3      │ │
│ └───────────────────┘ │
│ _ _ _ _ _   (5 huruf) │
│ [🎨 toolbar penggambar]│
│ ○○○○○ pemain (strip)  │ ← baris avatar kecil, geser horizontal
│ JAWABAN | LOG         │
│ Budi: gelas           │
│ [ Jawab di sini…  ➤ ] │
└───────────────────────┘
```
- Daftar pemain jadi **strip avatar horizontal** di atas tab, ketuk untuk melihat skor lengkap.
- Kolom jawaban tidak boleh tertutup keyboard (pakai `visualViewport`).

---

# BAGIAN C. Aturan penggunaan visual

- **Semua gambar orisinal.** Tidak meniru karakter, logo, atau maskot dari game atau merek lain.
- **Teks jangan dimasukkan ke dalam gambar.** Tulisan seperti "BENAR!", "HAMPIR BENAR", nama pemain, dan angka dirender oleh kode (huruf web), karena teks buatan AI sering salah eja. Minta GPT membuat bentuk, ikon, atau lencana tanpa tulisan.
- **Latar transparan** untuk semua aset karakter, ikon, dan stiker (PNG atau WebP dengan alfa). Pengecualian: pola latar dan ilustrasi layar penuh.
- Tema budaya Jogja (blangkon, becak, andong, Tugu, batik kawung, gunungan wayang, gudeg, gamelan) dipakai dengan gaya kartun sopan dan ramah. Aset akan tampil di aplikasi instansi pemerintah, jadi **tanpa unsur kekerasan, politik, SARA, atau yang tidak pantas**.

---

# BAGIAN D. STYLE LOCK (tempel di awal chat GPT)

Tempel blok ini **sekali** di awal chat, sebelum prompt aset pertama:

```
You are my illustration artist for a casual multiplayer drawing-and-guessing web game
called "Coret Tebak" for a tourism office in Yogyakarta, Indonesia.
Create ORIGINAL artwork only. Do not imitate any existing game, brand, mascot or logo.

STYLE LOCK (apply to every image I ask for in this chat):
- Friendly flat-vector cartoon, clean shapes, soft rounded corners.
- Thick consistent dark-indigo outline (about 6 px at 1024 px canvas, color #1B1F3B).
- Flat colors with ONE simple soft shadow shape; no gradients, no textures, no realistic lighting.
- Big expressive eyes, simple faces, slightly chunky proportions (head about 40% of height).
- Palette (use only these plus white and transparent):
  indigo #2B3A8C, deep ink #1B1F3B, gold #F5B82E, brick orange #E8743B,
  leaf green #3FA66B, cream #FFF6E5, sky #8FC9F2, soft red #E5484D, warm grey #C9C3B8.
- Javanese/Yogyakarta cultural elements shown respectfully: blangkon headwear, batik kawung
  pattern, becak, andong, Tugu Jogja, gunungan wayang, gudeg, gamelan.
- Mood: cheerful, warm, family-friendly, suitable for a government office app.
- NO text, letters, numbers, watermarks or logos inside any image.
- Transparent background (PNG with alpha) unless I say otherwise.
- Keep every character on the same drawing style so they look like one family.
- Centered subject with about 8% safe margin on all sides.
Reply "ready" and wait for my first request.
```

Setelah GPT menjawab "ready", mulai dari aset pertama (maskot). **Setelah satu aset disetujui, lampirkan gambar itu sebagai referensi** untuk aset berikutnya dengan kalimat: *"Same style and outline as the approved mascot above."*

---

# BAGIAN E. Daftar aset dan prompt

Prompt ditulis dalam bahasa Inggris karena umumnya lebih konsisten di generator gambar. Format ekspor ada di Bagian G.

## E1. Maskot "Mas Coret" (6 ekspresi)
Maskot ramah yang muncul di lobi, ruang tunggu, reveal, dan podium. Karakter orisinal: pria muda berblangkon memegang pensil besar.

**Prompt dasar (ekspresi netral):**
```
A cheerful original mascot named "Mas Coret": a young Javanese man in a traditional
blangkon headwear (batik kawung pattern in indigo and gold), simple cream shirt with
a small indigo vest, holding a big oversized pencil like a staff. Full body, standing,
friendly smile, waving one hand. Flat-vector style from the STYLE LOCK. Transparent background.
```
**Lalu minta 5 ekspresi lain** dengan karakter dan pakaian yang sama persis (ulang satu per satu):
1. `neutral` (di atas)
2. `happy`: tertawa lebar, mata menyipit gembira, mengangkat pensil
3. `thinking`: tangan di dagu, satu alis naik, gelembung pikiran kosong
4. `surprised`: mata membulat, mulut "o", pensil terangkat
5. `sad`: sedikit cemberut, bahu turun, pensil diturunkan
6. `winner`: kedua tangan terangkat, memegang piala kecil, senyum bangga

Tambahan (opsional): `drawing` (sedang mencoret di udara dengan pensil) untuk layar loading.

## E2. Avatar pemain (12 karakter)
Avatar bulat untuk daftar pemain. Dipakai kalau pemain tidak memakai foto profil Google. Setiap avatar **hanya kepala dan bahu**, kanvas persegi.

**Template prompt (ganti `[PROFESI]`):**
```
Round-framed avatar portrait (head and shoulders only), original character: [PROFESI].
Friendly smile, flat-vector style from the STYLE LOCK, solid pastel circular background
in one palette color, centered, square 1024x1024. The circle background is part of the image;
everything outside the circle is transparent.
```
**Daftar `[PROFESI]`:**
1. pembatik wanita memegang canting
2. pengayuh becak berkaus belang
3. kusir andong berblangkon dan topi caping
4. penari klasik dengan sanggul dan hiasan melati
5. penjual gudeg dengan bakul
6. abdi dalem berpakaian peranakan hitam dan blangkon
7. dalang kecil dengan wayang di tangan (siluet sederhana)
8. pemandu wisata dengan topi dan bendera kecil
9. turis dengan kamera dan topi lebar
10. pesepeda dengan helm dan kacamata
11. pemain gamelan memegang pemukul gong
12. fotografer dengan kamera dan tali kamera

## E3. Lencana dan ikon status
Bentuk tanpa tulisan, latar transparan, kanvas persegi 512×512. **Ikon antarmuka sederhana (centang, pensil, suara, bagikan, info, tutup, undo, hapus) tidak perlu dibuat GPT**, cukup pakai pustaka ikon (`lucide-react`) agar ringan dan tajam. Yang dibuat GPT hanya lencana bergaya:
```
Set of 3 trophy icons in flat-vector style from the STYLE LOCK, one image each:
(1) gold trophy cup with a small number-free star on the front,
(2) silver trophy cup, (3) bronze trophy cup. Same shape, different metal colors
(gold #F5B82E, silver #C9C3B8, bronze #E8743B). No text or numbers. Transparent background.
```
```
A small round "correct guess" badge: green circle with a bold white check mark,
thick indigo outline, tiny sparkle at top right. No text. Transparent background.
```
```
A small round "drawing now" badge: blue circle with a white oversized pencil diagonal inside,
thick indigo outline. No text. Transparent background.
```
```
A golden champion crown with three points and small gems in indigo, flat-vector, slightly tilted,
thick indigo outline. No text. Transparent background.
```

## E4. Stiker reaksi (untuk animasi hasil)
Bentuk besar tanpa tulisan. Tulisannya ditaruh oleh kode di atas bentuk ini. Kanvas 1024×1024, transparan.
```
A starburst sticker shape in gold with thick indigo outline, cheerful and bold,
like a comic "pop" burst, empty center, no text. Transparent background.
```
```
A soft rounded speech-bubble shape in leaf green with thick indigo outline and a tiny sparkle,
empty inside, no text. Transparent background.
```
```
A soft rounded speech-bubble shape in brick orange with a small light-bulb icon on its corner,
thick indigo outline, empty inside, no text. Transparent background.
```
```
A cute hourglass with cream sand and indigo frame, small drops of sand falling, flat-vector,
thick indigo outline, no text. Transparent background.
```
Penggunaan: bentuk emas = **BENAR!**, balon hijau = **menebak benar**, balon oranye berlampu = **HAMPIR BENAR**, jam pasir = **WAKTU HABIS**.

## E5. Kartu tema (7 ikon)
Dipakai di layar Pengaturan room untuk memilih tema. Kanvas 1024×1024, persegi, ilustrasi kecil di tengah, **latar kartu berwarna solid** boleh (bagian dari gambar), tanpa tulisan.

**Template:**
```
A square theme card illustration for the category "[TEMA]", flat-vector from the STYLE LOCK,
solid pastel background in one palette color, a single clear central icon made of [ISI],
rounded corners, no text. 1024x1024.
```
| `[TEMA]` | `[ISI]` (benda utama) |
|---|---|
| Umum | kotak hadiah, bola, kursi, payung |
| Jogja | Tugu Jogja, becak, andong kecil |
| Kuliner | semangkuk gudeg, gelas teh, sate |
| Hewan | kucing, kupu-kupu, ikan |
| Wisata | candi (siluet sederhana), tas ransel, kamera |
| Kantor | laptop, buku, gelas kopi, kalender |
| Aktivitas | sepeda, kamera, bola voli |

## E6. Pola latar (seamless)
Satu pola yang bisa diulang (tile), kontras rendah agar tidak mengganggu kanvas dan teks. Kanvas 1024×1024, **bukan transparan**.
```
A seamless tileable doodle pattern for a game background, flat-vector from the STYLE LOCK
but with thin 3 px outlines and low contrast. Background solid indigo #2B3A8C, doodles in slightly
lighter indigo and white at 25% opacity: tiny becak, blangkon, Tugu Jogja, batik kawung circles,
pencils, paper planes, stars, speech bubbles, clouds. No text. The pattern must tile seamlessly
with no visible edges. Square 1024x1024.
```
Variasi: ulangi dengan latar hangat (cream #FFF6E5, doodle emas pudar) untuk layar hasil akhir.

## E7. Podium dan perayaan
```
A three-step winners' podium (left step second place, center step first and tallest, right step
third), flat-vector from the STYLE LOCK, steps in cream, gold and brick orange tops with indigo outline,
no numbers or text on the steps. Slight 3/4 front view, transparent background, wide image 1600x900.
```
```
A set of 8 small confetti pieces on a transparent background arranged in a grid:
ribbon curl, star, circle, triangle, rectangle strip, tiny heart, small plus, spiral.
Palette colors only, flat, no outline, each piece about 160 px. Grid image 1024x1024.
```
(Konfeti utama akan dibuat oleh kode. Gambar ini hanya bahan tambahan, boleh dilewati.)
```
A large decorative laurel wreath in gold and leaf green with an empty center, flat-vector,
transparent background, 1024x1024.
```

## E8. Ilustrasi keadaan kosong
Kanvas 1200×900, transparan, tanpa teks.
```
Mas Coret the mascot (same character as the approved mascot) sitting on a stool waiting, looking at
an empty chair beside him, thought bubble empty. Transparent background.
```
(Untuk **Ruang tunggu** saat belum ada pemain lain.)
```
Mas Coret the mascot holding a magnifying glass looking around curiously, small question-mark-free
(no text) sparkles around. Transparent background.
```
(Untuk **Lobi** saat belum ada room.)

## E9. Siluet slot kosong
```
A grey round avatar silhouette placeholder (head and shoulders), flat-vector, soft warm grey,
no outline, simple, square 512x512, transparent background.
```

## E10. Logo "Coret Tebak" (opsional, bisa dilewati)
Teks logo sering salah dari generator gambar, jadi **disarankan dibuat di kode** (huruf web + ikon pensil). Kalau tetap ingin membuat gambar:
```
A cheerful emblem logo mark for a game called "Coret Tebak": a big pencil drawing a loopy swirl that
ends in a question-mark-shaped curl, blangkon batik pattern on the pencil band. Original design.
Flat-vector, thick indigo outline, palette colors, NO text. Transparent background, 1024x1024.
```
Wordmark "Coret Tebak" ditaruh di kode di samping ikon ini.

## E11. Animasi bingkai (opsional)
Generator gambar **tidak andal untuk animasi bingkai demi bingkai** (karakter sering berubah antar bingkai). Karena itu animasi dibuat **di kode** (Bagian F), memakai gambar diam dari E1 sampai E9. Kalau tetap ingin lembar animasi untuk layar loading:
```
A horizontal sprite sheet of 6 frames of Mas Coret the mascot (same character as approved)
drawing a loop in the air with his pencil, frames evenly spaced in a single row, identical size and
position in each frame, transparent background, 6144x1024.
```
Periksa dengan teliti: kalau ukuran, posisi, atau pakaian berbeda antar bingkai, jangan dipakai. Cadangan: animasikan satu gambar `mascot-drawing` dengan goyang halus di kode.

---

# BAGIAN F. Cara aset dianimasikan di kode (untuk Claude Code)

Semua animasi dibuat dengan **Framer Motion** dan **CSS keyframes** (ditambah `canvas-confetti` untuk konfeti). Tanpa GIF atau video. Hormati `prefers-reduced-motion` (nonaktifkan gerakan besar, sisakan fade).

| Momen | Aset | Animasi |
|---|---|---|
| Lobi dan ruang tunggu | `mascot-neutral`, `empty-lobby`, `empty-waiting` | Maskot "bernapas" (skala 1 ↔ 1.03, 3 dtk, ease-in-out, loop), melambai dengan putar kecil saat kursor mendekat |
| Pemain bergabung | Avatar | Muncul dengan efek membal (`scale 0 → 1.15 → 1`, 400 ms), baris di daftar meluncur masuk |
| Pemain keluar | Avatar | Mengecil dan memudar (250 ms), slot kembali jadi siluet |
| Pilih tema | Kartu tema | Kartu terangkat dan miring sedikit saat dipilih, bingkai emas menyala |
| Mulai giliran | `mascot-surprised` | Spanduk "Giliran Budi menggambar!" meluncur dari atas, maskot mengangguk |
| Pilih kata | 3 kartu | Kartu membalik 3D satu per satu (stagger 120 ms), yang dipilih membesar |
| Hitung mundur | Bilah waktu | Lebar menyusut linear, 10 detik terakhir berubah merah dan berdenyut |
| Petunjuk huruf | Kotak huruf | Kotak membalik saat huruf dibuka |
| **Tebakan benar** | `badge-correct`, `sticker-burst`, `sticker-bubble-correct` | Burst membal (scale 0 → 1.2 → 1, putar 6°), teks "BENAR!" ditumpuk oleh kode, skor melompat naik (count-up), centang hijau muncul di daftar, getar HP 40 ms |
| **Hampir benar** | `sticker-bubble-almost` | Kolom jawaban bergoyang (translateX ±6 px, 300 ms), balon oranye muncul 1,2 dtk lalu memudar |
| Tebakan salah | Teks | Baris baru muncul dengan fade-in dan naik 6 px |
| Waktu habis | `sticker-hourglass` | Jam pasir berputar 180° lalu bergetar, layar redup sesaat |
| Reveal | `mascot-happy` / `mascot-sad` | Jawaban muncul besar (scale in), skor naik per baris berurutan, konfeti kecil bila ada yang benar |
| Papan skor | Baris pemain | Urutan baris bergeser halus saat skor berubah (`layout` Framer) |
| **Podium akhir** | `podium`, `crown`, `trophy-1/2/3`, `mascot-winner`, `laurel` | Tiga balok naik bergantian dari bawah (3 → 2 → 1, jeda 600 ms), avatar jatuh menimpa balok dengan membal, mahkota turun ke juara 1, konfeti penuh layar 3 detik, maskot melompat |
| Layar muat | `mascot-drawing` | Goyang kecil ke kiri-kanan, atau lembar animasi bila lolos E11 |

Catatan teknis:
- Gerakkan hanya `transform` dan `opacity` agar mulus di HP.
- Jangan putar animasi besar saat kanvas sedang menggambar (menjaga performa).
- Semua teks pada stiker dirender oleh kode: huruf tebal bundar (misalnya Baloo 2 atau Fredoka, dari Google Fonts), putih dengan kontur indigo.

---

# BAGIAN G. Manifest aset (nama file, ukuran, format)

Simpan semua di `src/features/game/assets/`. Nama huruf kecil, pakai tanda hubung. Ekspor dari GPT biasanya PNG 1024 px, lalu **ubah ke WebP kualitas 85** agar ringan di HP. Target tiap file ≤ 150 KB (pola latar ≤ 200 KB).

| Kode | File | Ukuran | Alfa | Dipakai di |
|---|---|---|---|---|
| E1 | `mascot-neutral.webp` | 1024×1024 | ya | Lobi, ruang tunggu |
| E1 | `mascot-happy.webp` | 1024×1024 | ya | Reveal (ada yang benar) |
| E1 | `mascot-thinking.webp` | 1024×1024 | ya | Pilih kata |
| E1 | `mascot-surprised.webp` | 1024×1024 | ya | Mulai giliran |
| E1 | `mascot-sad.webp` | 1024×1024 | ya | Reveal (tak ada yang benar) |
| E1 | `mascot-winner.webp` | 1024×1024 | ya | Podium |
| E1 | `mascot-drawing.webp` | 1024×1024 | ya | Layar muat |
| E2 | `avatar-01.webp` … `avatar-12.webp` | 512×512 | ya | Daftar pemain |
| E3 | `trophy-1.webp`, `trophy-2.webp`, `trophy-3.webp` | 512×512 | ya | Lencana peringkat |
| E3 | `badge-correct.webp` | 512×512 | ya | Daftar pemain (benar) |
| E3 | `badge-drawing.webp` | 512×512 | ya | Daftar pemain (menggambar) |
| E3 | `crown.webp` | 512×512 | ya | Podium |
| E4 | `sticker-burst.webp` | 1024×1024 | ya | "BENAR!" |
| E4 | `sticker-bubble-correct.webp` | 1024×1024 | ya | Log "menebak benar" |
| E4 | `sticker-bubble-almost.webp` | 1024×1024 | ya | "HAMPIR BENAR" |
| E4 | `sticker-hourglass.webp` | 1024×1024 | ya | "WAKTU HABIS" |
| E5 | `theme-umum.webp`, `theme-jogja.webp`, `theme-kuliner.webp`, `theme-hewan.webp`, `theme-wisata.webp`, `theme-kantor.webp`, `theme-aktivitas.webp` | 512×512 | tidak (kartu) | Pengaturan room |
| E6 | `bg-pattern-indigo.webp`, `bg-pattern-cream.webp` | 1024×1024 | tidak | Latar (tile `background-repeat`) |
| E7 | `podium.webp` | 1600×900 | ya | Hasil akhir |
| E7 | `confetti-pieces.webp` | 1024×1024 | ya | Konfeti tambahan (opsional) |
| E7 | `laurel.webp` | 1024×1024 | ya | Podium |
| E8 | `empty-waiting.webp`, `empty-lobby.webp` | 1200×900 | ya | Keadaan kosong |
| E9 | `avatar-empty.webp` | 512×512 | ya | Slot "Kosong" |
| E10 | `logo-mark.webp` (opsional) | 1024×1024 | ya | Header |

### Pemeriksaan tiap aset sebelum dipakai
- [ ] Latar benar-benar transparan (buka di latar berwarna; tidak ada kotak-kotak palsu atau tepi putih).
- [ ] Tidak ada teks atau angka di dalam gambar.
- [ ] Gaya, ketebalan garis, dan palet sama dengan maskot.
- [ ] Wajah dan pakaian maskot sama di semua ekspresi.
- [ ] Tidak mirip karakter, logo, atau merek yang sudah ada.
- [ ] Ukuran file ≤ 150 KB.

> Kalau latar yang diminta transparan ternyata keluar putih atau kotak-kotak, hapus latarnya dengan alat pengganti latar (misalnya fitur "remove background" di editor gambar) sebelum diekspor ke WebP.

---

# BAGIAN H. Instruksi untuk Claude Code

**Tugas:** bangun fitur game "Coret Tebak" di DisparYK App sesuai alur Bagian A, tata letak Bagian B, dan animasi Bagian F, memakai aset Bagian G. Rencana teknis (database, realtime, RPC, keamanan, tahapan) ada di `Rencana_Game_Tebak_Gambar_DisparYK.md`. Ikuti file itu untuk arsitekturnya.

**Aturan:**
1. Kode game di `src/features/game/`, dimuat lazy (`React.lazy`) agar bundel absensi tidak membesar. Jangan ubah logika absensi dan RPC anti-manipulasi yang sudah ada.
2. Buat komponen: `LobbyPage`, `RoomSettingsPage` (tema, waktu, ronde, maks pemain, publik/privat), `WaitingRoom`, `WordPicker`, `GameScreen` (daftar pemain, kanvas, bilah waktu, tab JAWABAN/LOG), `RevealPanel`, `ResultPodium`.
3. Semua aset dibaca dari satu modul `assets.ts` (`export const ASSETS = { mascot: { neutral: new URL('./assets/mascot-neutral.webp', import.meta.url).href, ... } }`). Kalau file belum ada, tampilkan **placeholder** (lingkaran berwarna dengan inisial) sehingga game tetap bisa dicoba.
4. Teks pada stiker (BENAR!, HAMPIR BENAR, WAKTU HABIS) dirender oleh kode di atas gambar stiker.
5. Kolom jawaban: kirim ke RPC `game_submit_guess`. Respons `correct/close/wrong/already/closed` menentukan tampilan (Bagian A, status jawaban). Jawaban benar **tidak** dikirim ke pemain lain.
6. Utamakan tampilan ponsel (Bagian B). Uji di lebar 360 px.
7. Hormati `prefers-reduced-motion`. Gunakan `transform` dan `opacity` saja untuk animasi.
8. Tambahkan pengujian sederhana: normalisasi tebakan, hitungan skor, dan transisi fase.
9. Jangan memuat aset besar di halaman lain. Gunakan `loading="lazy"` untuk gambar kartu tema dan avatar.

**Definisi selesai:**
- Satu permainan penuh 3 pemain berjalan dari lobi sampai podium.
- Semua 7 layar Bagian A tampil dengan aset yang benar.
- Status salah / hampir benar / benar tampil sesuai aturan, skor sesuai rumus.
- Tampilan nyaman di HP 360 px dan desktop.
- Ukuran bundel absensi tidak bertambah (game dimuat terpisah).

---

## Catatan terakhir

- Urutan kerja yang disarankan: **(1)** buat maskot dan 3 avatar dulu untuk menguji gaya, **(2)** serahkan ke Claude Code untuk membangun layar dengan placeholder, **(3)** lengkapi sisa aset sambil kode berjalan. Dengan begitu pekerjaan kode tidak menunggu semua gambar selesai.
- Palet di Bagian D adalah usulan netral. Kalau DisparYK sudah punya warna resmi (header, tombol, logo dinas), ganti kode warna di STYLE LOCK sebelum membuat gambar supaya game menyatu dengan aplikasinya.
