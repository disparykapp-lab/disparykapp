import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, ImageIcon, Share2 } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { buatGambarNaskah } from "../../lib/gambarNaskah";
import { namaBerkasNaskah } from "../../lib/kartuNaskah";
import { tanpaMarkdown } from "../../lib/naskahAiTeks";
import type { NaskahAi } from "../../types/database";

const TOMBOL_KEDUA =
  "flex min-h-[56px] flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-1 text-[11px] font-semibold leading-tight text-brand-text transition active:scale-95 disabled:opacity-50";

/** Pratinjau kartu gambar berwatermark + bagikan/unduh gambar, bagikan/salin teks. */
export default function LembarBagikan({ hasil, onTutup }: { hasil: NaskahAi; onTutup: () => void }) {
  useModal(onTutup);
  const [gambar, setGambar] = useState<{ blob: Blob; url: string } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
  const [disalin, setDisalin] = useState(false);

  const nama = namaBerkasNaskah(hasil);
  const judul = hasil.nama_acara?.trim() || (hasil.tipe === "pertanyaan" ? "Pertanyaan wawancara" : "Naskah");
  const teks = tanpaMarkdown(hasil.hasil);
  const bisaBagikan = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    let batal = false;
    let url: string | null = null;
    buatGambarNaskah(hasil)
      .then((blob) => {
        if (batal) return;
        url = URL.createObjectURL(blob);
        setGambar({ blob, url });
      })
      .catch((e: unknown) => {
        if (!batal) setGalat(e instanceof Error ? e.message : "Gambar gagal dibuat.");
      });
    return () => {
      batal = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasil]);

  function unduh() {
    if (!gambar) return;
    const a = document.createElement("a");
    a.href = gambar.url;
    a.download = nama;
    a.click();
  }

  async function bagikanGambar() {
    if (!gambar) return;
    const berkas = new File([gambar.blob], nama, { type: "image/png" });
    if (navigator.canShare?.({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: judul });
      } catch {
        // dibatalkan pengguna
      }
      return;
    }
    unduh();
    setKabar("Browser ini belum bisa membagikan gambar langsung, jadi gambarnya diunduh. Kirim dari galeri atau folder unduhan.");
  }

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setDisalin(true);
      window.setTimeout(() => setDisalin(false), 1800);
    } catch {
      setKabar("Teks tidak bisa disalin otomatis. Tekan lama teksnya untuk menyalin.");
    }
  }

  async function bagikanTeks() {
    try {
      await navigator.share({ title: judul, text: teks });
    } catch {
      // dibatalkan pengguna
    }
  }

  // Portal ke body: kartu hasil memakai animasi transform, yang membuat `fixed`
  // di dalamnya ikut tergulir bersama kartu (bukan melayang di atas layar).
  return createPortal(
    <Lembar idJudul="judul-bagikan-naskah" judul={<><Share2 size={18} className="text-brand-masuk" /> Bagikan hasil</>} onTutup={onTutup}>
      <div className="flex max-h-[48vh] min-h-[200px] items-center justify-center overflow-hidden rounded-xl bg-gray-100 p-2">
        {gambar ? (
          <img src={gambar.url} alt={`Pratinjau kartu ${judul} dengan watermark DisparYK`} className="max-h-[calc(48vh-1rem)] w-auto max-w-full rounded-lg object-contain shadow-sm" />
        ) : galat ? (
          <p role="alert" className="px-4 text-center text-sm text-red-700">{galat}</p>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500" aria-live="polite">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-masuk/30 border-t-brand-masuk" aria-hidden="true" />
            <span className="text-xs">Menyiapkan gambar…</span>
          </div>
        )}
      </div>
      <p className="-mt-1 text-center text-[11px] text-gray-400">Gambar diberi watermark logo &amp; label DisparYK.</p>

      <button
        type="button"
        onClick={() => void bagikanGambar()}
        disabled={!gambar}
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-masuk px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        <ImageIcon size={16} /> Bagikan gambar
      </button>
      <div className={`grid gap-2 ${bisaBagikan ? "grid-cols-3" : "grid-cols-2"}`}>
        <button type="button" onClick={unduh} disabled={!gambar} className={TOMBOL_KEDUA}>
          <Download size={16} /> Unduh
        </button>
        {bisaBagikan && (
          <button type="button" onClick={() => void bagikanTeks()} className={TOMBOL_KEDUA}>
            <Share2 size={16} /> Bagikan teks
          </button>
        )}
        <button type="button" onClick={() => void salin()} className={TOMBOL_KEDUA}>
          {disalin ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} {disalin ? "Tersalin" : "Salin teks"}
        </button>
      </div>
      {kabar && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          {kabar}
        </p>
      )}
    </Lembar>,
    document.body
  );
}
