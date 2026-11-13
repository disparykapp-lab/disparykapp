import type { ReactNode } from "react";
import HeaderHalaman from "../components/HeaderHalaman";

export default function Panduan() {
  return (
    <div className="kolom-sempit flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Panduan Penggunaan" kembaliKe="/beranda" />

      <p className="text-sm text-gray-500">
        Panduan singkat cara absen dan memakai Kalender Konten di aplikasi DisparYK.
      </p>

      <Bagian judul="🙋 Profil Saya">
        <Langkah no={1}>
          Tekan foto/avatar bulat di header Beranda untuk buka halaman <strong>Profil Saya</strong>.
        </Langkah>
        <Langkah no={2}>
          Di sana kamu bisa ganti foto profil (tekan fotonya), ubah nama, isi tanggal lahir, dan
          asal sekolah/kampus. Tekan "Simpan Profil" setelah selesai.
        </Langkah>
        <Langkah no={3}>
          Kalau kamu sedang magang, tanggal mulai & selesai magang diatur oleh admin — akan
          muncul progress bar persentase magang di halaman ini dan di Beranda.
        </Langkah>
      </Bagian>

      <Bagian judul="🔑 Cara Masuk (Login)">
        <Langkah no={1}>Buka aplikasi, tekan tombol "Masuk dengan Google".</Langkah>
        <Langkah no={2}>Pilih akun Google kamu (email harus sudah didaftarkan admin).</Langkah>
        <Langkah no={3}>
          Kalau muncul pesan "Akun kamu belum didaftarkan", hubungi admin supaya email kamu
          ditambahkan lebih dulu.
        </Langkah>
      </Bagian>

      <Bagian judul="🟢 Cara Absen Masuk">
        <Langkah no={1}>Di halaman Beranda, tekan ikon "Absen Masuk".</Langkah>
        <Langkah no={2}>
          Pilih posisi kamu sekarang: <strong>"Di Kantor"</strong> kalau sedang di kantor, atau{" "}
          <strong>"Dinas Luar"</strong> kalau sedang tugas di luar (wajib isi keterangan singkat,
          misal "Survei lokasi wisata Kaliurang").
        </Langkah>
        <Langkah no={3}>
          Tekan "Lanjutkan" — aplikasi akan meminta izin lokasi. Tekan <strong>Izinkan</strong>{" "}
          saat browser bertanya.
        </Langkah>
        <Langkah no={4}>
          Ada juga kolom <strong>"Keterangan (opsional)"</strong> — boleh dikosongkan, atau diisi
          kalau ada yang mau dicatat (mis. "Telat karena macet parah di jalan"). Begitu diisi,
          muncul tombol <strong>"Unggah foto bukti"</strong> kalau mau melampirkan foto (foto
          otomatis dikecilkan dulu sebelum diunggah).
        </Langkah>
        <Langkah no={5}>
          Kamera akan terbuka otomatis dengan bingkai twibbon — posisikan wajah kamu di
          dalam bingkainya, lalu tekan <strong>"📸 Ambil Foto"</strong>. Kalau kurang pas, tekan
          "Ambil Ulang".
          {" "}Mau tampil lebih segar? Pilih efek <strong>Natural</strong> atau{" "}
          <strong>Glowing</strong> di bawah kamera (kulit sedikit dihaluskan, wajah lebih cerah) —
          pilihanmu diingat untuk absen berikutnya. Bentuk wajah tidak diubah.
        </Langkah>
        <Langkah no={6}>Tekan "Gunakan Foto" — tunggu sebentar sampai muncul layar sukses ✅.</Langkah>
        <Langkah no={7}>
          Foto absen kamu tampil di kartu <strong>"Status Hari Ini"</strong> di Beranda — tekan
          fotonya untuk memperbesar. Foto hanya bisa kamu lihat <strong>hari itu saja</strong>;
          mulai pukul 00.00 besoknya sudah tidak tampil lagi.
        </Langkah>
      </Bagian>

      <Bagian judul="🟠 Cara Absen Pulang">
        <p className="text-sm text-gray-600">
          Caranya sama seperti Absen Masuk, tinggal tekan ikon "Absen Pulang" di Beranda. Ikon
          ini baru aktif setelah kamu absen masuk lebih dulu.
        </p>
      </Bagian>

      <Bagian judul="📊 Rekap Absensi Saya">
        <p className="text-sm text-gray-600">
          Buka menu Rekap untuk melihat <strong>persentase kehadiranmu</strong> bulan ini dan
          kalender berwarna: hijau hadir, biru dinas luar, garis kuning telat, garis merah
          izin/sakit, garis hitam tidak absen. Geser kalender (atau tekan panah) untuk ganti bulan,
          dan ketuk kotak ringkasan untuk menampilkan satu jenis saja.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Ketuk tanggal atau kartu riwayat untuk melihat detailnya: jam masuk-pulang dan lama kerja.
          Di situ kamu juga bisa <strong>menambah/mengubah keterangan</strong> (mis. alasan telat
          atau lupa absen) beserta foto bukti — hari tanpa absen yang diberi keterangan dicatat
          sebagai izin. Tekan <strong>"Ekspor Excel"</strong> untuk mengunduh rekap bulan itu.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Mau rekap dari tanggal tertentu sampai tanggal tertentu? <strong>Tahan</strong> tanggal
          awal di kalender, lalu <strong>ketuk</strong> tanggal akhirnya (boleh geser ke bulan lain
          dulu). Persentase, ringkasan, riwayat, dan Ekspor Excel langsung mengikuti rentang itu.
          Tekan <strong>"Hapus rentang"</strong> untuk kembali ke rekap per bulan.
        </p>
      </Bagian>

      <Bagian judul="🟢 Pengguna Online">
        <p className="text-sm text-gray-600">
          Di bagian atas Beranda ada penunjuk jumlah pengguna yang sedang membuka aplikasi saat
          ini. Angkanya bergerak real-time, dan kamu otomatis dihitung selama aplikasi terbuka.
        </p>
      </Bagian>

      <Bagian judul="⚠️ Kenapa Absen Saya Ditolak?">
        <ButirMasalah
          judul='"Lokasi kamu terlalu jauh dari kantor"'
          solusi='Kamu memilih mode "Di Kantor" tapi GPS mendeteksi kamu di luar radius kantor. Kalau memang sedang di luar, pilih mode "Dinas Luar" saja.'
        />
        <ButirMasalah
          judul='"Lokasi kurang akurat"'
          solusi="Sinyal GPS HP kamu kurang bagus (biasanya karena di dalam gedung/ruangan tertutup). Coba pindah ke dekat jendela atau ruang terbuka, pastikan izin lokasi diset ke akurasi tinggi (High Accuracy / Presisi Tinggi) di pengaturan HP."
        />
        <ButirMasalah
          judul='"Isi keterangan dinas luar dulu"'
          solusi='Kolom keterangan wajib diisi (minimal 5 huruf) saat memilih mode "Dinas Luar".'
        />
        <ButirMasalah
          judul="Tidak bisa buka kamera"
          solusi="Pastikan browser diizinkan mengakses kamera. Aplikasi tidak menerima foto dari galeri — foto harus diambil langsung saat itu."
        />
        <ButirMasalah
          judul='"Kamu sudah absen masuk/pulang hari ini"'
          solusi="Setiap pegawai hanya bisa absen masuk dan pulang masing-masing satu kali per hari."
        />
      </Bagian>

      <Bagian judul="🤒 Tidak Masuk Karena Sakit/Izin">
        <Langkah no={1}>
          Di Beranda ada tombol bulat <strong>"Izin/Sakit"</strong> di antara Absen Masuk dan Absen
          Pulang. Di kalendernya, ketuk <strong>tanggal mulai</strong> lalu <strong>tanggal selesai</strong>{" "}
          (atau pilih cepat 1/2/3/5 hari) — semua hari kerja di antaranya otomatis tercatat izin,
          termasuk hari-hari ke depan. Tidak perlu izin lagi besok dan seterusnya. Sabtu & Minggu tidak
          dihitung.
        </Langkah>
        <Langkah no={2}>
          Isi alasannya, lalu boleh unggah foto bukti (mis. foto surat dokter) langsung dari HP. Foto
          dikecilkan otomatis dan hanya bisa dilihat kamu sendiri serta admin.
        </Langkah>
        <Langkah no={3}>
          Salah tanggal atau izinnya kebanyakan? Buka lagi tombol <strong>Izin/Sakit</strong> → pilih{" "}
          <strong>Ubah</strong> untuk mengganti rentang/keterangan, atau <strong>Batalkan</strong>.
        </Langkah>
        <Langkah no={4}>
          Sudah sembuh lebih cepat? Langsung <strong>Absen Masuk</strong> seperti biasa — izin hari itu
          otomatis hilang dan statusmu jadi hadir. Izin di hari berikutnya tetap ada; hapus lewat Ubah
          kalau tidak perlu lagi.
        </Langkah>
      </Bagian>

      <Bagian judul="📋 Tugas dari Admin">
        <Langkah no={1}>
          Buka menu <strong>Tugas</strong> di Beranda, lalu ketuk tugasnya untuk melihat detail,
          deadline, dan <strong>lampiran dari pemberi tugas</strong> (mis. template, contoh desain,
          lagu acuan — ketuk untuk membuka atau memutar). File Word (.docx) bisa langsung dibaca
          lewat tombol <strong>Lihat</strong> tanpa aplikasi Word; tombol <strong>Unduh</strong>{" "}
          menyimpan file dengan nama aslinya.
        </Langkah>
        <Langkah no={2}>
          Pilih status <strong>Belum / Selesai / Kendala</strong> dan tulis catatan kalau perlu.
        </Langkah>
        <Langkah no={3}>
          Lampirkan hasil kerja dengan tombol <strong>File</strong> (PDF, Word, Excel, PowerPoint,
          ZIP/RAR), <strong>Gambar</strong> (otomatis dikompres supaya hemat kuota),{" "}
          <strong>Lagu</strong> (MP3, M4A, WAV, …), atau <strong>Link</strong> (mis. Google Drive,
          Canva, YouTube). Maksimal 8 lampiran dan 20 MB per file — file yang lebih besar kirim
          lewat link.
        </Langkah>
        <Langkah no={4}>Tekan "Simpan". Lampiran baru terkirim ke admin setelah disimpan.</Langkah>
        <Langkah no={5}>
          Sesuai pilihan admin, sebuah tugas bisa: minta kamu menekan <strong>"Sudah saya baca"</strong>,
          punya <strong>langkah-langkah</strong> untuk dicentang, perlu <strong>dicek admin</strong>{" "}
          (status "Menunggu dicek", atau "Perlu revisi" berisi catatan perbaikan), atau berupa{" "}
          <strong>tugas sukarela</strong> yang diambil lewat tombol "Ambil tugas ini" selama kuota
          belum penuh. Pakai "💬 Tanya admin" kalau ada yang kurang jelas.
        </Langkah>
        <p className="text-sm text-gray-600">
          Tugas bertanda 📌 Disematkan selalu paling atas di daftar. Tugas mendesak, atau yang
          deadline-nya tinggal kurang dari 24 jam, muncul di kartu "Tugas perlu perhatian" di Beranda.
        </p>
      </Bagian>

      <Bagian judul="✉️ Tugas Undangan">
        <p className="text-sm text-gray-600">
          Kalau admin menugaskan kamu untuk mengantar undangan, menu "Tugas Undangan" di Beranda
          akan menampilkan daftarnya. Kalau kamu ditugaskan lewat <strong>tim</strong> (bukan
          perorangan), tugas itu muncul dengan keterangan "👥 Tim ..." — kamu dan anggota tim yang
          lain sama-sama bisa mengerjakan &amp; menandai tugas itu, statusnya dipakai bersama.
        </p>
        <Langkah no={1}>Tekan salah satu undangan untuk membuka detailnya.</Langkah>
        <Langkah no={2}>
          Pilih status <strong>Selesai</strong> kalau sudah diantar, atau{" "}
          <strong>Kendala</strong> kalau ada masalah (mis. alamat salah/tidak ketemu orangnya).
        </Langkah>
        <Langkah no={3}>
          Setelah surat diserahkan, isi <strong>nomor HP tamu undangan</strong> — ini dipakai
          untuk mengingatkan tamu saat H-2 sebelum acara. Isi juga{" "}
          <strong>Lokasi Pengantaran</strong> kalau belum ada.
        </Langkah>
        <Langkah no={4}>
          Kalau statusnya <strong>Selesai</strong>, minta tamu undangan tanda tangan langsung di
          layar HP kamu (di kolom tanda tangan yang muncul) sebagai bukti surat sudah diterima,
          baru tekan Simpan. Tanda tangan ini tersimpan sebagai bukti penerimaan dan bisa dilihat
          lagi kapan saja di tugas yang sama, juga oleh admin untuk verifikasi.
        </Langkah>
        <Langkah no={5}>
          Kalau semua tugas undanganmu sudah beres (tidak ada lagi yang berstatus "Belum"), menu
          ini di Beranda berubah jadi kartu ucapan terima kasih dari Dinas Pariwisata Kota
          Yogyakarta — masih bisa ditekan untuk membuka daftar tugasmu seperti biasa.
        </Langkah>
      </Bagian>

      <Bagian judul="📅 Kalender Konten">
        <p className="text-sm text-gray-600">
          Menu ini cuma muncul kalau divisi kamu diizinkan admin memakainya.
        </p>
        <Langkah no={1}>Tekan menu "Kalender" untuk lihat rencana konten media sosial — ada tampilan Bulanan (kalender) dan Daftar.</Langkah>
        <Langkah no={2}>
          Tekan "+ Tambah" untuk membuat konten baru: isi judul, deskripsi/caption, platform,
          tanggal & jam tayang, PIC penanggung jawab, divisi, dan link aset (Canva/Drive).
        </Langkah>
        <Langkah no={3}>
          Kamu bisa mengedit atau menghapus konten yang <strong>kamu buat sendiri</strong> atau
          yang <strong>kamu jadi PIC-nya</strong>. Konten buatan pegawai lain hanya bisa dilihat,
          tidak bisa diubah/dihapus.
        </Langkah>
        <Langkah no={4}>
          Kalau kamu ditunjuk sebagai PIC suatu konten, buka konten itu untuk mengubah statusnya
          (mis. menandai "Tayang" setelah diunggah).
        </Langkah>
      </Bagian>

      <Bagian judul="🎨 Game Coret Tebak">
        <p className="text-sm text-gray-600">
          Game tebak gambar untuk 2–10 pemain. Buka lewat tombol <strong>🎮 Game</strong> di pojok
          kanan bawah Beranda, lalu pilih "Main Sekarang" di pop-up Zona Game.
        </p>
        <Langkah no={1}>
          Tekan <strong>"Buat Room"</strong>, pilih tema, waktu menggambar, jumlah ronde, maksimal
          pemain, dan publik/privat. Bagikan <strong>kode room</strong> (atau tombol bagikan link)
          ke rekan kerja. Room publik juga muncul di daftar lobi.
        </Langkah>
        <Langkah no={2}>
          Rekan bergabung lewat daftar lobi, kolom <strong>"Kode room"</strong>, atau link. Host
          menekan <strong>"Mulai"</strong> kalau sudah ada minimal 2 pemain.
        </Langkah>
        <Langkah no={3}>
          Di lobi, tiap room punya status: <strong>Menunggu pemain</strong> (masih bisa
          bergabung) atau <strong>Main · Ronde x/y</strong> (sedang berlangsung). Ketuk kartu room
          untuk melihat detailnya — tema, pengaturan, siapa yang sedang menggambar, dan skor
          sementara. Room yang sedang kamu ikuti muncul di <strong>Room Kamu</strong>; tekan
          "Lanjutkan" untuk kembali ke permainan yang sempat ditinggal.
        </Langkah>
        <Langkah no={4}>
          Pemain bergiliran menggambar: pilih 1 dari 3 kata, lalu gambar di kanvas. Pemain lain
          mengetik tebakan. Huruf petunjuk terbuka pelan-pelan seiring waktu.
        </Langkah>
        <Langkah no={5}>
          Tebakan salah terlihat semua pemain. Tebakan <strong>"hampir benar"</strong> cuma
          terlihat olehmu (kolomnya bergoyang). Tebakan benar tidak ditampilkan ke pemain lain —
          mereka cuma melihat "kamu menebak benar".
        </Langkah>
        <Langkah no={6}>
          Makin cepat menebak, makin besar poinnya. Setelah semua giliran selesai, juara 1–3
          tampil di podium. Host bisa langsung "Main Lagi".
        </Langkah>
        <Langkah no={7}>
          Selama di halaman game ada musik latar (mulai setelah kamu menyentuh layar pertama
          kali). Tombol speaker 🔊 di pojok kanan atas mematikan musik sekaligus efek suaranya.
        </Langkah>
      </Bagian>

      <Bagian judul="🕵️ Game Siapa Penyusup?">
        <p className="text-sm text-gray-600">
          Game tebak kata untuk 4–12 pemain. Buka lewat tombol <strong>🎮 Game</strong> di pojok
          kanan bawah Beranda, lalu pilih "Main Sekarang" di kartu Siapa Penyusup?.
        </p>
        <Langkah no={1}>
          Tekan <strong>"Buat Room"</strong> dan pilih mode: <strong>Satu Divisi</strong> (hanya
          teman satu divisi yang bisa gabung) atau <strong>Antar Divisi</strong> (semua divisi
          boleh gabung, poin dikumpulkan per divisi). Atur juga jumlah penyusup, waktu tiap fase,
          dan kategori kata. Semua ini bisa diganti lagi oleh host lewat tombol{" "}
          <strong>"Ubah Pengaturan"</strong> di lobi, misalnya setelah Main Lagi.
        </Langkah>
        <Langkah no={2}>
          Bagikan <strong>kode room</strong> 5 huruf atau tombol <strong>Undang</strong>. Rekan
          bergabung lewat "Gabung Room". Di lobi, ketuk karaktermu untuk menggantinya. Host
          menekan <strong>"Mulai Game"</strong> kalau sudah ada minimal 4 pemain.
        </Langkah>
        <Langkah no={3}>
          Semua pemain dapat <strong>kata rahasia</strong>. Tekan dan tahan kartu untuk melihatnya.
          Sebagian besar pemain (Pemandu) dapat kata yang sama; 1–2 Penyusup dapat kata yang mirip
          tapi beda — dan biasanya tidak tahu kalau dirinya penyusup.
        </Langkah>
        <Langkah no={4}>
          Bergiliran, beri <strong>1 kata petunjuk</strong> tentang katamu (tidak boleh sama
          persis dengan katamu). Lalu <strong>diskusi</strong> lewat chat: siapa yang petunjuknya
          janggal?
        </Langkah>
        <Langkah no={5}>
          <strong>Voting</strong>: pilih yang kamu curigai, atau Lewati. Suara terbanyak
          tersingkir dan perannya diungkap; kalau seri, tidak ada yang tersingkir. Siapa memilih
          siapa tetap rahasia.
        </Langkah>
        <Langkah no={6}>
          Pemandu menang kalau semua penyusup tertangkap. Penyusup menang kalau jumlahnya sama
          dengan pemandu yang tersisa, atau masih bertahan setelah 6 ronde. Poin masuk ke
          <strong> Papan Skor</strong> (minggu ini &amp; sepanjang waktu, per pemain dan per divisi).
        </Langkah>
        <Langkah no={7}>
          <strong>Truth or Dare</strong>: di layar akhir, pihak yang kalah (penyusup yang
          ketahuan, atau para pemandu kalau penyusup lolos) kena hukuman. Kalau yang kalah lebih
          dari satu, roda nama memilih siapa yang kena; lalu roda menentukan Truth atau Dare, dan
          AI memberi 3 pilihan. Layarnya sama di HP semua pemain, jadi semua bisa ikut membaca.
          Tekan <strong>"Putar Lagi"</strong> sebanyak yang kalian mau — yang belum kebagian
          didahulukan.
        </Langkah>
        <Langkah no={8}>
          Kalau menutup aplikasi lebih dari 1 menit di tengah permainan, kamu dianggap keluar dan
          tidak mendapat poin game itu. Tombol speaker 🔊 mengatur musik dan efek suara.
        </Langkah>
      </Bagian>

      <Bagian judul="💡 Tips Supaya Absen Lancar">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Aktifkan GPS/Lokasi di HP sebelum membuka aplikasi.</li>
          <li>Pilih mode lokasi "Presisi Tinggi" / "High Accuracy" di pengaturan HP.</li>
          <li>Pastikan sinyal internet stabil saat absen.</li>
          <li>Izinkan akses Kamera & Lokasi saat browser bertanya (jangan tekan "Tolak").</li>
        </ul>
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

function ButirMasalah({ judul, solusi }: { judul: string; solusi: string }) {
  return (
    <div className="rounded-xl bg-brand-bg p-3">
      <p className="text-sm font-semibold text-brand-text">{judul}</p>
      <p className="mt-1 text-sm text-gray-600">{solusi}</p>
    </div>
  );
}
