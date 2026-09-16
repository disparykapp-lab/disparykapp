import type { ReactNode } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";

export default function PanduanAdmin() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Panduan Admin" />

      <p className="text-sm text-gray-500">
        Panduan singkat mengelola aplikasi DisparYK sebagai admin.
      </p>

      <Bagian judul="👥 Kelola Pegawai">
        <Langkah no={1}>
          Buka Kelola → Pegawai, tekan "+ Tambah" untuk mendaftarkan email Google pegawai baru.
        </Langkah>
        <Langkah no={2}>
          Isi nama, email Google, divisi, dan jabatan (opsional), lalu simpan. Pegawai bisa
          langsung "Masuk dengan Google" setelah ini — tidak perlu langkah lain.
        </Langkah>
        <Langkah no={3}>
          Tiap pegawai bisa diubah divisi dan perannya (Pegawai/Admin) langsung dari daftar.
        </Langkah>
        <Langkah no={4}>
          Tombol "Aktif/Nonaktif" untuk menonaktifkan sementara (pegawai nonaktif tidak bisa
          absen atau login, tapi datanya tetap tersimpan).
        </Langkah>
        <Langkah no={5}>
          Tombol "Hapus" menghapus pegawai <strong>permanen</strong> beserta seluruh riwayat
          absensinya — gunakan hanya kalau memang perlu, kalau ragu pakai "Nonaktif" saja.
        </Langkah>
        <Catatan>
          Menghapus akun di Supabase Auth (dashboard Supabase) <strong>tidak</strong> otomatis
          menghapus data pegawai di sini — dua hal berbeda, hapus manual di kedua tempat kalau
          perlu bersih total.
        </Catatan>
      </Bagian>

      <Bagian judul="🏷️ Kelola Divisi">
        <Langkah no={1}>Buka Kelola → Divisi untuk menambah, mengganti nama, atau menonaktifkan divisi/bidang.</Langkah>
        <Langkah no={2}>Divisi yang dinonaktifkan tidak akan muncul lagi di pilihan divisi pegawai baru.</Langkah>
        <Langkah no={3}>
          Tiap divisi punya checklist <strong>"Fitur"</strong> di bagian bawah kartunya — centang{" "}
          <strong>"Kalender Konten"</strong> untuk mengizinkan semua pegawai di divisi itu memakai
          menu Kalender Konten. Contoh: centang untuk divisi Pemasaran kalau merekalah yang
          mengurus media sosial.
        </Langkah>
        <Catatan>
          Admin selalu bisa memakai Kalender Konten apa pun centangan divisinya. Pegawai biasa
          hanya melihat menu "Kalender" di navigasi bawah kalau divisinya sudah dicentang.
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
          bentuk galeri, difilter berdasarkan rentang tanggal.
        </Langkah>
        <Langkah no={2}>
          Tekan "Hapus" di bawah foto untuk menghapus foto itu secara manual (mis. kalau ada
          yang perlu dihapus lebih cepat, tidak menunggu retensi otomatis).
        </Langkah>
        <Catatan>
          Foto yang lebih tua dari batas retensi (lihat bagian Retensi Data Otomatis) tidak akan
          muncul lagi di sini — sudah terhapus otomatis duluan.
        </Catatan>
      </Bagian>

      <Bagian judul="🔍 Tinjau Absensi">
        <Langkah no={1}>Buka Kelola → Tinjau Absensi untuk melihat semua entri absen semua pegawai.</Langkah>
        <Langkah no={2}>Filter berdasarkan rentang tanggal, atau centang "Hanya ditandai" untuk entri mencurigakan.</Langkah>
        <Langkah no={3}>
          Tekan salah satu baris untuk membuka detail: foto absen, peta lokasi, akurasi GPS, dan
          alamat IP — dipakai untuk mengecek kewajaran absen.
        </Langkah>
        <Langkah no={4}>
          Kalau ada yang mencurigakan, isi alasan lalu tekan <strong>"⚑ Tandai Entri Ini"</strong>{" "}
          di bagian bawah detail. Entri yang ditandai tampil dengan garis merah dan bisa
          difilter lewat centang "Hanya ditandai". Tekan "Batalkan Tanda" kalau sudah beres.
        </Langkah>
        <Langkah no={5}>
          Kalau pegawai sudah mengirim keterangan (mis. alasan sakit) beserta link bukti (mis.
          surat dokter di Google Drive) lewat halaman Rekap mereka, keterangan itu muncul di
          kotak biru paling atas detail entri ini — tekan "🔗 Buka link bukti" untuk memeriksanya.
        </Langkah>
      </Bagian>

      <Bagian judul="📊 Rekap Semua Pegawai">
        <Langkah no={1}>Buka menu Rekap — sebagai admin kamu bisa memfilter per Divisi atau per Pegawai (bukan cuma diri sendiri).</Langkah>
        <Langkah no={2}>Pilih "Semua Pegawai" untuk lihat ringkasan semua orang sekaligus.</Langkah>
        <Langkah no={3}>
          Tombol "Ekspor Excel" mengunduh file .xlsx rapi (judul, periode, ringkasan, tabel
          berwarna) siap dipakai untuk laporan ke atasan. Ada juga tombol "Cetak" untuk print
          langsung.
        </Langkah>
      </Bagian>

      <Bagian judul="📅 Kelola Kalender Konten">
        <Langkah no={1}>Buka menu Kalender, tekan "+ Tambah" (hanya admin yang bisa menambah konten baru).</Langkah>
        <Langkah no={2}>Isi judul, deskripsi/caption, platform, tanggal & jam tayang, PIC penanggung jawab, divisi, dan link aset (Canva/Drive).</Langkah>
        <Langkah no={3}>
          Admin bisa mengedit atau menghapus konten siapa saja. Pegawai biasa hanya bisa mengubah
          status konten yang PIC-nya dirinya sendiri.
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
