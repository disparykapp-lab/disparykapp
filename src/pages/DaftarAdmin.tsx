import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Check, Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import IkonGoogle from "../components/IkonGoogle";
import { cekUndanganAdmin, daftarAdmin, type InfoUndangan } from "../lib/undanganAdmin";
import { formatWaktuWIB, kodeUndanganSah, pesanStatus, sisaWaktu } from "../lib/undanganAdminAturan";

/**
 * Pendaftaran admin lewat link sekali pakai dari admin lain (/daftar-admin/:kode).
 * Cukup masuk dengan Google — tanpa data magang, foto, atau persetujuan lagi.
 */
export default function DaftarAdmin() {
  const { kode = "" } = useParams();
  const navigate = useNavigate();
  const { session, profile, loading, penolakan, daftarAdminGoogle, logout, refreshProfile } = useAuth();
  const kodeSah = kodeUndanganSah(kode);
  const [info, setInfo] = useState<InfoUndangan | null>(kodeSah ? null : { status: "tidak_ada" });
  const [galatCek, setGalatCek] = useState<string | null>(null);
  // null = belum diubah → pakai nama dari akun Google
  const [namaDiubah, setNama] = useState<string | null>(null);
  const [membukaGoogle, setMembukaGoogle] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const [dibuka] = useState(() => Date.now());

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? "";
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const fotoGoogle = meta.avatar_url || meta.picture || null;

  // status link dicek ulang saat akun berganti (pemakai link melihat "berhasil", bukan "sudah dipakai")
  useEffect(() => {
    if (!kodeSah) return;
    let batal = false;
    cekUndanganAdmin(kode)
      .then((d) => {
        if (batal) return;
        setInfo(d);
        setGalatCek(null);
      })
      .catch((e: unknown) => !batal && setGalatCek(e instanceof Error ? e.message : "Link gagal diperiksa."));
    return () => {
      batal = true;
    };
  }, [kode, kodeSah, userId]);

  const nama = namaDiubah ?? (meta.full_name || meta.name || "");

  async function keGoogle() {
    setMembukaGoogle(true);
    setGalat(null);
    try {
      await daftarAdminGoogle(kode);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Halaman Google gagal dibuka.");
      setMembukaGoogle(false);
    }
  }

  async function daftar() {
    if (nama.trim().length < 2) {
      setGalat("Tulis nama kamu (minimal 2 huruf).");
      return;
    }
    setMengirim(true);
    setGalat(null);
    try {
      await daftarAdmin(kode, nama);
      await refreshProfile();
      setBerhasil(true);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pendaftaran gagal. Coba lagi.");
      // status link mungkin sudah berubah (dipakai orang lain / dibatalkan)
      cekUndanganAdmin(kode).then(setInfo).catch(() => undefined);
    } finally {
      setMengirim(false);
    }
  }

  // ---------- berhasil ----------
  if (berhasil || (info?.dipakai_saya && profile)) {
    return (
      <Kerangka>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="anim-medali flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white" aria-hidden="true">
            <Check size={34} strokeWidth={3} />
          </span>
          <h2 className="text-lg font-bold text-brand-text">Kamu sekarang admin</h2>
          <p className="text-sm text-gray-600">
            Akun <b className="break-all">{email}</b> sudah terdaftar sebagai admin DisparYK. Mulai sekarang cukup masuk lewat
            halaman login dengan akun Google yang sama.
          </p>
          <button
            type="button"
            onClick={() => navigate("/beranda", { replace: true })}
            className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-masuk text-base font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            Masuk ke aplikasi
          </button>
        </div>
      </Kerangka>
    );
  }

  // ---------- memeriksa ----------
  if (loading || (!info && !galatCek)) {
    return (
      <Kerangka>
        <div className="flex flex-col items-center gap-3 py-4 text-center" aria-live="polite">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-masuk/25 border-t-brand-masuk" aria-hidden="true" />
          <p className="text-sm text-gray-500">Memeriksa link pendaftaran…</p>
        </div>
      </Kerangka>
    );
  }

  if (galatCek || !info) {
    return (
      <Kerangka>
        <KartuMasalah judul="Link belum bisa diperiksa" isi={galatCek ?? "Coba muat ulang halaman ini."}>
          <button type="button" onClick={() => window.location.reload()} className="min-h-[48px] w-full rounded-xl bg-brand-masuk text-sm font-bold text-white">
            Muat ulang
          </button>
        </KartuMasalah>
      </Kerangka>
    );
  }

  // ---------- sudah punya akun ----------
  if (session && profile) {
    const sudahAdmin = profile.role === "admin";
    return (
      <Kerangka>
        <div className="flex flex-col gap-4 text-center">
          <img src="/icon_setting.png" alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <div>
            <h2 className="text-lg font-bold text-brand-text">{sudahAdmin ? "Kamu sudah admin" : "Akun ini sudah terdaftar"}</h2>
            <p className="mt-1 break-all text-xs font-semibold text-gray-500">{email}</p>
          </div>
          <p className="text-sm text-gray-600">
            {sudahAdmin
              ? "Tidak perlu mendaftar lagi. Link ini tetap berlaku untuk orang yang dituju — teruskan ke dia."
              : "Akun ini terdaftar sebagai pegawai. Link pendaftaran admin hanya untuk akun baru — minta admin mengubah peranmu jadi Admin di Kelola Pegawai."}
          </p>
          <Link to="/beranda" className="flex min-h-[48px] items-center justify-center rounded-xl bg-brand-masuk text-sm font-bold text-white">
            Ke Beranda
          </Link>
          {info.status === "berlaku" && (
            <button type="button" onClick={() => void logout()} className="text-sm font-semibold text-brand-masuk underline underline-offset-2">
              Pakai akun Google lain
            </button>
          )}
        </div>
      </Kerangka>
    );
  }

  // ---------- link tidak bisa dipakai ----------
  if (info.status !== "berlaku") {
    const p = pesanStatus(info.status);
    return (
      <Kerangka>
        <KartuMasalah judul={p.judul} isi={p.isi}>
          {session && (
            <button type="button" onClick={() => void logout()} className="min-h-[44px] w-full rounded-xl border border-gray-300 text-sm font-semibold text-brand-text">
              Keluar dari {email}
            </button>
          )}
          <Link to="/login" className="text-sm font-semibold text-brand-masuk underline underline-offset-2">
            Sudah punya akun? Masuk
          </Link>
        </KartuMasalah>
      </Kerangka>
    );
  }

  const batas = info.berlaku_sampai ?? "";

  // ---------- belum masuk Google: kartu undangan ----------
  if (!session) {
    return (
      <Kerangka>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <img src="/icon_setting.png" alt="" className="h-24 w-24 rounded-full object-cover" />
            <p className="text-xs font-bold uppercase tracking-wide text-brand-masuk">Undangan admin</p>
            <h2 className="text-xl font-bold leading-snug text-brand-text">
              {info.pembuat ? `${info.pembuat} mengundangmu jadi admin` : "Kamu diundang jadi admin"}
            </h2>
            <p className="text-sm text-gray-600">Kelola absensi, pegawai, tugas, dan konten DisparYK.</p>
          </div>

          <ul className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-masuk" aria-hidden="true" />
              Cukup masuk dengan akun Gmail — tanpa isi data diri atau menunggu persetujuan.
            </li>
            <li className="flex items-start gap-2">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-brand-masuk" aria-hidden="true" />
              <span>
                Sekali pakai · berlaku sampai <b>{formatWaktuWIB(batas)}</b> ({sisaWaktu(batas, dibuka)})
              </span>
            </li>
          </ul>

          {penolakan?.alasan === "nonaktif" && (
            <div role="alert" className="rounded-2xl bg-amber-50 p-3 text-left text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-bold">Akun ini sudah terdaftar tapi nonaktif</p>
              <p className="mt-0.5 break-all text-xs font-semibold">{penolakan.email}</p>
              <p className="mt-1">Minta admin mengaktifkan akunmu di Kelola Pegawai, atau pakai akun Google lain.</p>
            </div>
          )}
          {galat && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {galat}
            </p>
          )}

          <button
            type="button"
            onClick={() => void keGoogle()}
            disabled={membukaGoogle}
            className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold text-brand-text shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
          >
            <IkonGoogle />
            {membukaGoogle ? "Membuka Google…" : "Lanjut dengan Google"}
          </button>
        </div>
      </Kerangka>
    );
  }

  // ---------- sudah masuk Google, belum punya akun: konfirmasi ----------
  return (
    <Kerangka>
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-masuk">Satu langkah lagi</p>
          <h2 className="text-lg font-bold text-brand-text">Daftar sebagai admin</h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
          {fotoGoogle ? (
            <img src={fotoGoogle} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-base font-bold text-white" aria-hidden="true">
              {(nama.trim() || email).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-500">Akun Google</p>
            <p className="break-all text-sm font-bold text-brand-text">{email}</p>
          </div>
          <button type="button" onClick={() => void logout()} className="shrink-0 text-xs font-semibold text-brand-masuk underline underline-offset-2">
            Ganti
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-700">Nama yang tampil di aplikasi</span>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            maxLength={100}
            autoComplete="name"
            className="w-full rounded-xl border border-gray-300 p-3 text-base"
          />
        </label>

        {galat && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{galat}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void daftar()}
          disabled={mengirim}
          className="min-h-[52px] rounded-xl bg-brand-masuk text-base font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {mengirim ? "Mendaftarkan…" : "Daftar jadi admin"}
        </button>
        <p className="text-center text-xs text-gray-400">Link ini langsung tidak berlaku setelah kamu terdaftar.</p>
      </div>
    </Kerangka>
  );
}

function KartuMasalah({ judul, isi, children }: { judul: string; isi: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
        <AlertCircle size={28} />
      </span>
      <h2 className="text-lg font-bold text-brand-text">{judul}</h2>
      <p className="text-sm text-gray-600">{isi}</p>
      <div className="mt-1 flex w-full flex-col items-center gap-3">{children}</div>
    </div>
  );
}

function Kerangka({ children }: { children: ReactNode }) {
  return (
    <div className="gradasi-brand flex min-h-screen flex-col items-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 p-2 shadow-lg">
          <img src="/logo-disparyk.png" alt="Logo Dinas Pariwisata Kota Yogyakarta" className="h-full w-auto object-contain" />
        </div>
        <h1 className="mt-3 text-xl font-bold">DisparYK</h1>
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}
