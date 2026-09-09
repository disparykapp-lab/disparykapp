import { useEffect, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import type { Divisi, Profile, Role } from "../../types/database";

export default function Pegawai() {
  const [list, setList] = useState<Profile[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [divisiId, setDivisiId] = useState("");
  const [jabatan, setJabatan] = useState("");

  async function muat() {
    setLoading(true);
    const [{ data: profiles, error: e1 }, { data: divisi, error: e2 }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("divisi").select("*").order("nama"),
    ]);
    if (e1) setError(e1.message);
    else if (e2) setError(e2.message);
    setList((profiles as Profile[]) ?? []);
    setDivisiList((divisi as Divisi[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void muat();
  }, []);

  async function tambahPegawai() {
    if (!nama.trim() || !email.trim()) {
      setError("Nama dan email wajib diisi.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    const { error } = await supabase.from("profiles").insert({
      nama: nama.trim(),
      email: email.trim().toLowerCase(),
      divisi_id: divisiId || null,
      jabatan: jabatan.trim() || null,
      role: "user",
    });
    if (error) {
      setError(
        error.message.includes("duplicate")
          ? "Email ini sudah terdaftar."
          : error.message
      );
    } else {
      setNama("");
      setEmail("");
      setDivisiId("");
      setJabatan("");
      setShowForm(false);
      await muat();
    }
    setMenyimpan(false);
  }

  async function ubahRole(id: string, role: Role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) setError(error.message);
    else await muat();
  }

  async function ubahDivisi(id: string, divisi_id: string) {
    const { error } = await supabase.from("profiles").update({ divisi_id: divisi_id || null }).eq("id", id);
    if (error) setError(error.message);
    else await muat();
  }

  async function toggleAktif(id: string, aktif: boolean) {
    const { error } = await supabase.from("profiles").update({ aktif: !aktif }).eq("id", id);
    if (error) setError(error.message);
    else await muat();
  }

  if (loading) return <Loading teks="Memuat pegawai..." />;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman
        judul="Kelola Pegawai"
        aksi={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-brand-masuk px-4 py-2 text-sm font-semibold text-white"
          >
            {showForm ? "Tutup" : "+ Tambah"}
          </button>
        }
      />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Daftarkan email Google pegawai. Pegawai bisa langsung masuk lewat "Masuk dengan Google" setelah didaftarkan.
          </p>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama lengkap"
            className="rounded-xl border border-gray-300 p-3 text-base"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Google"
            type="email"
            className="rounded-xl border border-gray-300 p-3 text-base"
          />
          <select
            value={divisiId}
            onChange={(e) => setDivisiId(e.target.value)}
            className="rounded-xl border border-gray-300 p-3 text-base"
          >
            <option value="">- Pilih Divisi -</option>
            {divisiList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama}
              </option>
            ))}
          </select>
          <input
            value={jabatan}
            onChange={(e) => setJabatan(e.target.value)}
            placeholder="Jabatan (opsional)"
            className="rounded-xl border border-gray-300 p-3 text-base"
          />
          <button
            onClick={() => void tambahPegawai()}
            disabled={menyimpan}
            className="min-h-[48px] rounded-xl bg-brand-masuk font-semibold text-white disabled:opacity-60"
          >
            Simpan Pegawai
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-brand-text">{p.nama}</p>
                <p className="text-xs text-gray-500">{p.email}</p>
              </div>
              <button
                onClick={() => void toggleAktif(p.id, p.aktif)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={p.divisi_id ?? ""}
                onChange={(e) => void ubahDivisi(p.id, e.target.value)}
                className="rounded-lg border border-gray-300 p-2 text-xs"
              >
                <option value="">- Divisi -</option>
                {divisiList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}
                  </option>
                ))}
              </select>
              <select
                value={p.role}
                onChange={(e) => void ubahRole(p.id, e.target.value as Role)}
                className="rounded-lg border border-gray-300 p-2 text-xs"
              >
                <option value="user">Pegawai</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            Belum ada pegawai terdaftar.
          </p>
        )}
      </div>
    </div>
  );
}
