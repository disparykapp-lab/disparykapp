import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Maximize2, Trash2, UserRound, X } from "lucide-react";
import KalenderRentang from "../../../components/KalenderRentang";
import Lembar from "../../../components/Lembar";
import { useModal } from "../../../lib/useModal";
import { hitungProgressMagang } from "../../../lib/profil";
import { formatTanggal } from "../../../lib/tanggal";
import { rentangAkhir, selisihHari, type PilihanRentang } from "../../../lib/izinAturan";
import { DURASI_MAGANG, batasMagang, fotoBesar, selesaiMagang } from "../../../lib/pegawaiAturan";
import type { Divisi, Profile } from "../../../types/database";
import { AvatarPegawai } from "./KartuPegawai";

const AMBANG_GESER = 60;
const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const tgl = (ymd: string) => fmt.format(new Date(`${ymd}T00:00:00Z`));

export type Perubahan = Partial<
  Pick<Profile, "nama" | "jabatan" | "divisi_id" | "role" | "wajib_absen" | "aktif" | "tanggal_mulai_magang" | "tanggal_selesai_magang">
>;

/**
 * Profil satu pegawai yang muncul ke depan. Pengaturan (divisi, peran, saklar)
 * langsung tersimpan saat diketuk; geser kiri/kanan untuk pegawai berikutnya.
 */
