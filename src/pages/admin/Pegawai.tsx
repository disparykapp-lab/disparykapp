import { useEffect, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { simpanMasaMagang, hitungProgressMagang } from "../../lib/profil";
import { formatTanggal } from "../../lib/tanggal";
import type { Divisi, Profile, Role } from "../../types/database";

export default function Pegawai() {
  const { profile: profileSaya } = useAuth();
  const [list, setList] = useState<Profile[]>([]);
  const [menghapusId, setMenghapusId] = useState<string | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [terbuka, setTerbuka] = useState<string | null>(null);

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

  async function hapusPegawai(p: Profile) {
    const konfirmasi = confirm(
      `Hapus "${p.nama}" (${p.email}) dari daftar pegawai?\n\n` +
        `Ini hanya menghapus data pegawai di aplikasi — akun Google-nya di Supabase Auth ` +
        `harus dihapus terpisah lewat dashboard Supabase kalau memang tidak dipakai lagi.\n\n` +
        `Seluruh riwayat absensi pegawai ini juga akan ikut terhapus permanen. ` +
        `Kalau hanya ingin menonaktifkan sementara, gunakan tombol "Aktif/Nonaktif" saja, jangan hapus.`
    );
    if (!konfirmasi) return;

    setMenghapusId(p.id);
    setError(null);
    const { error } = await supabase.from("profiles").delete().eq("id", p.id);
    if (error) setError(error.message);
    else await muat();
    setMenghapusId(null);
  }

  if (loading) return <Loading teks="Memuat pegawai..." />;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman
        judul="Kelola Pegawai"
        aksi={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-masuk-dark"
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
            <button
              onClick={() => setTerbuka(terbuka === p.id ? null : p.id)}
              className="flex items-start justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-masuk/10 text-sm font-bold text-brand-masuk">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    p.nama.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-brand-text">{p.nama}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  p.aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </button>

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
              <button
                onClick={() => void toggleAktif(p.id, p.aktif)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-brand-text"
              >
                {p.aktif ? "Nonaktifkan" : "Aktifkan"}
              </button>
              {p.id !== profileSaya?.id && (
                <button
                  onClick={() => void hapusPegawai(p)}
                  disabled={menghapusId === p.id}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 disabled:opacity-60"
                >
                  {menghapusId === p.id ? "Menghapus..." : "Hapus"}
                </button>
              )}
            </div>

            {terbuka === p.id && <ProfilKaryawan pegawai={p} onUbah={muat} />}
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

function ProfilKaryawan({ pegawai, onUbah }: { pegawai: Profile; onUbah: () => void }) {
  const [mulai, setMulai] = useState(pegawai.tanggal_mulai_magang ?? "");
  const [selesai, setSelesai] = useState(pegawai.tanggal_selesai_magang ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const magang = mulai && selesai ? hitungProgressMagang(mulai, selesai) : null;

  async function simpan() {
    setMenyimpan(true);
    setError(null);
    try {
      await simpanMasaMagang(pegawai.id, mulai || null, selesai || null);
      onUbah();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan masa magang.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Tanggal Lahir</p>
          <p className="text-brand-text">
            {pegawai.tanggal_lahir ? formatTanggal(pegawai.tanggal_lahir) : "- Belum diisi -"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Asal Sekolah/Kampus</p>
          <p className="text-brand-text">{pegawai.asal_sekolah || "- Belum diisi -"}</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">
        Data ini diisi pegawai sendiri lewat halaman Profil Saya.
      </p>

      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-sm font-semibold text-brand-text">Masa Magang</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Mulai</span>
            <input
              type="date"
              value={mulai}
              onChange={(e) => setMulai(e.target.value)}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Selesai</span>
            <input
              type="date"
              value={selesai}
              onChange={(e) => setSelesai(e.target.value)}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
        </div>

        {magang && (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-brand-masuk" style={{ width: `${magang.persen}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {magang.persen}% berjalan · {magang.teksSisa}
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={() => void simpan()}
          disabled={menyimpan}
          className="mt-3 min-h-[40px] w-full rounded-lg bg-brand-masuk text-xs font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : "Simpan Masa Magang"}
        </button>
      </div>
    </div>
  );
}
