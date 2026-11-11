import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import HeaderHub from "../components/HeaderHub";
import IconTile from "../components/IconTile";
import KartuOnline from "../components/KartuOnline";
import UcapanUlangTahun from "../components/UcapanUlangTahun";
import { ambilAbsensiHariIni } from "../lib/absensi";
import { LABEL_STATUS_ABSEN } from "../lib/absensiMeta";
import FormKeteranganAbsen from "../components/FormKeteranganAbsen";
import FotoAbsenHariIni from "../components/FotoAbsenHariIni";
import { hitungProgressMagang } from "../lib/profil";
import { formatTanggal } from "../lib/tanggal";
import { ambilTugasSaya, hitungRingkasanUndangan } from "../lib/undangan";
import { ambilFiturTugasUndangan, ambilTugasUmumSaya, infoDeadline, type TugasDenganPembuat } from "../lib/tugas";
import { belumDiambil, perluPerhatian, sudahBeres, urutkanTugas } from "../lib/tugasAturan";
import type { Absensi } from "../types/database";

// Pop-up Zona Game dimuat terpisah (berikut aset game-nya) baru saat tombol Game dibuka.
const muatPopupGame = () => import("../features/game/PopupGame");
const PopupGame = lazy(muatPopupGame);

export default function Beranda() {
  const { profile, bisaKalenderKonten, bisaNaskahAi } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [absensi, setAbsensi] = useState<Absensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tugasBelum, setTugasBelum] = useState(0);
  const [tugasTotal, setTugasTotal] = useState(0);
  const [perhatian, setPerhatian] = useState<{ tugas: TugasDenganPembuat; alasan: "mendesak" | "deadline" }[]>([]);
  const [bukaGame, setBukaGame] = useState(false);
  const tombolGame = useRef<HTMLButtonElement>(null);

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
    // Ringkasan menu Tugas = tugas dari admin + Tugas Undangan (kalau menunya aktif).
    Promise.all([
      ambilFiturTugasUndangan()
        .then((aktif) => (aktif ? ambilTugasSaya(profile.id) : []))
        .then((rows) => hitungRingkasanUndangan(rows))
        .catch(() => ({ belum: 0, total: 0 })),
      ambilTugasUmumSaya(profile.id)
        .then(({ tugas, progres }) => {
          // tugas sukarela yang belum diambil bukan tanggungan; "menunggu dicek" dianggap sudah dikerjakan
          const tanggungan = tugas.filter((t) => !belumDiambil(t, !!progres[t.id]));
          setPerhatian(
            urutkanTugas(tanggungan).flatMap((t) => {
              const alasan = perluPerhatian(t, progres[t.id]?.status, !!progres[t.id]);
              return alasan ? [{ tugas: t, alasan }] : [];
            })
          );
          return { belum: tanggungan.filter((t) => !sudahBeres(progres[t.id]?.status)).length, total: tanggungan.length };
        })
        .catch(() => ({ belum: 0, total: 0 })),
    ]).then(([u, t]) => {
      setTugasBelum(u.belum + t.belum);
      setTugasTotal(u.total + t.total);
    });
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
    <div className="flex flex-col gap-4 pb-20">
      <HeaderHub />

      <p className="text-center text-sm text-gray-500">{tanggalHariIni}</p>

      <KartuOnline />

      <UcapanUlangTahun />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat status absen..." />
      ) : (
        <>
          <div className={`grid gap-4 ${magang ? "lg:grid-cols-2" : ""}`}>
          {magang && (
            <section className="rounded-2xl bg-white p-5 shadow-sm lg:flex lg:flex-col">
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
              {/* Desktop: kartu ini setinggi kartu Status di sebelahnya — isi sisa ruangnya
                  dengan rincian masa magang supaya tidak kosong */}
              <dl className="mt-auto hidden grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-xs lg:grid">
                <div>
                  <dt className="text-gray-400">Mulai</dt>
                  <dd className="mt-0.5 font-semibold text-brand-text">{formatTanggal(profile!.tanggal_mulai_magang!)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Selesai</dt>
                  <dd className="mt-0.5 font-semibold text-brand-text">{formatTanggal(profile!.tanggal_selesai_magang!)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Hari ke</dt>
                  <dd className="mt-0.5 font-semibold text-brand-text">
                    {magang.hariBerjalan} dari {magang.totalHari}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm lg:flex lg:items-start lg:gap-6">
            {/* Desktop: status di kiri, foto absen di kanan (lebih pendek, tidak menyisakan
                ruang kosong di kartu Progress sebelahnya) */}
            <div className="lg:min-w-0 lg:flex-1">
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
              {absensi?.status === "izin" && !absensi.masuk_at && (
                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  Hari ini kamu tercatat izin. Ternyata masuk kerja? Tekan <strong>Absen Masuk</strong> — izin hari ini
                  otomatis jadi hadir.
                </p>
              )}
            </div>
            {absensi && <FotoAbsenHariIni absensi={absensi} />}
          </section>
          </div>

          {perhatian.length > 0 && <KartuPerhatian daftar={perhatian} />}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Absen Masuk & Pulang sebaris, tombol bulat Izin/Sakit tepat di tengahnya */}
            <div className="relative col-span-2 grid grid-cols-2 gap-3">
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
              <FormKeteranganAbsen
                onTersimpan={muatStatus}
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              />
            </div>
            {tugasTotal > 0 && tugasBelum === 0 ? (
              <Link
                to="/tugas"
                className="col-span-2 flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition active:scale-95"
              >
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <img src="/icon_checklist.png" alt="" className="h-16 w-16 rounded-full object-cover" />
                  <span className="text-sm font-semibold leading-tight text-brand-text">
                    Tugas
                  </span>
                </div>
                <img
                  src="/gambar_terimakasih.png"
                  alt="Terima kasih sudah menjalankan tugas dengan baik"
                  className="animasi-terimakasih h-20 w-full min-w-0 flex-1 object-contain sm:h-24"
                />
              </Link>
            ) : (
              <IconTile
                to="/tugas"
                iconSrc="/icon_checklist.png"
                label={tugasBelum > 0 ? `Tugas (${tugasBelum} belum)` : "Tugas"}
                penuh
                animasi={tugasBelum > 0}
              />
            )}
            <IconTile to="/rekap" iconSrc="/icon_rekap.png" label="Rekap" />
            {bisaKalenderKonten && (
              <IconTile to="/kalender" iconSrc="/icon_kalender_konten.png" label="Kalender Konten" />
            )}
            {bisaNaskahAi && <IconTile to="/naskah-ai" iconSrc="/icon_naskahai.png" label="Naskah AI" />}

            {isAdmin && <IconTile to="/kelola" iconSrc="/icon_setting.png" label="Kelola" />}
            <IconTile to="/panduan" iconSrc="/icon_panduan.png" label="Panduan" />
          </div>
        </>
      )}

      {/* Game dipisah dari deretan menu kerja: tombol melayang yang membuka pop-up sendiri */}
      <button
        ref={tombolGame}
        type="button"
        onClick={() => setBukaGame(true)}
        onPointerEnter={() => void muatPopupGame()}
        onFocus={() => void muatPopupGame()}
        onTouchStart={() => void muatPopupGame()}
        aria-haspopup="dialog"
        className="tombol-game fixed bottom-5 right-[max(1rem,calc((100vw-32rem)/2+1rem))] z-40 flex items-center gap-2 rounded-full bg-[#1f6feb] py-2 pl-2 pr-4 font-bold text-white shadow-lg shadow-blue-900/25 transition active:scale-95 lg:right-[max(1rem,calc((100vw-64rem)/2+1rem))]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
          <img src="/icon_gamepad.webp" alt="" aria-hidden="true" className="h-6 w-auto" />
        </span>
        Game
      </button>

      {bukaGame && (
        <Suspense fallback={null}>
          <PopupGame
            onTutup={() => {
              setBukaGame(false);
              tombolGame.current?.focus();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

/** Pengingat tugas: yang ditandai mendesak, atau deadline-nya tinggal < 24 jam (pilihan tugas, migrasi 0041). */
function KartuPerhatian({ daftar }: { daftar: { tugas: TugasDenganPembuat; alasan: "mendesak" | "deadline" }[] }) {
  const tampil = daftar.slice(0, 3);
  return (
    <Link
      to="/tugas"
      className={`flex flex-col gap-2 rounded-2xl border border-red-100 bg-white p-4 shadow-sm transition active:scale-[0.99] ${
        daftar.some((d) => d.alasan === "mendesak") ? "tugas-mendesak" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-red-700">Tugas perlu perhatian</h2>
        <span className="shrink-0 text-xs font-semibold text-brand-masuk">Buka Tugas ›</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {tampil.map(({ tugas, alasan }) => (
          <li key={tugas.id} className="flex min-w-0 items-center gap-2 text-sm">
            <span aria-hidden="true">{alasan === "mendesak" ? "🔥" : "⏰"}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-brand-text">{tugas.judul}</span>
            <span className="shrink-0 text-xs text-gray-500">
              {alasan === "mendesak" && !tugas.deadline_at ? "Mendesak" : tugas.deadline_at ? infoDeadline(tugas.deadline_at).teks : ""}
            </span>
          </li>
        ))}
      </ul>
      {daftar.length > tampil.length && <p className="text-xs text-gray-500">+{daftar.length - tampil.length} tugas lain</p>}
    </Link>
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
