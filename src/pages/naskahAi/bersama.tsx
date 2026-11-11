import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, ChevronDown, Copy, History, RotateCcw, Share2, Sparkles, Trash2, WandSparkles } from "lucide-react";
import Loading from "../../components/Loading";
import { superAdminHapusNaskahAi } from "../../lib/naskahAi";
import { hitungKata, hitungPoin, judulRiwayat, pecahPertanyaan, tambahPoin, tanpaMarkdown } from "../../lib/naskahAiTeks";
import type { NaskahAi } from "../../types/database";

// Komponen "studio" Naskah AI yang dipakai mode Naskah & Wawancara: langkah bernomor,
// kotak cerita besar, kartu pilihan, tombol bikin, kartu hasil, dan riwayat.

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
    <section className="rounded-3xl bg-white p-4 shadow-[0_12px_32px_-20px_rgba(31,41,55,0.45)] ring-1 ring-black/[0.04]">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff6a88] to-[#8b5cf6] text-sm font-black text-white shadow-sm">
          {no}
        </span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold tracking-tight text-brand-text">
            {judul}
            {opsional && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">opsional</span>}
          </h2>
          {ket && <p className="text-xs text-gray-500">{ket}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function SubJudul({ children }: { children: ReactNode }) {
  return <p className="-mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{children}</p>;
}

export function Tips({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{children}</p>;
}

export function Galat({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="muncul-ai rounded-2xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
      😵 {children}
    </p>
  );
}

/* ---------- Isian ---------- */

/** Kotak cerita besar + chip cepat yang menambah poin "- …" di baris baru. */
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
        className="min-h-[150px] w-full resize-y rounded-2xl bg-linear-to-br from-violet-50 via-white to-pink-50 p-3.5 text-[15px] leading-relaxed text-brand-text outline-none ring-1 ring-violet-100 transition placeholder:text-gray-400 focus:ring-2 focus:ring-violet-400"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {saran.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => tambah(s)}
            className="rounded-full bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100 transition hover:bg-violet-100 active:scale-95"
          >
            ＋ {s}
          </button>
        ))}
        <span className="ml-auto text-[11px] font-medium text-gray-400" aria-live="polite">
          {hitungPoin(value)} poin · {hitungKata(value)} kata
        </span>
      </div>
    </div>
  );
}

/** Input berikon dengan latar lembut (bukan kotak bergaris ala formulir). */
export function InputIkon({
  ikon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  children,
}: {
  ikon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  /** saran di bawah input (mis. ChipSaran) */
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-400">
        <span aria-hidden="true" className="text-base">
          {ikon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[44px] w-full min-w-0 bg-transparent text-sm text-brand-text outline-none placeholder:text-gray-400"
        />
      </div>
      {children}
    </div>
  );
}

/** Chip saran yang mengisi input; ketuk lagi untuk mengosongkan. */
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
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              aktif ? "bg-brand-text text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export interface OpsiVibe {
  value: string;
  emoji: string;
  judul: string;
  ket: string;
}

