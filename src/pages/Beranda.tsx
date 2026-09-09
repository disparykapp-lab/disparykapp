import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import { ambilAbsensiHariIni } from "../lib/absensi";
import type { Absensi } from "../types/database";

const LABEL_STATUS: Record<string, string> = {
  hadir: "Hadir",
  telat: "Telat",
  dinas_luar: "Dinas Luar",
};

export default function Beranda() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [absensi, setAbsensi] = useState<Absensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    setLoading(true);
    ambilAbsensiHariIni(profile.id)
      .then((data) => {
        if (mounted) setAbsensi(data);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Gagal memuat status absen.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [profile]);

  if (loading) return <Loading teks="Memuat status absen..." />;

  const sudahMasuk = !!absensi?.masuk_at;
  const sudahPulang = !!absensi?.keluar_at;

  const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Halo,</p>
          <h1 className="text-xl font-bold text-brand-text">{profile?.nama}</h1>
        </div>
        <button
          onClick={() => void logout()}
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-500 shadow-sm"
        >
          Keluar
        </button>
      </header>

      <p className="text-sm text-gray-500">{tanggalHariIni}</p>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Status Hari Ini</h2>
        <div className="flex flex-col gap-2 text-sm">
          <BarisStatus
            label="Masuk"
            nilai={absensi?.masuk_at ? formatJam(absensi.masuk_at) : "Belum absen"}
          />
          <BarisStatus
            label="Pulang"
            nilai={absensi?.keluar_at ? formatJam(absensi.keluar_at) : "Belum absen"}
          />
          {absensi?.status && (
            <BarisStatus label="Status" nilai={LABEL_STATUS[absensi.status] ?? absensi.status} />
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <button
          disabled={sudahMasuk}
          onClick={() => navigate("/absen/masuk")}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-brand-masuk text-lg font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          🟢 Absen Masuk
        </button>
        <button
          disabled={!sudahMasuk || sudahPulang}
          onClick={() => navigate("/absen/pulang")}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-brand-pulang text-lg font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          🟠 Absen Pulang
        </button>
      </div>
    </div>
  );
}

function BarisStatus({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-brand-text">{nilai}</span>
    </div>
  );
}

function formatJam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
