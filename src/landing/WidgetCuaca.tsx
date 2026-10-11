import { useEffect, useState } from "react";
import { ambilCuaca, type DataCuaca } from "./cuaca";

/**
 * Prakiraan cuaca singkat dari BMKG untuk satu destinasi. Tidak tampil sama sekali
 * kalau admin belum mengisi kode wilayahnya, atau kalau BMKG gagal dihubungi —
 * cukup disembunyikan, tidak menampilkan pesan galat ke pengunjung.
 */
export default function WidgetCuaca({ kodeWilayah }: { kodeWilayah?: string }) {
  const [data, setData] = useState<DataCuaca | null>(null);
  const [status, setStatus] = useState<"memuat" | "siap" | "gagal">("memuat");

  useEffect(() => {
    if (!kodeWilayah) {
      setStatus("gagal");
      return;
    }
    let batal = false;
    setStatus("memuat");
    ambilCuaca(kodeWilayah).then((d) => {
      if (batal) return;
      if (d) {
        setData(d);
        setStatus("siap");
      } else {
        setStatus("gagal");
      }
    });
    return () => {
      batal = true;
    };
  }, [kodeWilayah]);

  if (!kodeWilayah || status === "gagal") return null;

  if (status === "memuat") {
    return <div className="mt-5 h-[148px] animate-pulse rounded-lnd bg-white/60" aria-hidden="true" />;
  }
  if (!data) return null;

  return (
    <div className="mt-5 border-t border-lnd-sky-100 pt-5">
      <p className="label-kecil">Cuaca</p>
      {data.sekarang && (
        <div className="mt-2 flex items-center gap-3">
          <img src={data.sekarang.ikon} alt="" className="h-11 w-11 shrink-0" loading="lazy" />
          <div className="min-w-0">
            <p className="text-[22px] font-bold leading-tight text-lnd-navy">{Math.round(data.sekarang.suhu)}°C</p>
            <p className="truncate text-[13px] text-lnd-muted">{data.sekarang.kondisi}</p>
          </div>
        </div>
      )}
      {data.perHari.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {data.perHari.map((h) => (
            <li key={h.tanggal} className="rounded-lg bg-white p-2 text-center">
              <p className="truncate text-[11px] font-semibold text-lnd-navy">{h.label}</p>
              <img src={h.ikon} alt={h.kondisi} className="mx-auto my-1 h-7 w-7" loading="lazy" />
              <p className="text-[11px] text-lnd-muted">
                {Math.round(h.suhuMin)}°–{Math.round(h.suhuMaks)}°
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] text-lnd-muted">Sumber: BMKG</p>
    </div>
  );
}
