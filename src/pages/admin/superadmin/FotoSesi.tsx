import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, ImageOff, Trash2 } from "lucide-react";
import { urlFotoAbsenAdmin } from "../../../lib/absensi";
import { kompresGambar } from "../../../lib/unggah";

/** Foto satu sesi di form koreksi: yang sudah tersimpan, foto baru (belum diunggah), atau tidak ada. */
export type FotoKoreksi = { jenis: "lama"; path: string } | { jenis: "baru"; blob: Blob; url: string } | null;

const SISI_MAKS = 1280;
const TARGET_BYTE = 400_000;

/** Foto lama dimuat lewat signed URL (bucket privat). Di-key dengan path, jadi ganti foto = muat ulang. */
function FotoTersimpan({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let aktif = true;
    void urlFotoAbsenAdmin(path).then((u) => aktif && setUrl(u));
    return () => {
      aktif = false;
    };
  }, [path]);
  if (url === undefined) return <div className="aspect-[4/3] w-full animate-pulse bg-gray-100" />;
  if (url === null) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400">
        <ImageOff size={26} />
        <span className="text-xs">Foto tidak bisa dibuka</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className="aspect-[4/3] w-full object-cover" />;
}

/** Tambah/ganti/hapus foto masuk atau pulang — dari kamera atau galeri. Diunggah saat Simpan ditekan. */
export default function FotoSesi({
  label,
  foto,
  onUbah,
  nonaktif = false,
}: {
  /** "masuk" / "pulang" */
  label: string;
  foto: FotoKoreksi;
  onUbah: (f: FotoKoreksi) => void;
  nonaktif?: boolean;
}) {
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);
  const [menyiapkan, setMenyiapkan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function pilih(file: File | undefined) {
    if (!file) return;
    setGalat(null);
    if (!file.type.startsWith("image/")) {
      setGalat("File harus berupa foto.");
      return;
    }
    setMenyiapkan(true);
    try {
      const blob = await kompresGambar(file, SISI_MAKS, TARGET_BYTE);
      onUbah({ jenis: "baru", blob, url: URL.createObjectURL(blob) });
    } catch {
      setGalat("Foto ini tidak bisa dibaca. Coba foto lain (JPG atau PNG).");
    } finally {
      setMenyiapkan(false);
    }
  }

  const mati = nonaktif || menyiapkan;
  const alt = `Foto absen ${label}`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-brand-text">
        Foto {label} <span className="font-normal text-gray-400">(opsional)</span>
      </span>
      <input ref={kamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void pilih(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galeri} type="file" accept="image/*" className="hidden" onChange={(e) => { void pilih(e.target.files?.[0]); e.target.value = ""; }} />

      {foto ? (
        <div className="relative overflow-hidden rounded-2xl bg-gray-100">
          {foto.jenis === "baru" ? <img src={foto.url} alt={alt} className="aspect-[4/3] w-full object-cover" /> : <FotoTersimpan key={foto.path} path={foto.path} alt={alt} />}
          {foto.jenis === "baru" && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm">Belum disimpan</span>
          )}
          {menyiapkan && <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-brand-text">Menyiapkan foto…</div>}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => kamera.current?.click()}
              disabled={mati}
              aria-label={`Ambil ulang foto ${label} dengan kamera`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-brand-text shadow-sm transition active:scale-90 disabled:opacity-60"
            >
              <Camera size={16} />
            </button>
            <button
              type="button"
              onClick={() => galeri.current?.click()}
              disabled={mati}
              aria-label={`Ganti foto ${label} dari galeri`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-brand-text shadow-sm transition active:scale-90 disabled:opacity-60"
            >
              <ImageIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => onUbah(null)}
              disabled={mati}
              aria-label={`Hapus foto ${label}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm transition active:scale-90 disabled:opacity-60"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-masuk shadow-sm">
            <Camera size={22} />
          </span>
          <p className="text-xs text-gray-500">{menyiapkan ? "Menyiapkan foto…" : `Belum ada foto ${label}. Ambil langsung atau pilih dari galeri.`}</p>
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => kamera.current?.click()}
              disabled={mati}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand-masuk text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
            >
              <Camera size={16} /> Kamera
            </button>
            <button
              type="button"
              onClick={() => galeri.current?.click()}
              disabled={mati}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text transition active:scale-95 disabled:opacity-60"
            >
              <ImageIcon size={16} /> Galeri
            </button>
          </div>
        </div>
      )}
      {galat && <p role="alert" className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700">{galat}</p>}
    </div>
  );
}
