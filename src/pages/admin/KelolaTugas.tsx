import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { teksDenganLink } from "../../lib/linkify";
import {
  ambilFiturTugasUndangan,
  ambilSemuaTugas,
  formatWaktu,
  hapusTugas,
  infoDeadline,
  keInputWaktu,
  sasaranPegawai,
  simpanFiturTugasUndangan,
  simpanTugas,
  ubahAktifTugas,
  LABEL_STATUS_TUGAS,
  type IsiTugas,
  type ProgresTugas,
  type SasaranTugas,
  type StatusTugas,
  type TugasDenganPembuat,
} from "../../lib/tugas";
import type { Divisi, Profile } from "../../types/database";

type Filter = "semua" | "aktif" | "nonaktif";

export default function KelolaTugas() {
  const [tugas, setTugas] = useState<TugasDenganPembuat[]>([]);
  const [progres, setProgres] = useState<ProgresTugas[]>([]);
  const [pegawai, setPegawai] = useState<Profile[]>([]);
  const [divisi, setDivisi] = useState<Divisi[]>([]);
  const [fiturUndangan, setFiturUndangan] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("semua");
  /** null = form tertutup, "baru" = buat tugas baru, selain itu id tugas yang diubah */
  const [form, setForm] = useState<string | null>(null);
  const [rinci, setRinci] = useState<string | null>(null);

  async function muat() {
    try {
      const d = await ambilSemuaTugas();
      setTugas(d.tugas);
      setProgres(d.progres);
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

  const tersaring = tugas.filter((t) => filter === "semua" || (filter === "aktif" ? t.aktif : !t.aktif));

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

  if (loading) return <Loading teks="Memuat tugas..." />;

  const tugasDiubah = form && form !== "baru" ? tugas.find((t) => t.id === form) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
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
        <button
          type="button"
          onClick={() => setForm("baru")}
          className="min-h-[48px] rounded-2xl bg-brand-masuk text-sm font-semibold text-white shadow-sm"
        >
          + Buat tugas baru
        </button>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {(["semua", "aktif", "nonaktif"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${filter === f ? "bg-brand-masuk text-white" : "bg-white text-gray-500"}`}
          >
            {f === "semua" ? "Semua" : f === "aktif" ? "Aktif" : "Nonaktif"} ({f === "semua" ? tugas.length : tugas.filter((t) => (f === "aktif" ? t.aktif : !t.aktif)).length})
          </button>
        ))}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        {tersaring.map((t) => {
          const target = sasaranPegawai(t, pegawai);
          const prog = progresPerTugas[t.id] ?? [];
          const selesai = prog.filter((p) => p.status === "selesai" && target.some((x) => x.id === p.user_id)).length;
          const kendala = prog.filter((p) => p.status === "kendala").length;
          const persen = target.length > 0 ? Math.round((selesai / target.length) * 100) : 0;
          const deadline = t.deadline_at ? infoDeadline(t.deadline_at) : null;
          return (
            <article key={t.id} className={`flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ${t.aktif ? "" : "opacity-70"}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-brand-text">{t.judul}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <Lencana warna={t.aktif ? "hijau" : "abu"}>{t.aktif ? "Aktif" : "Nonaktif"}</Lencana>
                    <Lencana warna="abu">{labelSasaran(t, divisi, pegawai)}</Lencana>
                    {deadline && <Lencana warna={deadline.nada === "lewat" ? "merah" : deadline.nada === "dekat" ? "oranye" : "abu"}>⏰ {deadline.teks}</Lencana>}
                    {t.mulai_at && new Date(t.mulai_at) > new Date() && <Lencana warna="biru">Tampil {formatWaktu(t.mulai_at)}</Lencana>}
                  </div>
                </div>
                <Saklar nyala={t.aktif} onUbah={() => void ubahAktif(t)} label={`Aktifkan ${t.judul}`} />
              </div>

              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-brand-masuk" style={{ width: `${persen}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {selesai}/{target.length} pegawai selesai{kendala > 0 && <span className="text-red-600"> · {kendala} kendala</span>}
                </p>
              </div>

              <p className="text-[11px] text-gray-400">
                Dibuat {t.pembuat ? `oleh ${t.pembuat.nama} ` : ""}· {formatWaktu(t.created_at)}
                {!t.tampilkan_pembuat && " · nama pembuat disembunyikan dari pegawai"}
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => setRinci(rinci === t.id ? null : t.id)} className="rounded-lg border border-gray-300 px-3 py-2 font-semibold text-brand-text">
                  {rinci === t.id ? "Tutup rincian" : "Lihat progres"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(t.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 font-semibold text-brand-text"
                >
                  Ubah
                </button>
                <button type="button" onClick={() => void hapus(t)} className="ml-auto rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600">
                  Hapus
                </button>
              </div>

              {rinci === t.id && <RincianProgres tugas={t} target={target} progres={prog} />}
            </article>
          );
        })}
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

function RincianProgres({ tugas, target, progres }: { tugas: TugasDenganPembuat; target: Profile[]; progres: ProgresTugas[] }) {
  const peta = new Map(progres.map((p) => [p.user_id, p]));
  const urut = [...target].sort((a, b) => urutan(peta.get(a.id)?.status) - urutan(peta.get(b.id)?.status));
  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
      {tugas.deskripsi && <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{teksDenganLink(tugas.deskripsi)}</p>}
      {tugas.deadline_at && <p className="text-xs text-gray-500">Deadline: {formatWaktu(tugas.deadline_at)}</p>}
      {urut.length === 0 && <p className="text-xs text-gray-400">Belum ada pegawai aktif yang menjadi sasaran tugas ini.</p>}
      <ul className="flex flex-col divide-y divide-gray-100">
        {urut.map((p) => {
          const pr = peta.get(p.id);
          const s: StatusTugas = pr?.status ?? "belum";
          return (
            <li key={p.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text">{p.nama}</p>
                {pr?.catatan && <p className="text-xs text-gray-500">“{pr.catatan}”</p>}
                {pr && pr.status !== "belum" && <p className="text-[11px] text-gray-400">{formatWaktu(pr.diperbarui_at)}</p>}
              </div>
              <Lencana warna={s === "selesai" ? "hijau" : s === "kendala" ? "merah" : "abu"}>{LABEL_STATUS_TUGAS[s]}</Lencana>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const urutan = (s?: StatusTugas) => (s === "kendala" ? 0 : s === "selesai" ? 2 : 1);

/* ---------------- Form buat / ubah ---------------- */

function FormTugas({
  awal,
  pegawai,
  divisi,
  onBatal,
  onTersimpan,
}: {
  awal: TugasDenganPembuat | null;
  pegawai: Profile[];
  divisi: Divisi[];
  onBatal: () => void;
  onTersimpan: (baru: boolean) => void;
}) {
  const [judul, setJudul] = useState(awal?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? "");
  const [sasaran, setSasaran] = useState<SasaranTugas>(awal?.sasaran ?? "semua");
  const [divisiIds, setDivisiIds] = useState<string[]>(awal?.divisi_ids ?? []);
  const [userIds, setUserIds] = useState<string[]>(awal?.user_ids ?? []);
  const [pakaiDeadline, setPakaiDeadline] = useState(!!awal?.deadline_at);
  const [deadline, setDeadline] = useState(keInputWaktu(awal?.deadline_at ?? null));
  const [pakaiMulai, setPakaiMulai] = useState(!!awal?.mulai_at);
  const [mulai, setMulai] = useState(keInputWaktu(awal?.mulai_at ?? null));
  const [tampilkanPembuat, setTampilkanPembuat] = useState(awal?.tampilkan_pembuat ?? true);
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [cari, setCari] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

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
    };
    setMenyimpan(true);
    try {
      await simpanTugas(awal?.id ?? null, isi);
      onTersimpan(!awal);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan tugas.");
    } finally {
      setMenyimpan(false);
    }
  }

  const kelasInput = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-brand-masuk focus:outline-none focus:ring-2 focus:ring-brand-masuk/20";

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-masuk/30">
      <h2 className="font-bold text-brand-text">{awal ? "Ubah tugas" : "Buat tugas baru"}</h2>

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
              className={`rounded-md px-2 py-2 text-xs font-semibold ${sasaran === v ? "bg-white text-brand-masuk shadow-sm" : "text-gray-500"}`}
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
        <p className="text-xs text-gray-500">Akan terlihat oleh {jumlahSasaran} pegawai aktif.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pilihan (boleh dimatikan)</p>
        <BarisSaklar judul="Pakai deadline" ket="Pegawai melihat sisa waktu pengerjaan." nyala={pakaiDeadline} onUbah={() => setPakaiDeadline(!pakaiDeadline)}>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={kelasInput} />
        </BarisSaklar>
        <BarisSaklar judul="Atur waktu mulai tampil" ket="Tugas baru terlihat pegawai mulai waktu ini." nyala={pakaiMulai} onUbah={() => setPakaiMulai(!pakaiMulai)}>
          <input type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)} className={kelasInput} />
        </BarisSaklar>
        <BarisSaklar judul="Tampilkan nama pembuat" ket="Pegawai melihat siapa yang membuat tugas ini." nyala={tampilkanPembuat} onUbah={() => setTampilkanPembuat(!tampilkanPembuat)} />
        <BarisSaklar judul="Aktif" ket="Matikan untuk menyimpan sebagai draf atau menyembunyikan tugas." nyala={aktif} onUbah={() => setAktif(!aktif)} />
      </div>

      {galat && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{galat}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onBatal} className="min-h-[44px] flex-1 rounded-lg border border-gray-300 text-sm font-semibold text-brand-text">
          Batal
        </button>
        <button type="button" onClick={() => void simpan()} disabled={menyimpan} className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60">
          {menyimpan ? "Menyimpan..." : awal ? "Simpan perubahan" : "Buat tugas"}
        </button>
      </div>
    </section>
  );
}

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

function BarisSaklar({ judul, ket, nyala, onUbah, children }: { judul: string; ket: string; nyala: boolean; onUbah: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-700">
          <span className="font-semibold">{judul}</span>
          <span className="block text-xs text-gray-500">{ket}</span>
        </span>
        <Saklar nyala={nyala} onUbah={onUbah} label={judul} />
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

function Lencana({ warna, children }: { warna: "hijau" | "abu" | "merah" | "oranye" | "biru"; children: ReactNode }) {
  const kelas = {
    hijau: "bg-green-100 text-green-700",
    abu: "bg-gray-100 text-gray-600",
    merah: "bg-red-100 text-red-700",
    oranye: "bg-orange-100 text-orange-700",
    biru: "bg-blue-100 text-blue-700",
  }[warna];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${kelas}`}>{children}</span>;
}
