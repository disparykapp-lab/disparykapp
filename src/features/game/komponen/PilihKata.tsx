import { useState } from "react";
import { ASET } from "../assets";

/** Layar pilih kata: penggambar melihat 3 kartu; pemain lain melihat "X sedang memilih kata…". */
export function PilihKata({
  pilihan,
  sisa,
  onPilih,
}: {
  pilihan: string[];
  sisa: number;
  onPilih: (indeks: number) => void;
}) {
  const [dipilih, setDipilih] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-3 p-4 text-center">
      <img src={ASET.maskot.melukis} alt="" className="ct-napas h-24 w-auto" />
      <p className="ct-judul text-xl text-[var(--ct-indigo)]">Pilih kata untuk digambar</p>
      <p className="text-sm text-slate-500">Dipilihkan acak dalam {Math.ceil(sisa)} detik</p>
      <div className="ct-kartu-kata grid w-full gap-2 sm:grid-cols-3">
        {pilihan.map((kata, i) => (
          <button
            key={kata}
            type="button"
            disabled={dipilih !== null}
            onClick={() => {
              setDipilih(i);
              onPilih(i + 1);
            }}
            className={`rounded-2xl border-[3px] border-[var(--ct-tinta)] bg-white px-3 py-4 text-lg font-bold uppercase tracking-wide shadow-[0_4px_0_rgba(27,31,59,0.25)] transition ${
              dipilih === i ? "scale-105 bg-[var(--ct-emas)]" : dipilih !== null ? "opacity-40" : "active:translate-y-1"
            }`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {kata}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenungguPilih({ nama }: { nama: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <img src={ASET.wajah.pikir} alt="" className="ct-napas h-24 w-auto" />
      <p className="ct-judul text-lg">
        <span className="text-[var(--ct-biru)]">{nama}</span> sedang memilih kata…
      </p>
      <p className="text-sm text-slate-500">Siap-siap menebak!</p>
    </div>
  );
}
