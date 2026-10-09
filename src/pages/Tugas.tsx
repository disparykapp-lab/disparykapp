import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HeaderHalaman from "../components/HeaderHalaman";
import Loading from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";
import { teksDenganLink } from "../lib/linkify";
import { ambilTugasSaya, hitungRingkasanUndangan } from "../lib/undangan";
import {
  ambilFiturTugasUndangan,
  ambilTugasUmumSaya,
  formatWaktu,
  infoDeadline,
  simpanProgresTugas,
  LABEL_STATUS_TUGAS,
  type ProgresTugas,
  type StatusTugas,
  type TugasDenganPembuat,
} from "../lib/tugas";

type Tab = "belum" | "selesai" | "semua";

/**
 * Halaman Tugas pegawai: Tugas Undangan (kalau diaktifkan admin) sebagai salah
 * satu sub menu, lalu daftar tugas dari admin yang ditujukan ke pegawai ini.
 */
export default function Tugas() {
  const { profile } = useAuth();
  const [fiturUndangan, setFiturUndangan] = useState(true);
  const [undangan, setUndangan] = useState<{ belum: number; selesai: number; total: number } | null>(null);
  const [tugas, setTugas] = useState<TugasDenganPembuat[]>([]);
  const [progres, setProgres] = useState<Record<string, ProgresTugas>>({});
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("belum");
  const [terbuka, setTerbuka] = useState<string | null>(null);

  async function muatTugas() {
    if (!profile) return;
    try {
      const d = await ambilTugasUmumSaya(profile.id);
      setTugas(d.tugas);
      setProgres(d.progres);
      setGalat(null);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat tugas.");
    }
  }

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    Promise.all([
      ambilFiturTugasUndangan().then(setFiturUndangan),
      ambilTugasSaya(profile.id)
        .then((rows) => setUndangan(hitungRingkasanUndangan(rows)))
        .catch(() => setUndangan(null)),
      muatTugas(),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const statusDari = (id: string): StatusTugas => progres[id]?.status ?? "belum";
  const jumlah = useMemo(() => {
    const selesai = tugas.filter((t) => statusDari(t.id) === "selesai").length;
    return { belum: tugas.length - selesai, selesai, semua: tugas.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tugas, progres]);
  const tersaring = tugas.filter((t) => {
    const s = statusDari(t.id);
    return tab === "semua" || (tab === "selesai" ? s === "selesai" : s !== "selesai");
  });

  if (loading) return <Loading teks="Memuat tugas..." />;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tugas" kembaliKe="/beranda" />

      {fiturUndangan && <KartuUndangan ringkasan={undangan} />}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-brand-text">Tugas dari Admin</h2>
            <p className="text-xs text-gray-500">Tandai selesai setelah dikerjakan.</p>
          </div>
          {jumlah.semua > 0 && (
            <span className="text-xs font-semibold text-brand-masuk">
              {jumlah.selesai}/{jumlah.semua} selesai
            </span>
          )}
        </div>

        {galat && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{galat}</div>}

        {!galat && tugas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center shadow-sm">
            <img src="/icon_checklist.png" alt="" className="h-16 w-16 rounded-full object-cover" />
            <p className="text-sm font-semibold text-brand-text">Belum ada tugas</p>
            <p className="text-xs text-gray-500">Tugas baru dari admin akan muncul di sini.</p>
          </div>
        ) : (
          tugas.length > 0 && (
            <>
              <div className="flex gap-2 overflow-x-auto">
                {(["belum", "selesai", "semua"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                      tab === t ? "bg-brand-masuk text-white" : "bg-white text-gray-500"
                    }`}
                  >
                    {t === "belum" ? "Perlu dikerjakan" : t === "selesai" ? "Selesai" : "Semua"} ({jumlah[t]})
                  </button>
                ))}
              </div>

              <div className="grid items-start gap-2 lg:grid-cols-2">
                {tersaring.map((t) => (
                  <KartuTugas
                    key={t.id}
                    tugas={t}
                    progres={progres[t.id]}
                    terbuka={terbuka === t.id}
                    onBuka={() => setTerbuka(terbuka === t.id ? null : t.id)}
                    onTersimpan={() => {
                      setTerbuka(null);
                      void muatTugas();
                    }}
                  />
                ))}
                {tersaring.length === 0 && (
                  <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm lg:col-span-2">
                    {tab === "belum" ? "Semua tugas sudah selesai. Terima kasih! 🎉" : "Tidak ada tugas di sini."}
                  </p>
                )}
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}

function KartuUndangan({ ringkasan }: { ringkasan: { belum: number; selesai: number; total: number } | null }) {
  const total = ringkasan?.total ?? 0;
  const persen = total > 0 ? Math.round(((ringkasan?.selesai ?? 0) / total) * 100) : 0;
  const belum = ringkasan?.belum ?? 0;
  return (
    <Link
      to="/tugas-undangan"
      className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.98] ${belum > 0 ? "tugas-mendesak" : ""}`}
    >
      <img src="/icon_mail.png" alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-brand-text">Tugas Undangan</p>
          {belum > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">{belum} belum</span>}
        </div>
        {total > 0 ? (
          <>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand-masuk" style={{ width: `${persen}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {ringkasan?.selesai} dari {total} undangan selesai
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Belum ada undangan yang ditugaskan ke kamu.</p>
        )}
      </div>
      <span className="text-xl text-gray-300" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

function KartuTugas({
  tugas,
  progres,
  terbuka,
  onBuka,
  onTersimpan,
}: {
  tugas: TugasDenganPembuat;
  progres?: ProgresTugas;
  terbuka: boolean;
  onBuka: () => void;
  onTersimpan: () => void;
}) {
  const status = progres?.status ?? "belum";
  const deadline = tugas.deadline_at ? infoDeadline(tugas.deadline_at) : null;
  const tampilDeadline = deadline && status !== "selesai";

  return (
    <div className={`rounded-xl bg-white shadow-sm ${status === "selesai" ? "opacity-80" : ""}`}>
      <button type="button" onClick={onBuka} aria-expanded={terbuka} className="flex w-full items-start gap-3 p-4 text-left">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
            status === "selesai"
              ? "border-green-600 bg-green-600 text-white"
              : status === "kendala"
                ? "border-red-500 text-red-500"
                : "border-gray-300"
          }`}
        >
          {status === "selesai" ? "✓" : status === "kendala" ? "!" : ""}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug text-brand-text ${status === "selesai" ? "line-through decoration-gray-400" : ""}`}>
            {tugas.judul}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            {tampilDeadline && (
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  deadline.nada === "lewat" ? "bg-red-100 text-red-700" : deadline.nada === "dekat" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                ⏰ {deadline.teks}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              {tugas.sasaran === "personal" ? "Khusus kamu" : tugas.sasaran === "divisi" ? "Divisi kamu" : "Semua pegawai"}
            </span>
            {tugas.tampilkan_pembuat && tugas.pembuat && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Dari {tugas.pembuat.nama}</span>}
          </div>
        </div>
        <BadgeStatus status={status} />
      </button>
      {terbuka && <FormProgres tugas={tugas} progres={progres} onTersimpan={onTersimpan} />}
    </div>
  );
}

function FormProgres({ tugas, progres, onTersimpan }: { tugas: TugasDenganPembuat; progres?: ProgresTugas; onTersimpan: () => void }) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<StatusTugas>(progres?.status ?? "belum");
  const [catatan, setCatatan] = useState(progres?.catatan ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan() {
    if (!profile) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      await simpanProgresTugas(tugas.id, profile.id, status, catatan.trim() || null);
      onTersimpan();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
      {tugas.deskripsi && <p className="whitespace-pre-line text-sm text-gray-700">{teksDenganLink(tugas.deskripsi)}</p>}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {tugas.deadline_at && (
          <>
            <dt className="text-gray-500">Deadline</dt>
            <dd className="font-medium text-brand-text">{formatWaktu(tugas.deadline_at)}</dd>
          </>
        )}
        {tugas.mulai_at && (
          <>
            <dt className="text-gray-500">Mulai</dt>
            <dd className="font-medium text-brand-text">{formatWaktu(tugas.mulai_at)}</dd>
          </>
        )}
        {tugas.tampilkan_pembuat && tugas.pembuat && (
          <>
            <dt className="text-gray-500">Dibuat oleh</dt>
            <dd className="font-medium text-brand-text">{tugas.pembuat.nama}</dd>
          </>
        )}
      </dl>

      <div className="flex gap-2">
        {(["belum", "selesai", "kendala"] as StatusTugas[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg border p-2 text-xs font-semibold ${
              status === s ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            {LABEL_STATUS_TUGAS[s]}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Catatan untuk admin (opsional)</span>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={2}
          placeholder={status === "kendala" ? "Ceritakan kendalanya..." : "mis. sudah diserahkan ke bagian umum"}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      {galat && <p className="text-xs text-red-600">{galat}</p>}

      <button
        type="button"
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="min-h-[44px] rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
      >
        {menyimpan ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}

function BadgeStatus({ status }: { status: StatusTugas }) {
  const warna = status === "selesai" ? "bg-green-100 text-green-700" : status === "kendala" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${warna}`}>{LABEL_STATUS_TUGAS[status]}</span>;
}
