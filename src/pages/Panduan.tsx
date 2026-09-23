import type { ReactNode } from "react";
import HeaderHalaman from "../components/HeaderHalaman";

export default function Panduan() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Panduan Penggunaan" kembaliKe="/" />

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
          muncul kolom <strong>"Link bukti (opsional)"</strong> juga kalau mau lampirkan link
          (mis. foto/dokumen di Google Drive).
        </Langkah>
        <Langkah no={5}>
          Kamera akan terbuka otomatis. Posisikan wajah kamu, lalu tekan{" "}
          <strong>"📸 Ambil Foto"</strong>. Kalau kurang pas, tekan "Ambil Ulang".
        </Langkah>
        <Langkah no={6}>Tekan "Gunakan Foto" — tunggu sebentar sampai muncul layar sukses ✅.</Langkah>
      </Bagian>

      <Bagian judul="🟠 Cara Absen Pulang">
        <p className="text-sm text-gray-600">
          Caranya sama seperti Absen Masuk, tinggal tekan ikon "Absen Pulang" di Beranda. Ikon
          ini baru aktif setelah kamu absen masuk lebih dulu.
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
        <p className="text-sm text-gray-600">
          Di Beranda ada tombol <strong>"+ Tambah Keterangan"</strong>. Pilih tanggal kamu tidak
          masuk, isi alasannya, dan boleh tambahkan link bukti (mis. link foto surat dokter di
          Google Drive). Admin bisa melihat keterangan ini.
        </p>
      </Bagian>

      <Bagian judul="✉️ Tugas Undangan">
        <p className="text-sm text-gray-600">
          Kalau admin menugaskan kamu untuk mengantar undangan, menu "Tugas Undangan" di Beranda
          akan menampilkan daftarnya.
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
          baru tekan Simpan. Tanda tangan ini cuma tersimpan sebagai bukti buat kamu — admin cuma
          lihat progres selesai/belum, bukan gambar tanda tangannya.
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
