import { useEffect, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import { formatTanggal } from "../../lib/tanggal";
import type { BarisAbsensi } from "../../lib/rekap";

const LABEL_STATUS: Record<string, string> = {
  hadir: "Hadir",
  telat: "Telat",
  dinas_luar: "Dinas Luar",
};

export default function TinjauAbsensi() {
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hanyaDitandai, setHanyaDitandai] = useState(false);
  const [dari, setDari] = useState(defaultDari());
  const [sampai, setSampai] = useState(defaultHariIni());
  const [terbuka, setTerbuka] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    let query = supabase
      .from("absensi")
      .select("*, profiles(nama)")
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .order("tanggal", { ascending: false });

    if (hanyaDitandai) query = query.eq("ditandai", true);

    query.then(({ data, error }) => {
      if (!mounted) return;
      if (error) setError(error.message);
      setRows((data as BarisAbsensi[]) ?? []);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [dari, sampai, hanyaDitandai]);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tinjau Absensi" />

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
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={hanyaDitandai}
            onChange={(e) => setHanyaDitandai(e.target.checked)}
          />
          Hanya ditandai
        </label>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading teks="Memuat data absensi..." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl bg-white shadow-sm ${r.ditandai ? "ring-2 ring-red-300" : ""}`}
            >
              <button
                onClick={() => setTerbuka(terbuka === r.id ? null : r.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold text-brand-text">
                    {r.profiles?.nama ?? "-"} {r.ditandai && <span className="text-red-500">⚑</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTanggal(r.tanggal)} · {LABEL_STATUS[r.status] ?? r.status}
                  </p>
                </div>
                <span className="text-gray-400">{terbuka === r.id ? "▲" : "▼"}</span>
              </button>

              {terbuka === r.id && <DetailAbsensi row={r} />}
            </div>
          ))}
          {rows.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              Tidak ada data pada rentang ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailAbsensi({ row }: { row: BarisAbsensi }) {
  return (
    <div className="flex flex-col gap-4 border-t border-gray-100 p-4">
      {row.ditandai && row.alasan_tanda && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Alasan ditandai: {row.alasan_tanda}
        </p>
      )}
      <SesiAbsensi
        judul="Masuk"
        at={row.masuk_at}
        lat={row.masuk_lat}
        lng={row.masuk_lng}
        akurasi={row.masuk_akurasi}
        mode={row.masuk_mode}
        catatan={row.masuk_catatan}
        fotoPath={row.masuk_foto_path}
        ip={row.masuk_ip}
      />
      <SesiAbsensi
        judul="Pulang"
        at={row.keluar_at}
        lat={row.keluar_lat}
        lng={row.keluar_lng}
        akurasi={row.keluar_akurasi}
        mode={row.keluar_mode}
        catatan={row.keluar_catatan}
        fotoPath={row.keluar_foto_path}
        ip={row.keluar_ip}
      />
    </div>
  );
}

function SesiAbsensi({
  judul,
  at,
  lat,
  lng,
  akurasi,
  mode,
  catatan,
  fotoPath,
  ip,
}: {
  judul: string;
  at: string | null;
  lat: number | null;
  lng: number | null;
  akurasi: number | null;
  mode: string | null;
  catatan: string | null;
  fotoPath: string | null;
  ip: string | null;
}) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fotoPath) return;
    supabase.storage
      .from("absensi")
      .createSignedUrl(fotoPath, 300)
      .then(({ data }) => setFotoUrl(data?.signedUrl ?? null));
  }, [fotoPath]);

  if (!at) {
    return (
      <div>
        <p className="text-sm font-semibold text-gray-400">{judul}: belum absen</p>
      </div>
    );
  }

  const petaUrl =
    lat != null && lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003}%2C${lat - 0.003}%2C${
          lng + 0.003
        }%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-brand-text">
        {judul} · {new Date(at).toLocaleTimeString("id-ID")} · {mode === "kantor" ? "Di Kantor" : "Dinas Luar"}
      </p>
      {catatan && <p className="text-xs text-gray-500">Catatan: {catatan}</p>}
      <p className="text-xs text-gray-500">
        Akurasi GPS: {akurasi != null ? `${Math.round(akurasi)} m` : "-"} · IP: {ip ?? "-"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {fotoUrl && (
          <img src={fotoUrl} alt={`Foto ${judul}`} className="aspect-square w-full rounded-lg object-cover" />
        )}
        {petaUrl && (
          <iframe title={`Peta ${judul}`} src={petaUrl} className="aspect-square w-full rounded-lg border border-gray-200" />
        )}
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
