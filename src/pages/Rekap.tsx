import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/Loading";
import { ambilAbsensiRentang, hitungRingkasan, type BarisAbsensi } from "../lib/rekap";
import { unduhExcelRekap } from "../lib/excel";
import { kirimKlarifikasiAbsensi } from "../lib/absensi";
import { formatTanggal, keYMD, rentangBulan, rentangMinggu } from "../lib/tanggal";
import { supabase } from "../lib/supabase";
import { LABEL_STATUS_ABSEN } from "../lib/absensiMeta";
import HeaderHalaman from "../components/HeaderHalaman";
import GrafikKerajinan from "../components/GrafikKerajinan";
import { hitungPeringkat, unduhGambarPeringkat } from "../lib/peringkat";
import type { Divisi, Profile } from "../types/database";

/** "yyyy-MM-dd" -> Date tengah malam waktu lokal (bukan UTC) supaya tanggal tidak meleset. */
function ambilTanggal(ymd: string): Date {
  const [tahun, bulan, tgl] = ymd.split("-").map(Number);
  return new Date(tahun, bulan - 1, tgl);
}

export default function Rekap() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // dariInput/sampaiInput = isian tanggal di form; dari/sampai = rentang yang
  // benar-benar dipakai (baru berubah saat "Terapkan" ditekan). Default: minggu ini.
  const [awal] = useState(() => rentangMinggu(new Date()));
  const [dariInput, setDariInput] = useState(keYMD(awal.dari));
  const [sampaiInput, setSampaiInput] = useState(keYMD(awal.sampai));
  const [dari, setDari] = useState(awal.dari);
  const [sampai, setSampai] = useState(awal.sampai);
  const [errorTanggal, setErrorTanggal] = useState<string | null>(null);
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mengekspor, setMengekspor] = useState(false);
  const [mengunduhGambar, setMengunduhGambar] = useState(false);

  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [pegawaiId, setPegawaiId] = useState<string>("semua");
  const [divisiId, setDivisiId] = useState<string>("semua");

  const [editId, setEditId] = useState<string | null>(null);
  const [formCatatan, setFormCatatan] = useState("");
  const [formBukti, setFormBukti] = useState("");
  const [mengirimKlarifikasi, setMengirimKlarifikasi] = useState(false);
  const [errorKlarifikasi, setErrorKlarifikasi] = useState<string | null>(null);

  function terapkanRentang(dariYmd = dariInput, sampaiYmd = sampaiInput) {
    if (!dariYmd || !sampaiYmd) {
      setErrorTanggal("Isi tanggal mulai dan tanggal akhir dulu.");
      return;
    }
    if (dariYmd > sampaiYmd) {
      setErrorTanggal("Tanggal mulai tidak boleh setelah tanggal akhir.");
      return;
    }
    setErrorTanggal(null);
    setDari(ambilTanggal(dariYmd));
    setSampai(ambilTanggal(sampaiYmd));
  }

  function pakaiPreset(rentang: { dari: Date; sampai: Date }) {
    const d = keYMD(rentang.dari);
    const s = keYMD(rentang.sampai);
    setDariInput(d);
    setSampaiInput(s);
    terapkanRentang(d, s);
  }

  const adaPerubahanBelumDiterapkan =
    dariInput !== keYMD(dari) || sampaiInput !== keYMD(sampai);

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

  async function muatUlang() {
    if (!profile) return;
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

    try {
      const data = await ambilAbsensiRentang({ dari, sampai, userIds });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat rekap.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isAdmin, pegawaiId, divisiId, pegawaiList, dari, sampai]);

  const wajibAbsen =
    pegawaiId !== "semua"
      ? (pegawaiList.find((p) => p.id === pegawaiId)?.wajib_absen !== false)
      : (profile?.wajib_absen !== false);
  const ringkasan = useMemo(
    () => hitungRingkasan(rows, dari, sampai, wajibAbsen),
    [rows, dari, sampai, wajibAbsen]
  );
  const pegawaiDivisi = pegawaiList.filter((p) => divisiId === "semua" || p.divisi_id === divisiId);
  const pegawaiWajib = pegawaiDivisi.filter((p) => p.wajib_absen !== false);
  const tampilkanPerPegawai = isAdmin && pegawaiId === "semua";

  function bukaFormKlarifikasi(r: BarisAbsensi) {
    setEditId(editId === r.id ? null : r.id);
    setFormCatatan(r.catatan_klarifikasi ?? "");
    setFormBukti(r.bukti_url ?? "");
    setErrorKlarifikasi(null);
  }

  async function kirimKlarifikasi(tanggal: string) {
    if (formCatatan.trim().length < 3) {
      setErrorKlarifikasi("Isi keterangan dulu (minimal 3 huruf).");
      return;
    }
    setMengirimKlarifikasi(true);
    setErrorKlarifikasi(null);
    try {
      await kirimKlarifikasiAbsensi(tanggal, formCatatan.trim(), formBukti.trim());
      setEditId(null);
      await muatUlang();
    } catch (e) {
      setErrorKlarifikasi(e instanceof Error ? e.message : "Gagal mengirim keterangan.");
    } finally {
      setMengirimKlarifikasi(false);
    }
  }

  async function unduhPeringkat() {
    setMengunduhGambar(true);
    setError(null);
    try {
      await unduhGambarPeringkat({
        daftar: hitungPeringkat(rows, pegawaiWajib, dari, sampai),
        dari,
        sampai,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat gambar peringkat.");
    } finally {
      setMengunduhGambar(false);
    }
  }

  async function eksporExcel() {
    setMengekspor(true);
    try {
      await unduhExcelRekap({
        namaFile: `rekap-${keYMD(dari)}_sd_${keYMD(sampai)}`,
        judul: "Rekap Absensi — Dinas Pariwisata Kota Yogyakarta",
        periode: `${formatTanggal(dari, "d MMM yyyy")} – ${formatTanggal(sampai, "d MMM yyyy")}`,
        sertakanNama: isAdmin,
        rows,
        ringkasan: tampilkanPerPegawai ? undefined : ringkasan,
      });
    } finally {
      setMengekspor(false);
    }
  }

  const jumlahKolom = (isAdmin ? 5 : 4) + 1;

  return (
    <div className="flex flex-col gap-5 print:gap-3">
      <div className="print:hidden">
        <HeaderHalaman judul="Rekap Absensi" kembaliKe="/beranda" />
      </div>
      <h1 className="hidden text-xl font-bold text-brand-text print:block">Rekap Absensi</h1>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm print:hidden">
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
            onClick={() => terapkanRentang()}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold transition ${
              adaPerubahanBelumDiterapkan
                ? "bg-brand-masuk text-white"
                : "border border-gray-300 bg-white text-gray-400"
            }`}
          >
            Terapkan
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400">Cepat:</span>
          <button
            onClick={() => pakaiPreset(rentangMinggu(new Date()))}
            className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600"
          >
            Minggu ini
          </button>
          <button
            onClick={() => pakaiPreset(rentangBulan(new Date()))}
            className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600"
          >
            Bulan ini
          </button>
        </div>
        {errorTanggal && <p className="text-xs text-red-600">{errorTanggal}</p>}
        <p className="text-xs text-gray-400">
          Menampilkan:{" "}
          <strong className="text-gray-600">
            {formatTanggal(dari, "d MMM yyyy")} – {formatTanggal(sampai, "d MMM yyyy")}
          </strong>
          {adaPerubahanBelumDiterapkan && (
            <span className="ml-1 text-amber-600">(ada perubahan tanggal, tekan Terapkan)</span>
          )}
        </p>
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
          {isAdmin && !tampilkanPerPegawai && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <KartuRingkasan label="Hadir" nilai={ringkasan.hadir} warna="text-brand-masuk" />
              <KartuRingkasan label="Telat" nilai={ringkasan.telat} warna="text-brand-pulang" />
              <KartuRingkasan label="Dinas Luar" nilai={ringkasan.dinasLuar} warna="text-brand-info" />
              <KartuRingkasan label="Izin/Sakit" nilai={ringkasan.izin} warna="text-yellow-600" />
              <KartuRingkasan label="Tidak Absen" nilai={ringkasan.tidakAbsen} warna="text-gray-500" />
            </div>
          )}
          {isAdmin && !tampilkanPerPegawai && (
            <p className="text-sm text-gray-500">
              Total jam kerja: <strong>{ringkasan.totalJamKerja.toFixed(1)} jam</strong>
            </p>
          )}

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => void eksporExcel()}
              disabled={mengekspor}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text disabled:opacity-60"
            >
              <img src="/icon_excel.png" alt="" className="-ml-1 h-9 w-9 object-contain" />
              {mengekspor ? "Menyiapkan..." : "Ekspor Excel"}
            </button>
            {isAdmin && tampilkanPerPegawai && (
              <button
                onClick={() => void unduhPeringkat()}
                disabled={mengunduhGambar || pegawaiWajib.length === 0}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text disabled:opacity-60"
              >
                <img src="/icon_album.png" alt="" className="h-7 w-7 object-contain" />
                {mengunduhGambar ? "Membuat gambar..." : "Unduh Peringkat Terajin"}
              </button>
            )}
          </div>

          {isAdmin && tampilkanPerPegawai && (
            <div className="print:hidden">
              <GrafikKerajinan
                key={`${dari.getTime()}-${sampai.getTime()}-${divisiId}`}
                rows={rows}
                pegawai={pegawaiWajib}
                dikecualikan={pegawaiDivisi.length - pegawaiWajib.length}
                dari={dari}
                sampai={sampai}
              />
            </div>
          )}

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  {isAdmin && <th className="p-3">Nama</th>}
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Masuk</th>
                  <th className="p-3">Pulang</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 print:hidden">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-gray-50 last:border-0">
                      {isAdmin && <td className="p-3">{r.profiles?.nama ?? "-"}</td>}
                      <td className="p-3">{formatTanggal(r.tanggal)}</td>
                      <td className="p-3">{r.masuk_at ? formatJam(r.masuk_at) : "-"}</td>
                      <td className="p-3">{r.keluar_at ? formatJam(r.keluar_at) : "-"}</td>
                      <td className="p-3">
                        {LABEL_STATUS_ABSEN[r.status] ?? r.status}
                        {r.ditandai && <span className="ml-1 text-red-500">⚑</span>}
                      </td>
                      <td className="p-3 print:hidden">
                        {r.user_id === profile?.id ? (
                          <button
                            onClick={() => bukaFormKlarifikasi(r)}
                            className="text-xs font-medium text-brand-info"
                          >
                            {r.catatan_klarifikasi ? "✓ Lihat/Ubah" : "+ Keterangan"}
                          </button>
                        ) : r.catatan_klarifikasi ? (
                          <span className="text-xs text-gray-400">Ada keterangan</span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                    {editId === r.id && (
                      <tr className="border-b border-gray-50 bg-brand-bg print:hidden">
                        <td colSpan={jumlahKolom} className="p-3">
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-gray-600">
                              Keterangan (mis. alasan tidak absen / sakit / izin)
                            </label>
                            <textarea
                              value={formCatatan}
                              onChange={(e) => setFormCatatan(e.target.value)}
                              rows={2}
                              className="rounded-lg border border-gray-300 p-2 text-sm"
                              placeholder="Contoh: Sakit demam, surat keterangan dokter terlampir"
                            />
                            <label className="text-xs font-medium text-gray-600">
                              Link bukti (opsional — link Google Drive/foto/dokumen)
                            </label>
                            <input
                              value={formBukti}
                              onChange={(e) => setFormBukti(e.target.value)}
                              className="rounded-lg border border-gray-300 p-2 text-sm"
                              placeholder="https://drive.google.com/..."
                            />
                            {errorKlarifikasi && (
                              <p className="text-xs text-red-600">{errorKlarifikasi}</p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditId(null)}
                                className="min-h-[36px] flex-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-brand-text"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => void kirimKlarifikasi(r.tanggal)}
                                disabled={mengirimKlarifikasi}
                                className="min-h-[36px] flex-1 rounded-lg bg-brand-masuk text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {mengirimKlarifikasi ? "Menyimpan..." : "Simpan"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={jumlahKolom} className="p-6 text-center text-gray-400">
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
