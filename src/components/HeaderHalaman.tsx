import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

export default function HeaderHalaman({
  judul,
  kembaliKe = "/kelola",
  aksi,
}: {
  judul: string;
  kembaliKe?: string;
  aksi?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(kembaliKe)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm"
          aria-label="Kembali"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-brand-text">{judul}</h1>
      </div>
      {aksi}
    </header>
  );
}
