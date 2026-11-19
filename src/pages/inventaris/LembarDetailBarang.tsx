import { useEffect, useId, useState } from "react";
import { CheckCircle2, History, Pencil, Trash2 } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { ambilRiwayatBarang, hapusBarang, type MutasiDenganPencatat } from "../../lib/inventaris";
import { formatAngka, kelompokPerTanggal, saldoSetelah, statusStok } from "../../lib/inventarisAturan";
import type { BarangInventaris, JenisMutasi } from "../../types/database";
import { Avatar, FotoBarang, LencanaStok } from "./bersama";
import { GAYA_JENIS } from "./gaya";

const BATAS_RIWAYAT = 200;

/** Detail satu barang: foto, stok, tombol Masuk/Keluar, dan riwayat keluar-masuknya. */
export default function LembarDetailBarang({
  barang,
  hariIni,
  pesan,
  onTutup,
  onCatat,
  onBukaCatatan,
  onUbah,
  onDihapus,
}: {
  barang: BarangInventaris;
  hariIni: string;
  /** kabar singkat setelah menyimpan (mis. "Tercatat: keluar 20 pcs") */
  pesan: string | null;
  onTutup: () => void;
  onCatat: (jenis: JenisMutasi) => void;
  onBukaCatatan: (m: MutasiDenganPencatat) => void;
  onUbah: () => void;
  onDihapus: () => void;
}) {
  useModal(onTutup);
  const id = useId();
  const [riwayat, setRiwayat] = useState<MutasiDenganPencatat[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [yakinHapus, setYakinHapus] = useState(false);
  const [menghapus, setMenghapus] = useState(false);

  useEffect(() => {
    let batal = false;
    ambilRiwayatBarang(barang.id, BATAS_RIWAYAT)
      .then((d) => !batal && setRiwayat(d))
      .catch((e: unknown) => !batal && setGalat(e instanceof Error ? e.message : "Riwayat gagal dimuat."));
    return () => {
      batal = true;
    };
  }, [barang.id, barang.stok]);

  async function hapus() {
    setMenghapus(true);
    setGalat(null);
    try {
      await hapusBarang(barang.id);
      onDihapus();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menghapus barang.");
      setMenghapus(false);
      setYakinHapus(false);
    }
  }

  const saldo = riwayat ? saldoSetelah(riwayat, barang.stok) : new Map<string, number>();
  const grup = riwayat ? kelompokPerTanggal(riwayat, (m) => m.tanggal, hariIni) : [];
  const status = statusStok(barang);

  return (
    <Lembar
      idJudul={`${id}-judul`}
      onTutup={onTutup}
      lebar="max-w-lg"
      judul={<span className="truncate">{barang.nama}</span>}
      kepala={
        <>
          <button type="button" onClick={onUbah} aria-label="Ubah barang" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-brand-text">
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setYakinHapus(true)}
            aria-label="Hapus barang"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </>
      }
    >
      {pesan && (
        <p role="status" className="anim-buka flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0" /> {pesan}
        </p>
      )}

      {yakinHapus && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">
            Hapus <b>{barang.nama}</b> dari daftar? Riwayatnya tetap tersimpan di log dan barangnya bisa dipulihkan dari tab Riwayat.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setYakinHapus(false)} disabled={menghapus} className="min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm font-semibold">
              Batal
            </button>
            <button type="button" onClick={() => void hapus()} disabled={menghapus} className="min-h-[44px] rounded-xl bg-red-600 text-sm font-bold text-white">
              {menghapus ? "Menghapus…" : "Ya, hapus"}
            </button>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl">
        <FotoBarang path={barang.foto_path} alt={barang.nama} className="aspect-[4/3] max-h-[38vh] w-full" ukuranIkon={56} />
        <LencanaStok barang={barang} className="absolute left-3 top-3 shadow-sm" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {barang.kategori && <span className="rounded-full bg-lnd-sky px-2.5 py-0.5 text-[11px] font-semibold text-brand-masuk">{barang.kategori}</span>}
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">per {barang.satuan}</span>
          </div>
          {barang.stok_minimum > 0 && <p className="mt-1.5 text-[11px] text-gray-500">Diingatkan saat stok ≤ {formatAngka(barang.stok_minimum)}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-4xl font-extrabold leading-none tabular-nums ${status === "habis" ? "text-red-600" : status === "menipis" ? "text-amber-600" : "text-brand-text"}`}>
            {formatAngka(barang.stok)}
          </p>
          <p className="text-xs font-semibold text-gray-500">{barang.satuan} tersisa</p>
        </div>
      </div>

      {barang.keterangan && <p className="whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{barang.keterangan}</p>}

      <div className="grid grid-cols-2 gap-2">
        {(["masuk", "keluar"] as const).map((j) => {
          const G = GAYA_JENIS[j];
          return (
            <button
              key={j}
              type="button"
              onClick={() => onCatat(j)}
              className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-sm transition active:scale-95 ${G.tombol}`}
            >
              <G.ikon size={18} /> Barang {j}
            </button>
          );
        })}
      </div>

      <section aria-labelledby={`${id}-riwayat`} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <h3 id={`${id}-riwayat`} className="flex items-center gap-2 text-sm font-bold text-brand-text">
          <History size={16} className="text-brand-masuk" /> Keluar-masuk
          {riwayat && riwayat.length > 0 && <span className="text-xs font-semibold text-gray-400">{riwayat.length >= BATAS_RIWAYAT ? `${BATAS_RIWAYAT} terakhir` : riwayat.length}</span>}
        </h3>

        {galat && !yakinHapus && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{galat}</p>}
        {!riwayat && !galat && (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}
        {riwayat?.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">Belum ada catatan. Ketuk “Barang masuk” untuk mencatat stok pertama.</p>
        )}

        {grup.map((g) => (
          <div key={g.tanggal} className="flex flex-col gap-1">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.label}</p>
            {g.isi.map((m) => {
              const G = GAYA_JENIS[m.jenis];
              const sub = [m.pihak ? `${m.jenis === "masuk" ? "Dari" : "Untuk"} ${m.pihak}` : null, m.keterangan].filter(Boolean).join(" · ");
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onBukaCatatan(m)}
                  className="flex items-center gap-3 rounded-xl p-2 text-left transition hover:bg-gray-50 active:scale-[0.99]"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${G.latar} ${G.teks}`}>
                    <G.ikon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-extrabold tabular-nums ${G.teks}`}>
                      {m.jenis === "masuk" ? "+" : "−"}
                      {formatAngka(m.jumlah)} {barang.satuan}
                      {m.diubah_at && <span className="ml-1.5 text-[10px] font-semibold text-gray-400">diubah</span>}
                    </span>
                    <span className="block truncate text-xs text-gray-500">{sub || (m.jenis === "masuk" ? "Barang masuk" : "Barang keluar")}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Avatar pelaku={m.pencatat} ukuran="h-6 w-6 text-[9px]" />
                    {saldo.has(m.id) && <span className="text-[10px] font-semibold text-gray-400">sisa {formatAngka(saldo.get(m.id) ?? 0)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </section>
    </Lembar>
  );
}
