import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import HeaderHub from "../components/HeaderHub";
import IconTile from "../components/IconTile";
import { ambilAbsensiHariIni } from "../lib/absensi";
import { LABEL_STATUS_ABSEN } from "../lib/absensiMeta";
import FormKeteranganAbsen from "../components/FormKeteranganAbsen";
import { hitungProgressMagang } from "../lib/profil";
import { ambilTugasSaya, hitungRingkasanUndangan } from "../lib/undangan";
import type { Absensi } from "../types/database";

export default function Beranda() {
  const { profile, bisaKalenderKonten } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [absensi, setAbsensi] = useState<Absensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tugasBelum, setTugasBelum] = useState(0);

  async function muatStatus() {
    if (!profile) return;
    try {
      const data = await ambilAbsensiHariIni(profile.id);
      setAbsensi(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat status absen.");
    }
  }

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    muatStatus().finally(() => setLoading(false));
    ambilTugasSaya(profile.id)
      .then((rows) => setTugasBelum(hitungRingkasanUndangan(rows).belum))
      .catch(() => setTugasBelum(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const sudahMasuk = !!absensi?.masuk_at;
  const sudahPulang = !!absensi?.keluar_at;

  const magang =
    profile?.tanggal_mulai_magang && profile?.tanggal_selesai_magang
      ? hitungProgressMagang(profile.tanggal_mulai_magang, profile.tanggal_selesai_magang)
      : null;

  const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      <HeaderHub />

      <p className="text-center text-sm text-gray-500">{tanggalHariIni}</p>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat status absen..." />
      ) : (
        <>
          {magang && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-500">Progress Magang</h2>
                <span className="text-sm font-bold text-brand-masuk">{magang.persen}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-masuk transition-all"
                  style={{ width: `${magang.persen}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {magang.selesai ? "Masa magang sudah selesai" : magang.teksSisa}
              </p>
            </section>
          )}

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
                <BarisStatus label="Status" nilai={LABEL_STATUS_ABSEN[absensi.status] ?? absensi.status} />
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <IconTile
              to="/absen/masuk"
              iconSrc="/icon_absen_masuk.png"
              label="Absen Masuk"
              disabled={sudahMasuk}
            />
            <IconTile
              to="/absen/pulang"
              iconSrc="/icon_absen_keluar.png"
              label="Absen Pulang"
              disabled={!sudahMasuk || sudahPulang}
            />
            <IconTile
              to="/tugas-undangan"
              iconSrc="/icon_mail.png"
              label={tugasBelum > 0 ? `Tugas Undangan (${tugasBelum} belum)` : "Tugas Undangan"}
              penuh
              animasi={tugasBelum > 0}
            />
            <IconTile to="/rekap" iconSrc="/icon_rekap.png" label="Rekap" />
            {bisaKalenderKonten && (
              <IconTile to="/kalender" iconSrc="/icon_kalender_konten.png" label="Kalender" />
            )}
            {isAdmin && <IconTile to="/kelola" iconSrc="/icon_setting.png" label="Kelola" />}
            <IconTile to="/panduan" iconSrc="/icon_panduan.png" label="Panduan" />
          </div>

          <FormKeteranganAbsen onTersimpan={muatStatus} />
        </>
      )}
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
