import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cekRetensiAbsensi, type StatusRetensi } from "../../lib/retensi";

const MENU = [
  { to: "/kelola/pegawai", label: "Pegawai", icon: "👥", deskripsi: "Kelola akun & data pegawai" },
  { to: "/kelola/divisi", label: "Divisi", icon: "🏷️", deskripsi: "Kelola daftar bidang/divisi" },
  { to: "/kelola/pengaturan", label: "Pengaturan Kantor", icon: "🏢", deskripsi: "Lokasi, radius & jam kerja" },
  { to: "/kelola/tinjau", label: "Tinjau Absensi", icon: "🔍", deskripsi: "Cek entri mencurigakan" },
  { to: "/kelola/panduan", label: "Panduan Admin", icon: "📖", deskripsi: "Cara mengelola aplikasi" },
];

export default function Kelola() {
  const [retensi, setRetensi] = useState<StatusRetensi | null>(null);

  useEffect(() => {
    cekRetensiAbsensi().then(setRetensi);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-brand-text">Kelola</h1>

      {retensi && retensi.akanTerhapus > 0 && (
        <Link
          to="/rekap"
          className="flex flex-col gap-1 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm"
        >
          <span className="font-semibold">⚠️ {retensi.akanTerhapus} data absensi akan terhapus otomatis dalam 7 hari</span>
          <span>
            Data absensi disimpan {retensi.retensiBulan} bulan, lalu terhapus otomatis. Ekspor
            dulu lewat menu Rekap kalau masih dibutuhkan. Ketuk untuk buka Rekap.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-3">
        {MENU.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-masuk/10 text-2xl">
              {m.icon}
            </span>
            <div>
              <p className="font-semibold text-brand-text">{m.label}</p>
              <p className="text-xs text-gray-500">{m.deskripsi}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
