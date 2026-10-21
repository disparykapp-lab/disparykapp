import { useEffect, useState, type ReactNode } from "react";
import Loading from "../../components/Loading";
import { formatTanggal } from "../../lib/tanggal";
import { superAdminHapusNaskahAi } from "../../lib/naskahAi";
import type { NaskahAi } from "../../types/database";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-brand-text">{label}</span>
      {children}
    </label>
  );
}

const PESAN_NASKAH = [
  "Membaca poin-poin kegiatan...",
  "Menyusun kronologi acara...",
  "Merangkai kalimat...",
  "Menghaluskan gaya bahasa...",
  "Menyelesaikan naskah...",
];

const PESAN_PERTANYAAN = [
  "Memahami topik wawancara...",
  "Memikirkan sudut pandang menarik...",
  "Menyusun pertanyaan pembuka...",
  "Menajamkan pertanyaan lanjutan...",
  "Menyelesaikan daftar pertanyaan...",
];

/** Loading "ala AI" dengan maskot robot kecil (CSS saja, tanpa library animasi) —
 * sengaja sederhana (cuma kedip mata + antena berdenyut + goyang pelan) supaya
 * terasa hidup tanpa berlebihan. */
export function LoadingAi({ pesan = "naskah" }: { pesan?: "naskah" | "pertanyaan" }) {
  const daftar = pesan === "pertanyaan" ? PESAN_PERTANYAAN : PESAN_NASKAH;
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % daftar.length), 1700);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-6 text-center shadow-sm">
      <span className="robot-ai-wrap" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
          <line x1="32" y1="8" x2="32" y2="2" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
          <circle className="robot-ai-antena" cx="32" cy="2" r="3" fill="#a78bfa" />
          <rect x="12" y="10" width="40" height="34" rx="10" fill="#ede9fe" stroke="#a78bfa" strokeWidth="2" />
          <circle className="robot-ai-mata" cx="24" cy="26" r="3.5" fill="#7c3aed" />
          <circle className="robot-ai-mata" cx="40" cy="26" r="3.5" fill="#7c3aed" />
          <circle className="titik-ai" cx="26" cy="36" r="2" fill="#7c3aed" style={{ animationDelay: "0s" }} />
          <circle className="titik-ai" cx="32" cy="36" r="2" fill="#7c3aed" style={{ animationDelay: "0.15s" }} />
          <circle className="titik-ai" cx="38" cy="36" r="2" fill="#7c3aed" style={{ animationDelay: "0.3s" }} />
        </svg>
      </span>
      <p className="text-sm font-medium text-brand-text">{daftar[i]}</p>
      <p className="text-[11px] text-gray-400">✨ Powered by RAFAEL AI</p>
    </div>
  );
}

type RiwayatBaris = NaskahAi & { profiles: { nama: string } | null };

export function RiwayatList({
  riwayat,
  loading,
  error,
  superAdmin,
  onHapus,
  kosongTeks,
}: {
  riwayat: RiwayatBaris[];
  loading: boolean;
  error: string | null;
  superAdmin: boolean;
  onHapus: () => void;
  kosongTeks: string;
}) {
  const [menghapusId, setMenghapusId] = useState<string | null>(null);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-brand-text">Riwayat</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {errorHapus && <p className="text-sm text-red-600">{errorHapus}</p>}
      {loading ? (
        <Loading teks="Memuat riwayat..." />
      ) : (
        <div className="flex flex-col gap-2">
          {riwayat.map((r) => (
            <details key={r.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <summary className="flex cursor-pointer items-start justify-between gap-2">
                <span>
                  <strong className="text-brand-text">{r.nama_acara || r.jenis_acara || "Tanpa judul"}</strong>
                  {r.profiles?.nama && <span className="text-xs text-gray-400"> · oleh {r.profiles.nama}</span>}
                  <span className="block text-xs text-gray-400">{formatTanggal(r.created_at, "d MMM yyyy HH:mm")}</span>
                </span>
                {superAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      void hapus(r.id, r.nama_acara || r.jenis_acara || "Tanpa judul");
                    }}
                    disabled={menghapusId === r.id}
                    className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 disabled:opacity-60"
                  >
                    {menghapusId === r.id ? "..." : "Hapus"}
                  </button>
                )}
              </summary>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-xs text-gray-700">{r.hasil}</p>
            </details>
          ))}
          {riwayat.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">{kosongTeks}</p>
          )}
        </div>
      )}
    </div>
  );
}
