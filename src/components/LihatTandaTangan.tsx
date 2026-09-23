import { useEffect, useState } from "react";
import { ambilUrlTandaTangan } from "../lib/undangan";

/**
 * Thumbnail gambar tanda tangan (bucket privat `tanda_tangan`) — dipakai
 * baik di sisi petugas (lihat tanda tangan yang sudah dia ambil) maupun
 * admin (lihat progres bukti penerimaan). Tekan buat perbesar di tab baru.
 */
export default function LihatTandaTangan({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void ambilUrlTandaTangan(path).then((u) => {
      if (mounted) setUrl(u);
    });
    return () => {
      mounted = false;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-400">
        Memuat...
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" title="Lihat ukuran penuh">
      <img
        src={url}
        alt="Tanda tangan penerima"
        className="h-20 w-32 rounded-lg border border-gray-200 bg-white object-contain"
      />
    </a>
  );
}
