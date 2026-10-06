import type { ReactNode } from "react";

/** Judul + subjudul section. `aksi` ditaruh di kanan (mis. tautan "Lihat Semua"). */
export default function SectionHeading({
  judul,
  subjudul,
  aksi,
  id,
}: {
  judul: string;
  subjudul?: string;
  aksi?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div>
        <h2 id={id} className="judul-section reveal-judul">
          {judul}
        </h2>
        {subjudul && <p className="mt-2 max-w-xl text-[15px] text-lnd-muted">{subjudul}</p>}
      </div>
      {aksi && <div className="shrink-0 pb-1">{aksi}</div>}
    </div>
  );
}
