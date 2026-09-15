import type { ReactNode } from "react";
import HeaderHalaman from "../components/HeaderHalaman";

export default function Panduan() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Panduan Penggunaan" kembaliKe="/" />

      <p className="text-sm text-gray-500">Panduan singkat cara absen di aplikasi DisparYK.</p>

      <Bagian judul="🔑 Cara Masuk (Login)">
        <Langkah no={1}>Buka aplikasi, tekan tombol "Masuk dengan Google".</Langkah>
        <Langkah no={2}>Pilih akun Google kamu (email harus sudah didaftarkan admin).</Langkah>
        <Langkah no={3}>
          Kalau muncul pesan "Akun kamu belum didaftarkan", hubungi admin supaya email kamu
          ditambahkan lebih dulu.
        </Langkah>
      </Bagian>

      <Bagian judul="🟢 Cara Absen Masuk">
        <Langkah no={1}>Di halaman Beranda, tekan tombol hijau "Absen Masuk".</Langkah>
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
          Kamera akan terbuka otomatis. Posisikan wajah kamu, lalu tekan{" "}
          <strong>"📸 Ambil Foto"</strong>. Kalau kurang pas, tekan "Ambil Ulang".
        </Langkah>
        <Langkah no={5}>Tekan "Gunakan Foto" — tunggu sebentar sampai muncul layar sukses ✅.</Langkah>
      </Bagian>

      <Bagian judul="🟠 Cara Absen Pulang">
        <p className="text-sm text-gray-600">
          Caranya sama seperti Absen Masuk, tinggal tekan tombol oranye "Absen Pulang" di
          Beranda. Tombol ini baru aktif setelah kamu absen masuk lebih dulu.
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
