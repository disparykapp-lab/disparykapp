import { useEffect, useId, useState } from "react";
import { ChevronLeft, Lock, Trash2 } from "lucide-react";
import Lembar from "../../components/Lembar";
import { useModal } from "../../lib/useModal";
import { ambilPihakTerakhir, hapusMutasi, simpanMutasi, type MutasiDenganPencatat } from "../../lib/inventaris";
import {
  BATAS_INVENTARIS,
  formatAngka,
  jamWIB,
  labelTanggal,
  saranPihak,
  stokSetelah,
  tersediaUntukKeluar,
  validasiMutasi,
  type FormMutasi,
} from "../../lib/inventarisAturan";
import { tanggalWIB } from "../../lib/tinjauAbsenAturan";
import type { BarangInventaris, JenisMutasi, MutasiInventaris } from "../../types/database";
import StripTanggal from "../../components/StripTanggal";
import { tambahHari } from "../../lib/izinAturan";
import { Avatar, FotoBarang, PenghitungJumlah } from "./bersama";
import { GAYA_JENIS, KELAS_BARIS_CHIP, kelasChip } from "./gaya";

/** Form catat barang masuk/keluar — juga untuk mengubah / menghapus catatan lama. */
export default function LembarMutasi({
  barang,
  jenisAwal,
  mutasi,
  bolehUbah,
  hariIni,
  onKembali,
  onTutup,
  onTersimpan,
}: {
  barang: BarangInventaris;
  jenisAwal: JenisMutasi;
  /** ada = membuka catatan lama */
  mutasi: MutasiDenganPencatat | null;
  /** pencatat sendiri atau admin */
  bolehUbah: boolean;
  hariIni: string;
  onKembali: () => void;
  onTutup: () => void;
  onTersimpan: (pesan: string) => void;
}) {
  useModal(onTutup);
  const id = useId();
  const [form, setForm] = useState<FormMutasi>(() => ({
    jenis: mutasi?.jenis ?? jenisAwal,
    jumlah: mutasi?.jumlah ?? 0,
    tanggal: mutasi?.tanggal ?? hariIni,
    pihak: mutasi?.pihak ?? "",
    keterangan: mutasi?.keterangan ?? "",
  }));
  const [saran, setSaran] = useState<Pick<MutasiInventaris, "jenis" | "pihak">[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [yakinHapus, setYakinHapus] = useState(false);

  useEffect(() => {
    if (!bolehUbah) return;
    let batal = false;
    ambilPihakTerakhir()
      .then((d) => !batal && setSaran(d))
      .catch(() => undefined);
    return () => {
      batal = true;
    };
  }, [bolehUbah]);

  const ubah = <K extends keyof FormMutasi>(k: K, v: FormMutasi[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGalat(null);
  };

  const lama = mutasi ? { jenis: mutasi.jenis, jumlah: mutasi.jumlah } : null;
  const tersedia = tersediaUntukKeluar(barang.stok, lama);
  const sesudah = stokSetelah(barang.stok, { jenis: form.jenis, jumlah: form.jumlah }, lama);
  const lebih = form.jenis === "keluar" && form.jumlah > tersedia;
  const gaya = GAYA_JENIS[form.jenis];
  const chipPihak = saranPihak(saran, form.jenis);

  async function simpan() {
    const pesan = validasiMutasi(form, { hariIni, tersedia, satuan: barang.satuan });
    if (pesan) {
      setGalat(pesan);
      return;
    }
    setMenyimpan(true);
    setGalat(null);
    try {
      await simpanMutasi(mutasi?.id ?? null, barang.id, form);
      const teks = `${form.jenis === "masuk" ? "Masuk" : "Keluar"} ${formatAngka(form.jumlah)} ${barang.satuan}`;
      onTersimpan(mutasi ? `Catatan diperbarui: ${teks.toLowerCase()}` : `Tercatat: ${teks.toLowerCase()}`);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan catatan.");
      setMenyimpan(false);
    }
  }

  async function hapus() {
    if (!mutasi) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      await hapusMutasi(mutasi.id);
      onTersimpan("Catatan dihapus. Stok sudah dihitung ulang.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menghapus catatan.");
      setYakinHapus(false);
      setMenyimpan(false);
    }
  }

  const Ikon = gaya.ikon;
  const judul = !mutasi ? `Barang ${form.jenis}` : bolehUbah ? "Ubah catatan" : "Detail catatan";

  return (
    <Lembar
      idJudul={`${id}-judul`}
      onTutup={onTutup}
      judul={
        <>
          <Ikon size={18} className={gaya.teks} /> {judul}
        </>
      }
    >
      {/* barang yang dicatat — ketuk untuk kembali ke detail */}
      <button type="button" onClick={onKembali} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-2 pr-3 text-left transition active:scale-[0.99]">
        <ChevronLeft size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
        <FotoBarang path={barang.foto_path} kecil alt={barang.nama} className="h-11 w-11 shrink-0 rounded-xl" ukuranIkon={18} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-brand-text">{barang.nama}</span>
          <span className="block text-xs text-gray-500">
            Stok sekarang {formatAngka(barang.stok)} {barang.satuan}
          </span>
        </span>
      </button>

      {mutasi && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Avatar pelaku={mutasi.pencatat} ukuran="h-6 w-6 text-[9px]" />
          <span>
            Dicatat {mutasi.pencatat?.nama ?? "pegawai"} · {labelTanggal(tanggalWIB(mutasi.dibuat_at), hariIni).toLowerCase()} {jamWIB(mutasi.dibuat_at)}
            {mutasi.diubah_at ? " · pernah diubah" : ""}
          </span>
        </div>
      )}

      {!bolehUbah && mutasi ? (
        <>
          <div className={`flex items-center justify-between rounded-2xl p-4 ${gaya.latar}`}>
            <span className={`text-sm font-bold ${gaya.teks}`}>{gaya.label}</span>
            <span className={`text-2xl font-extrabold tabular-nums ${gaya.teks}`}>
              {mutasi.jenis === "masuk" ? "+" : "−"}
              {formatAngka(mutasi.jumlah)} <span className="text-sm font-semibold">{barang.satuan}</span>
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Tanggal</dt>
            <dd className="font-semibold text-brand-text">{labelTanggal(mutasi.tanggal, hariIni)}</dd>
            {mutasi.pihak && (
              <>
                <dt className="text-gray-500">{mutasi.jenis === "masuk" ? "Dari" : "Untuk"}</dt>
                <dd className="font-semibold text-brand-text">{mutasi.pihak}</dd>
              </>
            )}
            {mutasi.keterangan && (
              <>
                <dt className="text-gray-500">Keterangan</dt>
                <dd className="whitespace-pre-line text-brand-text">{mutasi.keterangan}</dd>
              </>
            )}
          </dl>
          <p className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            <Lock size={14} className="shrink-0" /> Hanya pencatat atau admin yang bisa mengubah catatan ini.
          </p>
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Jenis catatan" className="grid grid-cols-2 gap-1.5 rounded-full bg-gray-100 p-1">
            {(["masuk", "keluar"] as const).map((j) => {
              const G = GAYA_JENIS[j];
              const aktif = form.jenis === j;
              return (
                <button
                  key={j}
                  type="button"
                  role="tab"
                  aria-selected={aktif}
                  onClick={() => ubah("jenis", j)}
                  className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors ${
                    aktif ? `${G.tombol} text-white` : "text-gray-500"
                  }`}
                >
                  <G.ikon size={16} /> {G.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <span id={`${id}-jumlah`} className="text-sm font-semibold text-brand-text">
              Jumlah {form.jenis}
            </span>
            <PenghitungJumlah
              idLabel={`${id}-jumlah`}
              nilai={form.jumlah}
              onUbah={(n) => ubah("jumlah", n)}
              satuan={barang.satuan}
              maks={form.jenis === "keluar" ? tersedia : undefined}
            />
            <p className={`text-xs font-semibold ${lebih ? "text-red-600" : "text-gray-500"}`} aria-live="polite">
              {lebih
                ? `Melebihi stok — sisa ${formatAngka(Math.max(tersedia, 0))} ${barang.satuan}.`
                : form.jumlah > 0
                  ? `Stok ${formatAngka(barang.stok)} → ${formatAngka(sesudah)} ${barang.satuan}`
                  : form.jenis === "keluar" && tersedia <= 0
                    ? "Stok sedang habis — catat barang masuk dulu."
                    : " "}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-text">
              Tanggal <span className="font-normal text-gray-400">· {labelTanggal(form.tanggal, hariIni)}</span>
            </span>
            <StripTanggal
              nilai={form.tanggal}
              hariIni={hariIni}
              min={tambahHari(hariIni, -BATAS_INVENTARIS.hariMundur)}
              onUbah={(t) => ubah("tanggal", t)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-pihak`} className="text-sm font-semibold text-brand-text">
              {form.jenis === "keluar" ? "Untuk siapa / acara apa?" : "Dari mana?"} <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              id={`${id}-pihak`}
              value={form.pihak}
              maxLength={BATAS_INVENTARIS.pihak}
              onChange={(e) => ubah("pihak", e.target.value)}
              placeholder={form.jenis === "keluar" ? "mis. Pameran Jogja Istimewa, tamu Kadis" : "mis. vendor sablon, pengadaan 2026"}
              className="rounded-xl border border-gray-300 p-3 text-base"
            />
            {chipPihak.length > 0 && (
              <div className={KELAS_BARIS_CHIP} role="group" aria-label="Pernah dipakai">
                {chipPihak.map((p) => (
                  <button key={p} type="button" onClick={() => ubah("pihak", p)} className={kelasChip(form.pihak.trim().toLowerCase() === p.toLowerCase())}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-text">
              Keterangan <span className="font-normal text-gray-400">(opsional)</span>
            </span>
            <textarea
              value={form.keterangan}
              maxLength={BATAS_INVENTARIS.keterangan}
              onChange={(e) => ubah("keterangan", e.target.value)}
              rows={2}
              placeholder="mis. diambil Pak Budi, sisa dikembalikan Senin"
              className="resize-none rounded-xl border border-gray-300 p-3 text-base"
            />
          </label>

          {galat && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {galat}
            </p>
          )}

          <button
            type="button"
            onClick={() => void simpan()}
            disabled={menyimpan || form.jumlah < 1 || lebih}
            className={`min-h-[48px] rounded-xl text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 ${gaya.tombol}`}
          >
            {menyimpan
              ? "Menyimpan…"
              : mutasi
                ? "Simpan perubahan"
                : form.jumlah > 0
                  ? `Catat ${form.jenis} · ${formatAngka(form.jumlah)} ${barang.satuan}`
                  : `Catat ${form.jenis}`}
          </button>

          {mutasi &&
            (yakinHapus ? (
              <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">Hapus catatan ini? Stok dihitung ulang, dan penghapusannya tetap tercatat di log.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setYakinHapus(false)} disabled={menyimpan} className="min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm font-semibold">
                    Batal
                  </button>
                  <button type="button" onClick={() => void hapus()} disabled={menyimpan} className="min-h-[44px] rounded-xl bg-red-600 text-sm font-bold text-white">
                    Ya, hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setYakinHapus(true)}
                className="flex min-h-[40px] items-center justify-center gap-1.5 text-sm font-semibold text-red-600"
              >
                <Trash2 size={15} /> Hapus catatan
              </button>
            ))}
        </>
      )}
    </Lembar>
  );
}
