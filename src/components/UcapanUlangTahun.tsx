import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  apakahUlangTahunHariIni,
  ambilUlangTahunDivisi,
  ambilUcapanUntuk,
  sudahMengucapkan,
  kirimUcapan,
} from "../lib/ulangTahun";
import type { Profile, UcapanUlangTahun as TipeUcapan } from "../types/database";

type UcapanDenganPengirim = TipeUcapan & { profiles: { nama: string; foto_url: string | null } | null };

/** Kartu ulang tahun di beranda: animasi + daftar ucapan kalau hari ini ulang
 * tahun pengguna sendiri, atau kartu pengingat (+ kirim ucapan langsung) kalau
 * hari ini ulang tahun rekan sedivisi. Tidak tampil sama sekali kalau tidak
 * ada yang berulang tahun. */
export default function UcapanUlangTahun() {
  const { profile } = useAuth();
  const ulangTahunSendiri = apakahUlangTahunHariIni(profile?.tanggal_lahir);

  const [teman, setTeman] = useState<Profile[]>([]);

  useEffect(() => {
    if (!profile || ulangTahunSendiri || !profile.divisi_id) return;
    ambilUlangTahunDivisi(profile.divisi_id, profile.id)
      .then(setTeman)
      .catch(() => setTeman([]));
  }, [profile, ulangTahunSendiri]);

  if (!profile) return null;
  if (!ulangTahunSendiri && teman.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {ulangTahunSendiri && <KartuUlangTahunSendiri userId={profile.id} nama={profile.nama} />}
      {teman.map((t) => (
        <KartuPengingat key={t.id} target={t} />
      ))}
    </div>
  );
}

function KartuUlangTahunSendiri({ userId, nama }: { userId: string; nama: string }) {
  const [ucapan, setUcapan] = useState<UcapanDenganPengirim[]>([]);

  async function muat() {
    try {
      setUcapan(await ambilUcapanUntuk(userId));
    } catch {
      // tidak fatal, kartu ucapan selamat tetap tampil tanpa daftar
    }
  }

  useEffect(() => {
    void muat();
    const t = setInterval(() => void muat(), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white p-5 text-center shadow-sm">
      <img
        src="/icon_kucing_kiri.png"
        alt=""
        aria-hidden="true"
        className="kucing-ultah-kiri pointer-events-none absolute left-0 top-1/2 h-20 w-20 object-contain sm:h-24 sm:w-24"
      />
      <img
        src="/icon_kucing_kanan.png"
        alt=""
        aria-hidden="true"
        className="kucing-ultah-kanan pointer-events-none absolute right-0 top-1/2 h-20 w-20 object-contain sm:h-24 sm:w-24"
      />

      <img src="/icon_kue.png" alt="" aria-hidden="true" className="kue-ultah mx-auto h-16 w-16 object-contain" />
      <h2 className="relative mt-2 px-16 text-lg font-bold text-brand-text sm:px-20">Selamat Ulang Tahun, {nama}!</h2>
      <p className="relative px-16 text-xs text-gray-500 sm:px-20">Semoga sehat selalu dan makin semangat kerjanya 🎉</p>

      {ucapan.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 text-left">
          <p className="text-xs font-semibold text-gray-500">Ucapan dari rekan kerja</p>
          {ucapan.map((u) => (
            <div key={u.id} className="flex items-start gap-2 rounded-xl bg-gray-50 p-2">
              {u.profiles?.foto_url ? (
                <img src={u.profiles.foto_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-xs font-bold text-white">
                  {u.profiles?.nama?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
              <div>
                <p className="text-xs font-semibold text-brand-text">{u.profiles?.nama ?? "Rekan kerja"}</p>
                <p className="text-sm text-gray-700">{u.pesan}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function KartuPengingat({ target }: { target: Profile }) {
  const [pesan, setPesan] = useState("");
  const [sudahKirim, setSudahKirim] = useState<boolean | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sudahMengucapkan(target.id)
      .then(setSudahKirim)
      .catch(() => setSudahKirim(false));
  }, [target.id]);

  async function kirim() {
    if (pesan.trim().length < 1) return;
    setMengirim(true);
    setError(null);
    try {
      await kirimUcapan(target.id, pesan);
      setSudahKirim(true);
      setPesan("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim ucapan.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {target.foto_url ? (
          <img src={target.foto_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-sm font-bold text-white">
            {target.nama.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="text-sm text-brand-text">
          <span className="balon-ultah inline-block" aria-hidden="true">
            🎂
          </span>{" "}
          <strong>{target.nama}</strong> sedang berulang tahun hari ini!
        </p>
      </div>

      {sudahKirim === true ? (
        <p className="text-xs text-green-600">Ucapan kamu sudah terkirim ✓</p>
      ) : sudahKirim === false ? (
        <div className="flex gap-2">
          <input
            value={pesan}
            onChange={(e) => setPesan(e.target.value)}
            placeholder="Tulis ucapan singkat..."
            className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && void kirim()}
          />
          <button
            onClick={() => void kirim()}
            disabled={mengirim || pesan.trim().length < 1}
            className="shrink-0 rounded-lg bg-brand-masuk px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {mengirim ? "..." : "Kirim"}
          </button>
        </div>
      ) : null}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
