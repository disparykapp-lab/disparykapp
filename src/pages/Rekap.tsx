import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import { ambilAbsensiRentang, hitungRingkasan, unduhCsv, type BarisAbsensi } from "../lib/rekap";
import { formatTanggal, geserBulan, geserMinggu, rentangBulan, rentangMinggu } from "../lib/tanggal";
import { supabase } from "../lib/supabase";
import type { Divisi, Profile } from "../types/database";

type Mode = "mingguan" | "bulanan";

const LABEL_STATUS: Record<string, string> = {
  hadir: "Hadir",
  telat: "Telat",
  dinas_luar: "Dinas Luar",
};

export default function Rekap() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [mode, setMode] = useState<Mode>("mingguan");
  const [ref, setRef] = useState(new Date());
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [pegawaiId, setPegawaiId] = useState<string>("semua");
  const [divisiId, setDivisiId] = useState<string>("semua");

  const { dari, sampai } = useMemo(
    () => (mode === "mingguan" ? rentangMinggu(ref) : rentangBulan(ref)),
    [mode, ref]
  );

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("aktif", true)
      .then(({ data }) => setPegawaiList((data as Profile[]) ?? []));
    supabase
      .from("divisi")
      .select("*")
      .eq("aktif", true)
      .then(({ data }) => setDivisiList((data as Divisi[]) ?? []));
  }, [isAdmin]);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    let userIds: string[] | undefined;
    if (!isAdmin) {
      userIds = [profile.id];
    } else if (pegawaiId !== "semua") {
      userIds = [pegawaiId];
    } else if (divisiId !== "semua") {
      userIds = pegawaiList.filter((p) => p.divisi_id === divisiId).map((p) => p.id);
    }

    ambilAbsensiRentang({ dari, sampai, userIds })
      .then((data) => {
        if (mounted) setRows(data);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Gagal memuat rekap.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [profile, isAdmin, pegawaiId, divisiId, pegawaiList, dari, sampai]);

  const ringkasan = useMemo(() => hitungRingkasan(rows, dari, sampai), [rows, dari, sampai]);
  const tampilkanPerPegawai = isAdmin && pegawaiId === "semua";

  return (
    <div className="flex flex-col gap-5 print:gap-3">
      <h1 className="text-xl font-bold text-brand-text">Rekap Absensi</h1>

      <div className="flex gap-2 print:hidden">
        <ToggleMode label="Mingguan" aktif={mode === "mingguan"} onClick={() => setMode("mingguan")} />
        <ToggleMode label="Bulanan" aktif={mode === "bulanan"} onClick={() => setMode("bulanan")} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm print:hidden">
        <button
          onClick={() => setRef((r) => (mode === "mingguan" ? geserMinggu(r, -1) : geserBulan(r, -1)))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-brand-text">
          {formatTanggal(dari, "d MMM")} – {formatTanggal(sampai, "d MMM yyyy")}
        </span>
        <button
          onClick={() => setRef((r) => (mode === "mingguan" ? geserMinggu(r, 1) : geserBulan(r, 1)))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
        >
          ›
        </button>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <select
            value={divisiId}
            onChange={(e) => {
              setDivisiId(e.target.value);
              setPegawaiId("semua");
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="semua">Semua Divisi</option>
            {divisiList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama}
              </option>
            ))}
          </select>
          <select
            value={pegawaiId}
            onChange={(e) => setPegawaiId(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="semua">Semua Pegawai</option>
            {pegawaiList
              .filter((p) => divisiId === "semua" || p.divisi_id === divisiId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
          </select>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat rekap..." />
      ) : (
        <>
          {!tampilkanPerPegawai && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KartuRingkasan label="Hadir" nilai={ringkasan.hadir} warna="text-brand-masuk" />
              <KartuRingkasan label="Telat" nilai={ringkasan.telat} warna="text-brand-pulang" />
              <KartuRingkasan label="Dinas Luar" nilai={ringkasan.dinasLuar} warna="text-brand-info" />
              <KartuRingkasan label="Tidak Absen" nilai={ringkasan.tidakAbsen} warna="text-gray-500" />
            </div>
          )}
          {!tampilkanPerPegawai && (
            <p className="text-sm text-gray-500">
              Total jam kerja: <strong>{ringkasan.totalJamKerja.toFixed(1)} jam</strong>
            </p>
          )}

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => unduhCsv(`rekap-${mode}-${formatTanggal(dari, "yyyy-MM-dd")}`, rows)}
              className="min-h-[44px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
            >
              ⬇️ Ekspor CSV
            </button>
            <button
              onClick={() => window.print()}
              className="min-h-[44px] flex-1 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text"
            >
              🖨️ Cetak
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  {isAdmin && <th className="p-3">Nama</th>}
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Masuk</th>
                  <th className="p-3">Pulang</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    {isAdmin && <td className="p-3">{r.profiles?.nama ?? "-"}</td>}
                    <td className="p-3">{formatTanggal(r.tanggal)}</td>
                    <td className="p-3">{r.masuk_at ? formatJam(r.masuk_at) : "-"}</td>
                    <td className="p-3">{r.keluar_at ? formatJam(r.keluar_at) : "-"}</td>
                    <td className="p-3">
                      {LABEL_STATUS[r.status] ?? r.status}
                      {r.ditandai && <span className="ml-1 text-red-500">⚑</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="p-6 text-center text-gray-400">
                      Belum ada data pada rentang ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleMode({ label, aktif, onClick }: { label: string; aktif: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[40px] flex-1 rounded-xl text-sm font-semibold ${
        aktif ? "bg-brand-masuk text-white" : "bg-white text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}

function KartuRingkasan({ label, nilai, warna }: { label: string; nilai: number; warna: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold ${warna}`}>{nilai}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function formatJam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
