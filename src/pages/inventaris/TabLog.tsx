import { useCallback, useEffect, useState } from "react";
import { ambilLog, type LogDenganPelaku, type SaringanLog } from "../../lib/inventaris";
import { jamWIB, kalimatLog, kelompokPerTanggal, tanggalLog } from "../../lib/inventarisAturan";
import { Avatar } from "./bersama";
import { GAYA_NADA, KELAS_BARIS_CHIP, kelasChip } from "./gaya";

const SARINGAN: { id: SaringanLog; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "keluar", label: "Keluar" },
  { id: "masuk", label: "Masuk" },
  { id: "barang", label: "Data barang" },
];
const PER_HALAMAN = 40;

/** Log CRUD inventaris: siapa melakukan apa, kapan — dikelompokkan per hari. */
export default function TabLog({ hariIni, versi, onBuka }: { hariIni: string; versi: number; onBuka: (log: LogDenganPelaku) => void }) {
  const [saringan, setSaringan] = useState<SaringanLog>("semua");
  const [list, setList] = useState<LogDenganPelaku[] | null>(null);
  const [habis, setHabis] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(
    async (lanjut: LogDenganPelaku[] | null) => {
      setMemuat(true);
      setGalat(null);
      try {
        const sebelumId = lanjut?.length ? lanjut[lanjut.length - 1].id : undefined;
        const baru = await ambilLog({ saringan, sebelumId, batas: PER_HALAMAN });
        setList([...(lanjut ?? []), ...baru]);
        setHabis(baru.length < PER_HALAMAN);
      } catch (e) {
        setGalat(e instanceof Error ? e.message : "Log gagal dimuat.");
        if (!lanjut) setList([]);
      } finally {
        setMemuat(false);
      }
    },
    [saringan]
  );

  useEffect(() => {
    void muat(null);
  }, [muat, versi]);

  const grup = list ? kelompokPerTanggal(list, tanggalLog, hariIni) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className={KELAS_BARIS_CHIP} role="group" aria-label="Saring log">
        {SARINGAN.map((s) => (
          <button key={s.id} type="button" aria-pressed={saringan === s.id} onClick={() => {
              if (s.id === saringan) return;
              setList(null);
              setSaringan(s.id);
            }} className={kelasChip(saringan === s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {galat && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{galat}</p>}

      {!list && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {list?.length === 0 && !galat && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
          <img src="/icon_inventaris.png" alt="" className="h-20 w-20 rounded-full object-cover opacity-80" />
          <p className="text-sm font-semibold text-brand-text">Belum ada aktivitas</p>
          <p className="text-xs text-gray-500">Setiap barang ditambah, diubah, dihapus, masuk, atau keluar akan tercatat di sini.</p>
        </div>
      )}

      {grup.map((g) => (
        <section key={g.tanggal} aria-label={g.label} className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.label}</h3>
          <div className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm">
            {g.isi.map((l) => {
              const k = kalimatLog(l);
              const G = GAYA_NADA[k.nada];
              return (
                <button key={l.id} type="button" onClick={() => onBuka(l)} className="flex items-start gap-3 p-3 text-left transition hover:bg-gray-50 active:bg-gray-50">
                  <span className="relative mt-0.5 shrink-0">
                    <Avatar pelaku={l.pelaku} ukuran="h-9 w-9 text-xs" />
                    <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${G.latar} ${G.teks}`}>
                      <G.ikon size={11} strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-brand-text">
                      <b>{l.pelaku?.nama ?? "Seseorang"}</b> {k.kata} {k.jumlah && <b className={G.teks}>{k.jumlah}</b>} <b>{k.barang}</b>
                    </span>
                    {k.detail && <span className="mt-0.5 block truncate text-xs text-gray-500">{k.detail}</span>}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">{jamWIB(l.dibuat_at)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {list && list.length > 0 && !habis && (
        <button
          type="button"
          onClick={() => void muat(list)}
          disabled={memuat}
          className="min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text disabled:opacity-60"
        >
          {memuat ? "Memuat…" : "Muat yang lebih lama"}
        </button>
      )}
    </div>
  );
}