export default function DetailPegawai({
  p,
  online,
  divisiList,
  sayaId,
  hariIni,
  posisi,
  total,
  onSebelum,
  onBerikut,
  onTutup,
  onSimpan,
  onHapus,
}: {
  p: Profile;
  online: boolean;
  divisiList: Divisi[];
  sayaId: string | undefined;
  hariIni: string;
  posisi: number;
  total: number;
  onSebelum: (() => void) | null;
  onBerikut: (() => void) | null;
  onTutup: () => void;
  onSimpan: (perubahan: Perubahan) => Promise<void>;
  onHapus: () => Promise<void>;
}) {
  const idJudul = useId();
  const [arah, setArah] = useState<"kanan" | "kiri" | null>(null);
  const [fotoBuka, setFotoBuka] = useState(false);
  const sentuh = useRef<{ x: number; y: number } | null>(null);

  const isi = useRef<HTMLDivElement>(null);
  // pindah orang = mulai lagi dari atas lembar, bukan di posisi gulir orang sebelumnya
  useEffect(() => {
    isi.current?.closest("[role=dialog]")?.scrollTo({ top: 0 });
  }, [p.id]);

  function pindah(ke: "kanan" | "kiri") {
    const aksi = ke === "kanan" ? onBerikut : onSebelum;
    if (!aksi) return;
    setArah(ke);
    setFotoBuka(false);
    aksi();
  }

  const sedangMengisi = (t: EventTarget | null) =>
    !!(t as HTMLElement | null)?.closest?.("input, textarea, [data-tanpa-geser]") || !!document.querySelector("[role=dialog] [data-tanpa-geser]");

  useModal(
    () => (fotoBuka ? setFotoBuka(false) : onTutup()),
    (e) => {
      if (fotoBuka || sedangMengisi(e.target)) return;
      if (e.key === "ArrowLeft") pindah("kiri");
      if (e.key === "ArrowRight") pindah("kanan");
    }
  );

  function onTouchStart(e: TouchEvent) {
    if (sedangMengisi(e.target)) return;
    const t = e.touches[0];
    sentuh.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: TouchEvent) {
    const awal = sentuh.current;
    sentuh.current = null;
    if (!awal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - awal.x;
    if (Math.abs(dx) < AMBANG_GESER || Math.abs(dx) < Math.abs(t.clientY - awal.y)) return;
    pindah(dx < 0 ? "kanan" : "kiri");
  }

  return (
    <>
      <Lembar
        idJudul={idJudul}
        onTutup={onTutup}
        lebar="max-w-lg"
        judul={
          <>
            <UserRound size={20} className="text-brand-masuk" aria-hidden="true" /> Profil pegawai
          </>
        }
      >
        <div key={p.id} ref={isi} className={`flex flex-col gap-4 ${arah ? `anim-geser-${arah}` : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <IsiPegawai p={p} online={online} divisiList={divisiList} diriSendiri={p.id === sayaId} hariIni={hariIni} onSimpan={onSimpan} onHapus={onHapus} onBukaFoto={() => setFotoBuka(true)} />
        </div>

        {total > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => pindah("kiri")}
              disabled={!onSebelum}
              className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Sebelumnya
            </button>
            <span className="text-xs text-gray-400" aria-live="polite">
              {posisi + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => pindah("kanan")}
              disabled={!onBerikut}
              className="flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-text hover:bg-gray-100 disabled:opacity-30"
            >
              Berikutnya <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </Lembar>

      {fotoBuka && p.foto_url && <FotoPenuh url={fotoBesar(p.foto_url)} nama={p.nama} onTutup={() => setFotoBuka(false)} />}
    </>
  );
}

function IsiPegawai({
  p,
  online,
  divisiList,
  diriSendiri,
  hariIni,
  onSimpan,
  onHapus,
  onBukaFoto,
}: {
  p: Profile;
  online: boolean;
  divisiList: Divisi[];
  diriSendiri: boolean;
  hariIni: string;
  onSimpan: (perubahan: Perubahan) => Promise<void>;
  onHapus: () => Promise<void>;
  onBukaFoto: () => void;
}) {
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan(bagian: string, perubahan: Perubahan): Promise<boolean> {
    setSibuk(bagian);
    setGalat(null);
    try {
      await onSimpan(perubahan);
      return true;
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
      return false;
    } finally {
      setSibuk(null);
    }
  }

  const avatar = <AvatarPegawai p={p} online={online} ukuran="h-20 w-20" teks="text-2xl" />;

  return (
    <>
      <div className="flex items-center gap-4">
        {p.foto_url ? (
          <button type="button" onClick={onBukaFoto} aria-label={`Buka foto profil ${p.nama}`} className="group relative shrink-0 rounded-xl transition active:scale-95">
            {avatar}
            <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white" aria-hidden="true">
              <Maximize2 size={12} />
            </span>
          </button>
        ) : (
          avatar
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight text-brand-text">{p.nama}</p>
          <p className="truncate text-xs text-gray-500">{p.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {online && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Online</span>}
            {p.role === "admin" && <span className="rounded-full bg-brand-masuk/10 px-2 py-0.5 text-[11px] font-semibold text-brand-masuk">Admin</span>}
            {!p.aktif && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Nonaktif</span>}
            {diriSendiri && <span className="rounded-full bg-lnd-sky px-2 py-0.5 text-[11px] font-semibold text-brand-masuk">Akun kamu</span>}
          </div>
        </div>
      </div>

      {galat && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{galat}</p>}

      <Identitas p={p} sibuk={sibuk === "identitas"} onSimpan={(x) => simpan("identitas", x)} />

      <Bagian judul="Divisi">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Divisi">
          {[...divisiList.map((d) => ({ id: d.id as string | null, nama: d.nama })), { id: null, nama: "Tanpa divisi" }].map((d) => {
            const aktif = p.divisi_id === d.id;
            return (
              <button
                key={d.id ?? "tanpa"}
                type="button"
                aria-pressed={aktif}
                disabled={sibuk === "divisi"}
                onClick={() => !aktif && void simpan("divisi", { divisi_id: d.id })}
                className={`min-h-[36px] rounded-full px-3 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
                  aktif ? "bg-brand-masuk text-white" : "bg-white text-brand-text ring-1 ring-gray-200"
                }`}
              >
                {d.nama}
              </button>
            );
          })}
        </div>
      </Bagian>

      <Bagian judul="Pengaturan">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-text">Peran</p>
            {diriSendiri && <p className="text-[11px] text-gray-400">Akun sendiri tidak bisa diturunkan.</p>}
          </div>
          <div className="grid w-44 shrink-0 grid-cols-2 gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="Peran">
            {(
              [
                ["user", "Pegawai"],
                ["admin", "Admin"],
              ] as const
            ).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                role="radio"
                aria-checked={p.role === nilai}
                disabled={diriSendiri || sibuk === "peran"}
                onClick={() => p.role !== nilai && void simpan("peran", { role: nilai })}
                className={`min-h-[34px] rounded-full text-sm font-semibold transition disabled:cursor-not-allowed ${
                  p.role === nilai ? "bg-brand-masuk text-white shadow-sm" : "text-gray-500"
                } ${diriSendiri && p.role !== nilai ? "opacity-40" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Saklar
          label="Wajib absen"
          ket="Kalau mati, hari tanpa absen tidak dihitung dan tidak ikut peringkat."
          nyala={p.wajib_absen !== false}
          sibuk={sibuk === "wajib"}
          onUbah={(v) => void simpan("wajib", { wajib_absen: v })}
        />
        <Saklar
          label="Akun aktif"
          ket={diriSendiri ? "Akun sendiri tidak bisa dinonaktifkan." : "Kalau mati, pegawai tidak bisa masuk aplikasi."}
          nyala={p.aktif}
          mati={diriSendiri}
          sibuk={sibuk === "aktif"}
          onUbah={(v) => void simpan("aktif", { aktif: v })}
        />
      </Bagian>

      <Bagian judul="Data diri" ket="Diisi pegawai sendiri lewat Profil Saya.">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-gray-400">Tanggal lahir</p>
            <p className="font-medium text-brand-text">{p.tanggal_lahir ? formatTanggal(p.tanggal_lahir) : "—"}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">Asal sekolah/kampus</p>
            <p className="truncate font-medium text-brand-text">{p.asal_sekolah || "—"}</p>
          </div>
        </div>
      </Bagian>

      <MasaMagang p={p} hariIni={hariIni} sibuk={sibuk === "magang"} onSimpan={(x) => simpan("magang", x)} />

      {!diriSendiri && <ZonaHapus nama={p.nama} onHapus={onHapus} />}
    </>
  );
}

function Bagian({ judul, ket, children }: { judul: string; ket?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl bg-gray-50 p-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{judul}</h3>
        {ket && <p className="text-[11px] text-gray-400">{ket}</p>}
      </div>
      {children}
    </section>
  );
}

function Saklar({
  label,
  ket,
  nyala,
  mati = false,
  sibuk,
  onUbah,
}: {
  label: string;
  ket: string;
  nyala: boolean;
  mati?: boolean;
  sibuk: boolean;
  onUbah: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-text">{label}</p>
        <p className="text-[11px] text-gray-400">{ket}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={nyala}
        aria-label={label}
        disabled={mati || sibuk}
        onClick={() => onUbah(!nyala)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${nyala ? "bg-brand-masuk" : "bg-gray-300"}`}
      >
        <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${nyala ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function Identitas({ p, sibuk, onSimpan }: { p: Profile; sibuk: boolean; onSimpan: (x: Perubahan) => Promise<boolean> }) {
  const [nama, setNama] = useState(p.nama);
  const [jabatan, setJabatan] = useState(p.jabatan ?? "");
  const [galat, setGalat] = useState<string | null>(null);
  const berubah = nama.trim() !== p.nama || jabatan.trim() !== (p.jabatan ?? "");

  async function simpan() {
    if (nama.trim().length < 2) return setGalat("Nama minimal 2 huruf.");
    setGalat(null);
    await onSimpan({ nama: nama.trim(), jabatan: jabatan.trim() || null });
  }

  return (
    <Bagian judul="Identitas">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-500">Nama</span>
        <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={100} className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-500">Jabatan</span>
        <input
          value={jabatan}
          onChange={(e) => setJabatan(e.target.value)}
          maxLength={100}
          placeholder="mis. Staf Humas"
          className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm"
        />
      </label>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      {berubah && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setNama(p.nama);
              setJabatan(p.jabatan ?? "");
              setGalat(null);
            }}
            className="min-h-[40px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={sibuk}
            className="min-h-[40px] flex-1 rounded-xl bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
          >
            {sibuk ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      )}
    </Bagian>
  );
}

function MasaMagang({ p, hariIni, sibuk, onSimpan }: { p: Profile; hariIni: string; sibuk: boolean; onSimpan: (x: Perubahan) => Promise<boolean> }) {
  const [edit, setEdit] = useState(false);
  const [pilihan, setPilihan] = useState<PilihanRentang>({ mulai: p.tanggal_mulai_magang, selesai: p.tanggal_selesai_magang });
  const [galat, setGalat] = useState<string | null>(null);
  const ada = !!p.tanggal_mulai_magang && !!p.tanggal_selesai_magang;
  const progres = ada ? hitungProgressMagang(p.tanggal_mulai_magang!, p.tanggal_selesai_magang!) : null;

  function buka() {
    setPilihan({ mulai: p.tanggal_mulai_magang, selesai: p.tanggal_selesai_magang });
    setGalat(null);
    setEdit(true);
  }

  async function simpan(mulai: string | null, selesai: string | null) {
    if (mulai && (!selesai || selesai === mulai)) return setGalat("Ketuk tanggal selesai magang dulu.");
    setGalat(null);
    if (await onSimpan({ tanggal_mulai_magang: mulai, tanggal_selesai_magang: selesai })) setEdit(false);
  }

  if (!edit) {
    return (
      <Bagian judul="Masa magang">
        {progres ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-brand-text">
              {tgl(p.tanggal_mulai_magang!)} – {tgl(p.tanggal_selesai_magang!)}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-brand-masuk" style={{ width: `${progres.persen}%` }} />
            </div>
            <p className="text-xs text-gray-500">
              {progres.persen}% berjalan · {progres.teksSisa}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Belum diatur — bukan anak magang, atau tanggalnya belum diisi.</p>
        )}
        <button
          type="button"
          onClick={buka}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-brand-masuk ring-1 ring-brand-masuk/20 transition active:scale-[0.98]"
        >
          <CalendarRange size={16} aria-hidden="true" /> {ada ? "Ubah tanggal" : "Atur masa magang"}
        </button>
      </Bagian>
    );
  }

  const akhir = rentangAkhir(pilihan);
  const lama = akhir && pilihan.selesai ? selisihHari(akhir.mulai, akhir.selesai) + 1 : 0;
  return (
    <div data-tanpa-geser>
      <Bagian judul="Masa magang" ket="Ketuk tanggal mulai, lalu tanggal selesai.">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lama magang">
          {DURASI_MAGANG.map((n) => {
            const mulai = pilihan.mulai ?? hariIni;
            const aktif = !!pilihan.mulai && pilihan.selesai === selesaiMagang(pilihan.mulai, n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={aktif}
                onClick={() => setPilihan({ mulai, selesai: selesaiMagang(mulai, n) })}
                className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold ${aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-brand-text"}`}
              >
                {n === 12 ? "1 tahun" : `${n} bulan`}
              </button>
            );
          })}
        </div>
        <div className="rounded-xl bg-white p-2">
          <KalenderRentang
            pilihan={pilihan}
            onPilih={(x) => {
              setPilihan(x);
              setGalat(null);
            }}
            hariIni={hariIni}
            batas={(x) => batasMagang(hariIni, x)}
            teks={{ grup: "Pilih masa magang", mulai: "mulai magang", selesai: "selesai magang", libur: "akhir pekan" }}
            legenda={<span>Pakai panah bulan untuk melompat, atau chip lama magang di atas.</span>}
          />
        </div>
        {akhir && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Mulai</p>
              <p className="font-semibold text-brand-text">{tgl(akhir.mulai)}</p>
            </div>
            <div>
              <p className="text-gray-400">Selesai</p>
              <p className="font-semibold text-brand-text">{pilihan.selesai ? tgl(akhir.selesai) : "—"}</p>
            </div>
            {lama > 0 && <p className="col-span-2 font-bold text-brand-masuk">{lama} hari (±{Math.round(lama / 30)} bulan)</p>}
          </div>
        )}
        {galat && <p className="text-xs text-red-600">{galat}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEdit(false)}
            className="min-h-[40px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan(akhir?.mulai ?? null, pilihan.selesai)}
            disabled={sibuk || !akhir}
            className="min-h-[40px] flex-1 rounded-xl bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
          >
            {sibuk ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
        {ada && (
          <button type="button" onClick={() => void simpan(null, null)} disabled={sibuk} className="text-xs font-semibold text-gray-500 underline">
            Hapus masa magang
          </button>
        )}
      </Bagian>
    </div>
  );
}

