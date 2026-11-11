import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet di HP, kotak di tengah di layar lebar — sama dengan modal izin. */
export function Lembar({
  idJudul,
  judul,
  onTutup,
  lebar = "max-w-md",
  children,
  kepala,
}: {
  idJudul: string;
  judul: ReactNode;
  onTutup: () => void;
  lebar?: string;
  children: ReactNode;
  /** isi tambahan di kanan judul (sebelum tombol tutup) */
  kepala?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full ${lebar} flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={idJudul} className="flex min-w-0 items-center gap-2 text-base font-bold text-brand-text">
            {judul}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            {kepala}
            <button type="button" onClick={onTutup} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
