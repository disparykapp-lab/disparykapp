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
    <header className="gradasi-brand -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 rounded-b-3xl px-4 pb-4 pt-5 text-white shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(kembaliKe)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-brand-masuk shadow-sm"
          aria-label="Kembali"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">{judul}</h1>
      </div>
      {aksi}
    </header>
  );
}