function ZonaHapus({ nama, onHapus }: { nama: string; onHapus: () => Promise<void> }) {
  const [yakin, setYakin] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  if (!yakin) {
    return (
      <button
        type="button"
        onClick={() => setYakin(true)}
        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 transition active:scale-[0.98]"
      >
        <Trash2 size={15} aria-hidden="true" /> Hapus pegawai
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-red-50 p-3 ring-1 ring-red-200" data-tanpa-geser>
      <p className="text-sm font-bold text-red-700">Hapus {nama}?</p>
      <ul className="list-disc pl-4 text-xs text-red-800">
        <li>Data pegawai dan <b>seluruh riwayat absensinya</b> terhapus permanen.</li>
        <li>Akun Google-nya di Supabase Auth dihapus terpisah lewat dashboard Supabase.</li>
        <li>Kalau hanya sementara, cukup matikan "Akun aktif".</li>
      </ul>
      {galat && <p className="text-xs text-red-700">{galat}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setYakin(false)} className="min-h-[40px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text">
          Batal
        </button>
        <button
          type="button"
          disabled={sibuk}
          onClick={async () => {
            setSibuk(true);
            setGalat(null);
            try {
              await onHapus();
            } catch (e) {
              setGalat(e instanceof Error ? e.message : "Gagal menghapus.");
              setSibuk(false);
            }
          }}
          className="min-h-[40px] flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sibuk ? "Menghapus…" : "Ya, hapus permanen"}
        </button>
      </div>
    </div>
  );
}

/** Foto profil layar penuh; ketuk di mana saja atau Escape untuk menutup. */
function FotoPenuh({ url, nama, onTutup }: { url: string; nama: string; onTutup: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto profil ${nama}`}
      onClick={onTutup}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
    >
      <button type="button" aria-label="Tutup foto" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
        <X size={20} />
      </button>
      <img src={url} alt={`Foto profil ${nama}`} referrerPolicy="no-referrer" className="anim-buka max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl" />
      <p className="text-sm font-semibold text-white">{nama}</p>
    </div>
  );
}
