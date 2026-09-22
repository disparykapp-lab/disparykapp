import { useEffect, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { ambilAbsensiRentang, type BarisAbsensi } from "../../lib/rekap";
import { hapusFotoAbsensi } from "../../lib/absensi";
import { formatTanggal } from "../../lib/tanggal";
import type { Divisi } from "../../types/database";

interface FotoEntri {
  absensiId: string;
  jenis: "masuk" | "keluar";
  path: string;
  tanggal: string;
  waktu: string | null;
  namaPegawai: string;
  divisiId: string | null;
}

function jadikanEntriFoto(rows: BarisAbsensi[]): FotoEntri[] {
  const hasil: FotoEntri[] = [];
  for (const r of rows) {
    const nama = r.profiles?.nama ?? "-";
    const divisiId = r.profiles?.divisi_id ?? null;
    if (r.masuk_foto_path) {
      hasil.push({
        absensiId: r.id,
        jenis: "masuk",
        path: r.masuk_foto_path,
        tanggal: r.tanggal,
        waktu: r.masuk_at,
        namaPegawai: nama,
        divisiId,
      });
    }
    if (r.keluar_foto_path) {
      hasil.push({
        absensiId: r.id,
        jenis: "keluar",
        path: r.keluar_foto_path,
        tanggal: r.tanggal,
        waktu: r.keluar_at,
        namaPegawai: nama,
        divisiId,
      });
    }
  }
  return hasil.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

export default function FotoAbsensi() {
  const [foto, setFoto] = useState<FotoEntri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retensiHari, setRetensiHari] = useState<number | null>(null);
  const [dari, setDari] = useState(defaultDari());
  const [sampai, setSampai] = useState(defaultHariIni());
  const [menghapus, setMenghapus] = useState<string | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [divisiId, setDivisiId] = useState<string>("semua");

  useEffect(() => {
    supabase
      .from("divisi")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setDivisiList((data as Divisi[]) ?? []));
  }, []);

  async function muat() {
    setLoading(true);
    setError(null);
    try {
      const rows = await ambilAbsensiRentang({ dari: new Date(dari), sampai: new Date(sampai) });
      setFoto(jadikanEntriFoto(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat foto absensi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, sampai]);

  const fotoTersaring =
    divisiId === "semua" ? foto : foto.filter((f) => f.divisiId === divisiId);

  useEffect(() => {
    supabase
      .from("pengaturan")
      .select("retensi_foto_hari")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setRetensiHari(data?.retensi_foto_hari ?? null));
  }, []);

  async function hapus(f: FotoEntri) {
    const key = `${f.absensiId}-${f.jenis}`;
    if (!confirm(`Hapus foto ${f.jenis} milik ${f.namaPegawai} tanggal ${formatTanggal(f.tanggal)}?`)) {
      return;
    }
    setMenghapus(key);
    setError(null);
    try {
      await hapusFotoAbsensi(f.absensiId, f.jenis, f.path);
      setFoto((prev) => prev.filter((x) => !(x.absensiId === f.absensiId && x.jenis === f.jenis)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus foto.");
    } finally {
      setMenghapus(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Foto Absensi" />

      {retensiHari != null && (
        <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
          ℹ️ Foto otomatis terhapus sendiri setelah <strong>{retensiHari} hari</strong> (bisa
          diubah di Kelola → Pengaturan Kantor). Foto yang lebih tua dari itu sudah tidak akan
          muncul di sini.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <input
          type="date"
          value={dari}
          onChange={(e) => setDari(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
        <span className="text-gray-400">–</span>
        <input
          type="date"
          value={sampai}
          onChange={(e) => setSampai(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
        <select
          value={divisiId}
          onChange={(e) => setDivisiId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
        >
          <option value="semua">Semua Divisi</option>
          {divisiList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nama}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat foto absensi..." />
      ) : fotoTersaring.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          Tidak ada foto pada rentang ini.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotoTersaring.map((f) => (
            <KartuFoto
              key={`${f.absensiId}-${f.jenis}`}
              entri={f}
              menghapus={menghapus === `${f.absensiId}-${f.jenis}`}
              onHapus={() => void hapus(f)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KartuFoto({
  entri,
  menghapus,
  onHapus,
}: {
  entri: FotoEntri;
  menghapus: boolean;
  onHapus: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.storage
      .from("absensi")
      .createSignedUrl(entri.path, 300)
      .then(({ data }) => {
        if (mounted) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      mounted = false;
    };
  }, [entri.path]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="aspect-square w-full bg-gray-100">
        {url ? (
          <img src={url} alt={`Foto ${entri.jenis} ${entri.namaPegawai}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Memuat...</div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2">
        <p className="truncate text-xs font-semibold text-brand-text">{entri.namaPegawai}</p>
        <p className="text-[11px] text-gray-500">
          {formatTanggal(entri.tanggal)} · {entri.jenis === "masuk" ? "Masuk" : "Pulang"}
          {entri.waktu ? ` ${new Date(entri.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
        <button
          onClick={onHapus}
          disabled={menghapus}
          className="mt-1 min-h-[32px] rounded-lg border border-red-200 text-xs font-medium text-red-600 disabled:opacity-60"
        >
          {menghapus ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </div>
  );
}

function defaultDari() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultHariIni() {
  return new Date().toISOString().slice(0, 10);
}
