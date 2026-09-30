import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import {
  ambilSemuaUndangan,
  LABEL_KATEGORI,
  LABEL_STATUS_UNDANGAN,
  type StatusUndangan,
  type UndanganDenganPic,
} from "../../lib/undangan";

interface Kelompok {
  key: string;
  nama: string;
  tim: boolean;
  rows: UndanganDenganPic[];
}

/** Rekap "siapa membawa undangan siapa" — dikelompokkan per petugas/tim,
 * lintas semua kategori sekaligus, kebalikan dari Distribusi Undangan yang
 * dikelompokkan per kategori. */
export default function DistribusiPerPetugas() {
  const [rows, setRows] = useState<UndanganDenganPic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cari, setCari] = useState("");

  useEffect(() => {
    ambilSemuaUndangan()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat data undangan."))
      .finally(() => setLoading(false));
  }, []);

  const kelompok = useMemo<Kelompok[]>(() => {
    const peta = new Map<string, Kelompok>();
    const belumDitugaskan: UndanganDenganPic[] = [];

    for (const r of rows) {
      if (r.pic_user_id) {
        const key = `p:${r.pic_user_id}`;
        const ada = peta.get(key) ?? { key, nama: r.pic?.nama ?? "-", tim: false, rows: [] };
        ada.rows.push(r);
        peta.set(key, ada);
      } else if (r.pic_tim_id) {
        const key = `t:${r.pic_tim_id}`;
        const ada = peta.get(key) ?? { key, nama: r.pic_tim?.nama ?? "-", tim: true, rows: [] };
        ada.rows.push(r);
        peta.set(key, ada);
      } else {
        belumDitugaskan.push(r);
      }
    }

    const daftar = Array.from(peta.values()).sort(
      (a, b) => b.rows.length - a.rows.length || a.nama.localeCompare(b.nama, "id")
    );
    if (belumDitugaskan.length > 0) {
      daftar.push({ key: "belum", nama: "Belum Ditugaskan", tim: false, rows: belumDitugaskan });
    }
    return daftar;
  }, [rows]);

  const kelompokTersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return kelompok;
    return kelompok.filter((k) => k.nama.toLowerCase().includes(q));
  }, [kelompok, cari]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <HeaderHalaman judul="Distribusi per Petugas" kembaliKe="/kelola/undangan" />
        <Loading teks="Memuat data undangan..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Distribusi per Petugas" kembaliKe="/kelola/undangan" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <p className="text-sm text-gray-500">
        Daftar undangan yang dibawa tiap petugas/tim, digabung dari semua kategori.
      </p>

      <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama petugas/tim..." />

      <div className="grid items-start gap-3 lg:grid-cols-2">
        {kelompokTersaring.map((k) => {
          const selesai = k.rows.filter((r) => r.status === "selesai").length;
          return (
            <details
              key={k.key}
              className="group rounded-xl bg-white shadow-sm"
              open={kelompokTersaring.length <= 4}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-semibold text-brand-text marker:content-none">
                <span className="min-w-0 flex-1 truncate">
                  {k.key === "belum" ? "🚫" : k.tim ? "👥" : "🙋"} {k.nama}
                </span>
                <span className="shrink-0 text-xs font-normal text-gray-400">
                  {selesai}/{k.rows.length} selesai
                </span>
                <span className="shrink-0 text-gray-400 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="flex flex-col gap-1 border-t border-gray-100 p-2">
                {k.rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-text">{r.nama}</p>
                      <p className="text-xs text-gray-400">
                        {LABEL_KATEGORI[r.kategori]}
                        {r.sub_kelompok ? ` · ${r.sub_kelompok}` : ""}
                      </p>
                    </div>
                    <BadgeStatus status={r.status} />
                  </div>
                ))}
              </div>
            </details>
          );
        })}
        {kelompokTersaring.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm lg:col-span-2">
            Tidak ada petugas/tim yang cocok dengan pencarian ini.
          </p>
        )}
      </div>
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
