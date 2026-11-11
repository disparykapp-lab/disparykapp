import { useId, useState } from "react";
import { UserPlus } from "lucide-react";
import Lembar from "../../../components/Lembar";
import { useModal } from "../../../lib/useModal";
import { cekPegawaiBaru } from "../../../lib/pegawaiAturan";
import type { Divisi } from "../../../types/database";

export interface PegawaiBaru {
  nama: string;
  email: string;
  divisi_id: string | null;
  jabatan: string | null;
}

/** Lembar "Tambah pegawai": daftarkan email Google pegawai. */
export default function FormTambah({
  divisiList,
  divisiAwal,
  onTutup,
  onSimpan,
}: {
  divisiList: Divisi[];
  divisiAwal: string | null;
  onTutup: () => void;
  onSimpan: (p: PegawaiBaru) => Promise<void>;
}) {
  const idJudul = useId();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [divisiId, setDivisiId] = useState<string | null>(divisiAwal);
  const [jabatan, setJabatan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  useModal(onTutup);

  async function simpan() {
    const salah = cekPegawaiBaru(nama, email);
    if (salah) return setGalat(salah);
    setMenyimpan(true);
    setGalat(null);
    try {
      await onSimpan({ nama: nama.trim(), email: email.trim().toLowerCase(), divisi_id: divisiId, jabatan: jabatan.trim() || null });
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mendaftarkan pegawai.");
      setMenyimpan(false);
    }
  }

  const kelasIsian = "rounded-xl border border-gray-200 bg-gray-50 p-3 text-base focus:border-brand-masuk focus:bg-white focus:outline-none";

  return (
    <Lembar
      idJudul={idJudul}
      onTutup={onTutup}
      judul={
        <>
          <UserPlus size={20} className="text-brand-masuk" aria-hidden="true" /> Tambah pegawai
        </>
      }
    >
      <p className="-mt-1 text-xs text-gray-500">Daftarkan email Google pegawai — setelah itu dia bisa langsung masuk lewat "Masuk dengan Google".</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Nama lengkap</span>
        <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={100} placeholder="mis. Moch Farid Sahila" className={kelasIsian} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Email Google</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoCapitalize="none" placeholder="nama@gmail.com" className={kelasIsian} />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-600">Divisi</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Divisi">
          {divisiList.map((d) => {
            const aktif = divisiId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={aktif}
                onClick={() => setDivisiId(aktif ? null : d.id)}
                className={`min-h-[36px] rounded-full px-3 text-sm font-semibold transition active:scale-95 ${aktif ? "bg-brand-masuk text-white" : "bg-white text-brand-text ring-1 ring-gray-200"}`}
              >
                {d.nama}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-gray-400">Ketuk lagi untuk batal memilih. Bisa diatur nanti.</span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">Jabatan (opsional)</span>
        <input value={jabatan} onChange={(e) => setJabatan(e.target.value)} maxLength={100} placeholder="mis. Staf Humas" className={kelasIsian} />
      </label>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      <button
        type="button"
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="min-h-[48px] rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
      >
        {menyimpan ? "Mendaftarkan…" : "Daftarkan pegawai"}
      </button>
    </Lembar>
  );
}
