import { useEffect, useId, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { ambilSatuBarang, pulihkanBarang, type LogDenganPelaku } from "../../lib/inventaris";
import { isiLog, jamWIB, kalimatLog, labelTanggal, rincianPerubahan, tanggalLog } from "../../lib/inventarisAturan";
import type { BarangInventaris } from "../../types/database";
import { Avatar, FotoBarang } from "./bersama";
import { GAYA_NADA } from "./gaya";

const teks = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Rincian satu baris log: siapa, kapan, nilai sebelum → sesudah; pulihkan barang yang terhapus. */
export default function LembarLog({
  log,
  hariIni,
  onTutup,
  onBukaBarang,
  onDipulihkan,
}: {
  log: LogDenganPelaku;
  hariIni: string;
  onTutup: () => void;
  onBukaBarang: (b: BarangInventaris) => void;
  onDipulihkan: (b: BarangInventaris) => void;
}) {
  useModal(onTutup);
  const id = useId();
  const k = kalimatLog(log);
  const G = GAYA_NADA[k.nada];
  // undefined = sedang dicek; null = barangnya tidak ada lagi
  const [barang, setBarang] = useState<BarangInventaris | null | undefined>(log.barang_id ? undefined : null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!log.barang_id) return;
    let batal = false;
    ambilSatuBarang(log.barang_id)
      .then((b) => !batal && setBarang(b))
      .catch(() => !batal && setBarang(null));
    return () => {
      batal = true;
    };
  }, [log.barang_id]);

  async function pulihkan() {
    if (!barang) return;
    setProses(true);
    setGalat(null);
    try {
      await pulihkanBarang(barang.id);
      onDipulihkan({ ...barang, dihapus_at: null });
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memulihkan barang.");
      setProses(false);
    }
  }

  const ubah = log.aksi === "barang_ubah" || log.aksi === "mutasi_ubah" ? rincianPerubahan(log) : [];
  const isi = ubah.length ? [] : isiLog(log);
  const foto = ubah.find((r) => r.kunci === "foto_path");
  const fotoSnapshot = !ubah.length && log.aksi.startsWith("barang_") ? teks((log.sesudah ?? log.sebelum)?.foto_path) : null;
  const tanggal = tanggalLog(log);

  return (
    <Lembar
      idJudul={`${id}-judul`}
      onTutup={onTutup}
      judul={
        <>
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${G.latar} ${G.teks}`}>
            <G.ikon size={16} />
          </span>
          {G.judul}
        </>
      }
    >
      <div className="flex items-start gap-3">
        <Avatar pelaku={log.pelaku} ukuran="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <p className="text-sm leading-snug text-brand-text">
            <b>{log.pelaku?.nama ?? "Seseorang"}</b> {k.kata} {k.jumlah && <b className={G.teks}>{k.jumlah}</b>} <b>{k.barang}</b>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {labelTanggal(tanggal, hariIni)} · pukul {jamWIB(log.dibuat_at)}
          </p>
        </div>
      </div>

      {foto && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <FotoBarang path={teks((log.sebelum ?? {}).foto_path)} alt="Foto sebelumnya" className="aspect-square w-full rounded-xl" ukuranIkon={28} />
          <ArrowRight size={18} className="text-gray-400" aria-hidden="true" />
          <FotoBarang path={teks((log.sesudah ?? {}).foto_path)} alt="Foto sesudahnya" className="aspect-square w-full rounded-xl" ukuranIkon={28} />
        </div>
      )}
      {fotoSnapshot && <FotoBarang path={fotoSnapshot} alt={log.nama_barang} className="aspect-[4/3] max-h-[30vh] w-full rounded-xl" />}

      {ubah.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="grid grid-cols-[6.5rem_1fr_1fr] bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>Kolom</span>
            <span>Sebelum</span>
            <span>Sesudah</span>
          </div>
          {ubah.map((r) => (
            <div key={r.kunci} className="grid grid-cols-[6.5rem_1fr_1fr] gap-2 border-t border-gray-100 px-3 py-2 text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className="break-words text-gray-400 line-through decoration-gray-300">{r.dari}</span>
              <span className="break-words font-semibold text-brand-text">{r.ke}</span>
            </div>
          ))}
        </div>
      )}

      {isi.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-gray-50 p-3 text-sm">
          {isi.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="whitespace-pre-line break-words font-semibold text-brand-text">{r.nilai}</dd>
            </div>
          ))}
        </dl>
      )}

      {galat && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {galat}
        </p>
      )}

      {barang?.dihapus_at ? (
        log.aksi === "barang_hapus" ? (
          <button
            type="button"
            onClick={() => void pulihkan()}
            disabled={proses}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <RotateCcw size={16} /> {proses ? "Memulihkan…" : "Pulihkan barang ini"}
          </button>
        ) : (
          <p className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-500">Barang ini sudah dihapus dari daftar.</p>
        )
      ) : barang ? (
        <button
          type="button"
          onClick={() => onBukaBarang(barang)}
          className="min-h-[48px] rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text transition active:scale-[0.98]"
        >
          Buka {barang.nama}
        </button>
      ) : null}
    </Lembar>
  );
}
