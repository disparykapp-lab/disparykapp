import type { ReactNode } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";

export default function PanduanAdmin() {
  return (
    <div className="kolom-sempit flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Panduan Admin" />

      <p className="text-sm text-gray-500">
        Panduan singkat mengelola aplikasi DisparYK sebagai admin.
      </p>

      <Bagian judul="👥 Kelola Pegawai">
        <Langkah no={1}>
          Buka Kelola → Pegawai, tekan <strong>"+ Tambah"</strong>. Di lembar yang muncul, isi
          nama, email Google, pilih divisi (chip, ketuk lagi untuk batal), dan jabatan
          (opsional), lalu "Daftarkan pegawai". Pegawai bisa langsung "Masuk dengan Google".
        </Langkah>
        <Langkah no={2}>
          Kotak di atas menghitung Semua · Online · Admin · Magang · Nonaktif — ketuk salah satu
          untuk menampilkan itu saja (ketuk lagi untuk kembali). Chip divisi dan tombol 🔍
          (cari nama/email/jabatan) menyaring langsung. Yang online tampil paling atas dengan
          titik hijau di fotonya; akun nonaktif tampil pudar bergaris putus di paling bawah.
        </Langkah>
        <Langkah no={3}>
          Ketuk kartu pegawai untuk membuka profilnya di depan layar. Ketuk fotonya untuk melihat
          foto profil ukuran penuh. Geser kiri/kanan (atau Sebelumnya/Berikutnya, atau panah
          keyboard) untuk pindah ke pegawai lain tanpa menutup.
        </Langkah>
        <Langkah no={4}>
          Di profil: ubah <strong>nama & jabatan</strong> (tekan Simpan), pilih{" "}
          <strong>divisi</strong> lewat chip, <strong>peran</strong> Pegawai/Admin, saklar{" "}
          <strong>Wajib absen</strong>, dan saklar <strong>Akun aktif</strong> — divisi, peran, dan
          saklar langsung tersimpan (muncul "Tersimpan"). Akunmu sendiri tidak bisa diturunkan
          perannya, dinonaktifkan, atau dihapus.
        </Langkah>
        <Langkah no={5}>
          Pegawai yang tidak wajib absen tetap boleh absen, tapi hari tanpa absennya tidak dihitung
          "Tidak Absen" di Rekap dan dia tidak ikut Peringkat Kerajinan. Akun nonaktif tidak bisa
          login/absen, tapi datanya tetap tersimpan.
        </Langkah>
        <Langkah no={6}>
          Tanggal lahir dan asal sekolah/kampus diisi pegawai sendiri lewat Profil Saya, jadi di
          sini hanya tampil.
        </Langkah>
        <Langkah no={7}>
          <strong>Masa Magang:</strong> tekan "Atur masa magang"/"Ubah tanggal", lalu ketuk tanggal
          mulai dan tanggal selesai di kalender (seperti kalender izin) atau pakai chip 3 bulan /
          6 bulan / 1 tahun, lalu Simpan. Pegawai itu melihat progress bar magangnya di Beranda
          &amp; Profil Saya, dan kartu di daftar menampilkan persentasenya.
        </Langkah>
        <Langkah no={8}>
          "Hapus pegawai" di bagian bawah profil meminta konfirmasi dulu, lalu menghapus pegawai{" "}
          <strong>permanen</strong> beserta seluruh riwayat absensinya — kalau ragu, cukup matikan
          "Akun aktif".
        </Langkah>
        <Catatan>
          Menghapus akun di Supabase Auth (dashboard Supabase) <strong>tidak</strong> otomatis
          menghapus data pegawai di sini — dua hal berbeda, hapus manual di kedua tempat kalau
          perlu bersih total.
        </Catatan>
      </Bagian>

      <Bagian judul="📝 Pendaftaran Mandiri (/daftar)">
        <Langkah no={1}>
          Ada halaman pendaftaran tersembunyi di alamat{" "}
          <strong>[alamat-aplikasi]/daftar</strong> — tidak ada tombol/tautan ke sana dari halaman
          login. Bagikan alamat itu langsung ke calon pegawai/peserta magang yang perlu mendaftar.
        </Langkah>
        <Langkah no={2}>
          Pendaftar masuk dengan akun Google, lalu mengisi foto, nama, tanggal lahir, asal
          sekolah/kampus, masa magang (dari–sampai), dan memilih divisi.
        </Langkah>
        <Langkah no={3}>
          Akun hasil pendaftaran berstatus <strong>Nonaktif</strong> sampai kamu menyetujuinya:
          buka Kelola → Pegawai, cari namanya, lalu tekan <strong>"Aktifkan"</strong>. Sebelum itu
          dia belum bisa login/absen.
        </Langkah>
        <Catatan>
          Kalau ada pendaftar yang tidak dikenal, tekan "Hapus" di kartunya — jangan diaktifkan.
        </Catatan>
      </Bagian>

      <Bagian judul="🏷️ Kelola Divisi">
        <Langkah no={1}>Buka Kelola → Divisi untuk menambah, mengganti nama, atau menonaktifkan divisi/bidang.</Langkah>
        <Langkah no={2}>Divisi yang dinonaktifkan tidak akan muncul lagi di pilihan divisi pegawai baru.</Langkah>
        <Langkah no={3}>
          Tiap divisi punya checklist <strong>"Fitur"</strong> di bagian bawah kartunya — centang{" "}
          <strong>"Kalender Konten"</strong> untuk mengizinkan semua pegawai di divisi itu memakai
          menu Kalender Konten. Contoh: centang untuk divisi Pemasaran kalau merekalah yang
          mengurus media sosial. Centang <strong>"Naskah AI"</strong> dengan cara yang sama untuk
          mengizinkan divisi memakai menu Naskah AI (perlu Edge Function & API key OpenAI sudah
          disiapkan — lihat README bagian "Fitur Naskah AI").
        </Langkah>
        <Catatan>
          Admin selalu bisa memakai Kalender Konten dan Naskah AI apa pun centangan divisinya.
          Pegawai biasa hanya melihat menunya di navigasi bawah kalau divisinya sudah dicentang.
        </Catatan>
      </Bagian>

      <Bagian judul="🏢 Pengaturan Kantor">
        <Langkah no={1}>
          Buka Kelola → Pengaturan Kantor. Ini <strong>wajib diisi</strong> sebelum pegawai bisa
          absen dengan mode "Di Kantor".
        </Langkah>
        <Langkah no={2}>
          Tekan "📍 Ambil Lokasi Saat Ini" saat kamu sedang berada persis di titik kantor, atau
          isi koordinat Latitude/Longitude manual.
        </Langkah>
        <Langkah no={3}>
          Atur radius absen (jarak maksimal dari titik kantor yang masih dianggap "di kantor",
          dalam meter) dan akurasi GPS maksimal yang diterima.
        </Langkah>
        <Langkah no={4}>Atur jam masuk & jam pulang kantor — dipakai untuk menentukan status "Telat".</Langkah>
      </Bagian>

      <Bagian judul="🗑️ Retensi Data Otomatis">
        <Langkah no={1}>
          Masih di Kelola → Pengaturan Kantor, ada bagian "Retensi Data Otomatis" untuk atur
          berapa lama foto absen dan data absensi disimpan sebelum terhapus otomatis (default:
          foto 3 hari, data absensi 3 bulan).
        </Langkah>
        <Langkah no={2}>
          Aplikasi menampilkan peringatan kuning di halaman Kelola begitu ada data absensi yang
          akan terhapus dalam 7 hari — buka Rekap dan ekspor Excel dulu kalau masih dibutuhkan.
        </Langkah>
        <Catatan>
          Penghapusan berjalan otomatis tiap hari lewat penjadwal database (pg_cron), bukan
          manual. Setelah terhapus, data tidak bisa dikembalikan.
        </Catatan>
      </Bagian>

      <Bagian judul="🖼️ Foto Absensi">
        <Langkah no={1}>
          Buka Kelola → Foto Absensi untuk melihat semua foto masuk/pulang pegawai dalam
          bentuk galeri, difilter berdasarkan rentang tanggal dan divisi.
        </Langkah>
        <Langkah no={2}>
          Tekan "Hapus" di bawah foto untuk menghapus foto itu secara manual (mis. kalau ada
          yang perlu dihapus lebih cepat, tidak menunggu retensi otomatis).
        </Langkah>
        <Catatan>
          Foto yang lebih tua dari batas retensi (lihat bagian Retensi Data Otomatis) tidak akan
          muncul lagi di sini — sudah terhapus otomatis duluan.
        </Catatan>
        <Catatan>
          Pegawai hanya bisa melihat foto absennya sendiri di Beranda pada hari itu saja (mulai
          pukul 00.00 besoknya tidak tampil lagi). Fotonya tidak dihapus — admin tetap bisa
          melihatnya di sini sampai batas retensi.
        </Catatan>
      </Bagian>

      <Bagian judul="📸 Twibbon Foto Absen">
        <Langkah no={1}>
          Buka Kelola → Twibbon Foto Absen. Bingkai ini tampil di kamera absen dan ikut tersimpan
          di foto absen semua pegawai.
        </Langkah>
        <Langkah no={2}>
          Siapkan gambar sesuai ketentuan: <strong>PNG transparan, rasio 3:4 potret</strong>{" "}
          (disarankan 1080 × 1440 px, minimal 600 × 800 px), maksimal 2 MB, dan area wajah di
          tengah dibiarkan transparan. Ornamen/logo taruh di pinggir.
        </Langkah>
        <Langkah no={3}>
          Tekan "Pilih Twibbon Baru", cek pratinjau dan hasil pemeriksaan, lalu tekan "Simpan &
          Pakai". Berlaku mulai pegawai membuka kamera absen berikutnya.
        </Langkah>
        <Langkah no={4}>
          Tekan "Kembalikan ke Twibbon Bawaan" kalau ingin memakai bingkai asli aplikasi lagi.
        </Langkah>
        <Catatan>
          Ukuran twibbon media sosial (1080 × 1080 atau 1080 × 1350) ditolak karena bingkainya
          akan gepeng. Unduh twibbon bawaan di halaman itu sebagai contoh/template desain.
        </Catatan>
      </Bagian>

      <Bagian judul="🔍 Tinjau Absensi">
        <Langkah no={1}>
          Buka Kelola → Tinjau Absensi. Secara default halaman ini menampilkan data{" "}
          <strong>hari ini</strong>. Ketuk hari lain di strip minggu (geser kiri/kanan atau tekan
          panah untuk pindah minggu) — datanya langsung berganti. Tombol "Hari ini" membawa kembali
          ke hari ini.
        </Langkah>
        <Langkah no={2}>
          Untuk beberapa hari sekaligus, tekan <strong>"Kalender"</strong>: ketuk tanggal awal lalu
          tanggal akhir (seperti kalender izin), atau pilih chip cepat (Kemarin, Minggu ini, 7 hari
          terakhir, Bulan ini), lalu tekan <strong>"Tampilkan"</strong>. Paling panjang 31 hari
          sekali tampil; kartu dikelompokkan per tanggal.
        </Langkah>
        <Langkah no={3}>
          Garis kartu menunjukkan kehadiran: <strong>tanpa garis</strong> = hadir tepat waktu (atau
          Dinas Luar), <strong>kuning</strong> = telat, <strong>merah</strong> = izin/sakit,{" "}
          <strong>hitam</strong> = belum absen. Pegawai wajib absen yang belum punya data hari itu
          otomatis muncul sebagai kartu hitam (hari kerja saja, sampai hari ini). Kotak ringkasan di
          atas menghitung tiap warna — ketuk salah satu untuk menampilkan warna itu saja. Chip divisi
          dan pencarian nama menyaring langsung.
        </Langkah>
        <Langkah no={4}>
          Ketuk kartu untuk membuka detail di depan layar: foto masuk & pulang (ketuk foto untuk
          ukuran penuh), jam, akurasi GPS, alamat IP, dan keterangan. Peta lokasi cuma ditampilkan
          untuk absen <strong>Dinas Luar</strong>; absen "Di Kantor" sudah otomatis tervalidasi
          radius kantor. Geser kiri/kanan (atau tombol Sebelumnya/Berikutnya, atau panah keyboard)
          untuk pindah ke pegawai berikutnya tanpa menutup detail.
        </Langkah>
        <Langkah no={5}>
          Kalau ada yang mencurigakan, tekan <strong>"Tandai untuk ditinjau"</strong> di detail, isi
          alasannya, lalu "Tandai". Kartu yang ditandai diberi ikon bendera merah. Tekan "Batalkan
          tanda" kalau sudah beres.
        </Langkah>
        <Langkah no={6}>
          Kalau pegawai sudah mengirim keterangan (mis. alasan sakit/telat) beserta foto bukti
          (mis. surat dokter) — lewat tombol bulat "Izin/Sakit" di Beranda, kolom keterangan
          opsional saat absen, atau tombol "+Keterangan" di Rekap mereka — keterangan itu muncul
          di kotak "Keterangan dari pegawai" pada detail entri ini, lengkap dengan foto buktinya
          (tersimpan privat di Supabase Storage, bucket bukti_izin) — ketuk fotonya untuk ukuran penuh. Keterangan lama yang
          masih berupa link tampil sebagai "🔗 Buka link bukti".
        </Langkah>
        <Langkah no={7}>
          Pegawai bisa mengajukan izin beberapa hari sekaligus (mis. 3 hari sakit): tiap hari kerjanya
          tercatat sebagai entri Izin/Sakit tersendiri, termasuk hari-hari mendatang — jadi admin bisa
          melihat siapa yang akan izin. Rekap dan peringkat hanya menghitung sampai hari ini. Kalau
          pegawai ternyata masuk di hari izin, entri hari itu otomatis berubah jadi Hadir/Telat.
        </Langkah>
      </Bagian>

      <Bagian judul="👑 Super Admin">
        <Langkah no={1}>
          Menu ini cuma muncul di Kelola kalau akunmu ditandai <strong>super admin</strong> —
          tingkatan tambahan di atas admin biasa, tidak terlihat admin lain (role yang tampil
          tetap "Admin" seperti biasa).
        </Langkah>
        <Langkah no={2}>
          <strong>Koreksi Absensi:</strong> pilih pegawai dan tanggal, lalu atur langsung jam
          masuk/pulang, mode (Di Kantor/Dinas Luar), status, akurasi GPS, IP, dan keterangan —
          baik untuk mengubah data yang sudah ada maupun membuat baris baru untuk tanggal yang
          belum pernah diabsen. Ini menggantikan koreksi manual lewat SQL Editor.
        </Langkah>
        <Langkah no={3}>
          <strong>Akses Super Admin:</strong> jadikan atau cabut status super admin untuk akun
          admin lain. Cuma akun dengan role admin yang bisa ditandai.
        </Langkah>
        <Langkah no={4}>
          <strong>Log Aktivitas:</strong> menampilkan <strong>Terakhir Aktif Admin</strong> (kapan
          tiap admin terakhir login atau membuka aplikasi, diambil dari data sesi Supabase
          Auth — bukan dicatat manual) dan <strong>Riwayat Aksi Super Admin</strong>: semua koreksi absensi dan
          perubahan status super admin yang pernah dilakukan (siapa, apa, kapan) — tidak bisa
          dihapus lewat aplikasi, sebagai jejak audit untuk kekuatan menu ini.
        </Langkah>
      </Bagian>

      <Bagian judul="📊 Rekap Semua Pegawai">
        <Langkah no={1}>Buka menu Rekap — pilih sendiri tanggal mulai &amp; akhir lalu tekan "Terapkan" (atau pakai tombol cepat "Minggu ini"/"Bulan ini"). Sebagai admin kamu juga bisa memfilter per Divisi atau per Pegawai (bukan cuma diri sendiri).</Langkah>
        <Langkah no={2}>Pilih "Semua Pegawai" untuk lihat ringkasan semua orang sekaligus.</Langkah>
        <Langkah no={3}>
          Di mode "Semua Pegawai" muncul grafik <strong>🏅 Peringkat Kerajinan</strong> untuk
          rentang tanggal yang dipilih — cuma podium <strong>3 pegawai terajin</strong>, pegawai
          lain tidak ditampilkan. Skornya: hadir tepat waktu &amp; dinas luar = 1 poin, telat/izin
          = ½ poin, tidak absen = 0, dibagi jumlah hari kerja (Senin–Jumat sampai hari ini). Filter
          divisi ikut berlaku.
        </Langkah>
        <Langkah no={4}>
          Tombol "Ekspor Excel" mengunduh file .xlsx rapi (judul, periode, ringkasan, tabel
          berwarna) siap dipakai untuk laporan ke atasan. Di mode "Semua Pegawai" ada juga tombol{" "}
          <strong>"Unduh Peringkat Terajin"</strong> yang mengunduh gambar PNG berisi 10 pegawai
          terajin di rentang tanggal itu (siap dibagikan), bukan lagi tombol Cetak.
        </Langkah>
      </Bagian>

      <Bagian judul="📋 Kelola Tugas">
        <Langkah no={1}>
          Buka Kelola → Tugas, tekan "+ Buat tugas baru", lalu pilih sasaran: semua pegawai, divisi
          tertentu, atau pegawai tertentu. Kalau perlu, lampirkan materi untuk pegawai lewat tombol
          File / Gambar / Lagu / Link (mis. template, contoh desain, lagu acuan).
        </Langkah>
        <Langkah no={2}>
          Tekan "Lihat progres" untuk melihat status, catatan, dan <strong>lampiran</strong> tiap
          pegawai: gambar tampil sebagai thumbnail, lagu bisa langsung diputar, file dan link
          dibuka di tab baru.
        </Langkah>
        <Langkah no={3}>
          Di bagian <strong>Pilihan</strong>: perlu dicek admin (Setujui / Minta revisi dari
          rincian progres), langkah-langkah, kuota sukarela (siapa cepat dia dapat), konfirmasi
          dibaca, tandai mendesak, pengingat di Beranda, tanya-jawab, dan arsip otomatis beberapa
          hari setelah deadline.
        </Langkah>
        <Langkah no={4}>
          Tombol <strong>Duplikat</strong> menyalin tugas (isi, sasaran, lampiran, pilihan) jadi tugas
          baru — tinggal atur deadline-nya. Pertanyaan pegawai yang belum dijawab terlihat dari
          lencana "💬 belum dibalas" di kartu tugas.
        </Langkah>
        <Langkah no={5}>
          Tekan ikon <strong>📌 pin</strong> di kartu tugas (atau saklar "Sematkan di atas" di form)
          supaya tugas itu tetap paling atas di daftar admin dan pegawai. Tekan lagi untuk melepas.
        </Langkah>
        <Catatan>
          File lampiran disimpan privat (hanya pegawai pemiliknya dan admin yang bisa membuka) dan
          ikut terhapus saat tugasnya dihapus. Batasnya 20 MB per file; gambar dikompres otomatis di
          HP pegawai.
        </Catatan>
      </Bagian>

      <Bagian judul="✉️ Distribusi Undangan">
        <Langkah no={1}>
          Buka Kelola → Distribusi Undangan. Halaman ini dibagi jadi{" "}
          <strong>folder per kategori</strong> (VVIP, VIP OPD & Mitra, Wilayah & Ormas,
          Lansia/Disabilitas/Anak) supaya tidak perlu scroll ratusan baris sekaligus — tekan
          salah satu folder untuk masuk ke isinya.
        </Langkah>
        <Langkah no={2}>
          Ada kolom pencarian di bagian paling atas halaman (di luar folder) buat cari 1 nama
          undangan tanpa perlu tahu dia ada di kategori mana — hasilnya tampil lintas kategori,
          lengkap dengan tombol pilih &amp; tugaskan seperti di dalam folder.
        </Langkah>
        <Langkah no={3}>
          Di dalam folder, undangan otomatis dikelompokkan lagi jadi "sub-folder" (accordion)
          berdasarkan kolom <strong>Folder/Sub-kelompok</strong> tiap undangan — teks ini bebas
          diubah admin (lewat Edit), jadi kelompoknya bisa diatur ulang sesuai kebutuhan
          (misalnya berdasarkan lokasi, jenis tamu, dll), tidak harus ikut kategori Excel asli.
        </Langkah>
        <Langkah no={4}>
          Sebelum menugaskan, buka <strong>"👥 Kelola Tim"</strong> di atas kalau mau menugaskan
          beberapa pegawai sekaligus dalam 1 grup (rencana pemakaian: 2 orang per tim) — buat tim
          baru, beri nama, centang anggotanya. Tim bisa diedit/dihapus kapan saja; menghapus tim
          membuat undangan yang sedang ditugaskan ke tim itu jadi "belum ditugaskan" lagi.
        </Langkah>
        <Langkah no={5}>
          Filter (status/PIC/cari nama), lalu centang undangan yang mau dibagikan — bisa banyak
          sekaligus, pilih <strong>tim atau pegawai perorangan</strong> di dropdown "Tugaskan
          ke..." lalu tekan <strong>"Tugaskan"</strong>. Satu undangan hanya bisa punya satu PIC:
          kalau ditugaskan ke tim, semua anggota tim itu melihat &amp; boleh mengerjakan tugas
          yang sama (statusnya dipakai bersama, bukan diduplikasi per orang). Tombol{" "}
          <strong>"Batalkan Penugasan"</strong> mengembalikan jadi "belum ditugaskan" tanpa harus
          pindah ke pegawai/tim lain dulu.
        </Langkah>
        <Langkah no={6}>
          Tekan <strong>"+ Tambah Undangan di Kategori Ini"</strong> untuk menambah undangan baru
          secara manual (di luar 451 data awal dari Excel WJNC).
        </Langkah>
        <Langkah no={7}>
          Tekan salah satu undangan untuk buka detail — bisa <strong>Edit</strong> (nama,
          kategori, folder/sub-kelompok, lokasi parkir) atau <strong>Hapus</strong> permanen. Di
          situ juga bisa isi/ubah <strong>Lokasi Pengantaran</strong> (beda dari "Lokasi Parkir"
          yang khusus hari-H) — kolom ini juga bisa diisi/diubah pegawai yang jadi PIC-nya.
        </Langkah>
        <Langkah no={8}>
          Pegawai menandai sendiri undangan yang jadi tanggung jawabnya lewat menu "Tugas
          Undangan" di Beranda mereka (Selesai/Kendala + nomor HP tamu untuk pengingat H-2).
          Progresnya otomatis muncul di halaman ini.
        </Langkah>
        <Langkah no={9}>
          Kalau petugas sudah menandai <strong>Selesai</strong>, buka detail undangannya — akan
          muncul thumbnail <strong>tanda tangan tamu undangan</strong> (bukti penerimaan surat)
          yang diambil petugas langsung dari layar HP. Tekan gambarnya untuk melihat ukuran
          penuh di tab baru.
        </Langkah>
        <Langkah no={10}>
          Tombol <strong>"📋 Lihat per Petugas"</strong> di bagian atas membuka halaman terpisah
          yang menampilkan rekap kebalikannya: dikelompokkan per petugas/tim (bukan per kategori),
          jadi langsung kelihatan undangan siapa saja yang dibawa satu orang/tim, digabung dari
          semua kategori sekaligus. Ada juga kelompok "Belum Ditugaskan" di paling bawah.
        </Langkah>
        <Langkah no={11}>
          Tombol <strong>"Ekspor Excel"</strong> di bagian atas mengunduh daftar{" "}
          <strong>semua undangan</strong> (semua kategori) berisi dua kolom saja: Nama dan Catatan.
        </Langkah>
      </Bagian>

      <Bagian judul="🌐 Landing Page">
        <Langkah no={1}>
          Alamat utama aplikasi (<strong>/</strong>) sekarang adalah halaman depan publik yang
          bisa dibuka siapa saja, termasuk sebelum login. Dashboard pegawai pindah ke{" "}
          <strong>/beranda</strong>. Buka Kelola → <strong>Landing Page</strong> untuk mengubah
          isinya.
        </Langkah>
        <Langkah no={2}>
          Setiap bagian (Hero, Destinasi, Gaya Wisata, Agenda, Berita, Testimoni, Newsletter,
          Footer, dan Navigasi) bisa dibuka dengan menekan judulnya. Ubah isinya, lalu tekan{" "}
          <strong>"Simpan"</strong> di bagian itu. Perubahan langsung tampil untuk pengunjung.
        </Langkah>
        <Langkah no={3}>
          Untuk foto, tekan <strong>"Unggah foto"</strong> atau <strong>"Ganti foto"</strong>.
          Foto otomatis diperkecil ke format WebP (maks. 1600 px) sebelum disimpan. Pakai foto
          yang kamu punya haknya (mis. foto sendiri atau berlisensi bebas), bukan tautan dari
          situs lain.
        </Langkah>
        <Langkah no={4}>
          Bagian <strong>Agenda, Berita, Testimoni, Destinasi, Gaya Wisata, dan Newsletter</strong>{" "}
          bisa disembunyikan dengan centang "Tampilkan bagian ini di landing". Agenda, Berita,
          dan Testimoni sengaja disembunyikan dulu sampai ada konten aslinya. Jangan mengisi
          testimoni yang tidak benar-benar dari pengunjung.
        </Langkah>
        <Langkah no={5}>
          Tombol <strong>"+ Tambah ..."</strong> menambah item baru (destinasi, berita, dll),
          dan <strong>↑ Naik / ↓ Turun</strong> mengatur urutannya. Untuk menghapus item, tekan
          "Hapus" lalu konfirmasi.
        </Langkah>
        <Langkah no={6}>
          Tombol <strong>"Kembalikan isi bawaan"</strong> mengganti isi bagian itu dengan contoh
          awal. Perubahan belum tersimpan sampai kamu menekan "Simpan".
        </Langkah>
        <Langkah no={7}>
          Kategori destinasi memakai ID kategori (mis. <em>budaya, alam</em>), dan Gaya Wisata
          yang dipilih pengunjung meredupkan agenda yang tidak cocok. Pastikan ID-nya sama
          persis.
        </Langkah>
        <Langkah no={8}>
          Beranda cuma menampilkan <strong>4 destinasi teratas</strong> di bagian "Destinasi
          Populer" (urutan sesuai daftar di sini — pakai ↑ Naik/↓ Turun untuk memilih mana
          yang tampil). Sisanya tetap bisa dibuka lewat tautan{" "}
          <strong>"Lihat Semua Destinasi"</strong>, yang membuka halaman daftar lengkap
          (<em>/destinasi</em>) dengan filter kategori sendiri.
        </Langkah>
        <Langkah no={9}>
          Di bagian atas halaman ada sakelar <strong>"Landing page"</strong>. Kalau dimatikan,
          alamat utama langsung mengarahkan pengunjung ke halaman login. Kamu tetap bisa masuk
          dan mengedit landing seperti biasa. Nyalakan lagi kapan pun kamu siap.
        </Langkah>
        <Langkah no={10}>
          Item <strong>Destinasi, Berita, dan Agenda</strong> punya halaman detail sendiri
          (<em>/destinasi/ID</em>, <em>/berita/ID</em>, <em>/agenda/ID</em>) yang terbuka saat
          kartunya diklik di landing. Isi bagian <strong>"Halaman detail"</strong> di dalam
          item (kosong = memakai teks singkat di kartu), lalu tekan{" "}
          <strong>"Lihat halaman detail"</strong> untuk mengeceknya di pratinjau sebelum
          disimpan.
        </Langkah>
        <Langkah no={11}>
          Khusus Destinasi, ada field <strong>"Galeri foto"</strong> di bagian halaman detail —
          unggah beberapa foto sekaligus untuk ditampilkan sebagai galeri yang bisa diperbesar
          pengunjung (foto mengembang jadi layar penuh, bisa digeser/panah antar foto).
        </Langkah>
        <Langkah no={12}>
          Masih di Destinasi, field <strong>"Kode wilayah BMKG (cuaca)"</strong> (di dalam
          "Pengaturan teknis") opsional — isi kodenya supaya halaman detail menampilkan
          prakiraan cuaca 3 hari dari BMKG. Format 4 segmen, mis. <em>34.71.05.1001</em>; cari
          kode kelurahan tujuan lewat{" "}
          <a href="https://data.bmkg.go.id/prakiraan-cuaca/" target="_blank" rel="noopener noreferrer" className="underline">
            data.bmkg.go.id/prakiraan-cuaca
          </a>
          . Kosongkan kalau tidak tahu kodenya — cuaca cukup disembunyikan, bukan error.
        </Langkah>
      </Bagian>

      <Bagian judul="📅 Kelola Kalender Konten">
        <Langkah no={1}>
          Buka menu Kalender, tekan "+ Tambah" — semua pegawai yang divisinya punya akses
          Kalender Konten (lihat bagian Kelola Divisi) boleh menambah konten baru, bukan cuma
          admin.
        </Langkah>
        <Langkah no={2}>Isi judul, deskripsi/caption, platform, tanggal & jam tayang, PIC penanggung jawab, divisi, dan link aset (Canva/Drive).</Langkah>
        <Langkah no={3}>
          Admin bisa mengedit atau menghapus konten siapa saja. Pegawai biasa bisa mengedit
          penuh dan menghapus konten yang dia buat sendiri atau yang PIC-nya dia — tidak bisa
          mengubah/menghapus konten milik pegawai lain.
        </Langkah>
      </Bagian>
    </div>
  );
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-white p-5 shadow-sm" open>
      <summary className="cursor-pointer list-none text-base font-bold text-brand-text marker:content-none">
        <span className="flex items-center justify-between">
          {judul}
          <span className="text-gray-400 transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </details>
  );
}

function Langkah({ no, children }: { no: number; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-gray-600">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-masuk/10 text-xs font-bold text-brand-masuk">
        {no}
      </span>
      <p>{children}</p>
    </div>
  );
}

function Catatan({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
      <strong>Catatan:</strong> {children}
    </div>
  );
}
