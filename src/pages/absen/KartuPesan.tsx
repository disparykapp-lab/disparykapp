import type { ReactNode } from "react";

/** Kartu pesan di tengah halaman (sudah absen, belum masuk, atau gagal) + tombol aksi. */
export default function KartuPesan({ gambar, judul, children, aksi }: { gambar: ReactNode; judul: string; children: ReactNode; aksi: ReactNode }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
      {gambar}
      <h2 className="text-lg font-bold text-brand-text">{judul}</h2>
      <div className="max-w-xs text-sm text-gray-600">{children}</div>
      <div className="mt-2 flex w-full flex-wrap gap-3">{aksi}</div>
    </section>
  );
}
