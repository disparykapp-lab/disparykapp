# Rencana implementasi — "Siapa Penyusup?"

Status: **semua tahap selesai dan sudah di `main`** (PR #8 tahap 1–2, PR #9 tahap 3–5). Lanjutan di `fitur/siapa-penyusup-lanjutan` (2026-11-04): bank kata umum (0034) dan cadangan saat Realtime terputus.
Seluruh mesin permainan ada di server (0033), termasuk voting, skor, main lagi, dan papan skor, karena transisinya saling bergantung.

### Checklist README §10
| Item | Status |
|---|---|
| Entry menu game (emblem + nama) | ✅ kartu di pop-up Zona Game |
| Buat/gabung room + validasi Satu Divisi | ✅ |
| Lobby realtime (join/leave/ready/kick/host pindah) | ✅ (realtime belum diuji di Supabase asli; tanpa Realtime tetap jalan lewat detak) |
| Pembagian kata per-user + kartu tahan-untuk-lihat | ✅ |
| Fase petunjuk bergiliran + validasi petunjuk | ✅ |
| Chat diskusi + timer server | ✅ |
| Voting rahasia + hasil + seri/lewati | ✅ |
| Cek menang + layar akhir + kata terungkap | ✅ (+ tebakan terakhir, batas 6 ronde) |
| Skor per pemain & per divisi + papan skor | ✅ |
| Audio manager (BGM per layar, SFX, mute tersimpan, unlock on tap) | ✅ |
| Reconnect & penanganan host keluar | ✅ (muat ulang di tiap fase, host pindah) |
| Uji di HP Android & iPhone (Safari) + reduced motion | ⚠️ reduced motion ✅ di Chrome; **HP asli belum** |

### Yang diuji & yang belum
- Postgres lokal (image Supabase): uji RLS + 6 skenario permainan penuh (`supabase/tests/siapa_penyusup_rls.sql` untuk dijalankan di Supabase).
- Chrome 375 px, 4 user lewat PostgREST: buat/gabung/lobi/kick, mulai → kartu → petunjuk → diskusi → voting → hasil → akhir → main lagi, tebakan terakhir, papan skor, mute, reduced motion.
- Tanpa Realtime sama sekali (4 user, tanpa muat ulang halaman): lobi, bagikan kata, petunjuk, diskusi, voting, dan hasil tetap berganti di semua layar dalam ≤ 5,5 dtk. Dengan kode sebelumnya semua layar macet di lobi.
- **Belum**: Realtime Supabase asli, HP asli (Android Chrome, iPhone Safari — terutama audio OGG/MP3 & tahan-kartu), dan jaringan lambat.

### Cadangan saat Realtime terputus (`usePenyusupRoom.ts`)
Selama channel Realtime belum/tidak `SUBSCRIBED` (WebSocket diblokir jaringan kantor, sinyal HP putus), setiap detak 5 dtk juga memuat ulang room, pemain, log, petunjuk, dan chat. Hal yang sama terjadi tepat saat tenggat fase. Saat tab kembali terlihat, room selalu dimuat ulang sekali, karena HP yang layarnya dikunci bisa melewatkan event tanpa tanda putus. Biayanya ±15 permintaan per pemain per 10 dtk, hanya selama Realtime terputus. Toast "X bergabung/keluar" hanya muncul lewat Realtime.

### Perbaikan atas CSS paket (di `tambahan.css`)
- `.sp-toast`: `translate: -50%` tertimpa animasi `sp-anim-slide-up` → toast bergeser & terpotong; kini dipusatkan dengan margin dan dipindah ke atas agar tidak menutup kotak input.
- "Kurangi gerakan" tidak mematikan animasi anak `.sp-anim-stagger`.
- Target sentuh tombol stepper (36×34) dan tombol keluarkan pemain dinaikkan ke 44 px.

### Menjalankan migrasi & menguji
1. Supabase → SQL Editor → jalankan berurutan `0032_game_siapa_penyusup.sql`, `0033_siapa_penyusup_permainan.sql`, lalu `0034_siapa_penyusup_bank_kata_umum.sql` (bank kata umum: 6 kategori benda & tempat sehari-hari, 75 pasangan; bank kata khas Jogja dari paket aset dinonaktifkan karena tidak dikenal semua anak magang). Syarat: 0001–0031 sudah jalan (butuh `game_normal()` & `game_jarak()` dari 0028). Keduanya aman dijalankan ulang.
2. Masih di SQL Editor, jalankan `supabase/tests/siapa_penyusup_rls.sql`. Harus muncul dua NOTICE `OK: …`, tanpa `GAGAL`. Skrip ini di-rollback, jadi tidak mengubah data.
3. Cek Realtime: Database → Publications → `supabase_realtime` harus memuat `penyusup_room`, `penyusup_pemain`, `penyusup_petunjuk`, `penyusup_chat`, `penyusup_log`.
4. Uji dua akun: browser biasa (akun A) + jendela incognito (akun B, harus akun lain yang terdaftar). A: Beranda → Game → Siapa Penyusup → Buat Room. B: Gabung Room → ketik kode, atau buka link undangan. Yang dicek: B muncul di lobi A tanpa reload (+ suara & toast), tombol Siap, ganti karakter, kick (B melihat layar "Kamu dikeluarkan" dan tidak bisa masuk lagi), host keluar → B jadi host. Mode Satu Divisi: akun dari divisi lain harus ditolak. Tombol Mulai Game baru aktif dengan 4 pemain online (3–4 akun).
Sumber: `aset-game-sumber/siapa-penyusup/Referensi/README_UNTUK_CODEX.md` (spesifikasi), `prototype/index.html`,
`manifest_aset.json`, `bank_kata.json`, dan implementasi Coret Tebak (`src/features/game/`, migrasi 0028 & 0029).

---

## 1. Temuan dari kode yang ada

| Hal | Kondisi sekarang | Dampak ke rencana |
|---|---|---|
| Migrasi terakhir | `0031_bukti_izin.sql` | Migrasi baru mulai dari **0032** |
| Menu | `AppLayout.tsx` hanya pembungkus `<Outlet/>` (tanpa menu). Game dibuka dari **tombol melayang "Game" di Beranda** → `PopupGame.tsx` (lazy) yang berisi kartu Coret Tebak + placeholder *"Game lain menyusul…"* | Entry "Siapa Penyusup?" = kartu kedua di pop-up Zona Game (lihat pertanyaan **P1**) |
| Route game | `/game/*` di dalam `AppLayout` (kontainer `max-w-lg px-4`), CT memakai `-mx-4 -mt-4` agar latar penuh | Siapa Penyusup butuh layar penuh (`sp-screen` + background 1920²), jadi route ditaruh **di dalam `RequireAuth` tapi di luar `AppLayout`** |
| Profil & divisi | `profiles(id uuid, nama, divisi_id uuid null, foto_url, aktif, role 'admin'/'user')`, `divisi(id uuid, nama, aktif, created_at)`. Keduanya bisa dibaca semua user login (policy `select … using (true)`). `useAuth()` sudah memberi `profile` dan `divisi` | Nama & divisi diambil lewat join, tanpa kolom baru di tabel bersama |
| ID bertipe UUID | README menyebut `user_id % 8` dan `--divisi-1..8` "sesuai id divisi" | Avatar default = `abs(hashtext(user_id::text)) % 8` (di server). Warna divisi = urutan divisi (`order by created_at, id`) modulo 8, +1 |
| `divisi_id` boleh null | Ada user tanpa divisi | Tidak boleh membuat room Satu Divisi; di Antar Divisi tampil "Tanpa divisi" dan tidak masuk papan skor divisi |
| Tes | `tests/coret-tebak.test.ts` hanya menguji `logika.ts` (fungsi murni). Tidak ada tes database | Aturan permainan dicerminkan di `logika.ts` + diuji. Keamanan RLS diuji lewat skrip SQL manual (lihat §7) |
| `.gitignore` | `aset-game-sumber/` di-ignore | File aset yang dipakai **disalin** ke `src/features/siapa-penyusup/assets/` agar ikut ter-commit |
| Vite | Config default (`assetsInlineLimit` 4 KB) | Ikon (semuanya < 4 KB) otomatis di-inline sebagai data URI. Animasi SVG di `<img>` tetap jalan |

---

## 2. Yang dipakai ulang vs. yang baru

### 2.1 Opsi skema: (a) tabel baru `penyusup_*` vs (b) memperluas `game_room`

| | (a) Tabel baru berprefiks `penyusup_` | (b) `game_room` + kolom `jenis` |
|---|---|---|
| Constraint CT | Tidak tersentuh | `game_room` punya kolom NOT NULL dan CHECK khusus CT: `tema`, `waktu_gambar in (60,90,120)`, `jumlah_ronde 1–5`, `maks_pemain 2–10` (SP butuh 12), `status` 5 nilai. Semua harus diubah |
| Fungsi CT | Tidak tersentuh | `game_daftar_lobi`, `game_gabung`, `game_keluar`, `_game_maju` membaca `game_room` **tanpa filter jenis**. Room SP akan muncul di lobi CT, dan `_game_maju` bisa "menyelesaikan" room SP (`v_online < 2 → _game_selesai`). Semua fungsi itu harus ditulis ulang |
| Data rahasia | Kartu per pemain (sesuai README) | `game_rahasia` satu baris per room (PK `room_id`), policy-nya terikat `penggambar_id`. Tidak cocok |
| Kolom pemain | `hidup`, `siap`, `avatar`, `divisi_id`, `sudah_vote` | `game_pemain` berisi `sudah_benar` & `poin_giliran` milik CT; kolom SP harus ditambah ke tabel CT |
| Keuntungan | Isolasi penuh, bisa dihapus tanpa efek samping | Bisa memakai ulang `game_anggota`, `game_online`, `game_kehadiran`, `game_log` |
| Biaya | ±40 baris helper kecil diduplikasi (anggota/online/kode) | Mengubah perilaku CT, padahal **dilarang** di `AGENTS.md` |

**Rekomendasi: (a).** Opsi (b) mengharuskan perubahan constraint dan menulis ulang 4 fungsi inti CT, jadi risiko regresi CT besar. Yang dihemat hanya beberapa helper pendek. Dengan (a), migrasi SP berdiri sendiri, CT tidak terpengaruh sama sekali, dan rollback cukup dengan `drop table penyusup_* cascade`.

### 2.2 Peta pemakaian ulang

| Bagian | Dipakai ulang? | Cara |
|---|---|---|
| `game_normal(text)` (SQL) | ✅ langsung | Fungsi murni (`immutable`, tidak menyentuh tabel CT). Dipakai untuk validasi petunjuk & tebakan terakhir |
| `game_jarak(a,b)` (SQL) | ✅ opsional | Toleransi salah ketik di tebakan terakhir (lihat P8) |
| `is_admin()`, `profiles`, `divisi` + policy select | ✅ langsung | Join untuk nama/divisi |
| `game_anggota`, `game_online` | ❌ | Terikat `game_pemain`/`game_kehadiran`. Dibuat versi baru `penyusup_anggota`, `penyusup_online` (isi sama) |
| Generator kode room | ❌ (pola disalin) | Inline di `game_buat_room`. Dibuat `_penyusup_kode_baru()` dengan alfabet yang sama `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (tanpa O/0/I/1) |
| Pola `_game_maju` | ✅ pola | `_penyusup_maju(room)`: idempoten, `select … for update`, dipicu oleh detak & RPC |
| Pola detak + koreksi jam | ✅ pola | `penyusup_detak()` mengembalikan `{sekarang}`; hook menghitung `selisihJam = server − (t0+t1)/2`, detak 5 dtk, picu detak tepat di `fase_berakhir + 250 ms` |
| Pola `useRoom.ts` | ✅ pola | `usePenyusupRoom.ts`: subscribe `postgres_changes` → `muatSemua()` saat `SUBSCRIBED`, debounce muat pemain 150 ms, `jalankan()` untuk error |
| `api.ts` `cekError()` | ✅ pola (disalin) | 6 baris; disalin agar chunk SP tidak bergantung pada modul CT |
| `logika.ts` CT: `namaPendek`, `peringkat` | ✅ impor | `logika.ts` tidak punya import, jadi aman diimpor dari `../game/logika` tanpa mengubah CT |
| `useAuth()`, `Loading` | ✅ langsung | |
| `Lembar`, `Kepala`, `Avatar`, `Konfeti`, `ChipStatus` | ❌ | Terikat kelas `ct-*`/Fredoka. SP memakai `.sp-*` dari paket (`sp-toast`, `sp-confetti`, `sp-player`, dst.) |
| `suara.ts` (synth oscillator) | ❌ | SP memakai file audio. Hanya pola `aturSuara/dengarSuara` + localStorage yang ditiru |
| `musik.ts` (unlock lewat gestur) | ✅ pola | Diterapkan di `audio.ts` baru, tetapi dengan Web Audio agar loop tanpa jeda |

---

## 3. Route & entry menu

### 3.1 Route (di `src/App.tsx`)

```tsx
// Game Siapa Penyusup juga terpisah: layar penuh, aset & audio baru diunduh saat dibuka.
const SiapaPenyusupPage = lazy(() => import("./features/siapa-penyusup/SiapaPenyusupPage"));
...
<Route element={<RequireAuth />}>
  <Route path="/siapa-penyusup/*" element={<Suspense fallback={<Loading teks="Memuat game..." />}><SiapaPenyusupPage /></Suspense>} />
  <Route element={<AppLayout />}> ...route lama tidak berubah... </Route>
</Route>
```

Sub-route di `SiapaPenyusupPage` (semua dibungkus `<div className="sp-root">`):

| Path | Layar prototype |
|---|---|
| `/siapa-penyusup` | 1. Menu |
| `/siapa-penyusup/cara-main` | 1b. Cara main |
| `/siapa-penyusup/buat` | 2. Buat room |
| `/siapa-penyusup/gabung` | 3. Gabung room (input 5 huruf + daftar room terbuka) |
| `/siapa-penyusup/gabung/:kode` | Link undangan: langsung gabung lalu redirect (pola `GabungLewatLink`) |
| `/siapa-penyusup/main/:roomId` | 4–10, dipilih dari `room.status` |
| `/siapa-penyusup/papan-skor` | Papan skor (tab Per Divisi / Per Pemain, Minggu ini / Semua) |

Tombol `ic_absensi` di kiri atas Menu → `navigate("/beranda")`.

### 3.2 Entry menu

Ganti placeholder *"Game lain menyusul…"* di `src/features/game/PopupGame.tsx` dengan kartu kedua: `emblem_app.svg` + judul "Siapa Penyusup?" + "4–12 pemain · Satu/Antar Divisi" + tombol "Main Sekarang" → `/siapa-penyusup`.
Emblem diimpor langsung dengan `new URL("../siapa-penyusup/assets/ui/emblem_app.svg", import.meta.url)` (bukan lewat `aset.ts`), supaya chunk pop-up tetap kecil.
Ini **mengubah satu file milik CT** (hanya menambah markup, tanpa mengubah perilaku CT), jadi perlu persetujuan (**P1**).
Tambahan: satu bagian baru "🕵️ Siapa Penyusup?" di `src/pages/Panduan.tsx`.

---

## 4. Struktur folder & aset

```
src/features/siapa-penyusup/
├── SiapaPenyusupPage.tsx     route + <div class="sp-root">, impor CSS paket
├── aset.ts                   satu modul URL aset (new URL(..., import.meta.url)), seperti game/assets.ts
├── audio.ts                  manajer audio: Web Audio, OGG/MP3, mute (localStorage "siapa-penyusup:suara"), ducking, unlock saat tap pertama, hook useBgm(nama)
├── api.ts                    pembungkus RPC & select, tipe baris tabel
├── usePenyusupRoom.ts        state room + postgres_changes + detak + koreksi jam + kartu sendiri
├── logika.ts                 fungsi murni (tanpa import), cermin aturan SQL, diuji node --test
├── tambahan.css              helper layout dari <style> prototype, di-scope ke .sp-root (.sp-root .sp-topbar, …)
├── komponen/                 Layar (sp-screen + sp-bg + topbar + mute), TilePemain, BadgeDivisi, FaseTimer,
│                             KartuKata (tahan-untuk-lihat), InputKode, Toast, Konfeti, FlashMerah, Stempel
├── layar/                    Menu, CaraMain, BuatRoom, GabungRoom, PapanSkor, HalamanRoom (switch status),
│                             Lobby, BagikanKata, Petunjuk, Diskusi, Voting, HasilVote, TebakanTerakhir, HasilAkhir
└── assets/                   struktur subfolder SAMA dengan paket, sehingga url() di CSS tidak perlu diedit
    ├── css/      tokens.css, komponen.css, animasi.css
    ├── font/     Baloo2-Variable-latin.woff2, Nunito-Variable-latin.woff2
    ├── background/ karakter/ ikon/ ui/
    └── audio/bgm/  audio/sfx/
```

Struktur `assets/css` + `assets/font` + `assets/ikon` dipertahankan, sehingga `url("../font/…")` di `tokens.css` dan `url("../ikon/ic_benar.svg")` di `komponen.css` tetap benar tanpa diedit, dan Vite akan memprosesnya. Toast, modal, flash merah, dan confetti dirender **di dalam** `.sp-root` (tanpa portal ke `body`). Semuanya sudah `position: fixed`, jadi tetap menutupi layar.

### File yang disalin dari `aset-game-sumber/siapa-penyusup/Asset/`

| Folder | Disalin | Tidak disalin | Ukuran |
|---|---|---|---|
| `background/` | 5 SVG (lobby, diskusi, voting, hasil_pemandu_menang, hasil_penyusup_menang) | — | 92 KB |
| `karakter/` | 24 SVG (8 avatar × normal/_penyusup/_tersingkir) | — | 128 KB |
| `ikon/` | 35 SVG | `ic_mic` (tidak ada voice chat) | ±20 KB (di-inline) |
| `ui/` | 13 SVG (logo, emblem, kartu kata ×2, kartu peran ×2, stempel ×4, banner ×2, lencana_bulat) | — | 540 KB |
| `css/` | tokens, komponen, animasi | — | 28 KB |
| `font/` | 2 woff2 | — | 76 KB |
| `audio/bgm/` | 3 × (ogg + mp3) | — | 2,4 MB |
| `audio/sfx/` | 22 × (ogg + mp3): semua yang ada di tabel "Peta layar → aset" | `sfx_tick` (opsional), `sfx_notifikasi` (tidak ada layar yang memakai) | ±650 KB |
| `pattern/`, `png/` | — | Tidak dipakai prototype; folder PNG 12 MB | — |

Audio tidak masuk bundel JS, karena hanya URL-nya yang dipaketkan. File baru di-`fetch` saat pertama diputar: BGM saat layar terkait dibuka, SFX dimuat ringan saat masuk room. Format dipilih dengan `canPlayType('audio/ogg; codecs="vorbis"')`, dengan fallback MP3 (Safari). Volume diambil dari `manifest_aset.json`. Nilainya disalin sebagai konstanta di `audio.ts`, bukan mengimpor JSON dari folder yang di-ignore.

---

## 5. Migrasi SQL baru

Usulan dua file sesuai tahap (lihat **P12**):
- `0032_siapa_penyusup.sql`: seluruh tabel, RLS, realtime, seed bank kata, helper, RPC room & lobby (tahap 2)
- `0033_siapa_penyusup_ronde.sql`: mesin fase, RPC ronde/vote/skor, papan skor (tahap 3–4)

Semua RPC memakai `security definer set search_path = public`. Fungsi internal berawalan `_penyusup_` dicabut hak `execute`-nya dari `public, anon, authenticated`. RPC klien hanya di-`grant` ke `authenticated`. Pola ini sama dengan 0028.

### 5.1 Tabel

| Tabel | Kolom utama | RLS select | Realtime |
|---|---|---|---|
| `penyusup_kategori` | `id text pk` (`wisata_jogja`, …), `nama`, `ikon`, `urutan` | semua user login | – |
| `penyusup_pasangan` | `id`, `kategori_id`, `kata_a`, `kata_b`, `aktif`, `unique(kategori_id, kata_a, kata_b)` | **tanpa policy** (klien tidak bisa baca) | – |
| `penyusup_room` | `id`, `kode unique`, `host_id`, `mode` (`satu_divisi`/`antar_divisi`), `divisi_id` (null jika antar), `privat`, `kategori_id` (null = acak), `jumlah_penyusup` (0 = otomatis), `waktu_petunjuk` 15–60, `waktu_diskusi` 30–180, `waktu_voting` 15–60, `penyusup_tahu`, `tebakan_terakhir`, `status`, `game_ke`, `ronde`, `urutan uuid[]`, `giliran_ke`, `giliran_user_id`, `fase_mulai`, `fase_berakhir`, `hasil_vote jsonb`, `akhir jsonb`, `dibuat_at`, `diperbarui_at` | anggota, atau room publik (`not privat`) yang divisinya cocok | ✅ |
| `penyusup_pemain` | PK `(room_id, user_id)`, `divisi_id` (snapshot saat gabung), `avatar smallint 0–7`, `siap`, `hafal`, `hidup`, `sudah_vote`, `aktif`, `dikeluarkan`, `skor`, `bergabung_at` | sama dengan room | ✅ |
| `penyusup_rahasia` | PK `room_id`, `pasangan_id`, `kata_pemandu`, `kata_penyusup`, `penyusup_ids uuid[]`, `terpakai bigint[]` | **tanpa policy** | ❌ |
| `penyusup_kartu` | PK `(room_id, user_id)`, `game_ke`, `kata`, `peran_terlihat` (**null** jika `penyusup_tahu` mati) | **hanya `user_id = auth.uid()`** | ❌ |
| `penyusup_petunjuk` | `id`, `room_id`, `game_ke`, `ronde`, `user_id`, `teks`, `lewat bool`, `dibuat_at` | anggota | ✅ |
| `penyusup_chat` | `id`, `room_id`, `game_ke`, `ronde`, `user_id`, `teks`, `dibuat_at` | anggota | ✅ |
| `penyusup_vote` | PK `(room_id, game_ke, ronde, voter_id)`, `target_id` (null = lewati), `diubah_at` | **hanya `voter_id = auth.uid()`** | ❌ |
| `penyusup_kehadiran` | PK `(room_id, user_id)`, `terakhir_aktif` | anggota | ❌ (seperti CT) |
| `penyusup_log` | `id`, `room_id`, `jenis` (gabung/keluar/dikeluarkan/host/mulai/tersingkir/selesai), `user_id`, `data jsonb`, `dibuat_at` | anggota | ✅ |
| `penyusup_skor` | `id`, `room_id` (**on delete set null**), `game_ke`, `user_id`, `divisi_id`, `mode`, `peran`, `menang`, `poin`, `dibuat_at` | semua user login (data pasca-game) | ❌ |
| `penyusup_kata_terlarang` | `kata text pk` | tanpa policy | – |
| `penyusup_gabung_gagal` | `user_id`, `dibuat_at` | tanpa policy | – |

Prinsip anti-bocor:
1. Realtime `postgres_changes` mengirim **seluruh baris baru** untuk setiap UPDATE. Karena itu kata, peran, dan `penyusup_ids` **tidak pernah** disimpan di `penyusup_room` atau `penyusup_pemain` sebelum `selesai`. Isinya baru disalin ke `penyusup_room.akhir` saat game berakhir.
2. Kolom peran yang asli ada di `penyusup_rahasia` (tanpa policy). `penyusup_kartu.peran_terlihat` hanya diisi jika setting "penyusup tahu perannya" aktif. Jika mati, **semua** pemain (termasuk pemandu) tidak mendapat peran. Kalau hanya pemandu yang mendapat peran, pemain yang tidak mendapat kartu peran otomatis tahu dirinya penyusup.
3. Kartu, rahasia, dan vote tidak dimasukkan ke publikasi realtime (lapisan pertahanan kedua di atas RLS).
4. Poin "vote tepat ke penyusup" dan "penyusup bertahan" baru dihitung di akhir game. Jika `skor` bertambah per ronde, pemain bisa menebak siapa penyusupnya dari perubahan skor.

### 5.2 Helper

`penyusup_anggota(room)`, `penyusup_online(room, user)` (40 dtk, untuk tampilan & giliran), `_penyusup_kode_baru()`, `_penyusup_kasar(teks)` (cek terhadap `penyusup_kata_terlarang` setelah `game_normal`), `_penyusup_avatar_default(user)` = `abs(hashtext(user::text)) % 8`.

### 5.3 RPC klien

| RPC | Validasi utama |
|---|---|
| `penyusup_buat_room(p_mode, p_kategori, p_jumlah_penyusup, p_waktu_petunjuk, p_waktu_diskusi, p_waktu_voting, p_penyusup_tahu, p_tebakan_terakhir, p_privat, p_avatar) → uuid` | login & `profiles.aktif`; Satu Divisi wajib punya `divisi_id`; rentang waktu; bersihkan room > 1 hari |
| `penyusup_gabung(p_kode, p_avatar) → jsonb {ok, room_id \| pesan}` | Batas percobaan: ≥ 10 kegagalan / 10 menit → tolak. Mengembalikan `{ok:false}`, **bukan** `raise`, karena `raise` me-*rollback* insert ke `penyusup_gabung_gagal`. Tolak jika: kode tidak ada, `dikeluarkan`, mode Satu Divisi & divisi beda, status ≠ `menunggu` (kecuali pemain lama kembali), ≥ 12 pemain aktif |
| `penyusup_keluar(p_room)` | Pindah host ke pemain aktif dengan `bergabung_at` paling awal; hapus room jika kosong; di tengah game → `hidup = false` lalu `_penyusup_maju` |
| `penyusup_keluarkan(p_room, p_user)` | Host saja, bukan diri sendiri; set `aktif=false, dikeluarkan=true` |
| `penyusup_siap(p_room, p_siap)` / `penyusup_pilih_avatar(p_room, p_avatar)` | Status `menunggu` |
| `penyusup_mulai(p_room)` | Host; ≥ 4 pemain aktif & online; jumlah penyusup valid (`< n/2`, otomatis 2 jika ≥ 7); pilih pasangan yang belum `terpakai`, acak sisi a/b, acak penyusup; tulis rahasia + kartu; `status = bagikan`, `fase_berakhir = now() + 20 dtk` |
| `penyusup_hafal(p_room)` | Tombol "Sudah Hafal"; jika semua pemain hidup sudah hafal → langsung ke petunjuk |
| `penyusup_petunjuk(p_room, p_teks) → jsonb {hasil}` | Giliran sendiri & sebelum `fase_berakhir`; 1 kata, ≤ 24 karakter, spasi dirapikan; tolak hanya jika `game_normal(teks) = game_normal(kata sendiri)` (P5: bagian kata seperti "Prambanan" untuk "Candi Prambanan" **diperbolehkan**) atau mengandung kata kasar |
| `penyusup_chat(p_room, p_teks)` | Status `diskusi` (juga `petunjuk`?), pemain hidup, ≤ 200 karakter, maks 1 pesan / 1,5 dtk & 20 / menit, filter kata kasar |
| `penyusup_ke_voting(p_room)` | Host, status `diskusi` |
| `penyusup_vote(p_room, p_target)` | Status `voting` & sebelum tenggat; voter hidup; target hidup & ≠ diri sendiri; `null` = lewati; upsert (bisa diganti); set `sudah_vote = true` |
| `penyusup_tebak_akhir(p_room, p_teks)` | Status `tebakan_terakhir`, hanya penyusup yang baru tersingkir |
| `penyusup_main_lagi(p_room)` | Host, status `selesai` → `menunggu`, `game_ke + 1`, reset `hidup/siap/hafal/sudah_vote`, hapus kartu |
| `penyusup_detak(p_room) → jsonb {sekarang}` | Anggota; upsert kehadiran; `_penyusup_maju` |
| `penyusup_daftar_room() → jsonb` | Room publik `menunggu` dengan penghuni online (Satu Divisi hanya untuk divisi yang sama) + room yang sedang diikuti sendiri (pola 0029) |
| `penyusup_papan_skor(p_rentang 'minggu' \| 'semua') → jsonb` | `{per_pemain:[…], per_divisi:[…]}`; per divisi hanya dari game `antar_divisi` |

### 5.4 Mesin fase `_penyusup_maju(room)`

| Status | Maju jika | Ke |
|---|---|---|
| `menunggu` / `selesai` | host offline | host pindah (tetap status sama) |
| semua status main | pemain aktif yang offline > 60 dtk | `aktif=false, hidup=false`, log `keluar`, lalu cek menang |
| `bagikan` | tenggat 20 dtk lewat / semua hafal | `petunjuk` (ronde 1, urutan pemain hidup diacak) |
| `petunjuk` | petunjuk masuk / tenggat lewat (tulis "(lewat)") / pemain giliran offline | giliran berikutnya; jika habis → `diskusi` |
| `diskusi` | tenggat lewat / host percepat | `voting` |
| `voting` | tenggat lewat / semua pemain hidup & online sudah vote | hitung → `hasil_vote` (8 dtk, untuk animasi) |
| `hasil_vote` | tenggat lewat | `tebakan_terakhir` (15 dtk, jika aktif & yang tersingkir penyusup) atau cek menang |
| `tebakan_terakhir` | tebakan masuk / tenggat lewat | cek menang |
| cek menang | semua penyusup tersingkir → **pemandu**; penyusup hidup ≥ pemandu hidup → **penyusup**; ronde ≥ 6 (P7) → **penyusup** (berhasil berbaur); selain itu → `petunjuk` ronde + 1 | `selesai` (isi `akhir`, tulis `penyusup_skor`) |

Hitung vote: target dengan suara terbanyak tersingkir. Jika ada **seri** di posisi teratas, atau `lewati ≥ suara terbanyak`, tidak ada yang tersingkir (`stempel_seri`). Pemain yang tidak memilih tidak dihitung.
`hasil_vote = {tally:{user_id:n}, lewati:n, tersingkir_id|null, peran|null, kata|null}`. Peran hanya untuk yang tersingkir. Sesuai P4, `kata` diisi **hanya jika yang tersingkir penyusup** (seperti prototype: "Penyusup tertangkap! Katanya: …"). Kata pemandu tidak pernah diungkap sebelum game selesai, karena itu akan memberi tahu penyusup kata yang benar.

### 5.5 Seed bank kata

`insert into penyusup_kategori …` (5 kategori) dan `insert into penyusup_pasangan …` (54 pasangan) dari `bank_kata.json`, memakai `on conflict do nothing`. Blok `VALUES` dibuat dengan skrip satu kali (Python membaca JSON), lalu hasilnya ditempel ke migrasi dan dicek manual. JSON tidak dibaca saat runtime. Seed kecil `penyusup_kata_terlarang` (lihat P10).

---

## 6. Pemetaan event README §4 → RPC + `postgres_changes`

| Event | Arah | Implementasi Disparyk |
|---|---|---|
| `room:create` | C→S | `penyusup_buat_room(...)` → `room_id`; kode dibaca dari baris room |
| `room:join` | C→S | `penyusup_gabung(kode, avatar)` → `{ok, room_id \| pesan}` |
| `room:ready` | C→S | `penyusup_siap(room, bool)` |
| `room:leave` | C→S | `penyusup_keluar(room)` |
| `room:kick` | C→S | `penyusup_keluarkan(room, user)` |
| `game:start` | C→S | `penyusup_mulai(room)` |
| `room:state` | S→C | `postgres_changes` `penyusup_room` (`id=eq.<room>`) + `penyusup_pemain` (`room_id=eq.<room>`). Pemain dimuat ulang dengan join `profiles(nama, foto_url)` + nama divisi |
| `round:word` | S→C | **Bukan realtime.** Saat `status` menjadi `bagikan` (atau `game_ke` berubah), klien membaca `penyusup_kartu` miliknya sendiri; RLS memastikan hanya baris sendiri yang terbaca |
| `phase:change` | S→C | UPDATE `penyusup_room`: `status`, `ronde`, `fase_berakhir`, `giliran_user_id`. Timer = `fase_berakhir − (Date.now() + selisihJam)` |
| `clue:submit` | C→S | `penyusup_petunjuk(room, teks)` |
| `clue:new` | S→C | INSERT `penyusup_petunjuk` |
| `chat:send` | C→S | `penyusup_chat(room, teks)` |
| (chat masuk) | S→C | INSERT `penyusup_chat` |
| (host percepat) | C→S | `penyusup_ke_voting(room)` |
| `vote:cast` | C→S | `penyusup_vote(room, target \| null)` |
| `vote:progress` | S→C | UPDATE `penyusup_pemain.sudah_vote` → `{voted, total}` dihitung di klien; tile diberi `.is-voted` (kelas sudah ada di `komponen.css`) |
| `vote:result` | S→C | UPDATE `penyusup_room` saat masuk `hasil_vote` (kolom `hasil_vote`) |
| `game:end` | S→C | UPDATE `penyusup_room` → `status = selesai`, kolom `akhir = {pemenang, kata_pemandu, kata_penyusup, penyusup_ids, skor:[…], skor_divisi:[…]}` |
| (gabung/keluar, SFX) | S→C | INSERT `penyusup_log` → `sfx_gabung` / `sfx_keluar_room` + `sp-anim-join` |
| (detak & jam) | C→S | `penyusup_detak(room)` tiap 5 dtk + saat tab terlihat + tepat di tenggat |

---

## 7. Urutan pengerjaan

Tahap mengikuti prompt 2–6 di `Referensi/PROMPT_CODEX.md`. Setiap tahap ditutup dengan `npm run lint`, `npm test`, `npm run build`.

| Tahap | Isi | Selesai jika |
|---|---|---|
| **1. Aset, route, menu, layar statis** | Salin aset (§4), `aset.ts`, impor CSS paket, `SiapaPenyusupPage` + route lazy, kartu di PopupGame, layar Menu/Cara Main/Buat/Gabung (navigasi saja), `audio.ts` (Web Audio loop, OGG/MP3, mute, ducking BGM ke 30%, unlock tap pertama) | Tampilan cocok dengan prototype di 375 px & desktop; CT & Beranda tidak berubah; chunk absensi tidak membesar (bandingkan `vite build`) |
| **2. DB room & lobby** | `0032`: tabel, RLS, realtime, seed, helper, RPC room/lobby; `api.ts`, `usePenyusupRoom.ts`; layar Lobby (kode + salin + link undangan, grid pemain + badge divisi, mahkota host, SIAP, pilih avatar, kick); `logika.ts` + tes aturan gabung/kick/pindah host | 2 akun (browser biasa + incognito) bisa buat/gabung/keluar/kick; Satu Divisi menolak divisi lain |
| **3. Inti ronde** | `0033` bagian mesin fase, mulai, kartu, hafal, petunjuk, chat; layar Bagikan Kata (3-2-1, kartu terbang, tahan untuk lihat), Petunjuk, Diskusi, `FaseTimer` (`is-warning` ≤ 10, `is-critical` ≤ 5 + `sfx_tick_kritis`) | Satu ronde berjalan dengan 4 akun; kata orang lain tidak muncul di Network/Realtime devtools |
| **4. Voting, hasil, skor** | Vote, hitung, hasil vote (3 varian stempel), tebakan terakhir, cek menang, skor, layar Hasil Akhir (banner, kata vs kata, papan skor divisi/pemain, confetti, jingle), Main Lagi, halaman Papan Skor | Semua cabang menang/seri teruji |
| **5. Rapikan & uji** | Bandingkan dengan prototype, aksesibilitas §8, reconnect, host keluar di tengah ronde, kick, timer habis di setiap fase, reduced motion, mute | Checklist README §10 tercentang |

**Tes otomatis** (`tests/siapa-penyusup.test.ts`, untuk fungsi murni di `logika.ts`): `jumlahPenyusupOtomatis`, `validasiJumlahPenyusup`, `normalPetunjuk` / `petunjukDitolak`, `hitungVote` (seri, lewati menang, tanpa vote), `cekPemenang`, `hitungSkor`, `aksiGabung` (divisi beda / penuh / berjalan / dikeluarkan / pemain lama), `hostBerikut`, `faseBerikut`, `warnaDivisi`, `kodeValid`.
**Tes keamanan DB**: `node --test` tidak bisa menjalankan Postgres. Karena itu dibuat `supabase/tests/siapa_penyusup_rls.sql` untuk dijalankan manual di SQL Editor. Skrip ini menyimulasikan dua user (`set local role authenticated; set local request.jwt.claims = '{"sub":"…"}'`) dan memastikan: kartu orang lain tidak terbaca, `penyusup_rahasia`/`penyusup_pasangan` kosong bagi klien, vote orang lain tidak terbaca, dan baris `penyusup_room` tidak memuat kata sebelum `selesai`. Skrip dibungkus `begin … rollback`.

---

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Kata/peran bocor lewat payload realtime (UPDATE mengirim seluruh baris) | Data rahasia hanya di tabel tanpa realtime (§5.1); skrip uji RLS |
| Fase hanya maju jika ada klien yang mengirim detak (tidak ada cron), sama seperti CT | Semua klien di room memicu detak tepat di tenggat; fase "macet" langsung jalan begitu ada satu klien kembali |
| `raise exception` me-*rollback* pencatatan percobaan gabung yang gagal | `penyusup_gabung` mengembalikan `{ok:false, pesan}` untuk kegagalan yang perlu dicatat |
| Seri atau lewati terus-menerus membuat game tidak pernah selesai | Batas ronde maksimum (P7) |
| Tailwind preflight (reset `img`, `button`) bisa bertabrakan dengan asumsi CSS paket | Cek visual di tahap 1; perbaiki di `tambahan.css` yang di-scope `.sp-root` |
| 12 avatar SVG beranimasi + background beranimasi berat di Android murah | Ukur di tahap 5; jika perlu, grid besar memakai versi PNG avatar (salin hanya yang dipakai) |
| Safari: OGG Vorbis tidak didukung di versi lama; AudioContext butuh gestur | Deteksi `canPlayType`, fallback MP3; `resume()` di tap pertama |
| Ukuran repo bertambah ±4 MB (audio) | Hanya file yang dipakai; audio tidak masuk bundel JS |
| Bergantung pada `game_normal` milik CT | Fungsi murni & stabil; dicatat di header migrasi. Bila CT mengubahnya, SP ikut terpengaruh |
| Warna divisi bergeser jika divisi ditambah/dihapus (urutan `created_at`) | Diterima (kosmetik); alternatif kolom warna di `divisi` = ubah tabel bersama |
| Realtime: 12 pemain × chat aktif | Rate-limit chat di RPC; channel per room |
| Migrasi dijalankan manual di SQL Editor | Header migrasi menuliskan urutan & prasyarat (0028 harus sudah ada karena `game_normal`) |

---

## 9. Keputusan default (berlaku kecuali Anda mengubahnya)

- Mute SP terpisah dari CT (kunci `siapa-penyusup:suara`); satu tombol speaker untuk SFX + BGM.
- Pemain tersingkir tetap melihat chat & petunjuk, tetapi tidak bisa mengirim chat, petunjuk, atau vote.
- Chat hanya dibuka di fase `diskusi`.
- Yang terlihat selama voting: siapa yang **sudah** vote (centang `.is-voted`), tetapi tidak terlihat memilih siapa. Setelah hasil keluar, hanya jumlah suara per pemain yang ditampilkan (chip `sp-player__votes`), bukan siapa memilih siapa.
- Pemain lama yang reload/kembali selalu boleh masuk lagi ke room-nya (pola CT); pemain yang dikeluarkan tidak boleh.
- Pasangan kata yang sudah dipakai di sebuah room tidak diulang di room yang sama sampai bank kategori habis (pola `terpakai` di CT).

---

## 10. Keputusan

| # | Keputusan |
|---|---|
| P1 | ✅ Boleh mengubah `PopupGame.tsx`: placeholder diganti kartu Siapa Penyusup |
| P2 | Semua profil aktif boleh main, termasuk admin |
| P3 | Tanpa batas jam main |
| P4 | Kata penyusup **ditampilkan** saat penyusup tertangkap (seperti prototype). Kata pemandu tetap disembunyikan sampai akhir |
| P5 | Petunjuk yang memuat bagian kata sendiri **diperbolehkan**; hanya yang sama persis yang ditolak |
| P7 | Ada batas ronde: maksimal 6 ronde, lalu penyusup menang |
| P6, P8–P14 | Belum dijawab, jadi memakai rekomendasi: putus > 60 dtk = tersingkir; tebakan terakhir = pengaturan room (default mati, toleransi 1 huruf untuk kata ≥ 6); +50 per ronde bertahan; minggu = Senin–Minggu WIB; daftar kata kasar kecil di SQL; bank kata dikelola lewat SQL; 2 file migrasi; avatar diingat di `localStorage`; room publik tampil di daftar, Satu Divisi hanya untuk divisi yang sama |

### Pertanyaan awal (arsip)

1. **P1 — Entry menu.** Boleh saya mengubah `src/features/game/PopupGame.tsx` (file CT) untuk mengganti placeholder "Game lain menyusul…" dengan kartu Siapa Penyusup? Alternatifnya, pop-up dipindah ke file netral (`src/features/zona-game/`), tetapi perubahannya lebih besar.
2. **P2 — Siapa boleh main?** Hanya `role = 'user'` yang aktif ("anak magang"), atau admin juga? (Default: semua profil aktif, sama dengan CT.)
3. **P3 — Batas jam main** (mis. hanya setelah absen masuk / jam istirahat)? Default: tanpa batas, sama dengan CT.
4. **P4 — Yang diungkap saat seseorang tersingkir.** Prototype menampilkan *kata penyusup* saat penyusup tertangkap. Jika ada 2 penyusup dan mode "tidak tahu peran", penyusup kedua langsung sadar dirinya penyusup karena katanya sama. Rekomendasi: **ungkap peran saja**; kata baru diungkap di Hasil Akhir. Atau ikuti prototype?
5. **P5 — Validasi petunjuk.** Spesifikasi hanya menolak petunjuk yang *sama persis* dengan kata sendiri, jadi "Prambanan" untuk "Candi Prambanan" lolos. Rekomendasi: tolak juga jika sama dengan salah satu kata penyusun yang ≥ 4 huruf. Setuju?
6. **P6 — Pemain putus > 60 dtk di tengah game** dianggap tersingkir (perannya tidak diungkap) dan cek menang tetap dijalankan. Konsekuensinya, jika penyusup yang putus, pemandu menang. Setuju?
7. **P7 — Batas ronde** untuk mencegah seri tanpa akhir. Rekomendasi: maksimal 6 ronde; jika tercapai, penyusup menang karena berhasil berbaur.
8. **P8 — Tebakan terakhir** dijadikan pengaturan room (default **mati**)? Bolehkah salah ketik 1 huruf (`game_jarak ≤ 1` untuk kata ≥ 6 huruf)?
9. **P9 — Skor.** "Penyusup bertahan 1 ronde +50": dihitung **per ronde** yang dilewati, atau sekali saja? Untuk papan skor "minggu ini", apakah yang dimaksud minggu kalender Senin–Minggu WIB?
10. **P10 — Filter kata kasar.** Adakah daftar kata dari Dispar? Kalau tidak, saya isi daftar kecil Bahasa Indonesia/Jawa umum di `penyusup_kata_terlarang` yang bisa ditambah admin lewat SQL.
11. **P11 — Kelola bank kata.** Apakah cukup lewat SQL dulu, atau perlu halaman admin (Kelola → Bank Kata)? Rekomendasi: SQL dulu, halaman admin menyusul.
12. **P12 — Migrasi** dipecah menjadi dua file (0032 room/lobby, 0033 ronde/skor) sesuai tahap, atau satu file 0032 yang ditulis lengkap di tahap 2?
13. **P13 — Pilihan avatar** diingat antar-room lewat `localStorage` (rekomendasi, tanpa mengubah `profiles`), atau disimpan permanen di profil (perlu kolom baru di tabel bersama)?
14. **P14 — Room publik.** Default spesifikasi adalah "privat (pakai kode)". Room yang dibuat publik muncul di daftar "Room terbuka"; room Satu Divisi yang publik hanya terlihat oleh divisi yang sama. Setuju?
