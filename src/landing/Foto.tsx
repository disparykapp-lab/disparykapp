import { useState } from "react";

/**
 * Foto dengan fallback gradien. Kalau `src` kosong atau gagal dimuat, yang tampil
 * adalah gradien berwarna (bukan abu-abu polos) sampai admin mengunggah foto.
 */
export default function Foto({
  src,
  alt,
  className = "",
  gradien = "linear-gradient(160deg,#f2b8c4 0%,#8e1e3c 100%)",
  lazy = true,
  prioritas = false,
}: {
  src: string;
  alt: string;
  className?: string;
  gradien?: string;
  lazy?: boolean;
  prioritas?: boolean;
}) {
  const [gagal, setGagal] = useState(false);
  const tampilGambar = src && !gagal;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: gradien }}>
      {tampilGambar && (
        <img
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          fetchPriority={prioritas ? "high" : "auto"}
          onError={() => setGagal(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
