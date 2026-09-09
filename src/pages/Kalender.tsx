import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { id } from "date-fns/locale";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import { ambilKonten, type BarisKonten } from "../lib/konten";
import { geserBulan, keYMD } from "../lib/tanggal";
import {
  IKON_PLATFORM,
  LABEL_PLATFORM,
  LABEL_STATUS_KONTEN,
  WARNA_STATUS_KONTEN,
} from "../lib/kontenMeta";
import type { PlatformKonten, StatusKonten } from "../types/database";

type Tampilan = "bulanan" | "daftar";

export default function Kalender() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [tampilan, setTampilan] = useState<Tampilan>("bulanan");
  const [ref, setRef] = useState(new Date());
  const [items, setItems] = useState<BarisKonten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<PlatformKonten | "semua">("semua");
  const [filterStatus, setFilterStatus] = useState<StatusKonten | "semua">("semua");

  const rentang = useMemo(() => {
    const dari = startOfWeek(startOfMonth(ref), { weekStartsOn: 1 });
    const sampai = endOfWeek(endOfMonth(ref), { weekStartsOn: 1 });
    return { dari, sampai };
  }, [ref]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    ambilKonten({ dari: keYMD(rentang.dari), sampai: keYMD(rentang.sampai) })
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Gagal memuat konten.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [rentang]);

  const itemsTersaring = items.filter(
    (k) =>
      (filterPlatform === "semua" || k.platform === filterPlatform) &&
      (filterStatus === "semua" || k.status === filterStatus)
  );

  const hariDalamGrid = useMemo(
    () => eachDayOfInterval({ start: rentang.dari, end: rentang.sampai }),
    [rentang]
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">Kalender Konten</h1>
        {isAdmin && (
          <Link
            to="/kalender/baru"
            className="rounded-full bg-brand-masuk px-4 py-2 text-sm font-semibold text-white"
          >
            + Tambah
          </Link>
        )}
      </header>

      <div className="flex gap-2">
        <ToggleTampilan label="Bulanan" aktif={tampilan === "bulanan"} onClick={() => setTampilan("bulanan")} />
        <ToggleTampilan label="Daftar" aktif={tampilan === "daftar"} onClick={() => setTampilan("daftar")} />
      </div>

      {tampilan === "bulanan" && (
        <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <button
            onClick={() => setRef((r) => geserBulan(r, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-brand-text">
            {format(ref, "MMMM yyyy", { locale: id })}
          </span>
          <button
            onClick={() => setRef((r) => geserBulan(r, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            ›
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as PlatformKonten | "semua")}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="semua">Semua Platform</option>
          {(Object.keys(LABEL_PLATFORM) as PlatformKonten[]).map((p) => (
            <option key={p} value={p}>
              {LABEL_PLATFORM[p]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusKonten | "semua")}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="semua">Semua Status</option>
          {(Object.keys(LABEL_STATUS_KONTEN) as StatusKonten[]).map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_KONTEN[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat kalender konten..." />
      ) : tampilan === "bulanan" ? (
        <div className="grid grid-cols-7 gap-1 rounded-xl bg-white p-2 shadow-sm">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => (
            <div key={h} className="p-1 text-center text-[11px] font-semibold text-gray-400">
              {h}
            </div>
          ))}
          {hariDalamGrid.map((hari) => {
            const kontenHari = itemsTersaring.filter((k) => isSameDay(new Date(k.tanggal_tayang), hari));
            const dalamBulan = isSameMonth(hari, ref);
            return (
              <div
                key={hari.toISOString()}
                className={`min-h-[64px] rounded-lg border border-gray-50 p-1 text-[11px] ${
                  dalamBulan ? "bg-white" : "bg-gray-50 text-gray-300"
                }`}
              >
                <div className="mb-1 text-right text-[10px] text-gray-400">{format(hari, "d")}</div>
                <div className="flex flex-col gap-0.5">
                  {kontenHari.slice(0, 2).map((k) => (
                    <Link
                      key={k.id}
                      to={`/kalender/${k.id}/edit`}
                      className={`truncate rounded px-1 py-0.5 ${WARNA_STATUS_KONTEN[k.status]}`}
                      title={k.judul}
                    >
                      {IKON_PLATFORM[k.platform]} {k.judul}
                    </Link>
                  ))}
                  {kontenHari.length > 2 && (
                    <span className="text-gray-400">+{kontenHari.length - 2} lagi</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {itemsTersaring.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              Belum ada konten pada bulan ini.
            </p>
          )}
          {itemsTersaring.map((k) => (
            <Link
              key={k.id}
              to={`/kalender/${k.id}/edit`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-brand-text">
                  {IKON_PLATFORM[k.platform]} {k.judul}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(k.tanggal_tayang), "d MMM yyyy", { locale: id })}
                  {k.jam_tayang ? ` · ${k.jam_tayang.slice(0, 5)}` : ""}
                  {k.profiles?.nama ? ` · PIC: ${k.profiles.nama}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${WARNA_STATUS_KONTEN[k.status]}`}>
                {LABEL_STATUS_KONTEN[k.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleTampilan({ label, aktif, onClick }: { label: string; aktif: boolean; onClick: () => void }) {
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
