import { useEffect, useRef, useState } from "react";
import { urlFotoAbsenSaya } from "../lib/absensi";
import { msSampaiBesokWIB } from "../lib/absensiMeta";
import type { Absensi } from "../types/database";

/**
 * Foto absen masuk/pulang milik sendiri (kotak kecil) di bagian bawah tiket "Status Hari Ini". Hanya
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
  ].filter((f) => f.path);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1" title="Foto absen hanya tampil hari ini">
      <div className="flex gap-2">
        {daftar.map((f) => {
          const judul = f.at ? `${f.judul} · ${formatJam(f.at)}` : f.judul;
          const u = url[f.path!];
          return (
            <figure key={f.judul} className="flex flex-col items-center gap-0.5">
              {u ? (
                <button
                  type="button"
                  onClick={() => setDibuka({ url: u, judul })}
                  className="h-14 w-14 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-2 ring-white transition active:scale-95"
                  aria-label={`Perbesar foto absen ${f.judul.toLowerCase()}`}
                >
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-1 text-center text-[9px] leading-tight text-gray-400 ${
                    u === undefined ? "animate-pulse" : ""
                  }`}
                >
                  {u === undefined ? "" : "Foto tidak tersedia"}
                </span>
              )}
              <figcaption className="text-[10px] font-medium text-gray-500">{f.judul}</figcaption>
            </figure>
          );
        })}
      </div>
      <span className="text-[9px] text-gray-400">foto hanya hari ini</span>

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
