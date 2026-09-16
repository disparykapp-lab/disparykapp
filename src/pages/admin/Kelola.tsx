import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeaderHalaman from "../../components/HeaderHalaman";
import IconTile from "../../components/IconTile";
import { cekRetensiAbsensi, type StatusRetensi } from "../../lib/retensi";

const MENU = [
  { to: "/kelola/pegawai", label: "Pegawai", icon: "👥", warna: "bg-brand-masuk" },
  { to: "/kelola/divisi", label: "Divisi", icon: "🏷️", warna: "bg-purple-500" },
  { to: "/kelola/pengaturan", label: "Pengaturan Kantor", icon: "🏢", warna: "bg-brand-info" },
  { to: "/kelola/tinjau", label: "Tinjau Absensi", icon: "🔍", warna: "bg-brand-pulang" },
  { to: "/kelola/foto", label: "Foto Absensi", icon: "🖼️", warna: "bg-teal-500" },
  { to: "/kelola/panduan", label: "Panduan Admin", icon: "📖", warna: "bg-gray-500" },
];

export default function Kelola() {
  const [retensi, setRetensi] = useState<StatusRetensi | null>(null);

  useEffect(() => {
    cekRetensiAbsensi().then(setRetensi);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Kelola" kembaliKe="/" />

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

      <div className="grid grid-cols-3 gap-3">
        {MENU.map((m) => (
          <IconTile key={m.to} to={m.to} icon={m.icon} label={m.label} warna={m.warna} />
        ))}
      </div>
    </div>
  );
}
