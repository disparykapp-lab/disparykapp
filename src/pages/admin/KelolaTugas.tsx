import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import HeaderHalaman from "../../components/HeaderHalaman";
import { DaftarLampiran, InputLampiran } from "../../components/LampiranTugas";
import Loading from "../../components/Loading";
import TanyaJawabTugas from "../../components/TanyaJawabTugas";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { teksDenganLink } from "../../lib/linkify";
import {
  ambilFiturTugasUndangan,
  ambilSemuaTugas,
  formatWaktu,
  hapusFileLampiran,
  hapusTugas,
  infoDeadline,
  keInputWaktu,
  pathLampiran,
  periksaTugas,
  salinLampiranMateri,
  sasaranPegawai,
  sematkanTugas,
  simpanFiturTugasUndangan,
  simpanTugas,
  ubahAktifTugas,
  LABEL_STATUS_TUGAS,
  type IsiTugas,
  type ProgresTugas,
  type SasaranTugas,
  type StatusTugas,
  type TanyaTugas,
  type TugasDenganPembuat,
} from "../../lib/tugas";
import {
  PILIHAN_BAWAAN,
  dahulukanSematan,
  hitungLangkah,
  idLangkah,
  kolomPilihan,
  rapikanLangkah,
  sudahDiarsip,
  type LangkahTugas,
} from "../../lib/tugasAturan";
import { folderLampiranMateri, type Lampiran } from "../../lib/tugasLampiranMeta";
import type { Divisi, Profile } from "../../types/database";

type Filter = "semua" | "aktif" | "nonaktif";
type Dibaca = { tugas_id: string; user_id: string; dibaca_at: string };

