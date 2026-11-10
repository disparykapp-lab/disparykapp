import { useEffect, useRef, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { ambilIsiLampiran } from "../lib/tugas";

/**
 * Jendela pratinjau .docx di dalam aplikasi — supaya lampiran Word bisa dibaca
 * di HP yang tidak punya aplikasi Word/Docs. Isi file diambil lewat sesi login,
 * diubah jadi HTML sederhana (lib/docx, dimuat saat dibutuhkan saja).
 */
export default function PratinjauDocx({ path, nama, onUnduh, onTutup }: { path: string; nama: string; onUnduh: () => void; onTutup: () => void }) {
  const wadah = useRef<HTMLDivElement>(null);
  const tombolTutup = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"memuat" | "siap" | "gagal">("memuat");
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let batal = false;
    let lepas = () => {};
    (async () => {
      try {
        if (typeof DecompressionStream === "undefined") throw new Error("Browser ini belum bisa menampilkan dokumen. Pakai tombol Unduh.");
        const [isi, { docxKeElemen }] = await Promise.all([ambilIsiLampiran(path), import("../lib/docx")]);
        const hasil = await docxKeElemen(isi);
        if (batal) return hasil.tutup();
        lepas = hasil.tutup;
        wadah.current?.replaceChildren(hasil.elemen);
        setStatus("siap");
      } catch (e) {
        if (batal) return;
        setGalat(e instanceof Error ? e.message : "Dokumen tidak bisa dibuka.");
        setStatus("gagal");
      }
    })();
    return () => {
      batal = true;
      lepas();
    };
  }, [path]);

  useEffect(() => {
    tombolTutup.current?.focus();
    const tekan = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [onTutup]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Pratinjau ${nama}`} onClick={onTutup} className="fixed inset-0 z-50 flex bg-black/70 p-2 sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center gap-2 border-b border-gray-100 p-3">
          <FileText className="h-5 w-5 shrink-0 text-brand-masuk" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-text">{nama}</p>
          <button type="button" onClick={onUnduh} className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-brand-text">
            <Download className="h-4 w-4" aria-hidden="true" />
            Unduh
          </button>
          <button
            ref={tombolTutup}
            type="button"
            onClick={onTutup}
            aria-label="Tutup pratinjau"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8">
          {status === "memuat" && <p className="animate-pulse text-sm text-gray-400">Membuka dokumen…</p>}
          {status === "gagal" && (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <p>{galat}</p>
              <button type="button" onClick={onUnduh} className="rounded-lg bg-brand-masuk px-4 py-2 text-xs font-semibold text-white">
                Unduh file aslinya
              </button>
            </div>
          )}
          <div ref={wadah} className="pratinjau-docx" />
        </div>
        {status === "siap" && (
          <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
            Tampilan sederhana — tata letak bisa sedikit berbeda dari Word. Unduh untuk file aslinya.
          </p>
        )}
      </div>
    </div>
  );
}
