import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, ChevronDown, Copy, RotateCcw, Share2, Trash2, type LucideIcon } from "lucide-react";
import Loading from "../../components/Loading";
import { superAdminHapusNaskahAi } from "../../lib/naskahAi";
import { hitungKata, hitungPoin, judulRiwayat, pecahPertanyaan, tambahPoin, tanpaMarkdown } from "../../lib/naskahAiTeks";
import type { NaskahAi } from "../../types/database";

// Komponen Naskah AI (mode Naskah & Wawancara) dengan bahasa visual aplikasi:
// kartu putih, maroon, ilustrasi stiker dari /public, tanpa gradasi/animasi hiasan.

/* ---------- Kerangka ---------- */

export function Langkah({
  no,
  judul,
  ket,
  opsional,
  children,
}: {
  no: number;
  judul: string;
  ket?: string;
  opsional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-xs font-bold text-white">{no}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-text">
            {judul}
            {opsional && <span className="ml-1.5 text-xs font-normal text-gray-400">(opsional)</span>}
          </h2>
          {ket && <p className="text-xs text-gray-500">{ket}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function SubJudul({ children }: { children: ReactNode }) {
  return <p className="-mb-1.5 text-xs font-medium text-gray-600">{children}</p>;
}

export function Tips({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-lnd-sky px-3 py-2 text-xs text-brand-masuk-dark">{children}</p>;
}

export function Galat({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {children}
    </p>
  );
}

const kelasIsian =
  "rounded-xl border border-gray-200 bg-gray-50 text-sm text-brand-text placeholder:text-gray-400 transition focus:border-brand-masuk focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-masuk/15";

/* ---------- Isian ---------- */

/** Kotak cerita + tombol cepat yang menambah poin "- …" di baris baru. */
export function KotakCerita({
  label,
  value,
  onChange,
  placeholder,
  saran,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  saran: string[];
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  function tambah(s: string) {
    const baru = tambahPoin(value, s);
    onChange(baru);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(baru.length, baru.length);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={placeholder}
        className={`min-h-[140px] w-full resize-y p-3 leading-relaxed ${kelasIsian}`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {saran.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => tambah(s)}
            className="rounded-full bg-lnd-sky px-3 py-1.5 text-xs font-semibold text-brand-masuk transition active:scale-95"
          >
            + {s}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-gray-400" aria-live="polite">
          {hitungPoin(value)} poin · {hitungKata(value)} kata
        </span>
      </div>
    </div>
  );
}

/** Input berlabel dengan ikon garis di depannya. */
export function Isian({
  ikon: Ikon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  children,
}: {
  ikon: LucideIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  /** saran di bawah input (ChipSaran) */
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-600">
        {label}
      </label>
      <div className="relative">
        <Ikon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-h-[44px] w-full min-w-0 py-2 pl-9 pr-3 ${kelasIsian}`}
        />
      </div>
      {children}
    </div>
  );
}

/** Saran yang mengisi input; ketuk lagi untuk mengosongkan. */
export function ChipSaran({ label, opsi, value, onChange }: { label: string; opsi: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {opsi.map((o) => {
        const aktif = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(aktif ? "" : o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export interface OpsiGaya {
  value: string;
  /** ilustrasi dari /public */
  gambar: string;
  judul: string;
  ket: string;
}

/** Kartu pilihan berilustrasi — sama seperti pilihan Di Kantor / Dinas Luar di halaman Absen. */
export function KartuGaya({ label, opsi, value, onChange }: { label: string; opsi: OpsiGaya[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2.5">
      {opsi.map((o) => {
        const aktif = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[72px] items-center gap-2.5 rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
              aktif ? "border-brand-masuk bg-brand-masuk/10" : "border-gray-200 bg-white"
            }`}
          >
            <img src={o.gambar} alt="" className="h-11 w-11 shrink-0 object-contain" />
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${aktif ? "text-brand-masuk" : "text-brand-text"}`}>{o.judul}</span>
              <span className="block text-[11px] leading-snug text-gray-500">{o.ket}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Pilihan bersebelahan bergaya tab di halaman Tugas. */
export function Segmen<T extends string | number>({
  label,
  opsi,
  value,
  onChange,
}: {
  label: string;
  opsi: { value: T; judul: string; ket?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1"
      style={{ gridTemplateColumns: `repeat(${opsi.length}, minmax(0, 1fr))` }}
    >
      {opsi.map((o) => {
        const aktif = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-1 transition ${aktif ? "bg-brand-masuk text-white" : "text-gray-600"}`}
          >
            <span className="text-sm font-semibold">{o.judul}</span>
            {o.ket && <span className={`text-[10px] ${aktif ? "text-white/80" : "text-gray-400"}`}>{o.ket}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Tombol & hasil ---------- */

/** Tombol utama, menempel di bawah layar selama form digulir. */
export function TombolBikin({
  onClick,
  siap,
  memuat,
  teks,
  teksBelumSiap,
}: {
  onClick: () => void;
  siap: boolean;
  memuat: boolean;
  teks: string;
  teksBelumSiap: string;
}) {
  return (
    <div className="sticky bottom-3 z-20">
      <button
        type="button"
        onClick={onClick}
        disabled={!siap || memuat}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-masuk px-4 text-sm font-semibold text-white shadow-md transition active:scale-[0.98] disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
      >
        {memuat ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            Sedang menulis…
          </>
        ) : siap ? (
          teks
        ) : (
          teksBelumSiap
        )}
      </button>
    </div>
  );
}

const PESAN_NASKAH = ["Membaca poin-poin kegiatan…", "Menyusun kronologi acara…", "Merangkai kalimat…", "Merapikan gaya bahasa…", "Hampir selesai…"];
const PESAN_PERTANYAAN = ["Memahami topik wawancara…", "Mencari sudut pandang menarik…", "Menyusun pertanyaan pembuka…", "Menajamkan pertanyaan lanjutan…", "Hampir selesai…"];

/** Saat AI menulis: ilustrasi, langkah yang sedang dikerjakan, dan bilah progres. */
export function SedangMenulis({ pesan = "naskah" }: { pesan?: "naskah" | "pertanyaan" }) {
  const daftar = pesan === "pertanyaan" ? PESAN_PERTANYAAN : PESAN_NASKAH;
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, daftar.length - 1)), 2600);
    return () => clearInterval(t);
  }, [daftar.length]);

  return (
    <div className="anim-buka flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm" aria-live="polite">
      <img src="/naskah-ai/naskah.png" alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-text">{daftar[i]}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-lnd-sky" aria-hidden="true">
          <div className="progres-naskah h-full rounded-full bg-brand-masuk" />
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Biasanya ±10 detik · RAFAEL AI</p>
      </div>
    </div>
  );
}

/** Tempat hasil sebelum ada hasil (kolom kanan di desktop). */
export function PratinjauKosong({ judul, ket }: { judul: string; ket: string }) {
  return (
    <div className="hidden flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 p-8 text-center lg:flex">
      <img src="/naskah-ai/naskah.png" alt="" className="h-20 w-20 rounded-full object-cover opacity-90" />
      <p className="text-sm font-semibold text-brand-text">{judul}</p>
      <p className="text-xs text-gray-500">{ket}</p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{children}</span>;
}

function useSalin() {
  const [disalin, setDisalin] = useState<string | null>(null);
  async function salin(teks: string, kunci: string) {
    try {
      await navigator.clipboard.writeText(teks);
      setDisalin(kunci);
      window.setTimeout(() => setDisalin((k) => (k === kunci ? null : k)), 1800);
    } catch {
      // clipboard bisa ditolak browser — teks masih bisa diseleksi manual
    }
  }
  return { disalin, salin };
}

/** Hasil AI: salin, bagikan, bikin ulang. Pertanyaan wawancara tampil bernomor, bisa disalin satu-satu. */
export function KartuHasil({
  hasil,
  label,
  memuat,
  onUlang,
}: {
  hasil: NaskahAi;
  label?: string;
  memuat: boolean;
  onUlang: () => void;
}) {
  const { disalin, salin } = useSalin();
  const pecah = hasil.tipe === "pertanyaan" ? pecahPertanyaan(hasil.hasil) : null;
  const bisaBagikan = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="anim-buka flex flex-col gap-3 rounded-2xl border-t-4 border-brand-masuk bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-brand-text">
          {hasil.tipe === "pertanyaan" ? (pecah ? `${pecah.daftar.length} pertanyaan siap dipakai` : "Pertanyaan siap dipakai") : "Naskah sudah jadi"}
        </h3>
        <div className="flex flex-wrap justify-end gap-1">
          {label && <Label>{label}</Label>}
          <Label>±{hitungKata(hasil.hasil)} kata</Label>
        </div>
      </div>

      {pecah ? (
        <div className="flex flex-col gap-2">
          {pecah.pembuka && <p className="text-xs text-gray-500">{pecah.pembuka}</p>}
          <ol className="flex flex-col divide-y divide-gray-100 rounded-xl bg-gray-50">
            {pecah.daftar.map((p, i) => (
              <li key={i} className="flex items-start gap-3 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-[11px] font-bold text-white">{i + 1}</span>
                <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-brand-text">{p}</p>
                <button
                  type="button"
                  onClick={() => void salin(p, `q${i}`)}
                  aria-label={`Salin pertanyaan ${i + 1}`}
                  className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-brand-masuk"
                >
                  {disalin === `q${i}` ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                </button>
              </li>
            ))}
          </ol>
          {pecah.penutup && <p className="text-xs text-gray-500">{pecah.penutup}</p>}
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3.5 text-sm leading-relaxed text-brand-text">{tanpaMarkdown(hasil.hasil)}</div>
      )}

      <p className="text-[11px] text-gray-400">Cek lagi fakta & ejaannya sebelum dipublikasikan.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void salin(hasil.hasil, "semua")}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand-masuk px-4 text-xs font-semibold text-white transition active:scale-95"
        >
          {disalin === "semua" ? <Check size={14} /> : <Copy size={14} />}
          {disalin === "semua" ? "Tersalin" : "Salin"}
        </button>
        {bisaBagikan && (
          <button
            type="button"
            onClick={() => void navigator.share({ title: hasil.nama_acara || "Naskah", text: hasil.hasil }).catch(() => {})}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-brand-text transition active:scale-95"
          >
            <Share2 size={14} /> Bagikan
          </button>
        )}
        <button
          type="button"
          onClick={onUlang}
          disabled={memuat}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-brand-text transition active:scale-95 disabled:opacity-50"
        >
          <RotateCcw size={14} /> Bikin ulang
        </button>
      </div>
    </div>
  );
}

/* ---------- Riwayat ---------- */

export type RiwayatBaris = NaskahAi & { profiles: { nama: string } | null };

/** Riwayat yang langsung tampil; sisanya lewat "Lihat semua". */
const RIWAYAT_AWAL = 5;

export function RiwayatList({
  riwayat,
  loading,
  error,
  superAdmin,
  onHapus,
  onPakai,
  kosongTeks,
}: {
  riwayat: RiwayatBaris[];
  loading: boolean;
  error: string | null;
  superAdmin: boolean;
  onHapus: () => void;
  /** isi ulang form dengan isian riwayat ini */
  onPakai: (r: RiwayatBaris) => void;
  kosongTeks: string;
}) {
  const [menghapusId, setMenghapusId] = useState<string | null>(null);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);
  const [semua, setSemua] = useState(false);
  const { disalin, salin } = useSalin();
  const tampil = semua ? riwayat : riwayat.slice(0, RIWAYAT_AWAL);

  async function hapus(id: string, judul: string) {
    if (!window.confirm(`Hapus riwayat "${judul}"? Tidak bisa dibatalkan.`)) return;
    setMenghapusId(id);
    setErrorHapus(null);
    try {
      await superAdminHapusNaskahAi(id);
      onHapus();
    } catch (e) {
      setErrorHapus(e instanceof Error ? e.message : "Gagal menghapus riwayat.");
    } finally {
      setMenghapusId(null);
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Riwayat">
      <h2 className="px-1 text-sm font-semibold text-brand-text">
        Riwayat {riwayat.length > 0 && <span className="font-normal text-gray-400">({riwayat.length})</span>}
      </h2>
      {error && <Galat>{error}</Galat>}
      {errorHapus && <Galat>{errorHapus}</Galat>}
      {loading ? (
        <Loading teks="Memuat riwayat..." />
      ) : riwayat.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">{kosongTeks}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tampil.map((r) => {
            const judul = judulRiwayat(r);
            return (
              <details key={r.id} className="group rounded-2xl bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 marker:content-none">
                  <img src="/naskah-ai/naskah.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-text">{judul}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {r.profiles?.nama && `${r.profiles.nama} · `}
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: localeId })}
                    </span>
                  </span>
                  <ChevronDown size={18} className="shrink-0 text-gray-400 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <p className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{tanpaMarkdown(r.hasil)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void salin(r.hasil, r.id)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-300 px-3 text-xs font-semibold text-brand-text"
                    >
                      {disalin === r.id ? <Check size={13} /> : <Copy size={13} />} {disalin === r.id ? "Tersalin" : "Salin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPakai(r)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-lnd-sky px-3 text-xs font-semibold text-brand-masuk"
                    >
                      <RotateCcw size={13} /> Pakai isiannya lagi
                    </button>
                    {superAdmin && (
                      <button
                        type="button"
                        onClick={() => void hapus(r.id, judul)}
                        disabled={menghapusId === r.id}
                        className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 disabled:opacity-60"
                      >
                        <Trash2 size={13} /> {menghapusId === r.id ? "Menghapus…" : "Hapus"}
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
          {riwayat.length > RIWAYAT_AWAL && (
            <button type="button" onClick={() => setSemua(!semua)} className="min-h-[40px] rounded-xl text-xs font-semibold text-brand-masuk">
              {semua ? "Tampilkan lebih sedikit" : `Lihat semua (${riwayat.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
