import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeaderHalaman from "../../components/HeaderHalaman";
import IconTile from "../../components/IconTile";
import { supabase } from "../../lib/supabase";
import { cekRetensiAbsensi, type StatusRetensi } from "../../lib/retensi";

const MENU = [
  { to: "/kelola/pegawai", label: "Pegawai", iconSrc: "/kelola/icon_pegawai.png" },
  { to: "/kelola/divisi", label: "Divisi", iconSrc: "/kelola/icon_divisi.png" },
  { to: "/kelola/pengaturan", label: "Pengaturan Kantor", iconSrc: "/kelola/icon_kantor.png" },
  { to: "/kelola/tinjau", label: "Tinjau Absensi", iconSrc: "/kelola/icon_tinjau.png" },
  { to: "/kelola/foto", label: "Foto Absensi", iconSrc: "/kelola/icon_album.png" },
  { to: "/kelola/panduan", label: "Panduan Admin", iconSrc: "/kelola/icon_panduan.png" },
];

export default function Kelola() {
  const [retensi, setRetensi] = useState<StatusRetensi | null>(null);
  const [undanganBelum, setUndanganBelum] = useState(0);

  useEffect(() => {
    cekRetensiAbsensi().then(setRetensi);
    supabase
      .from("undangan")
      .select("*", { count: "exact", head: true })
      .eq("status", "belum")
      .then(({ count }) => setUndanganBelum(count ?? 0));
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

      <div className="grid grid-cols-2 gap-3">
        <IconTile
          to="/kelola/undangan"
          iconSrc="/icon_mail.png"
          label={undanganBelum > 0 ? `Distribusi Undangan (${undanganBelum} belum)` : "Distribusi Undangan"}
          penuh
          animasi={undanganBelum > 0}
        />
        {MENU.map((m) => (
          <IconTile key={m.to} to={m.to} iconSrc={m.iconSrc} label={m.label} />
        ))}
      </div>
    </div>
  );
}
