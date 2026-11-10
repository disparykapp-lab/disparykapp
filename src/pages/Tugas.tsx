import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import HeaderHalaman from "../components/HeaderHalaman";
import { DaftarLampiran, InputLampiran } from "../components/LampiranTugas";
import Loading from "../components/Loading";
import TanyaJawabTugas from "../components/TanyaJawabTugas";
import { useAuth } from "../contexts/AuthContext";
import { teksDenganLink } from "../lib/linkify";
import { ambilTugasSaya, hitungRingkasanUndangan } from "../lib/undangan";
import {
  ambilFiturTugasUndangan,
  ambilTugasUmumSaya,
  formatWaktu,
  hapusFileLampiran,
  ikutTugas,
  infoDeadline,
  lepasTugas,
  pathLampiran,
  simpanLangkahSelesai,
  simpanProgresTugas,
  tandaiDibaca,
  LABEL_STATUS_TUGAS,
  type ProgresTugas,
  type StatusTugas,
  type TugasDenganPembuat,
} from "../lib/tugas";
import { belumDiambil, hitungLangkah, pilihanStatus, sudahBeres, urutkanTugas } from "../lib/tugasAturan";
import { folderLampiranPegawai, type Lampiran } from "../lib/tugasLampiranMeta";
import { useTanyaLangsung } from "../lib/useTanyaLangsung";

type Tab = "belum" | "selesai" | "semua";

/**
 * Halaman Tugas pegawai: Tugas Undangan (kalau diaktifkan admin) sebagai salah
 * satu sub menu, lalu daftar tugas dari admin yang ditujukan ke pegawai ini, dan
 * tugas sukarela yang masih bisa diambil.
 */
