import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import { supabase } from "../../lib/supabase";
import { formatTanggal } from "../../lib/tanggal";
import { tandaiAbsensi } from "../../lib/absensi";
import { LABEL_STATUS_ABSEN } from "../../lib/absensiMeta";
import { teksDenganLink } from "../../lib/linkify";
import type { BarisAbsensi } from "../../lib/rekap";
import type { Divisi } from "../../types/database";

export default function TinjauAbsensi() {
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hanyaDitandai, setHanyaDitandai] = useState(false);

  // dariInput/sampaiInput = nilai yang sedang diketik di form (belum tentu
  // sudah aktif); dari/sampai = rentang yang BENAR-BENAR dipakai buat query,
  // baru berubah saat tombol "Terapkan" ditekan supaya tidak fetch berkali-
  // kali sambil pengguna masih mengetik tanggal.
  const [dariInput, setDariInput] = useState(defaultHariIni());
  const [sampaiInput, setSampaiInput] = useState(defaultHariIni());
  const [dari, setDari] = useState(defaultHariIni());
  const [sampai, setSampai] = useState(defaultHariIni());

  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [divisiId, setDivisiId] = useState<string>("semua");
  const [cari, setCari] = useState("");

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
    let query = supabase
      .from("absensi")
      .select("*, profiles(nama, divisi_id)")
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .order("tanggal", { ascending: false });

    if (hanyaDitandai) query = query.eq("ditandai", true);

    const { data, error } = await query;
    if (error) setError(error.message);
    setRows((data as BarisAbsensi[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, sampai, hanyaDitandai]);

  function terapkanFilter() {
    setDari(dariInput);
    setSampai(sampaiInput);
  }

  const adaPerubahanBelumDiterapkan = dariInput !== dari || sampaiInput !== sampai;
  const cariNormal = cari.trim().toLowerCase();

  const rowsTersaring = rows.filter((r) => {
    if (divisiId !== "semua" && r.profiles?.divisi_id !== divisiId) return false;
    if (cariNormal && !(r.profiles?.nama ?? "").toLowerCase().includes(cariNormal)) return false;
    return true;
  });

  const ringkasan = useMemo(() => {
    const hasil = { total: rowsTersaring.length, hadir: 0, telat: 0, dinas_luar: 0, izin: 0 };
    for (const r of rowsTersaring) {
      if (r.status === "hadir") hasil.hadir++;
      else if (r.status === "telat") hasil.telat++;
      else if (r.status === "dinas_luar") hasil.dinas_luar++;
      else if (r.status === "izin") hasil.izin++;
    }
    return hasil;
  }, [rowsTersaring]);

  // Cuma dua hal yang perlu disorot di sini: telat (merah) & izin/sakit
  // (hitam). Hadir/dinas luar/tidak ada baris tidak ditampilkan di kartu ini
  // — sudah cukup terwakili di kartu ringkasan total di atas.
  const satuHari = dari === sampai;

  const orangSatuHari = useMemo(() => {
    if (!satuHari) return [];
    return rowsTersaring
      .filter((r): r is BarisAbsensi & { status: "telat" | "izin" } =>
        r.status === "telat" || r.status === "izin"
      )
      .map((r) => ({ id: r.id, nama: r.profiles?.nama ?? "-", status: r.status }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rowsTersaring, satuHari]);

  const rekapRentang = useMemo(() => {
    if (satuHari) return [];
    const perUser = new Map<string, { nama: string; telat: number; izin: number }>();
    for (const r of rowsTersaring) {
      if (r.status !== "telat" && r.status !== "izin") continue;
      const cur = perUser.get(r.user_id) ?? { nama: r.profiles?.nama ?? "-", telat: 0, izin: 0 };
      if (r.status === "telat") cur.telat++;
      else cur.izin++;
      perUser.set(r.user_id, cur);
    }
    return Array.from(perUser.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rowsTersaring, satuHari]);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tinjau Absensi" />

      <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dariInput}
            onChange={(e) => setDariInput(e.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={sampaiInput}
            onChange={(e) => setSampaiInput(e.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
          <button
            onClick={terapkanFilter}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold transition ${
              adaPerubahanBelumDiterapkan
                ? "bg-brand-masuk text-white"
                : "border border-gray-300 bg-white text-gray-400"
            }`}
          >
            Terapkan
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Menampilkan: <strong className="text-gray-600">{formatTanggal(ambilTanggal(dari), "d MMM yyyy")}</strong>
          {dari !== sampai && (
            <>
              {" "}
              – <strong className="text-gray-600">{formatTanggal(ambilTanggal(sampai), "d MMM yyyy")}</strong>
            </>
          )}
          {adaPerubahanBelumDiterapkan && (
            <span className="ml-1 text-amber-600">(ada perubahan tanggal, tekan Terapkan)</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
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
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={hanyaDitandai}
              onChange={(e) => setHanyaDitandai(e.target.checked)}
            />
            Hanya ditandai
          </label>
          <div className="ml-auto w-full max-w-[220px]">
            <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama pegawai..." />
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!loading && (
        <div className="grid grid-cols-5 gap-2 rounded-xl bg-white p-3 shadow-sm text-center">
          <Ringkas label="Total" nilai={ringkasan.total} />
          <Ringkas label="Hadir" nilai={ringkasan.hadir} warna="text-green-600" />
          <Ringkas label="Telat" nilai={ringkasan.telat} warna="text-amber-600" />
          <Ringkas label="Dinas Luar" nilai={ringkasan.dinas_luar} warna="text-blue-600" />
          <Ringkas label="Izin" nilai={ringkasan.izin} warna="text-gray-500" />
        </div>
      )}

      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-brand-text">🚩 Telat & Izin/Sakit</p>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Telat
            <span className="ml-1 h-2.5 w-2.5 rounded-full bg-gray-900" /> Izin/Sakit
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400">Memuat...</p>
        ) : satuHari ? (
          orangSatuHari.length === 0 ? (
            <p className="text-xs text-gray-400">Tidak ada yang telat atau izin/sakit hari ini.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orangSatuHari.map((o) => (
                <span
                  key={o.id}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    o.status === "telat" ? "bg-red-500 text-white" : "bg-gray-900 text-white"
                  }`}
                >
                  {o.nama}
                </span>
              ))}
            </div>
          )
        ) : rekapRentang.length === 0 ? (
          <p className="text-xs text-gray-400">Tidak ada yang telat atau izin/sakit di rentang ini.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {rekapRentang.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <span className="rounded-full bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-800">
                  {p.nama}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {p.telat}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {p.izin}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <Loading teks="Memuat data absensi..." />
      ) : (
        <div className="flex flex-col gap-2">
          {rowsTersaring.map((r) => (
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
                    {formatTanggal(r.tanggal)} · {LABEL_STATUS_ABSEN[r.status] ?? r.status}
                  </p>
                </div>
                <span className="text-gray-400">{terbuka === r.id ? "▲" : "▼"}</span>
              </button>

              {terbuka === r.id && <DetailAbsensi row={r} onUbah={muat} />}
            </div>
          ))}
          {rowsTersaring.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              Tidak ada data pada rentang ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailAbsensi({ row, onUbah }: { row: BarisAbsensi; onUbah: () => void }) {
  const [alasan, setAlasan] = useState(row.alasan_tanda ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorTanda, setErrorTanda] = useState<string | null>(null);

  async function simpanTanda(ditandai: boolean) {
    if (ditandai && alasan.trim().length < 3) {
      setErrorTanda("Isi alasan penandaan dulu (minimal 3 huruf).");
      return;
    }
    setMenyimpan(true);
    setErrorTanda(null);
    try {
      await tandaiAbsensi(row.id, ditandai, alasan.trim());
      onUbah();
    } catch (e) {
      setErrorTanda(e instanceof Error ? e.message : "Gagal menyimpan tanda.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-gray-100 p-4">
      {(row.catatan_klarifikasi || row.bukti_url) && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-semibold">Keterangan dari pegawai</p>
          {row.catatan_klarifikasi && <p className="mt-1">{teksDenganLink(row.catatan_klarifikasi)}</p>}
          {row.bukti_url && (
            <a
              href={row.bukti_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-blue-700 underline"
            >
              🔗 Buka link bukti
            </a>
          )}
        </div>
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

      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-sm font-semibold text-brand-text">Tandai untuk Ditinjau</p>
        {row.ditandai ? (
          <div className="flex flex-col gap-2">
            {row.alasan_tanda && (
              <p className="text-sm text-red-700">Alasan saat ini: {row.alasan_tanda}</p>
            )}
            <button
              onClick={() => void simpanTanda(false)}
              disabled={menyimpan}
              className="min-h-[40px] rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text disabled:opacity-60"
            >
              {menyimpan ? "Menyimpan..." : "Batalkan Tanda"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={2}
              placeholder="Alasan ditandai, mis. lokasi mencurigakan / foto tidak jelas"
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
            {errorTanda && <p className="text-xs text-red-600">{errorTanda}</p>}
            <button
              onClick={() => void simpanTanda(true)}
              disabled={menyimpan}
              className="min-h-[40px] rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-60"
            >
              {menyimpan ? "Menyimpan..." : "⚑ Tandai Entri Ini"}
            </button>
          </div>
        )}
      </div>
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
      {catatan && <p className="text-xs text-gray-500">Catatan: {teksDenganLink(catatan)}</p>}
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
        {!fotoUrl && fotoPath === null && (
          <p className="col-span-2 text-xs text-gray-400">Foto sudah dihapus otomatis (retensi habis).</p>
        )}
      </div>
    </div>
  );
}

function Ringkas({ label, nilai, warna }: { label: string; nilai: number; warna?: string }) {
  return (
    <div>
      <p className={`text-lg font-bold ${warna ?? "text-brand-text"}`}>{nilai}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function defaultHariIni() {
  return new Date().toISOString().slice(0, 10);
}

/** Ubah string "yyyy-MM-dd" jadi Date di tengah malam waktu lokal (bukan UTC)
 * supaya tanggalnya tidak meleset dibanding yang diketik pengguna. */
function ambilTanggal(ymd: string): Date {
  const [tahun, bulan, tanggal] = ymd.split("-").map(Number);
  return new Date(tahun, bulan - 1, tanggal);
}
