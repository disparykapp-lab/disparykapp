import { useState } from "react";
import { buatTim, hapusTim, perbaruiTim, type TimDenganAnggota } from "../lib/tim";
import type { Profile } from "../types/database";

interface Props {
  timList: TimDenganAnggota[];
  pegawaiList: Profile[];
  onUbah: () => Promise<void> | void;
}

/**
 * Kelola tim (gabungan pegawai) buat penugasan undangan bersama — dipakai
 * di halaman Distribusi Undangan. Rencana pemakaian: 1 tim = 2 orang, tapi
 * tidak dibatasi teknis, jadi anggotanya bebas berapa saja.
 */
export default function PanelTim({ timList, pegawaiList, onUbah }: Props) {
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [anggota, setAnggota] = useState<Set<string>>(new Set());
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapusId, setMenghapusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function bukaForm(t?: TimDenganAnggota) {
    setError(null);
    if (t) {
      setEditId(t.id);
      setNama(t.nama);
      setAnggota(new Set(t.anggota.map((a) => a.id)));
    } else {
      setEditId(null);
      setNama("");
      setAnggota(new Set());
    }
    setFormTerbuka(true);
  }

  function toggleAnggota(id: string) {
    setAnggota((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function simpan() {
    if (!nama.trim()) {
      setError("Nama tim tidak boleh kosong.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    try {
      const anggotaIds = Array.from(anggota);
      if (editId) await perbaruiTim(editId, nama.trim(), anggotaIds);
      else await buatTim(nama.trim(), anggotaIds);
      setFormTerbuka(false);
      await onUbah();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan tim.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus(t: TimDenganAnggota) {
    if (!confirm(`Hapus tim "${t.nama}"? Undangan yang sedang ditugaskan ke tim ini akan jadi belum ditugaskan.`))
      return;
    setMenghapusId(t.id);
    setError(null);
    try {
      await hapusTim(t.id);
      await onUbah();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus tim.");
    } finally {
      setMenghapusId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {timList.length === 0 && !formTerbuka && (
        <p className="text-sm text-gray-400">
          Belum ada tim. Buat tim supaya bisa menugaskan undangan ke beberapa pegawai sekaligus
          (mis. 2 orang per tim).
        </p>
      )}

      <div className="grid items-start gap-2 lg:grid-cols-2">
        {timList.map((t) => (
          <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-text">👥 {t.nama}</p>
                <p className="text-xs text-gray-500">
                  {t.anggota.length > 0 ? t.anggota.map((a) => a.nama).join(", ") : "Belum ada anggota"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => bukaForm(t)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-brand-text"
                >
                  Edit
                </button>
                <button
                  onClick={() => void hapus(t)}
                  disabled={menghapusId === t.id}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-60"
                >
                  {menghapusId === t.id ? "..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {formTerbuka ? (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Nama Tim</span>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Tim A"
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">
              Anggota ({anggota.size} dipilih — biasanya 2 orang)
            </span>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {pegawaiList.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded p-1 text-sm">
                  <input
                    type="checkbox"
                    checked={anggota.has(p.id)}
                    onChange={() => toggleAnggota(p.id)}
                    className="h-4 w-4"
                  />
                  {p.nama}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFormTerbuka(false)}
              className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold text-brand-text"
            >
              Batal
            </button>
            <button
              onClick={() => void simpan()}
              disabled={menyimpan}
              className="flex-1 rounded-lg bg-brand-masuk p-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {menyimpan ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Buat Tim"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => bukaForm()}
          className="min-h-[40px] rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500"
        >
          + Buat Tim Baru
        </button>
      )}
    </div>
  );
}
