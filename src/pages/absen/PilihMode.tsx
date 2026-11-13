import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { CekLokasi, ModeAbsen } from "../../lib/absenAturan";
import type { Posisi } from "../../lib/geolocation";

/** Dua kartu berstiker: Di Kantor / Dinas Luar. */
export default function PilihMode({
  mode,
  onPilih,
  posisi,
  cek,
}: {
  mode: ModeAbsen;
  onPilih: (m: ModeAbsen) => void;
  posisi: Posisi | null;
  cek: CekLokasi;
}) {
  const subKantor = !posisi ? (
    <span className="text-gray-400">Menunggu lokasi…</span>
  ) : cek.dalamRadius === true ? (
    <span className="font-semibold text-green-700">Kamu di area kantor</span>
  ) : cek.dalamRadius === false ? (
    <span className="font-semibold text-brand-pulang">Di luar radius</span>
  ) : (
    <span className="text-gray-500">Absen dari kantor</span>
  );
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Kamu sedang di mana?">
      <Kartu aktif={mode === "kantor"} onKlik={() => onPilih("kantor")} gambar="/icon_absen_dikantor.png" judul="Di Kantor" sub={subKantor} />
      <Kartu
        aktif={mode === "luar"}
        onKlik={() => onPilih("luar")}
        gambar="/icon_absen_dinas.png"
        judul="Dinas Luar"
        sub={<span className="text-gray-500">Tugas di luar kantor</span>}
      />
    </div>
  );
}

function Kartu({ aktif, onKlik, gambar, judul, sub }: { aktif: boolean; onKlik: () => void; gambar: string; judul: string; sub: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktif}
      onClick={onKlik}
      className={`relative flex min-w-0 flex-col items-start gap-1 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-2 transition active:scale-[0.98] ${
        aktif ? "ring-brand-masuk" : "ring-transparent"
      }`}
    >
      <span
        className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full transition ${
          aktif ? "bg-brand-masuk text-white" : "border-2 border-gray-200"
        }`}
        aria-hidden="true"
      >
        {aktif && <Check size={13} strokeWidth={3} />}
      </span>
      <img src={gambar} alt="" className={`h-12 w-12 object-contain transition ${aktif ? "" : "opacity-70 grayscale-[40%]"}`} />
      <span className="mt-1 font-bold text-brand-text">{judul}</span>
      <span className="text-[11px] leading-tight">{sub}</span>
    </button>
  );
}
