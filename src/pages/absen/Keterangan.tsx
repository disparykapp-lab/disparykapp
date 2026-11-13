import { useState } from "react";
import { ChevronRight, NotebookPen } from "lucide-react";
import Lembar from "../../components/Lembar";
import InputBukti from "../../components/InputBukti";
import { useModal } from "../../lib/useModal";
import { ALASAN_CEPAT, sisipkanAlasan } from "../../lib/absenAturan";
import { TOMBOL_KEDUA, TOMBOL_UTAMA } from "./gaya";

export interface IsiKeterangan {
  isi: string;
  bukti: string;
}

type Saran = "telat" | "awal" | null;

/** Baris ringkas di halaman; isinya diedit di lembar (bottom sheet). */
export function BarisKeterangan({ nilai, saran, onBuka }: { nilai: IsiKeterangan; saran: Saran; onBuka: () => void }) {
  const ada = nilai.isi.trim().length > 0;
  const judul = ada ? "Keterangan" : saran === "telat" ? "Telat? Tulis alasannya" : saran === "awal" ? "Pulang lebih awal? Tulis alasannya" : "Tambah keterangan";
  return (
    <button
      type="button"
      onClick={onBuka}
      aria-haspopup="dialog"
      className={`flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 transition active:scale-[0.99] ${
        saran && !ada ? "ring-amber-200" : "ring-transparent"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          ada ? "bg-brand-masuk/10 text-brand-masuk" : saran ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
        }`}
        aria-hidden="true"
      >
        <NotebookPen size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-brand-text">{judul}</span>
        <span className="block truncate text-xs text-gray-500">
          {ada ? `“${nilai.isi.trim()}”${nilai.bukti ? " · ada foto bukti" : ""}` : "Opsional · dibaca admin"}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-gray-300" aria-hidden="true" />
    </button>
  );
}

export function LembarKeterangan({
  awal,
  saran,
  onSimpan,
  onTutup,
}: {
  awal: IsiKeterangan;
  saran: Saran;
  onSimpan: (v: IsiKeterangan) => void;
  onTutup: () => void;
}) {
  useModal(onTutup);
  const [isi, setIsi] = useState(awal.isi);
  const [bukti, setBukti] = useState(awal.bukti);
  const [sibuk, setSibuk] = useState(false);
  const panjang = isi.trim().length;
  const chip = ALASAN_CEPAT[saran ?? "umum"];
  const petunjuk =
    saran === "telat" ? "Kasih tahu admin kenapa telat hari ini." : saran === "awal" ? "Kasih tahu admin kenapa pulang lebih awal." : "Catatan tambahan untuk absen hari ini.";

  return (
    <Lembar idJudul="judul-keterangan-absen" judul="Keterangan" onTutup={onTutup}>
      <p className="-mt-1 text-sm text-gray-500">{petunjuk}</p>
      <div className="flex flex-wrap gap-2">
        {chip.map((c) => {
          const dipakai = isi.toLowerCase().includes(c.toLowerCase());
          return (
            <button
              key={c}
              type="button"
              onClick={() => setIsi((v) => sisipkanAlasan(v, c))}
              aria-pressed={dipakai}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${dipakai ? "bg-brand-masuk text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      <textarea
        value={isi}
        onChange={(e) => setIsi(e.target.value)}
        aria-label="Isi keterangan"
        placeholder={saran === "awal" ? "Contoh: Sudah izin atasan, lanjut rapat di dinas" : "Contoh: Macet parah di Jalan Magelang"}
        rows={3}
        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-base transition focus:border-brand-masuk focus:bg-white focus:outline-none"
      />
      {panjang > 0 && panjang < 3 && <p className="-mt-1 text-xs text-amber-700">Tulis minimal 3 huruf.</p>}
      {panjang >= 3 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-brand-text">Foto bukti (opsional)</p>
          <InputBukti nilai={bukti} onUbah={setBukti} onSibuk={setSibuk} />
        </div>
      )}
      <div className="flex gap-3 pt-1">
        {awal.isi ? (
          <button type="button" className={TOMBOL_KEDUA} onClick={() => onSimpan({ isi: "", bukti: "" })}>
            Hapus
          </button>
        ) : (
          <button type="button" className={TOMBOL_KEDUA} onClick={onTutup}>
            Batal
          </button>
        )}
        <button
          type="button"
          className={TOMBOL_UTAMA}
          disabled={sibuk || (panjang > 0 && panjang < 3)}
          onClick={() => onSimpan({ isi: isi.trim(), bukti: panjang >= 3 ? bukti : "" })}
        >
          {sibuk ? "Tunggu unggahan…" : "Simpan"}
        </button>
      </div>
    </Lembar>
  );
}
