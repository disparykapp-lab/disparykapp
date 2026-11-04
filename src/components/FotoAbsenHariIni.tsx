import { useEffect, useRef, useState } from "react";
import { urlFotoAbsenSaya } from "../lib/absensi";
import { msSampaiBesokWIB } from "../lib/absensiMeta";
import type { Absensi } from "../types/database";

/**
 * Foto absen masuk/pulang milik sendiri di kartu "Status Hari Ini". Hanya
 * foto hari ini yang bisa dibuka (dijaga policy Storage, migrasi 0036); pukul
 * 00.00 WIB foto disembunyikan walau Beranda masih terbuka.
 */
export default function FotoAbsenHariIni({ absensi }: { absensi: Absensi }) {
  const masukPath = absensi.masuk_foto_path;
  const keluarPath = absensi.keluar_foto_path;
  // path → URL sementara; null = tidak bisa dibuka, belum ada kunci = masih memuat
  const [url, setUrl] = useState<Record<string, string | null>>({});
  const [lewatHari, setLewatHari] = useState(false);
  const [dibuka, setDibuka] = useState<{ url: string; judul: string } | null>(null);

  useEffect(() => {
    let aktif = true;
    for (const path of [masukPath, keluarPath]) {
      if (!path) continue;
      void urlFotoAbsenSaya(path).then((u) => {
        if (aktif) setUrl((m) => ({ ...m, [path]: u }));
      });
    }
    return () => {
      aktif = false;
    };
  }, [masukPath, keluarPath]);

  useEffect(() => {
    const t = setTimeout(() => setLewatHari(true), msSampaiBesokWIB());
    return () => clearTimeout(t);
  }, []);

  if (lewatHari || (!masukPath && !keluarPath)) return null;

  const daftar = [
    { judul: "Masuk", path: masukPath, at: absensi.masuk_at },
    { judul: "Pulang", path: keluarPath, at: absensi.keluar_at },
  ];

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 lg:mt-0 lg:w-64 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-sm font-semibold text-gray-500">Foto Absen Kamu</h3>
        <span className="text-[11px] text-gray-400">Hanya tampil hari ini</span>
      </div>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        {daftar.map((f) => {
          const judul = f.at ? `${f.judul} · ${formatJam(f.at)}` : f.judul;
          const u = f.path ? url[f.path] : null;
          return (
            <figure key={f.judul} className="flex flex-col gap-1">
              {f.path && u ? (
                <button
                  type="button"
                  onClick={() => setDibuka({ url: u, judul })}
                  className="overflow-hidden rounded-xl bg-gray-100 transition active:scale-95"
                  aria-label={`Perbesar foto absen ${f.judul.toLowerCase()}`}
                >
                  <img src={u} alt="" className="aspect-[3/4] w-full object-cover" />
                </button>
              ) : (
                <div
                  className={`flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-2 text-center text-xs text-gray-400 ${
                    f.path && u === undefined ? "animate-pulse" : ""
                  }`}
                >
                  {!f.path ? (f.at ? "Tanpa foto" : "Belum absen") : u === undefined ? "Memuat..." : "Foto tidak tersedia"}
                </div>
              )}
              <figcaption className="text-center text-xs font-medium text-gray-500">{judul}</figcaption>
            </figure>
          );
        })}
      </div>

      {dibuka && <LihatFoto {...dibuka} onTutup={() => setDibuka(null)} />}
    </div>
  );
}

function LihatFoto({ url, judul, onTutup }: { url: string; judul: string; onTutup: () => void }) {
  const tombolTutup = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    tombolTutup.current?.focus();
    const tekan = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [onTutup]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto absen ${judul}`}
      onClick={onTutup}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
    >
      <img
        src={url}
        alt={`Foto absen ${judul}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[78vh] max-w-full rounded-xl object-contain"
      />
      <p className="text-sm font-semibold text-white">{judul}</p>
      <button
        ref={tombolTutup}
        type="button"
        onClick={onTutup}
        className="min-h-[44px] rounded-xl bg-white px-6 text-sm font-semibold text-brand-text"
      >
        Tutup
      </button>
    </div>
  );
}

function formatJam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
