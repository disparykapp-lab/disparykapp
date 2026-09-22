import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import {
  ambilSemuaUndangan,
  hitungRingkasanUndangan,
  tugaskanUndangan,
  LABEL_KATEGORI,
  LABEL_STATUS_UNDANGAN,
  type KategoriUndangan,
  type StatusUndangan,
  type UndanganDenganPic,
} from "../../lib/undangan";
import type { Profile } from "../../types/database";

export default function DistribusiUndangan() {
  const [rows, setRows] = useState<UndanganDenganPic[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterKategori, setFilterKategori] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterPic, setFilterPic] = useState<string>("semua");
  const [cari, setCari] = useState("");

  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [picTugas, setPicTugas] = useState("");
  const [menugaskan, setMenugaskan] = useState(false);

  async function muat() {
    setLoading(true);
    setError(null);
    try {
      const data = await ambilSemuaUndangan();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data undangan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void muat();
    supabase
      .from("profiles")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setPegawaiList((data as Profile[]) ?? []));
  }, []);

  const rowsTersaring = useMemo(() => {
    return rows.filter((r) => {
      if (filterKategori !== "semua" && r.kategori !== filterKategori) return false;
      if (filterStatus !== "semua" && r.status !== filterStatus) return false;
      if (filterPic === "belum_ditugaskan" && r.pic_user_id) return false;
      if (filterPic !== "semua" && filterPic !== "belum_ditugaskan" && r.pic_user_id !== filterPic)
        return false;
      if (cari.trim() && !r.nama.toLowerCase().includes(cari.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, filterKategori, filterStatus, filterPic, cari]);

  const ringkasan = useMemo(() => hitungRingkasanUndangan(rows), [rows]);

  const ringkasanPerPic = useMemo(() => {
    const peta = new Map<string, { nama: string; total: number; selesai: number }>();
    for (const r of rows) {
      if (!r.pic_user_id) continue;
      const key = r.pic_user_id;
      const nama = r.pic?.nama ?? "-";
      const ada = peta.get(key) ?? { nama, total: 0, selesai: 0 };
      ada.total++;
      if (r.status === "selesai") ada.selesai++;
      peta.set(key, ada);
    }
    return Array.from(peta.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  function toggleSemuaTampil() {
    setTerpilih((prev) => {
      const semuaSudah = rowsTersaring.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (semuaSudah) {
        rowsTersaring.forEach((r) => next.delete(r.id));
      } else {
        rowsTersaring.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function toggleSatu(id: string) {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function tugaskanTerpilih() {
    if (terpilih.size === 0 || !picTugas) return;
    setMenugaskan(true);
    setError(null);
    try {
      await tugaskanUndangan(Array.from(terpilih), picTugas);
      setTerpilih(new Set());
      setPicTugas("");
      await muat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menugaskan.");
    } finally {
      setMenugaskan(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Distribusi Undangan" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat data undangan..." />
      ) : (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500">Progres Keseluruhan</h2>
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

            {ringkasanPerPic.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500">Progres per Pegawai</p>
                {ringkasanPerPic.map((p) => (
                  <div key={p.nama} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 truncate text-gray-600">{p.nama}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-masuk"
                        style={{ width: `${p.total > 0 ? (p.selesai / p.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-gray-500">
                      {p.selesai}/{p.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
              >
                <option value="semua">Semua Kategori</option>
                {(Object.keys(LABEL_KATEGORI) as KategoriUndangan[]).map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KATEGORI[k]}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
              >
                <option value="semua">Semua Status</option>
                {(Object.keys(LABEL_STATUS_UNDANGAN) as StatusUndangan[]).map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS_UNDANGAN[s]}
                  </option>
                ))}
              </select>
              <select
                value={filterPic}
                onChange={(e) => setFilterPic(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
              >
                <option value="semua">Semua PIC</option>
                <option value="belum_ditugaskan">Belum Ditugaskan</option>
                {pegawaiList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama..."
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-bg p-3">
            <button
              onClick={toggleSemuaTampil}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-brand-text"
            >
              {rowsTersaring.length > 0 && rowsTersaring.every((r) => terpilih.has(r.id))
                ? "Batalkan Semua"
                : "Pilih Semua yang Tampil"}
            </button>
            <span className="text-xs text-gray-500">{terpilih.size} dipilih</span>
            <select
              value={picTugas}
              onChange={(e) => setPicTugas(e.target.value)}
              className="ml-auto rounded-lg border border-gray-300 bg-white p-2 text-sm"
            >
              <option value="">Tugaskan ke...</option>
              {pegawaiList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
            <button
              onClick={() => void tugaskanTerpilih()}
              disabled={terpilih.size === 0 || !picTugas || menugaskan}
              className="min-h-[40px] rounded-lg bg-brand-masuk px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {menugaskan ? "Menugaskan..." : "Tugaskan"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {rowsTersaring.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={terpilih.has(r.id)}
                  onChange={() => toggleSatu(r.id)}
                  className="h-5 w-5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-text">{r.nama}</p>
                  <p className="truncate text-xs text-gray-500">
                    {LABEL_KATEGORI[r.kategori]}
                    {r.sub_kelompok ? ` · ${r.sub_kelompok}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    PIC: {r.pic?.nama ?? "belum ditugaskan"}
                  </p>
                </div>
                <BadgeStatus status={r.status} />
              </label>
            ))}
            {rowsTersaring.length === 0 && (
              <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
                Tidak ada undangan yang cocok dengan filter ini.
              </p>
            )}
          </div>
        </>
      )}
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