/** Kartu pilihan gaya (pengganti dropdown). */
export function KartuVibe({ label, opsi, value, onChange }: { label: string; opsi: OpsiVibe[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {opsi.map((o) => {
        const aktif = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(o.value)}
            className={`relative flex flex-col items-start gap-0.5 rounded-2xl p-3 text-left transition active:scale-[0.97] ${
              aktif
                ? "bg-linear-to-br from-[#2a1140] via-[#4a1748] to-[#8e1e3c] text-white shadow-lg shadow-violet-500/25"
                : "bg-gray-50 text-brand-text ring-1 ring-gray-100 hover:bg-gray-100"
            }`}
          >
            <span className="mb-1 text-2xl" aria-hidden="true">
              {o.emoji}
            </span>
            <span className="text-sm font-extrabold tracking-tight">{o.judul}</span>
            <span className={`text-[11px] leading-snug ${aktif ? "text-white/70" : "text-gray-500"}`}>{o.ket}</span>
            {aktif && (
              <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-masuk" aria-hidden="true">
                <Check size={12} strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pilihan bersebelahan (panjang naskah, jumlah pertanyaan). */
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
    <div role="group" aria-label={label} className="grid gap-1 rounded-2xl bg-gray-100 p-1" style={{ gridTemplateColumns: `repeat(${opsi.length}, minmax(0, 1fr))` }}>
      {opsi.map((o) => {
        const aktif = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-1.5 transition ${aktif ? "bg-white text-brand-text shadow-sm" : "text-gray-500 hover:text-brand-text"}`}
          >
            <span className="text-sm font-extrabold">{o.judul}</span>
            {o.ket && <span className="text-[10px] font-medium text-gray-400">{o.ket}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Tombol & hasil ---------- */

/** Tombol utama yang menempel di bawah layar selama form digulir. */
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
        className={`tombol-ai flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold tracking-tight text-white transition active:scale-[0.98] ${siap ? "" : "tombol-ai-mati"}`}
      >
        {memuat ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            Lagi diracik AI…
          </>
        ) : siap ? (
          <>
            <Sparkles size={18} aria-hidden="true" /> {teks}
          </>
        ) : (
          teksBelumSiap
        )}
      </button>
    </div>
  );
}

const PESAN_NASKAH = [
  "Membaca poin-poin kegiatan…",
  "Menyusun kronologi acara…",
  "Merangkai kalimat…",
  "Menghaluskan gaya bahasa…",
  "Sentuhan terakhir…",
];

const PESAN_PERTANYAAN = [
  "Memahami topik wawancara…",
  "Mencari sudut pandang menarik…",
  "Menyusun pertanyaan pembuka…",
  "Menajamkan pertanyaan lanjutan…",
  "Sentuhan terakhir…",
];

/** Kartu "AI lagi mikir": maskot robot, pesan bergantian, dan baris kerangka berkilau. */
export function LoadingAi({ pesan = "naskah" }: { pesan?: "naskah" | "pertanyaan" }) {
  const daftar = pesan === "pertanyaan" ? PESAN_PERTANYAAN : PESAN_NASKAH;
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % daftar.length), 1700);
    return () => clearInterval(t);
  }, [daftar.length]);

  return (
    <div className="naskah-hero muncul-ai flex flex-col items-center gap-3 rounded-3xl p-6 text-center text-white" aria-live="polite">
      <span className="naskah-blob" style={{ width: 180, height: 180, left: -60, top: -70, background: "#c0334f" }} aria-hidden="true" />
      <span className="naskah-blob" style={{ width: 200, height: 200, right: -80, bottom: -90, background: "#7c3aed", animationDelay: "-5s" }} aria-hidden="true" />
      <span className="robot-ai-wrap" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <line x1="32" y1="8" x2="32" y2="2" stroke="#f0abfc" strokeWidth="2" strokeLinecap="round" />
          <circle className="robot-ai-antena" cx="32" cy="2" r="3" fill="#f0abfc" />
          <rect x="12" y="10" width="40" height="34" rx="10" fill="rgba(255,255,255,0.12)" stroke="#f0abfc" strokeWidth="2" />
          <circle className="robot-ai-mata" cx="24" cy="26" r="3.5" fill="#fff" />
          <circle className="robot-ai-mata" cx="40" cy="26" r="3.5" fill="#fff" />
          <circle className="titik-ai" cx="26" cy="36" r="2" fill="#f0abfc" style={{ animationDelay: "0s" }} />
          <circle className="titik-ai" cx="32" cy="36" r="2" fill="#f0abfc" style={{ animationDelay: "0.15s" }} />
          <circle className="titik-ai" cx="38" cy="36" r="2" fill="#f0abfc" style={{ animationDelay: "0.3s" }} />
        </svg>
      </span>
      <p className="text-sm font-bold">{daftar[i]}</p>
      <div className="flex w-full max-w-xs flex-col gap-2" aria-hidden="true">
        {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((w) => (
          <span key={w} className={`h-2.5 animate-pulse rounded-full bg-white/15 ${w}`} />
        ))}
      </div>
      <p className="text-[11px] text-white/50">✨ Powered by RAFAEL AI</p>
    </div>
  );
}

/** Tempat hasil sebelum ada hasil (desktop, kolom kanan). */
export function PratinjauKosong({ judul, ket }: { judul: string; ket: string }) {
  return (
    <div className="hidden flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-violet-200 bg-linear-to-br from-violet-50/70 to-pink-50/70 p-8 text-center lg:flex">
      <span className="stiker-ai flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">
        <WandSparkles className="text-violet-500" size={26} />
      </span>
      <p className="text-sm font-extrabold text-brand-text">{judul}</p>
      <p className="text-xs text-gray-500">{ket}</p>
    </div>
  );
}

function Pil({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{children}</span>;
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

/** Hasil AI dalam bingkai gradasi: salin, bagikan, bikin ulang. Pertanyaan tampil per kartu. */
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
    <div className="bingkai-ai muncul-ai">
      <div className="flex flex-col gap-3 rounded-[1.65rem] bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">✨ Udah jadi!</p>
            <h3 className="text-lg font-black tracking-tight text-brand-text">
              {hasil.tipe === "pertanyaan" ? (pecah ? `${pecah.daftar.length} pertanyaan siap` : "Pertanyaan siap") : "Naskah kamu"}
            </h3>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {label && <Pil>{label}</Pil>}
            <Pil>±{hitungKata(hasil.hasil)} kata</Pil>
          </div>
        </div>

        {pecah ? (
          <div className="flex flex-col gap-2">
            {pecah.pembuka && <p className="text-xs text-gray-500">{pecah.pembuka}</p>}
            <ol className="flex flex-col gap-2">
              {pecah.daftar.map((p, i) => (
                <li key={i} className="muncul-ai flex items-start gap-3 rounded-2xl bg-gray-50 p-3" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff6a88] to-[#8b5cf6] text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-brand-text">{p}</p>
                  <button
                    type="button"
                    onClick={() => void salin(p, `q${i}`)}
                    aria-label={`Salin pertanyaan ${i + 1}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-violet-600"
                  >
                    {disalin === `q${i}` ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                  </button>
                </li>
              ))}
            </ol>
            {pecah.penutup && <p className="text-xs text-gray-500">{pecah.penutup}</p>}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words rounded-2xl bg-linear-to-br from-gray-50 to-violet-50/50 p-4 text-[15px] leading-relaxed text-brand-text">
            {tanpaMarkdown(hasil.hasil)}
          </div>
        )}

        <p className="text-[11px] text-gray-400">👀 Cek lagi faktanya sebelum dipublikasikan ya.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void salin(hasil.hasil, "semua")}
            className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand-text px-4 text-xs font-bold text-white transition active:scale-95"
          >
            {disalin === "semua" ? <Check size={14} /> : <Copy size={14} />}
            {disalin === "semua" ? "Tersalin!" : "Salin semua"}
          </button>
          {bisaBagikan && (
            <button
              type="button"
              onClick={() => void navigator.share({ title: hasil.nama_acara || "Naskah AI", text: hasil.hasil }).catch(() => {})}
              className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-gray-100 px-4 text-xs font-bold text-brand-text transition active:scale-95"
            >
              <Share2 size={14} /> Bagikan
            </button>
          )}
          <button
            type="button"
            onClick={onUlang}
            disabled={memuat}
            className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-xs font-bold text-violet-700 ring-1 ring-violet-200 transition active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={14} /> Bikin ulang
          </button>
        </div>
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
      <h2 className="flex items-center gap-2 px-1 text-sm font-extrabold tracking-tight text-brand-text">
        <History size={16} className="text-violet-500" aria-hidden="true" /> Riwayat
        {riwayat.length > 0 && <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-bold text-gray-600">{riwayat.length}</span>}
      </h2>
      {error && <Galat>{error}</Galat>}
      {errorHapus && <Galat>{errorHapus}</Galat>}
      {loading ? (
        <Loading teks="Memuat riwayat..." />
      ) : riwayat.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">🪄 {kosongTeks}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tampil.map((r) => {
            const judul = judulRiwayat(r);
            return (
              <details key={r.id} className="group rounded-2xl bg-white shadow-[0_8px_24px_-18px_rgba(31,41,55,0.5)] ring-1 ring-black/[0.04] open:ring-violet-200">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 marker:content-none">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-100 to-pink-100 text-lg" aria-hidden="true">
                    {r.tipe === "pertanyaan" ? "🎤" : "📝"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-brand-text">{judul}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {r.profiles?.nama && `${r.profiles.nama} · `}
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: localeId })}
                    </span>
                    <span className="block truncate text-xs text-gray-500 group-open:hidden">{tanpaMarkdown(r.hasil)}</span>
                  </span>
                  <ChevronDown size={18} className="shrink-0 text-gray-400 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <p className="whitespace-pre-wrap break-words rounded-2xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{tanpaMarkdown(r.hasil)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void salin(r.hasil, r.id)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-brand-text"
                    >
                      {disalin === r.id ? <Check size={13} /> : <Copy size={13} />} {disalin === r.id ? "Tersalin!" : "Salin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPakai(r)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-violet-50 px-3 text-xs font-bold text-violet-700"
                    >
                      <RotateCcw size={13} /> Pakai isiannya lagi
                    </button>
                    {superAdmin && (
                      <button
                        type="button"
                        onClick={() => void hapus(r.id, judul)}
                        disabled={menghapusId === r.id}
                        className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-bold text-red-600 ring-1 ring-red-200 disabled:opacity-60"
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
            <button
              type="button"
              onClick={() => setSemua(!semua)}
              className="min-h-[40px] rounded-full text-xs font-bold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-50"
            >
              {semua ? "Tampilkan lebih sedikit" : `Lihat semua (${riwayat.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