export default function Tugas() {
  const { profile } = useAuth();
  const [fiturUndangan, setFiturUndangan] = useState(true);
  const [undangan, setUndangan] = useState<{ belum: number; selesai: number; total: number } | null>(null);
  const [tugas, setTugas] = useState<TugasDenganPembuat[]>([]);
  const [progres, setProgres] = useState<Record<string, ProgresTugas>>({});
  const [dibaca, setDibaca] = useState<Record<string, string>>({});
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
      setDibaca(d.dibaca);
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

  // Tugas sukarela yang belum diambil bukan tanggungan — dipisah dari daftar utama.
  const { tanggungan, sukarela } = useMemo(() => {
    const tanggungan: TugasDenganPembuat[] = [];
    const sukarela: TugasDenganPembuat[] = [];
    for (const t of tugas) (belumDiambil(t, !!progres[t.id]) ? sukarela : tanggungan).push(t);
    return { tanggungan, sukarela: urutkanTugas(sukarela) };
  }, [tugas, progres]);
  const jumlah = useMemo(() => {
    const selesai = tanggungan.filter((t) => sudahBeres(progres[t.id]?.status)).length;
    return { belum: tanggungan.length - selesai, selesai, semua: tanggungan.length };
  }, [tanggungan, progres]);
  const tersaring = urutkanTugas(
    tanggungan.filter((t) => {
      const beres = sudahBeres(progres[t.id]?.status);
      return tab === "semua" || (tab === "selesai" ? beres : !beres);
    })
  );

  const kartu = (t: TugasDenganPembuat) => (
    <KartuTugas
      key={t.id}
      tugas={t}
      progres={progres[t.id]}
      dibacaAt={dibaca[t.id]}
      terbuka={terbuka === t.id}
      onBuka={() => setTerbuka(terbuka === t.id ? null : t.id)}
      onTersimpan={() => {
        setTerbuka(null);
        void muatTugas();
      }}
      onSegarkan={() => void muatTugas()}
    />
  );

  if (loading) return <Loading teks="Memuat tugas..." />;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tugas" kembaliKe="/beranda" />

      {fiturUndangan && <KartuUndangan ringkasan={undangan} />}

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-brand-text">Tugas dari Admin</h2>
            <p className="text-xs text-gray-500">Tandai selesai setelah dikerjakan.</p>
          </div>
          {jumlah.semua > 0 && (
            <span className="shrink-0 text-xs font-semibold text-brand-masuk">
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
          <>
            {tanggungan.length > 0 && (
              <>
                {/* tiga tab selalu muat selebar layar HP (tidak menggulir ke samping) */}
                <div className="grid grid-cols-3 gap-1.5 rounded-full bg-white p-1 shadow-sm sm:max-w-md">
                  {(["belum", "selesai", "semua"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      aria-pressed={tab === t}
                      className={`min-h-[40px] rounded-full px-2 text-xs font-semibold leading-tight sm:text-sm ${
                        tab === t ? "bg-brand-masuk text-white" : "text-gray-500"
                      }`}
                    >
                      {t === "belum" ? "Perlu dikerjakan" : t === "selesai" ? "Selesai" : "Semua"} ({jumlah[t]})
                    </button>
                  ))}
                </div>

                {/* grid-cols-1: kolom tidak melebar mengikuti teks panjang (link/nama file) */}
                <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">
                  {tersaring.map(kartu)}
                  {tersaring.length === 0 && (
                    <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm lg:col-span-2">
                      {tab === "belum" ? "Semua tugas sudah selesai. Terima kasih! 🎉" : "Tidak ada tugas di sini."}
                    </p>
                  )}
                </div>
              </>
            )}

            {sukarela.length > 0 && (
              <div className="flex flex-col gap-2">
                <div>
                  <h3 className="text-sm font-bold text-brand-text">Tugas sukarela</h3>
                  <p className="text-xs text-gray-500">Boleh diambil — siapa cepat dia dapat sampai kuotanya penuh.</p>
                </div>
                <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">{sukarela.map(kartu)}</div>
              </div>
            )}
          </>
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
  dibacaAt,
  terbuka,
  onBuka,
  onTersimpan,
  onSegarkan,
}: {
  tugas: TugasDenganPembuat;
  progres?: ProgresTugas;
  dibacaAt?: string;
  terbuka: boolean;
  onBuka: () => void;
  onTersimpan: () => void;
  onSegarkan: () => void;
}) {
  const status = progres?.status ?? "belum";
  const beres = sudahBeres(status);
  const bisaDiambil = belumDiambil(tugas, !!progres);
  const deadline = tugas.deadline_at ? infoDeadline(tugas.deadline_at) : null;
  const langkah = hitungLangkah(tugas.langkah, progres?.langkah_selesai);

  return (
    <div
      className={`min-w-0 rounded-xl bg-white shadow-sm ${status === "selesai" ? "opacity-80" : ""} ${
        tugas.mendesak && !beres ? "ring-2 ring-red-300" : tugas.disematkan_at ? "ring-2 ring-amber-300" : ""
      }`}
    >
      <button type="button" onClick={onBuka} aria-expanded={terbuka} className="flex w-full items-start gap-3 p-4 text-left">
        <IkonStatus status={status} />
        <div className="min-w-0 flex-1">
          <p className={`break-words text-sm font-semibold leading-snug text-brand-text ${status === "selesai" ? "line-through decoration-gray-400" : ""}`}>
            {tugas.judul}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            {tugas.disematkan_at && <Chip warna="kuning">📌 Disematkan</Chip>}
            {tugas.mendesak && !beres && <Chip warna="merah">🔥 Mendesak</Chip>}
            {deadline && !beres && (
              <Chip warna={deadline.nada === "lewat" ? "merah" : deadline.nada === "dekat" ? "oranye" : "abu"}>⏰ {deadline.teks}</Chip>
            )}
            {tugas.kuota != null && (
              <Chip warna="ungu">
                Sukarela · {tugas.kuota_terisi ?? 0}/{tugas.kuota} terisi
              </Chip>
            )}
            <Chip warna="abu">{tugas.sasaran === "personal" ? "Khusus kamu" : tugas.sasaran === "divisi" ? "Divisi kamu" : "Semua pegawai"}</Chip>
            {tugas.tampilkan_pembuat && tugas.pembuat && <Chip warna="abu">Dari {tugas.pembuat.nama}</Chip>}
            {tugas.wajib_baca && !dibacaAt && <Chip warna="oranye">👁 Belum dibaca</Chip>}
            {langkah.total > 0 && !bisaDiambil && (
              <Chip warna="abu">
                ☑️ {langkah.selesai}/{langkah.total} langkah
              </Chip>
            )}
            {(tugas.lampiran?.length ?? 0) > 0 && <Chip warna="kuning">📁 {tugas.lampiran!.length} lampiran tugas</Chip>}
            {(progres?.lampiran?.length ?? 0) > 0 && <Chip warna="biru">📎 {progres!.lampiran!.length} lampiran kamu</Chip>}
          </div>
        </div>
        {!bisaDiambil && <BadgeStatus status={status} />}
      </button>
      {terbuka &&
        (bisaDiambil ? (
          <DetailSukarela tugas={tugas} dibacaAt={dibacaAt} onDiambil={onSegarkan} />
        ) : (
          <FormProgres tugas={tugas} progres={progres} dibacaAt={dibacaAt} onTersimpan={onTersimpan} onSegarkan={onSegarkan} />
        ))}
    </div>
  );
}

/** Isi tugas yang sama untuk tugas biasa & sukarela: keterangan, lampiran admin, waktu, konfirmasi baca. */
function InfoTugas({ tugas, dibacaAt, onDibaca }: { tugas: TugasDenganPembuat; dibacaAt?: string; onDibaca: () => void }) {
  const { profile } = useAuth();
  const [menandai, setMenandai] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function sudahBaca() {
    if (!profile) return;
    setMenandai(true);
    setGalat(null);
    try {
      await tandaiDibaca(tugas.id, profile.id);
      onDibaca();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenandai(false);
    }
  }

  return (
    <>
      {tugas.deskripsi && <p className="whitespace-pre-line break-words text-sm text-gray-700">{teksDenganLink(tugas.deskripsi)}</p>}
      {(tugas.lampiran?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-500">Lampiran dari pemberi tugas</p>
          <DaftarLampiran lampiran={tugas.lampiran} />
        </div>
      )}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
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

      {tugas.wajib_baca &&
        (dibacaAt ? (
          <p className="text-xs font-medium text-green-700">✓ Sudah kamu baca · {formatWaktu(dibacaAt)}</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg bg-orange-50 p-3 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 text-xs text-orange-800">Admin meminta kamu mengonfirmasi sudah membaca tugas ini.</p>
            <button
              type="button"
              onClick={() => void sudahBaca()}
              disabled={menandai}
              className="min-h-[40px] shrink-0 rounded-lg bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-60"
            >
              {menandai ? "Menyimpan..." : "✓ Sudah saya baca"}
            </button>
          </div>
        ))}
      {galat && <p className="text-xs text-red-600">{galat}</p>}
    </>
  );
}

function DetailSukarela({ tugas, dibacaAt, onDiambil }: { tugas: TugasDenganPembuat; dibacaAt?: string; onDiambil: () => void }) {
  const [mengambil, setMengambil] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const penuh = (tugas.kuota_terisi ?? 0) >= (tugas.kuota ?? 0);

  async function ambil() {
    setMengambil(true);
    setGalat(null);
    try {
      await ikutTugas(tugas.id);
      onDiambil();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengambil tugas.");
      onDiambil(); // perbarui angka kuota
    } finally {
      setMengambil(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
      <InfoTugas tugas={tugas} dibacaAt={dibacaAt} onDibaca={onDiambil} />
      <div className="flex flex-col gap-2 rounded-lg bg-purple-50 p-3">
        <p className="text-xs text-purple-800">
          Tugas sukarela untuk {tugas.kuota} orang · {tugas.kuota_terisi ?? 0} sudah mengambil.
          {penuh ? " Kuota sudah penuh." : " Ambil kalau kamu bisa mengerjakannya."}
        </p>
        <button
          type="button"
          onClick={() => void ambil()}
          disabled={mengambil || penuh}
          className="min-h-[44px] rounded-lg bg-purple-700 text-sm font-semibold text-white disabled:opacity-50"
        >
          {mengambil ? "Mengambil..." : penuh ? "Kuota penuh" : "Ambil tugas ini"}
        </button>
      </div>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
    </div>
  );
}

function FormProgres({
  tugas,
  progres,
  dibacaAt,
  onTersimpan,
  onSegarkan,
}: {
  tugas: TugasDenganPembuat;
  progres?: ProgresTugas;
  dibacaAt?: string;
  onTersimpan: () => void;
  onSegarkan: () => void;
}) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<"belum" | "selesai" | "kendala">(pilihanStatus(progres?.status));
  const [catatan, setCatatan] = useState(progres?.catatan ?? "");
  const [lampiran, setLampiran] = useState<Lampiran[]>(progres?.lampiran ?? []);
  const [centang, setCentang] = useState<string[]>(progres?.langkah_selesai ?? []);
  const [mengunggah, setMengunggah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  // File yang diunggah di form ini tapi belum tersimpan: dihapus kalau form ditutup tanpa Simpan.
  const unggahanBaru = useRef(new Set<string>());
  const tersimpan = useRef(false);
  useEffect(() => {
    const baru = unggahanBaru.current;
    return () => {
      if (!tersimpan.current) void hapusFileLampiran([...baru]);
    };
  }, []);
  const aturSibuk = useCallback((sibuk: boolean) => setMengunggah(sibuk), []);
  const langkah = tugas.langkah ?? [];
  const bisaDilepas = tugas.kuota != null && progres?.status === "belum" && (progres?.lampiran?.length ?? 0) === 0;

  function hapusLampiran(l: Lampiran) {
    setLampiran((daftar) => daftar.filter((x) => x !== l));
    // file yang baru diunggah langsung dibuang; file lama baru dihapus setelah Simpan
    if (l.path && unggahanBaru.current.delete(l.path)) void hapusFileLampiran([l.path]);
  }

  async function ubahCentang(id: string) {
    if (!profile) return;
    const baru = centang.includes(id) ? centang.filter((x) => x !== id) : [...centang, id];
    setCentang(baru);
    try {
      await simpanLangkahSelesai(tugas.id, profile.id, baru);
    } catch (e) {
      setCentang(centang);
      setGalat(e instanceof Error ? e.message : "Centangan gagal disimpan.");
    }
  }

  async function lepas() {
    if (!window.confirm("Batal mengambil tugas ini? Tempatmu akan terbuka untuk rekan lain.")) return;
    try {
      await lepasTugas(tugas.id);
      onTersimpan();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal melepas tugas.");
    }
  }

  async function simpan() {
    if (!profile) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      const lama = pathLampiran(progres?.lampiran);
      // "Selesai" yang tidak diubah dikirim ulang sebagai status tersimpan, supaya tugas
      // yang sudah disetujui/menunggu dicek tidak dikirim ulang untuk dicek
      const kirim: StatusTugas = status === pilihanStatus(progres?.status) && progres ? progres.status : status;
      await simpanProgresTugas(tugas.id, profile.id, kirim, catatan.trim() || null, lampiran, lama.length > 0);
      tersimpan.current = true;
      const dipakai = new Set(pathLampiran(lampiran));
      void hapusFileLampiran(lama.filter((p) => !dipakai.has(p)));
      onTersimpan();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
      <InfoTugas tugas={tugas} dibacaAt={dibacaAt} onDibaca={onSegarkan} />

      {progres?.status === "revisi" && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">Admin meminta revisi</p>
          {progres.catatan_admin && <p className="mt-0.5 whitespace-pre-line break-words">{progres.catatan_admin}</p>}
          <p className="mt-1 text-red-700">Perbaiki, lalu tandai Selesai lagi untuk dikirim ulang.</p>
        </div>
      )}
      {progres?.status === "diperiksa" && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">⏳ Hasil kerjamu menunggu dicek admin.</p>}
      {progres?.status === "selesai" && tugas.perlu_cek && progres.diperiksa_at && (
        <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800">
          <p className="font-semibold">✓ Disetujui admin · {formatWaktu(progres.diperiksa_at)}</p>
          {progres.catatan_admin && <p className="mt-0.5 whitespace-pre-line break-words">{progres.catatan_admin}</p>}
        </div>
      )}

      {langkah.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-gray-500">
            Langkah-langkah ({hitungLangkah(langkah, centang).selesai}/{langkah.length})
          </p>
          <ul className="flex flex-col gap-1">
            {langkah.map((l) => (
              <li key={l.id}>
                <label className="flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <input type="checkbox" checked={centang.includes(l.id)} onChange={() => void ubahCentang(l.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-masuk" />
                  <span className={`min-w-0 break-words ${centang.includes(l.id) ? "text-gray-400 line-through" : "text-brand-text"}`}>{l.teks}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(["belum", "selesai", "kendala"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`min-h-[40px] rounded-lg border px-1 text-xs font-semibold ${
              status === s ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            {LABEL_STATUS_TUGAS[s]}
          </button>
        ))}
      </div>
      {tugas.perlu_cek && status === "selesai" && <p className="-mt-1 text-[11px] text-gray-500">Tugas ini dicek admin dulu sebelum dianggap selesai.</p>}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Catatan untuk admin (opsional)</span>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={2}
          placeholder={status === "kendala" ? "Ceritakan kendalanya..." : "mis. sudah diserahkan ke bagian umum"}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      {profile && (
        <InputLampiran
          folder={folderLampiranPegawai(profile.id, tugas.id)}
          label="Lampiran hasil kerja (opsional)"
          nilai={lampiran}
          onUbah={setLampiran}
          onSibuk={aturSibuk}
          onUnggahBaru={(path) => unggahanBaru.current.add(path)}
          onHapus={hapusLampiran}
        />
      )}

      {galat && <p className="text-xs text-red-600">{galat}</p>}

      <button
        type="button"
        onClick={() => void simpan()}
        disabled={menyimpan || mengunggah}
        className="min-h-[44px] rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
      >
        {menyimpan ? "Menyimpan..." : mengunggah ? "Tunggu unggahan selesai..." : "Simpan"}
      </button>
      {bisaDilepas && (
        <button type="button" onClick={() => void lepas()} className="self-center text-xs font-semibold text-gray-500 underline">
          Batal ambil tugas ini
        </button>
      )}

      {tugas.tanya_jawab !== false && profile && <TanyaAdmin tugasId={tugas.id} saya={profile.id} />}
    </div>
  );
}

/** "Tanya admin" di form tugas: balasan admin masuk langsung lewat websocket (0042). */
function TanyaAdmin({ tugasId, saya }: { tugasId: string; saya: string }) {
  const { pesan, tersambung, galat, tambah } = useTanyaLangsung({ tugasId, pemilik: saya });
  const terakhir = pesan[pesan.length - 1];
  const dijawab = !!terakhir && terakhir.pengirim_id !== saya;
  return (
    <details className="group rounded-lg border border-gray-100 p-3">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-brand-text marker:content-none">
        <span>
          💬 Tanya admin tentang tugas ini{pesan.length > 0 && ` (${pesan.length})`}
        </span>
        {dijawab && <Chip warna="biru">Dijawab admin</Chip>}
        <span className="text-gray-400 group-open:hidden">▾</span>
      </summary>
      <div className="mt-3">
        <TanyaJawabTugas
          tugasId={tugasId}
          pemilik={saya}
          saya={saya}
          namaPengirim={() => "Admin"}
          pesan={pesan}
          tersambung={tersambung}
          galatMuat={galat}
          onTerkirim={tambah}
        />
      </div>
    </details>
  );
}

function IkonStatus({ status }: { status: StatusTugas }) {
  const gaya: Record<StatusTugas, [string, string]> = {
    belum: ["border-gray-300", ""],
    selesai: ["border-green-600 bg-green-600 text-white", "✓"],
    diperiksa: ["border-amber-500 text-amber-600", "⏳"],
    kendala: ["border-red-500 text-red-500", "!"],
    revisi: ["border-red-500 text-red-500", "↺"],
  };
  return (
    <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${gaya[status][0]}`}>
      {gaya[status][1]}
    </span>
  );
}

function BadgeStatus({ status }: { status: StatusTugas }) {
  const warna: Record<StatusTugas, string> = {
    belum: "bg-gray-100 text-gray-500",
    selesai: "bg-green-100 text-green-700",
    diperiksa: "bg-amber-100 text-amber-800",
    kendala: "bg-red-100 text-red-700",
    revisi: "bg-red-100 text-red-700",
  };
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${warna[status]}`}>{LABEL_STATUS_TUGAS[status]}</span>;
}

function Chip({ warna, children }: { warna: "abu" | "merah" | "oranye" | "kuning" | "biru" | "ungu"; children: ReactNode }) {
  const kelas = {
    abu: "bg-gray-100 text-gray-600",
    merah: "bg-red-100 font-semibold text-red-700",
    oranye: "bg-orange-100 font-semibold text-orange-700",
    kuning: "bg-amber-50 font-semibold text-amber-700",
    biru: "bg-blue-50 font-semibold text-brand-info",
    ungu: "bg-purple-100 font-semibold text-purple-700",
  }[warna];
  return <span className={`max-w-full truncate rounded-full px-2 py-0.5 ${kelas}`}>{children}</span>;
}