export default function KelolaTugas() {
  const [tugas, setTugas] = useState<TugasDenganPembuat[]>([]);
  const [progres, setProgres] = useState<ProgresTugas[]>([]);
  const [dibaca, setDibaca] = useState<Dibaca[]>([]);
  const [tanya, setTanya] = useState<TanyaTugas[]>([]);
  const [pegawai, setPegawai] = useState<Profile[]>([]);
  const [divisi, setDivisi] = useState<Divisi[]>([]);
  const [fiturUndangan, setFiturUndangan] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("semua");
  /** null = form tertutup, "baru" = buat tugas baru, "salin:{id}" = duplikat, selain itu id tugas yang diubah */
  const [form, setForm] = useState<string | null>(null);
  const [rinci, setRinci] = useState<string | null>(null);

  async function muat() {
    try {
      const d = await ambilSemuaTugas();
      setTugas(d.tugas);
      setProgres(d.progres);
      setDibaca(d.dibaca);
      setTanya(d.tanya);
      setGalat(null);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat tugas.");
    }
  }

  useEffect(() => {
    Promise.all([
      muat(),
      supabase.from("profiles").select("*").order("nama").then(({ data }) => setPegawai((data as Profile[]) ?? [])),
      supabase.from("divisi").select("*").order("nama").then(({ data }) => setDivisi((data as Divisi[]) ?? [])),
      ambilFiturTugasUndangan().then(setFiturUndangan),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pesan) return;
    const t = window.setTimeout(() => setPesan(null), 2500);
    return () => window.clearTimeout(t);
  }, [pesan]);

  const progresPerTugas = useMemo(() => {
    const peta: Record<string, ProgresTugas[]> = {};
    for (const p of progres) (peta[p.tugas_id] ??= []).push(p);
    return peta;
  }, [progres]);

  const tersaring = dahulukanSematan(tugas.filter((t) => filter === "semua" || (filter === "aktif" ? t.aktif : !t.aktif)));
  // kolom pilihan 0041 sudah ada kalau baris tugas memuatnya
  const migrasiPilihan = tugas.length > 0 && "perlu_cek" in tugas[0];

  async function ubahFiturUndangan() {
    if (fiturUndangan === null) return;
    try {
      await simpanFiturTugasUndangan(!fiturUndangan);
      setFiturUndangan(!fiturUndangan);
      setPesan(!fiturUndangan ? "Tugas Undangan ditampilkan ke pegawai." : "Tugas Undangan disembunyikan dari pegawai.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengubah pengaturan.");
    }
  }

  async function ubahAktif(t: TugasDenganPembuat) {
    try {
      await ubahAktifTugas(t.id, !t.aktif);
      setTugas((d) => d.map((x) => (x.id === t.id ? { ...x, aktif: !t.aktif } : x)));
      setPesan(!t.aktif ? "Tugas diaktifkan. Pegawai sudah bisa melihatnya." : "Tugas dimatikan. Pegawai tidak melihatnya lagi.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengubah status.");
    }
  }

  async function sematkan(t: TugasDenganPembuat) {
    try {
      const waktu = await sematkanTugas(t.id, !t.disematkan_at);
      setTugas((d) => d.map((x) => (x.id === t.id ? { ...x, disematkan_at: waktu } : x)));
      setPesan(waktu ? "Tugas disematkan di paling atas." : "Sematan dilepas.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyematkan tugas.");
    }
  }

  async function hapus(t: TugasDenganPembuat) {
    if (!window.confirm(`Hapus tugas "${t.judul}" beserta progres pegawai? Kalau hanya ingin menyembunyikan, matikan saja.`)) return;
    try {
      await hapusTugas(t.id);
      setPesan("Tugas dihapus.");
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  function bukaForm(nilai: string) {
    setForm(nilai);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <Loading teks="Memuat tugas..." />;

  const salinDari = form?.startsWith("salin:") ? tugas.find((t) => t.id === form.slice(6)) ?? null : null;
  const tugasDiubah = form && form !== "baru" && !salinDari ? tugas.find((t) => t.id === form) ?? null : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <HeaderHalaman judul="Tugas" kembaliKe="/kelola" />

      {/* Tugas Undangan: tetap dikelola di Distribusi Undangan, di sini hanya saklar menunya */}
      <section className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <img src="/icon_mail.png" alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-text">Tugas Undangan</p>
          <p className="text-xs text-gray-500">
            {fiturUndangan === false ? "Disembunyikan dari menu Tugas pegawai." : "Tampil sebagai sub menu di halaman Tugas pegawai."}{" "}
            <Link to="/kelola/undangan" className="font-semibold text-brand-masuk underline">
              Atur pembagian
            </Link>
          </p>
        </div>
        <Saklar nyala={fiturUndangan !== false} disabled={fiturUndangan === null} onUbah={() => void ubahFiturUndangan()} label="Tampilkan Tugas Undangan ke pegawai" />
      </section>

      {galat && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{galat}</div>}
      {pesan && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{pesan}</div>}

      {form ? (
        <FormTugas
          key={form}
          awal={tugasDiubah}
          salinDari={salinDari}
          migrasiPilihan={migrasiPilihan}
          pegawai={pegawai.filter((p) => p.aktif)}
          divisi={divisi}
          onBatal={() => setForm(null)}
          onTersimpan={async (baru) => {
            setForm(null);
            setPesan(baru ? "Tugas dibuat." : "Perubahan tersimpan.");
            await muat();
          }}
        />
      ) : (
        <button type="button" onClick={() => bukaForm("baru")} className="min-h-[48px] rounded-2xl bg-brand-masuk text-sm font-semibold text-white shadow-sm">
          + Buat tugas baru
        </button>
      )}

      <div className="grid grid-cols-3 gap-1.5 rounded-full bg-white p-1 shadow-sm sm:max-w-md">
        {(["semua", "aktif", "nonaktif"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-[40px] rounded-full px-2 text-xs font-semibold sm:text-sm ${filter === f ? "bg-brand-masuk text-white" : "text-gray-500"}`}
          >
            {f === "semua" ? "Semua" : f === "aktif" ? "Aktif" : "Nonaktif"} ({f === "semua" ? tugas.length : tugas.filter((t) => (f === "aktif" ? t.aktif : !t.aktif)).length})
          </button>
        ))}
      </div>

      {/* grid-cols-1: kolom tidak melebar mengikuti teks panjang */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {tersaring.map((t) => (
          <KartuTugasAdmin
            key={t.id}
            tugas={t}
            pegawai={pegawai}
            divisi={divisi}
            progres={progresPerTugas[t.id] ?? []}
            dibaca={dibaca.filter((d) => d.tugas_id === t.id)}
            tanya={tanya.filter((q) => q.tugas_id === t.id)}
            rinci={rinci === t.id}
            onRinci={() => setRinci(rinci === t.id ? null : t.id)}
            onUbahAktif={() => void ubahAktif(t)}
            onSematkan={() => void sematkan(t)}
            onUbah={() => bukaForm(t.id)}
            onDuplikat={() => bukaForm(`salin:${t.id}`)}
            onHapus={() => void hapus(t)}
            onPesan={(p) => setPesan(p)}
            onMuat={() => void muat()}
          />
        ))}
        {tersaring.length === 0 && !galat && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm lg:col-span-2">
            {tugas.length === 0 ? "Belum ada tugas. Tekan \"Buat tugas baru\" untuk memulai." : "Tidak ada tugas di filter ini."}
          </p>
        )}
      </div>
    </div>
  );
}

function labelSasaran(t: TugasDenganPembuat, divisi: Divisi[], pegawai: Profile[]): string {
  if (t.sasaran === "semua") return "Semua pegawai";
  if (t.sasaran === "divisi") {
    const nama = divisi.filter((d) => t.divisi_ids.includes(d.id)).map((d) => d.nama);
    return `Divisi: ${nama.join(", ") || "-"}`;
  }
  const nama = pegawai.filter((p) => t.user_ids.includes(p.id)).map((p) => p.nama);
  return nama.length <= 2 ? `Personal: ${nama.join(", ") || "-"}` : `Personal: ${nama.length} orang`;
}

/** Percakapan yang pesan terakhirnya dari pegawai (belum dijawab admin). */
function belumDibalas(tanya: TanyaTugas[]): number {
  const terakhir = new Map<string, TanyaTugas>();
  for (const q of tanya) terakhir.set(q.user_id, q);
  return [...terakhir.values()].filter((q) => q.pengirim_id === q.user_id).length;
}

function KartuTugasAdmin({
  tugas: t,
  pegawai,
  divisi,
  progres: prog,
  dibaca,
  tanya,
  rinci,
  onRinci,
  onUbahAktif,
  onSematkan,
  onUbah,
  onDuplikat,
  onHapus,
  onPesan,
  onMuat,
}: {
  tugas: TugasDenganPembuat;
  pegawai: Profile[];
  divisi: Divisi[];
  progres: ProgresTugas[];
  dibaca: Dibaca[];
  tanya: TanyaTugas[];
  rinci: boolean;
  onRinci: () => void;
  onUbahAktif: () => void;
  onSematkan: () => void;
  onUbah: () => void;
  onDuplikat: () => void;
  onHapus: () => void;
  onPesan: (pesan: string) => void;
  onMuat: () => void;
}) {
  // tugas sukarela: yang dihitung hanya pegawai yang mengambilnya
  const target = t.kuota != null ? pegawai.filter((p) => prog.some((x) => x.user_id === p.id)) : sasaranPegawai(t, pegawai);
  const diTarget = (id: string) => target.some((x) => x.id === id);
  const selesai = prog.filter((p) => p.status === "selesai" && diTarget(p.user_id)).length;
  const menunggu = prog.filter((p) => p.status === "diperiksa" && diTarget(p.user_id)).length;
  const kendala = prog.filter((p) => (p.status === "kendala" || p.status === "revisi") && diTarget(p.user_id)).length;
  const persen = target.length > 0 ? Math.round((selesai / target.length) * 100) : 0;
  const deadline = t.deadline_at ? infoDeadline(t.deadline_at) : null;
  const sudahBaca = dibaca.filter((d) => diTarget(d.user_id)).length;
  const perluDibalas = belumDibalas(tanya);

  return (
    <article
      className={`flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ${t.aktif ? "" : "opacity-70"} ${
        t.mendesak && t.aktif ? "ring-2 ring-red-300" : t.disematkan_at ? "ring-2 ring-amber-300" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold leading-snug text-brand-text">{t.judul}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {t.disematkan_at && <Lencana warna="kuning">📌 Disematkan</Lencana>}
            <Lencana warna={t.aktif ? "hijau" : "abu"}>{t.aktif ? "Aktif" : "Nonaktif"}</Lencana>
            {t.mendesak && <Lencana warna="merah">🔥 Mendesak</Lencana>}
            <Lencana warna="abu">{labelSasaran(t, divisi, pegawai)}</Lencana>
            {deadline && <Lencana warna={deadline.nada === "lewat" ? "merah" : deadline.nada === "dekat" ? "oranye" : "abu"}>⏰ {deadline.teks}</Lencana>}
            {t.mulai_at && new Date(t.mulai_at) > new Date() && <Lencana warna="biru">Tampil {formatWaktu(t.mulai_at)}</Lencana>}
            {sudahDiarsip(t) && <Lencana warna="abu">🗄 Diarsipkan dari pegawai</Lencana>}
            {t.kuota != null && (
              <Lencana warna="ungu">
                Sukarela {t.kuota_terisi ?? 0}/{t.kuota}
              </Lencana>
            )}
            {menunggu > 0 && <Lencana warna="oranye">⏳ {menunggu} menunggu dicek</Lencana>}
            {perluDibalas > 0 && <Lencana warna="merah">💬 {perluDibalas} belum dibalas</Lencana>}
            {t.wajib_baca && (
              <Lencana warna="biru">
                👁 {sudahBaca}/{target.length} dibaca
              </Lencana>
            )}
            {(t.langkah?.length ?? 0) > 0 && <Lencana warna="abu">☑️ {t.langkah!.length} langkah</Lencana>}
            {(t.lampiran?.length ?? 0) > 0 && <Lencana warna="biru">📎 {t.lampiran!.length} lampiran</Lencana>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onSematkan}
            aria-pressed={!!t.disematkan_at}
            aria-label={t.disematkan_at ? `Lepas sematan ${t.judul}` : `Sematkan ${t.judul} di atas`}
            title={t.disematkan_at ? "Lepas sematan" : "Sematkan di atas"}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
              t.disematkan_at ? "bg-amber-100 text-amber-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
          >
            <Pin className={`h-5 w-5 ${t.disematkan_at ? "fill-current" : ""}`} />
          </button>
          <Saklar nyala={t.aktif} onUbah={onUbahAktif} label={`Aktifkan ${t.judul}`} />
        </div>
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-masuk" style={{ width: `${persen}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {selesai}/{target.length} pegawai selesai
          {kendala > 0 && <span className="text-red-600"> · {kendala} kendala/revisi</span>}
          {t.kuota != null && target.length === 0 && " · belum ada yang mengambil"}
        </p>
      </div>

      <p className="text-[11px] text-gray-400">
        Dibuat {t.pembuat ? `oleh ${t.pembuat.nama} ` : ""}· {formatWaktu(t.created_at)}
        {!t.tampilkan_pembuat && " · nama pembuat disembunyikan dari pegawai"}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap">
        <TombolKecil onKlik={onRinci}>{rinci ? "Tutup rincian" : "Lihat progres"}</TombolKecil>
        <TombolKecil onKlik={onUbah}>Ubah</TombolKecil>
        <TombolKecil onKlik={onDuplikat}>Duplikat</TombolKecil>
        <TombolKecil onKlik={onHapus} bahaya>
          Hapus
        </TombolKecil>
      </div>

      {rinci && <RincianProgres tugas={t} target={target} progres={prog} dibaca={dibaca} tanya={tanya} pegawai={pegawai} onPesan={onPesan} onMuat={onMuat} />}
    </article>
  );
}

function TombolKecil({ onKlik, bahaya, children }: { onKlik: () => void; bahaya?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className={`min-h-[40px] rounded-lg border px-3 font-semibold ${bahaya ? "border-red-200 text-red-600 sm:ml-auto" : "border-gray-300 text-brand-text"}`}
    >
      {children}
    </button>
  );
}

function RincianProgres({
  tugas,
  target,
  progres,
  dibaca,
  tanya,
  pegawai,
  onPesan,
  onMuat,
}: {
  tugas: TugasDenganPembuat;
  target: Profile[];
  progres: ProgresTugas[];
  dibaca: Dibaca[];
  tanya: TanyaTugas[];
  pegawai: Profile[];
  onPesan: (pesan: string) => void;
  onMuat: () => void;
}) {
  const { profile } = useAuth();
  const peta = new Map(progres.map((p) => [p.user_id, p]));
  const petaBaca = new Map(dibaca.map((d) => [d.user_id, d.dibaca_at]));
  const urut = [...target].sort((a, b) => urutan(peta.get(a.id)?.status) - urutan(peta.get(b.id)?.status));
  const namaPengirim = (id: string | null) => pegawai.find((p) => p.id === id)?.nama ?? "Admin";
  // percakapan dari pegawai yang bukan target (mis. sudah keluar dari sasaran) tetap ditampilkan
  const penanyaLain = [...new Set(tanya.map((q) => q.user_id))].filter((id) => !target.some((p) => p.id === id));

  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-gray-100 pt-3">
      {tugas.deskripsi && <p className="whitespace-pre-line break-words rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{teksDenganLink(tugas.deskripsi)}</p>}
      {(tugas.lampiran?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500">Lampiran tugas</p>
          <DaftarLampiran lampiran={tugas.lampiran} />
        </div>
      )}
      {(tugas.langkah?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Langkah-langkah</p>
          <ol className="list-decimal pl-5 text-xs text-gray-700">
            {tugas.langkah!.map((l) => (
              <li key={l.id} className="break-words">
                {l.teks}
              </li>
            ))}
          </ol>
        </div>
      )}
      {tugas.deadline_at && <p className="text-xs text-gray-500">Deadline: {formatWaktu(tugas.deadline_at)}</p>}
      {urut.length === 0 && (
        <p className="text-xs text-gray-400">{tugas.kuota != null ? "Belum ada pegawai yang mengambil tugas sukarela ini." : "Belum ada pegawai aktif yang menjadi sasaran tugas ini."}</p>
      )}
      <ul className="flex flex-col divide-y divide-gray-100">
        {urut.map((p) => {
          const pr = peta.get(p.id);
          const s: StatusTugas = pr?.status ?? "belum";
          const langkah = hitungLangkah(tugas.langkah, pr?.langkah_selesai);
          const pesanPegawai = tanya.filter((q) => q.user_id === p.id);
          return (
            <li key={p.id} className="flex min-w-0 flex-col gap-1.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-brand-text">{p.nama}</p>
                  <p className="flex flex-wrap gap-x-2 text-[11px] text-gray-400">
                    {pr && pr.status !== "belum" && <span>{formatWaktu(pr.diperbarui_at)}</span>}
                    {langkah.total > 0 && (
                      <span>
                        ☑️ {langkah.selesai}/{langkah.total} langkah
                      </span>
                    )}
                    {tugas.wajib_baca && <span>{petaBaca.has(p.id) ? `👁 dibaca ${formatWaktu(petaBaca.get(p.id)!)}` : "👁 belum dibaca"}</span>}
                  </p>
                </div>
                <Lencana warna={s === "selesai" ? "hijau" : s === "kendala" || s === "revisi" ? "merah" : s === "diperiksa" ? "oranye" : "abu"}>{LABEL_STATUS_TUGAS[s]}</Lencana>
              </div>
              {pr?.catatan && <p className="break-words text-xs text-gray-500">“{pr.catatan}”</p>}
              {(pr?.lampiran?.length ?? 0) > 0 && <DaftarLampiran lampiran={pr!.lampiran} />}
              {pr && (s === "diperiksa" || s === "revisi" || (s === "selesai" && tugas.perlu_cek)) && (
                <PanelPeriksa tugasId={tugas.id} pegawai={p} progres={pr} onSelesai={(pesan) => {
                    onPesan(pesan);
                    onMuat();
                  }} />
              )}
              {/* hanya pegawai yang sudah bertanya — supaya rincian 15 pegawai tidak penuh kotak kosong */}
              {profile && pesanPegawai.length > 0 && (
                <details className="rounded-lg bg-gray-50 px-3 py-2" open={pesanPegawai.length > 0 && pesanPegawai[pesanPegawai.length - 1].pengirim_id === p.id}>
                  <summary className="cursor-pointer text-xs font-semibold text-brand-text">💬 Tanya-jawab ({pesanPegawai.length})</summary>
                  <div className="mt-2">
                    <TanyaJawabTugas tugasId={tugas.id} pemilik={p.id} saya={profile.id} namaPengirim={namaPengirim} awal={pesanPegawai} onTerkirim={onMuat} />
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      {profile && penanyaLain.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
          <p className="text-xs font-semibold text-gray-500">Pertanyaan dari pegawai lain</p>
          {penanyaLain.map((id) => (
            <div key={id} className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="mb-2 text-xs font-semibold text-brand-text">{namaPengirim(id)}</p>
              <TanyaJawabTugas tugasId={tugas.id} pemilik={id} saya={profile.id} namaPengirim={namaPengirim} awal={tanya.filter((q) => q.user_id === id)} onTerkirim={onMuat} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Setujui / minta revisi hasil kerja pegawai (tugas "perlu dicek admin"). */
function PanelPeriksa({ tugasId, pegawai, progres, onSelesai }: { tugasId: string; pegawai: Profile; progres: ProgresTugas; onSelesai: (pesan: string) => void }) {
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function periksa(setuju: boolean) {
    setSibuk(true);
    setGalat(null);
    try {
      await periksaTugas(tugasId, pegawai.id, setuju, catatan);
      onSelesai(setuju ? `Hasil kerja ${pegawai.nama} disetujui.` : `Revisi dikirim ke ${pegawai.nama}.`);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan pemeriksaan.");
    } finally {
      setSibuk(false);
    }
  }

  if (progres.status !== "diperiksa") {
    return (
      <p className={`rounded-lg px-3 py-2 text-xs ${progres.status === "revisi" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
        {progres.status === "revisi" ? "Diminta revisi" : "Disetujui"}
        {progres.diperiksa_at ? ` · ${formatWaktu(progres.diperiksa_at)}` : ""}
        {progres.catatan_admin ? ` — “${progres.catatan_admin}”` : ""}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">⏳ Menunggu dicek</p>
      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        placeholder="Catatan untuk pegawai (wajib kalau minta revisi)"
        className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={sibuk} onClick={() => void periksa(false)} className="min-h-[40px] rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-700 disabled:opacity-60">
          Minta revisi
        </button>
        <button type="button" disabled={sibuk} onClick={() => void periksa(true)} className="min-h-[40px] rounded-lg bg-green-600 text-xs font-semibold text-white disabled:opacity-60">
          ✓ Setujui
        </button>
      </div>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
    </div>
  );
}

const urutan = (s?: StatusTugas) => (s === "diperiksa" ? 0 : s === "kendala" || s === "revisi" ? 1 : s === "selesai" ? 3 : 2);

/* ---------------- Form buat / ubah / duplikat ---------------- */

function FormTugas({
  awal,
  salinDari,
  migrasiPilihan,
  pegawai,
  divisi,
  onBatal,
  onTersimpan,
}: {
  awal: TugasDenganPembuat | null;
  /** duplikat: isi awal dari tugas ini, disimpan sebagai tugas baru */
  salinDari: TugasDenganPembuat | null;
  migrasiPilihan: boolean;
  pegawai: Profile[];
  divisi: Divisi[];
  onBatal: () => void;
  onTersimpan: (baru: boolean) => void;
}) {
  const sumber = awal ?? salinDari;
  const [judul, setJudul] = useState(salinDari ? `${salinDari.judul} (salinan)` : (awal?.judul ?? ""));
  const [deskripsi, setDeskripsi] = useState(sumber?.deskripsi ?? "");
  const [sasaran, setSasaran] = useState<SasaranTugas>(sumber?.sasaran ?? "semua");
  const [divisiIds, setDivisiIds] = useState<string[]>(sumber?.divisi_ids ?? []);
  const [userIds, setUserIds] = useState<string[]>(sumber?.user_ids ?? []);
  // tanggal tidak ikut diduplikat — tugas salinan biasanya untuk periode lain
  const [pakaiDeadline, setPakaiDeadline] = useState(!!awal?.deadline_at);
  const [deadline, setDeadline] = useState(keInputWaktu(awal?.deadline_at ?? null));
  const [pakaiMulai, setPakaiMulai] = useState(!!awal?.mulai_at);
  const [mulai, setMulai] = useState(keInputWaktu(awal?.mulai_at ?? null));
  const [tampilkanPembuat, setTampilkanPembuat] = useState(sumber?.tampilkan_pembuat ?? true);
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [mendesak, setMendesak] = useState(sumber?.mendesak ?? PILIHAN_BAWAAN.mendesak);
  const [perluCek, setPerluCek] = useState(sumber?.perlu_cek ?? PILIHAN_BAWAAN.perlu_cek);
  const [wajibBaca, setWajibBaca] = useState(sumber?.wajib_baca ?? PILIHAN_BAWAAN.wajib_baca);
  const [ingatkan, setIngatkan] = useState(sumber?.ingatkan ?? PILIHAN_BAWAAN.ingatkan);
  const [tanyaJawab, setTanyaJawab] = useState(sumber?.tanya_jawab ?? PILIHAN_BAWAAN.tanya_jawab);
  // sematan tidak ikut diduplikat — itu soal letak tugas aslinya
  const [sematkan, setSematkan] = useState(!!awal?.disematkan_at);
  const [pakaiKuota, setPakaiKuota] = useState(sumber?.kuota != null);
  const [kuota, setKuota] = useState(String(sumber?.kuota ?? 3));
  const [pakaiArsip, setPakaiArsip] = useState(sumber?.arsip_hari != null);
  const [arsipHari, setArsipHari] = useState(String(sumber?.arsip_hari ?? 7));
  const [langkah, setLangkah] = useState<LangkahTugas[]>(sumber?.langkah ?? []);
  const [pakaiLangkah, setPakaiLangkah] = useState((sumber?.langkah?.length ?? 0) > 0);
  const [cari, setCari] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  // Tugas baru dapat id di sini, supaya lampirannya bisa diunggah ke materi/{id}/ sebelum disimpan.
  const [idTugas] = useState(() => awal?.id ?? crypto.randomUUID());
  const [lampiran, setLampiran] = useState<Lampiran[]>(awal?.lampiran ?? []);
  const [mengunggah, setMengunggah] = useState(false);
  const [menyalin, setMenyalin] = useState(!!salinDari && (salinDari.lampiran?.length ?? 0) > 0);
  // File yang diunggah di form ini tapi belum tersimpan: dihapus kalau form ditutup tanpa simpan.
  const unggahanBaru = useRef(new Set<string>());
  const tersimpan = useRef(false);
  useEffect(() => {
    const baru = unggahanBaru.current;
    return () => {
      if (!tersimpan.current) void hapusFileLampiran([...baru]);
    };
  }, []);
  const aturSibuk = useCallback((sibuk: boolean) => setMengunggah(sibuk), []);

  // Duplikat: file materi disalin ke folder tugas baru (dibuang lagi kalau dibatalkan).
  useEffect(() => {
    if (!salinDari || (salinDari.lampiran?.length ?? 0) === 0) return;
    let batal = false;
    salinLampiranMateri(salinDari.lampiran!, idTugas)
      .then((hasil) => {
        for (const p of pathLampiran(hasil)) unggahanBaru.current.add(p);
        if (!batal) setLampiran(hasil);
      })
      .finally(() => !batal && setMenyalin(false));
    return () => {
      batal = true;
    };
  }, [salinDari, idTugas]);

  function hapusLampiran(l: Lampiran) {
    setLampiran((daftar) => daftar.filter((x) => x !== l));
    // file yang baru diunggah langsung dibuang; file lama baru dihapus setelah disimpan
    if (l.path && unggahanBaru.current.delete(l.path)) void hapusFileLampiran([l.path]);
  }

  const jumlahSasaran = sasaranPegawai({ sasaran, divisi_ids: divisiIds, user_ids: userIds }, pegawai).length;
  const pegawaiTersaring = pegawai.filter((p) => p.nama.toLowerCase().includes(cari.trim().toLowerCase()));

  async function simpan() {
    setGalat(null);
    if (!judul.trim()) return setGalat("Judul tugas wajib diisi.");
    if (sasaran === "divisi" && divisiIds.length === 0) return setGalat("Pilih minimal satu divisi.");
    if (sasaran === "personal" && userIds.length === 0) return setGalat("Pilih minimal satu pegawai.");
    if (pakaiDeadline && !deadline) return setGalat("Isi tanggal deadline, atau matikan pilihan deadline.");
    if (pakaiMulai && !mulai) return setGalat("Isi waktu mulai tampil, atau matikan pilihannya.");
    if (pakaiDeadline && pakaiMulai && new Date(deadline) <= new Date(mulai)) return setGalat("Deadline harus setelah waktu mulai tampil.");
    const nKuota = Number(kuota);
    if (pakaiKuota && !(Number.isInteger(nKuota) && nKuota >= 1 && nKuota <= 500)) return setGalat("Kuota sukarela harus 1–500 orang.");
    const nArsip = Number(arsipHari);
    if (pakaiArsip && pakaiDeadline && !(Number.isInteger(nArsip) && nArsip >= 1 && nArsip <= 365)) return setGalat("Arsip otomatis harus 1–365 hari setelah deadline.");
    const langkahRapi = pakaiLangkah ? rapikanLangkah(langkah) : [];
    if (pakaiLangkah && langkahRapi.length === 0) return setGalat("Isi minimal satu langkah, atau matikan pilihan langkah-langkah.");

    const isi: IsiTugas = {
      judul: judul.trim(),
      deskripsi: deskripsi.trim() || null,
      aktif,
      sasaran,
      divisi_ids: sasaran === "divisi" ? divisiIds : [],
      user_ids: sasaran === "personal" ? userIds : [],
      deadline_at: pakaiDeadline ? new Date(deadline).toISOString() : null,
      mulai_at: pakaiMulai ? new Date(mulai).toISOString() : null,
      tampilkan_pembuat: tampilkanPembuat,
      ...kolomPilihan(
        {
          perlu_cek: perluCek,
          mendesak,
          kuota: pakaiKuota ? nKuota : null,
          wajib_baca: wajibBaca,
          langkah: langkahRapi,
          arsip_hari: pakaiArsip && pakaiDeadline ? nArsip : null,
          ingatkan,
          tanya_jawab: tanyaJawab,
          disematkan_at: sematkan ? (awal?.disematkan_at ?? new Date().toISOString()) : null,
        },
        migrasiPilihan || (!!awal && "perlu_cek" in awal)
      ),
    };
    const lama = pathLampiran(awal?.lampiran);
    // kolom lampiran hanya dikirim kalau dipakai, supaya simpan tetap jalan sebelum migrasi 0040
    if (lampiran.length > 0 || lama.length > 0) isi.lampiran = lampiran;
    setMenyimpan(true);
    try {
      await simpanTugas(awal?.id ?? null, isi, idTugas);
      tersimpan.current = true;
      const dipakai = new Set(pathLampiran(lampiran));
      void hapusFileLampiran(lama.filter((p) => !dipakai.has(p)));
      onTersimpan(!awal);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan tugas.");
    } finally {
      setMenyimpan(false);
    }
  }

  const kelasInput = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-brand-masuk focus:outline-none focus:ring-2 focus:ring-brand-masuk/20";

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-masuk/30 sm:p-5">
      <h2 className="font-bold text-brand-text">{awal ? "Ubah tugas" : salinDari ? "Duplikat tugas" : "Buat tugas baru"}</h2>
      {salinDari && <p className="-mt-2 text-xs text-gray-500">Isi, sasaran, lampiran, dan pilihan disalin. Atur ulang deadline untuk tugas ini.</p>}

      {/* Desktop: isi tugas di kiri, pilihan di kanan (saklar tidak terlempar jauh dari labelnya) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">Judul tugas</span>
            <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Kumpulkan laporan kegiatan bulan ini" className={kelasInput} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">
              Keterangan <span className="font-normal text-gray-400">(opsional)</span>
            </span>
            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} placeholder="Detail tugas, tautan berkas, dan sebagainya." className={kelasInput} />
          </label>

          {menyalin ? (
            <p className="animate-pulse text-xs text-gray-500">Menyalin lampiran…</p>
          ) : (
            <InputLampiran
              folder={folderLampiranMateri(idTugas)}
              label="Lampiran untuk pegawai (opsional) — mis. template, contoh desain, lagu acuan"
              nilai={lampiran}
              onUbah={setLampiran}
              onSibuk={aturSibuk}
              onUnggahBaru={(path) => unggahanBaru.current.add(path)}
              onHapus={hapusLampiran}
            />
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">Ditujukan untuk</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
              {(
                [
                  ["semua", "Semua pegawai"],
                  ["divisi", "Per divisi"],
                  ["personal", "Personal"],
                ] as [SasaranTugas, string][]
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSasaran(v)}
                  aria-pressed={sasaran === v}
                  className={`min-h-[40px] rounded-md px-1 text-xs font-semibold leading-tight ${sasaran === v ? "bg-white text-brand-masuk shadow-sm" : "text-gray-500"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {sasaran === "divisi" && (
              <div className="flex flex-wrap gap-1.5">
                {divisi.map((d) => (
                  <Chip key={d.id} aktif={divisiIds.includes(d.id)} onKlik={() => setDivisiIds(toggle(divisiIds, d.id))}>
                    {d.nama}
                  </Chip>
                ))}
                {divisi.length === 0 && <p className="text-xs text-gray-500">Belum ada divisi. Tambahkan di Kelola → Divisi.</p>}
              </div>
            )}

            {sasaran === "personal" && (
              <div className="flex flex-col gap-2">
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama pegawai..." className={kelasInput} />
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                  {pegawaiTersaring.map((p) => (
                    <Chip key={p.id} aktif={userIds.includes(p.id)} onKlik={() => setUserIds(toggle(userIds, p.id))}>
                      {p.nama}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Akan terlihat oleh {jumlahSasaran} pegawai aktif{pakaiKuota ? `, maksimal ${Number(kuota) || "?"} orang yang mengambil` : ""}.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-gray-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pilihan (boleh dimatikan)</p>

          <Kelompok judul="Waktu">
            <BarisSaklar judul="Pakai deadline" ket="Pegawai melihat sisa waktu pengerjaan." nyala={pakaiDeadline} onUbah={() => setPakaiDeadline(!pakaiDeadline)}>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={kelasInput} />
            </BarisSaklar>
            <BarisSaklar judul="Atur waktu mulai tampil" ket="Tugas baru terlihat pegawai mulai waktu ini." nyala={pakaiMulai} onUbah={() => setPakaiMulai(!pakaiMulai)}>
              <input type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)} className={kelasInput} />
            </BarisSaklar>
            <BarisSaklar
              judul="Arsip otomatis"
              ket={pakaiDeadline ? "Disembunyikan dari pegawai beberapa hari setelah deadline (tetap ada di sini)." : "Nyalakan deadline dulu untuk memakai pilihan ini."}
              nyala={pakaiArsip && pakaiDeadline}
              disabled={!pakaiDeadline}
              onUbah={() => setPakaiArsip(!pakaiArsip)}
            >
              <AngkaSatuan nilai={arsipHari} onUbah={setArsipHari} min={1} maks={365} satuan="hari setelah deadline" />
            </BarisSaklar>
          </Kelompok>

          <Kelompok judul="Pengerjaan">
            <BarisSaklar judul="Perlu dicek admin" ket="Selesai dari pegawai menunggu disetujui; admin bisa minta revisi." nyala={perluCek} onUbah={() => setPerluCek(!perluCek)} />
            <BarisSaklar judul="Langkah-langkah" ket="Pegawai mencentang langkah satu per satu." nyala={pakaiLangkah} onUbah={() => setPakaiLangkah(!pakaiLangkah)}>
              <EditorLangkah langkah={langkah} onUbah={setLangkah} kelasInput={kelasInput} />
            </BarisSaklar>
            <BarisSaklar judul="Kuota sukarela" ket="Pegawai sasaran menekan Ambil tugas; siapa cepat dia dapat." nyala={pakaiKuota} onUbah={() => setPakaiKuota(!pakaiKuota)}>
              <AngkaSatuan nilai={kuota} onUbah={setKuota} min={1} maks={500} satuan="orang" />
            </BarisSaklar>
            <BarisSaklar judul="Konfirmasi dibaca" ket="Pegawai menekan Sudah saya baca; terlihat siapa yang belum." nyala={wajibBaca} onUbah={() => setWajibBaca(!wajibBaca)} />
          </Kelompok>

          <Kelompok judul="Tampilan & pemberitahuan">
            <BarisSaklar judul="Sematkan di atas" ket="📌 Tetap paling atas di daftar admin & pegawai." nyala={sematkan} onUbah={() => setSematkan(!sematkan)} />
            <BarisSaklar judul="Tandai mendesak" ket="Paling atas di daftar & muncul di Beranda pegawai." nyala={mendesak} onUbah={() => setMendesak(!mendesak)} />
            <BarisSaklar judul="Pengingat di Beranda" ket="Muncul di Beranda kalau deadline tinggal < 24 jam." nyala={ingatkan} onUbah={() => setIngatkan(!ingatkan)} />
            <BarisSaklar judul="Tanya-jawab" ket="Pegawai bisa bertanya tentang tugas ini ke admin." nyala={tanyaJawab} onUbah={() => setTanyaJawab(!tanyaJawab)} />
            <BarisSaklar judul="Tampilkan nama pembuat" ket="Pegawai melihat siapa yang membuat tugas ini." nyala={tampilkanPembuat} onUbah={() => setTampilkanPembuat(!tampilkanPembuat)} />
            <BarisSaklar judul="Aktif" ket="Matikan untuk menyimpan sebagai draf atau menyembunyikan tugas." nyala={aktif} onUbah={() => setAktif(!aktif)} />
          </Kelompok>
        </div>
      </div>

      {galat && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{galat}</p>}

      <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:w-96">
        <button type="button" onClick={onBatal} className="min-h-[44px] rounded-lg border border-gray-300 text-sm font-semibold text-brand-text">
          Batal
        </button>
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={menyimpan || mengunggah || menyalin}
          className="min-h-[44px] rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : mengunggah || menyalin ? "Tunggu lampiran..." : awal ? "Simpan perubahan" : "Buat tugas"}
        </button>
      </div>
    </section>
  );
}

function EditorLangkah({ langkah, onUbah, kelasInput }: { langkah: LangkahTugas[]; onUbah: (l: LangkahTugas[]) => void; kelasInput: string }) {
  const ubah = (id: string, teks: string) => onUbah(langkah.map((l) => (l.id === id ? { ...l, teks } : l)));
  return (
    <div className="flex flex-col gap-1.5">
      {langkah.map((l, i) => (
        <div key={l.id} className="flex items-center gap-1.5">
          <span className="w-5 shrink-0 text-right text-xs font-semibold text-gray-400">{i + 1}.</span>
          <input value={l.teks} onChange={(e) => ubah(l.id, e.target.value)} maxLength={300} placeholder="mis. Ambil foto suasana" aria-label={`Langkah ${i + 1}`} className={`${kelasInput} min-w-0`} />
          <button
            type="button"
            onClick={() => onUbah(langkah.filter((x) => x.id !== l.id))}
            aria-label={`Hapus langkah ${i + 1}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-red-600"
          >
            ×
          </button>
        </div>
      ))}
      {langkah.length < 30 && (
        <button
          type="button"
          onClick={() => onUbah([...langkah, { id: idLangkah(), teks: "" }])}
          className="min-h-[40px] rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-brand-masuk"
        >
          + Tambah langkah
        </button>
      )}
    </div>
  );
}

function AngkaSatuan({ nilai, onUbah, min, maks, satuan }: { nilai: string; onUbah: (v: string) => void; min: number; maks: number; satuan: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={maks}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        className="w-24 rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-brand-masuk focus:outline-none focus:ring-2 focus:ring-brand-masuk/20"
      />
      {satuan}
    </label>
  );
}

function Kelompok({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{judul}</p>
      {children}
    </div>
  );
}

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

function BarisSaklar({
  judul,
  ket,
  nyala,
  disabled,
  onUbah,
  children,
}: {
  judul: string;
  ket: string;
  nyala: boolean;
  disabled?: boolean;
  onUbah: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className={`min-w-0 text-sm text-gray-700 ${disabled ? "opacity-60" : ""}`}>
          <span className="font-semibold">{judul}</span>
          <span className="block text-xs text-gray-500">{ket}</span>
        </span>
        <Saklar nyala={nyala} disabled={disabled} onUbah={onUbah} label={judul} />
      </div>
      {nyala && children}
    </div>
  );
}

function Saklar({ nyala, disabled, onUbah, label }: { nyala: boolean; disabled?: boolean; onUbah: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      disabled={disabled}
      onClick={onUbah}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${nyala ? "bg-brand-masuk" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${nyala ? "left-[22px]" : "left-0.5"}`} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Chip({ aktif, onKlik, children }: { aktif: boolean; onKlik: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onKlik}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-gray-700"}`}
    >
      {aktif ? "✓ " : ""}
      {children}
    </button>
  );
}

function Lencana({ warna, children }: { warna: "hijau" | "abu" | "merah" | "oranye" | "biru" | "ungu" | "kuning"; children: ReactNode }) {
  const kelas = {
    kuning: "bg-amber-100 text-amber-700",
    hijau: "bg-green-100 text-green-700",
    abu: "bg-gray-100 text-gray-600",
    merah: "bg-red-100 text-red-700",
    oranye: "bg-orange-100 text-orange-700",
    biru: "bg-blue-100 text-blue-700",
    ungu: "bg-purple-100 text-purple-700",
  }[warna];
  return <span className={`max-w-full shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${kelas}`}>{children}</span>;
}
