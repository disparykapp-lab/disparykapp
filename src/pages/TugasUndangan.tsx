import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../components/HeaderHalaman";
import Loading from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";
import {
  ambilTugasSaya,
  hitungRingkasanUndangan,
  perbaruiTugasUndangan,
  LABEL_KATEGORI,
  LABEL_STATUS_UNDANGAN,
  type StatusUndangan,
  type Undangan,
} from "../lib/undangan";

const TAB: { value: "semua" | StatusUndangan; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "belum", label: "Belum" },
  { value: "selesai", label: "Selesai" },
  { value: "kendala", label: "Kendala" },
];

export default function TugasUndangan() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Undangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"semua" | StatusUndangan>("semua");
  const [terbuka, setTerbuka] = useState<string | null>(null);

  async function muat() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ambilTugasSaya(profile.id);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat tugas undangan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const ringkasan = useMemo(() => hitungRingkasanUndangan(rows), [rows]);
  const rowsTersaring = tab === "semua" ? rows : rows.filter((r) => r.status === tab);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tugas Undangan" kembaliKe="/" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat tugas..." />
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          Belum ada undangan yang ditugaskan ke kamu.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500">Progres Kamu</h2>
              <span className="text-sm font-bold text-brand-masuk">
                {ringkasan.total > 0 ? Math.round((ringkasan.selesai / ringkasan.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-masuk transition-all"
                style={{ width: `${ringkasan.total > 0 ? (ringkasan.selesai / ringkasan.total) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {ringkasan.selesai} selesai · {ringkasan.kendala} kendala · {ringkasan.belum} belum ·{" "}
              {ringkasan.total} total
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TAB.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  tab === t.value ? "bg-brand-masuk text-white" : "bg-white text-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {rowsTersaring.map((r) => (
              <div key={r.id} className="rounded-xl bg-white shadow-sm">
                <button
                  onClick={() => setTerbuka(terbuka === r.id ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-brand-text">{r.nama}</p>
                    <p className="text-xs text-gray-500">
                      {LABEL_KATEGORI[r.kategori]}
                      {r.sub_kelompok ? ` · ${r.sub_kelompok}` : ""}
                    </p>
                    {r.lokasi_parkir && (
                      <p className="text-xs text-gray-400">Parkir: {r.lokasi_parkir}</p>
                    )}
                    {r.lokasi_pengantaran && (
                      <p className="text-xs text-gray-400">Lokasi: {r.lokasi_pengantaran}</p>
                    )}
                    {r.catatan && <p className="text-xs text-gray-400">Kontak: {r.catatan}</p>}
                  </div>
                  <BadgeStatus status={r.status} />
                </button>
                {terbuka === r.id && <FormTugas row={r} onTersimpan={muat} />}
              </div>
            ))}
            {rowsTersaring.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
                Tidak ada tugas dengan status ini.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FormTugas({ row, onTersimpan }: { row: Undangan; onTersimpan: () => void }) {
  const [status, setStatus] = useState<StatusUndangan>(row.status);
  const [catatan, setCatatan] = useState(row.catatan ?? "");
  const [lokasi, setLokasi] = useState(row.lokasi_pengantaran ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simpan() {
    setMenyimpan(true);
    setError(null);
    try {
      await perbaruiTugasUndangan(row.id, {
        status,
        catatan: catatan.trim() || null,
        lokasi_pengantaran: lokasi.trim() || null,
      });
      onTersimpan();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
      <div className="flex gap-2">
        {(["belum", "selesai", "kendala"] as StatusUndangan[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg border p-2 text-xs font-semibold ${
              status === s
                ? "border-brand-masuk bg-brand-masuk text-white"
                : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            {LABEL_STATUS_UNDANGAN[s]}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">
          Nomor HP tamu undangan (untuk pengingat H-2)
        </span>
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="mis. 0812xxxxxxx — diisi setelah surat diserahkan"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Lokasi Pengantaran</span>
        <input
          value={lokasi}
          onChange={(e) => setLokasi(e.target.value)}
          placeholder="mis. Kantor Kelurahan Baciro"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={() => void simpan()}
        disabled={menyimpan}
        className="min-h-[44px] rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
      >
        {menyimpan ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}

function BadgeStatus({ status }: { status: StatusUndangan }) {
  const warna =
    status === "selesai"
      ? "bg-green-100 text-green-700"
      : status === "kendala"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-500";
  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${warna}`}>
      {LABEL_STATUS_UNDANGAN[status]}
    </span>
  );
}
