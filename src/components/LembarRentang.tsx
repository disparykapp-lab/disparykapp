import { useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import KalenderRentang from "./KalenderRentang";
import Lembar from "./Lembar";
import { useModal } from "../lib/useModal";
import { rentangAkhir, type PilihanRentang } from "../lib/izinAturan";
import { labelRentang } from "../lib/tinjauAbsenAturan";

/** Lembar pilih rentang tanggal (seperti kalender izin) + chip pilihan cepat. Dipakai Tinjau Absensi & Rekap admin. */
export default function LembarRentang({
  dari,
  sampai,
  hariIni,
  cepat,
  batas,
  maksHari,
  onTutup,
  onTerapkan,
}: {
  dari: string;
  sampai: string;
  hariIni: string;
  /** chip pilihan cepat */
  cepat: { id: string; label: string; dari: string; sampai: string }[];
  batas: (p: PilihanRentang) => { min: string; max: string };
  maksHari: number;
  onTutup: () => void;
  onTerapkan: (dari: string, sampai: string) => void;
}) {
  const idJudul = useId();
  const [pilihan, setPilihan] = useState<PilihanRentang>({ mulai: dari, selesai: sampai });
  // kalender dipasang ulang saat memilih chip, supaya bulannya ikut pindah
  const [kunci, setKunci] = useState(0);
  useModal(onTutup);

  const akhir = rentangAkhir(pilihan);
  const ringkas = akhir ? labelRentang(akhir.mulai, akhir.selesai, hariIni) : null;

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      judul={
        <>
          <CalendarDays size={20} className="text-brand-masuk" aria-hidden="true" /> Pilih tanggal
        </>
      }
    >
      <p className="-mt-1 text-xs text-gray-500">Ketuk tanggal awal lalu tanggal akhir. Paling panjang {maksHari} hari.</p>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]" role="group" aria-label="Pilihan cepat">
        {cepat.map((c) => {
          const r = { mulai: c.dari, selesai: c.sampai };
          const aktif = !!akhir && akhir.mulai === r.mulai && akhir.selesai === r.selesai;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={aktif}
              onClick={() => {
                setPilihan(r);
                setKunci((k) => k + 1);
              }}
              className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 text-brand-text"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <KalenderRentang
        key={kunci}
        pilihan={pilihan}
        onPilih={setPilihan}
        hariIni={hariIni}
        batas={batas}
        teks={{ grup: "Pilih tanggal absensi", mulai: "tanggal awal", selesai: "tanggal akhir", libur: "akhir pekan" }}
        legenda={<span>Sabtu–Minggu tampil pudar · lingkaran tipis = hari ini</span>}
      />

      {ringkas && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-sm font-bold text-brand-text">{ringkas.judul}</p>
          <p className="text-[11px] text-gray-500">
            {!pilihan.selesai ? "Sekarang ketuk tanggal akhir — atau langsung Tampilkan untuk satu hari." : ringkas.ket || "Satu hari"}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!akhir}
        onClick={() => akhir && onTerapkan(akhir.mulai, akhir.selesai)}
        className="min-h-[48px] rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
      >
        Tampilkan
      </button>
    </Lembar>
  );
}
