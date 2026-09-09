import { Link } from "react-router-dom";

const MENU = [
  { to: "/kelola/pegawai", label: "Pegawai", icon: "👥", deskripsi: "Kelola akun & data pegawai" },
  { to: "/kelola/divisi", label: "Divisi", icon: "🏷️", deskripsi: "Kelola daftar bidang/divisi" },
  { to: "/kelola/pengaturan", label: "Pengaturan Kantor", icon: "🏢", deskripsi: "Lokasi, radius & jam kerja" },
  { to: "/kelola/tinjau", label: "Tinjau Absensi", icon: "🔍", deskripsi: "Cek entri mencurigakan" },
];

export default function Kelola() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-brand-text">Kelola</h1>
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
