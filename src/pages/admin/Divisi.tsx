import { useEffect, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import type { Divisi as DivisiType } from "../../types/database";

export default function Divisi() {
  const [list, setList] = useState<DivisiType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  async function muat() {
    setLoading(true);
    const { data, error } = await supabase.from("divisi").select("*").order("created_at");
    if (error) setError(error.message);
    else setList((data as DivisiType[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void muat();
  }, []);

  async function tambah() {
    if (!namaBaru.trim()) return;
    setMenyimpan(true);
    setError(null);
    const { error } = await supabase.from("divisi").insert({ nama: namaBaru.trim() });
    if (error) setError(error.message);
    else {
      setNamaBaru("");
      await muat();
    }
    setMenyimpan(false);
  }

  async function ubahNama(id: string, nama: string) {
    const { error } = await supabase.from("divisi").update({ nama }).eq("id", id);
    if (error) setError(error.message);
    else await muat();
  }

  async function toggleAktif(id: string, aktif: boolean) {
    const { error } = await supabase.from("divisi").update({ aktif: !aktif }).eq("id", id);
    if (error) setError(error.message);
    else await muat();
  }

  if (loading) return <Loading teks="Memuat divisi..." />;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Kelola Divisi" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2">
        <input
          value={namaBaru}
          onChange={(e) => setNamaBaru(e.target.value)}
          placeholder="Nama divisi baru"
          className="flex-1 rounded-xl border border-gray-300 p-3 text-base"
        />
        <button
          onClick={() => void tambah()}
          disabled={menyimpan}
          className="min-h-[48px] rounded-xl bg-brand-masuk px-4 font-semibold text-white disabled:opacity-60"
        >
          Tambah
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {list.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
            <input
              defaultValue={d.nama}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== d.nama) {
                  void ubahNama(d.id, e.target.value.trim());
                }
              }}
              className="flex-1 rounded-lg border border-transparent bg-transparent p-2 text-sm focus:border-gray-300"
            />
            <button
              onClick={() => void toggleAktif(d.id, d.aktif)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                d.aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {d.aktif ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            Belum ada divisi.
          </p>
        )}
      </div>
    </div>
  );
}
