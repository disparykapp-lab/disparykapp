import { useEffect, useMemo, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import LihatTandaTangan from "../../components/LihatTandaTangan";
import { supabase } from "../../lib/supabase";
import {
  ambilSemuaUndangan,
  hapusUndangan,
  hitungRingkasanUndangan,
  perbaruiLokasiPengantaran,
  perbaruiUndangan,
  tambahUndangan,
  tugaskanUndangan,
  LABEL_KATEGORI,
  LABEL_STATUS_UNDANGAN,
  type KategoriUndangan,
  type StatusUndangan,
  type UndanganDenganPic,
  type UndanganInput,
} from "../../lib/undangan";
import type { Profile } from "../../types/database";

export default function DistribusiUndangan() {
  const [rows, setRows] = useState<UndanganDenganPic[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kategoriAktif, setKategoriAktif] = useState<KategoriUndangan | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterPic, setFilterPic] = useState<string>("semua");
  const [cari, setCari] = useState("");

  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [picTugas, setPicTugas] = useState("");
  const [menugaskan, setMenugaskan] = useState(false);
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [tambahTerbuka, setTambahTerbuka] = useState(false);

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

  const ringkasan = useMemo(() => hitungRingkasanUndangan(rows), [rows]);

  const ringkasanPerKategori = useMemo(() => {
    const peta = new Map<KategoriUndangan, { total: number; selesai: number }>();
    for (const r of rows) {
      const ada = peta.get(r.kategori) ?? { total: 0, selesai: 0 };
      ada.total++;
      if (r.status === "selesai") ada.selesai++;
      peta.set(r.kategori, ada);
    }
    return peta;
  }, [rows]);

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

  const rowsKategori = useMemo(
    () => (kategoriAktif ? rows.filter((r) => r.kategori === kategoriAktif) : []),
    [rows, kategoriAktif]
  );

  const rowsTersaring = useMemo(() => {
    return rowsKategori.filter((r) => {
      if (filterStatus !== "semua" && r.status !== filterStatus) return false;
      if (filterPic === "belum_ditugaskan" && r.pic_user_id) return false;
      if (filterPic !== "semua" && filterPic !== "belum_ditugaskan" && r.pic_user_id !== filterPic)
        return false;
      if (cari.trim() && !r.nama.toLowerCase().includes(cari.trim().toLowerCase())) return false;
      return true;
    });
  }, [rowsKategori, filterStatus, filterPic, cari]);

  const kelompok = useMemo(() => {
    const peta = new Map<string, UndanganDenganPic[]>();
    for (const r of rowsTersaring) {
      const key = r.sub_kelompok?.trim() || "Lainnya";
      const arr = peta.get(key) ?? [];
      arr.push(r);
      peta.set(key, arr);
    }
    return Array.from(peta.entries());
  }, [rowsTersaring]);

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

  async function batalkanPenugasanTerpilih() {
    if (terpilih.size === 0) return;
    setMenugaskan(true);
    setError(null);
    try {
      await tugaskanUndangan(Array.from(terpilih), null);
      setTerpilih(new Set());
      setPicTugas("");
      await muat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membatalkan penugasan.");
    } finally {
      setMenugaskan(false);
    }
  }

  async function hapusSatu(r: UndanganDenganPic) {
    if (!confirm(`Hapus undangan "${r.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await hapusUndangan(r.id);
      setTerbuka(null);
      await muat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <HeaderHalaman judul="Distribusi Undangan" />
        <Loading teks="Memuat data undangan..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Distribusi Undangan" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

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

      {kategoriAktif === null ? (
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(LABEL_KATEGORI) as KategoriUndangan[]).map((k) => {
            const r = ringkasanPerKategori.get(k) ?? { total: 0, selesai: 0 };
            return (
              <button
                key={k}
                onClick={() => setKategoriAktif(k)}
                className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-95"
              >
                <p className="text-sm font-semibold text-brand-text">📁 {LABEL_KATEGORI[k]}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-masuk"
                    style={{ width: `${r.total > 0 ? (r.selesai / r.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {r.selesai}/{r.total} selesai
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              setKategoriAktif(null);
              setTerpilih(new Set());
              setTambahTerbuka(false);
            }}
            className="self-start text-sm font-medium text-brand-masuk"
          >
            ← Semua Kategori
          </button>

          <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm">
            <p className="text-sm font-bold text-brand-text">📁 {LABEL_KATEGORI[kategoriAktif]}</p>
            <div className="flex flex-wrap gap-2">
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
            <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama..." />
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
            <button
              onClick={() => void batalkanPenugasanTerpilih()}
              disabled={terpilih.size === 0 || menugaskan}
              className="min-h-[40px] rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              Batalkan Penugasan
            </button>
          </div>

          <button
            onClick={() => setTambahTerbuka((v) => !v)}
            className="min-h-[44px] rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500"
          >
            {tambahTerbuka ? "Batal Tambah" : "+ Tambah Undangan di Kategori Ini"}
          </button>
          {tambahTerbuka && (
            <FormUndangan
              kategoriAwal={kategoriAktif}
              onBatal={() => setTambahTerbuka(false)}
              onSimpan={async (input) => {
                await tambahUndangan(input);
                setTambahTerbuka(false);
                await muat();
              }}
            />
          )}

          <div className="flex flex-col gap-3">
            {kelompok.map(([namaKelompok, list]) => (
              <details
                key={namaKelompok}
                className="group rounded-xl bg-white shadow-sm"
                open={kelompok.length <= 3}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm font-semibold text-brand-text marker:content-none">
                  <span>
                    📂 {namaKelompok} ({list.length})
                  </span>
                  <span className="text-gray-400 transition group-open:rotate-180">▾</span>
                </summary>
                <div className="flex flex-col gap-2 border-t border-gray-100 p-2">
                  {list.map((r) => (
                    <div key={r.id} className="rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={terpilih.has(r.id)}
                          onChange={() => toggleSatu(r.id)}
                          className="h-5 w-5 shrink-0"
                        />
                        <button
                          onClick={() => setTerbuka(terbuka === r.id ? null : r.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-semibold leading-snug text-brand-text">{r.nama}</p>
                          <p className="text-xs text-gray-400">
                            PIC: {r.pic?.nama ?? "belum ditugaskan"}
                          </p>
                        </button>
                        <BadgeStatus status={r.status} />
                      </div>
                      {terbuka === r.id && (
                        <DetailUndangan row={r} onUbah={muat} onHapus={() => void hapusSatu(r)} />
                      )}
                    </div>
                  ))}
                </div>
              </details>
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

function FormUndangan({
  kategoriAwal,
  onBatal,
  onSimpan,
}: {
  kategoriAwal: KategoriUndangan;
  onBatal: () => void;
  onSimpan: (input: UndanganInput) => Promise<void>;
}) {
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<KategoriUndangan>(kategoriAwal);
  const [subKelompok, setSubKelompok] = useState("");
  const [lokasiParkir, setLokasiParkir] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simpan() {
    if (!nama.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    try {
      await onSimpan({
        kategori,
        sub_kelompok: subKelompok.trim() || null,
        nama: nama.trim(),
        lokasi_parkir: lokasiParkir.trim() || null,
      });
      setNama("");
      setSubKelompok("");
      setLokasiParkir("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Nama</span>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Kategori</span>
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value as KategoriUndangan)}
          className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
        >
          {(Object.keys(LABEL_KATEGORI) as KategoriUndangan[]).map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Folder / Sub-kelompok (opsional)</span>
        <input
          value={subKelompok}
          onChange={(e) => setSubKelompok(e.target.value)}
          placeholder="mis. Lurah, Media, dll — bebas, bisa apa saja"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Lokasi Parkir (opsional)</span>
        <input
          value={lokasiParkir}
          onChange={(e) => setLokasiParkir(e.target.value)}
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onBatal}
          className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold text-brand-text"
        >
          Batal
        </button>
        <button
          onClick={() => void simpan()}
          disabled={menyimpan}
          className="flex-1 rounded-lg bg-brand-masuk p-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : "Tambah"}
        </button>
      </div>
    </div>
  );
}

function DetailUndangan({
  row,
  onUbah,
  onHapus,
}: {
  row: UndanganDenganPic;
  onUbah: () => Promise<void>;
  onHapus: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [nama, setNama] = useState(row.nama);
  const [kategori, setKategori] = useState<KategoriUndangan>(row.kategori);
  const [subKelompok, setSubKelompok] = useState(row.sub_kelompok ?? "");
  const [lokasiParkir, setLokasiParkir] = useState(row.lokasi_parkir ?? "");
  const [lokasiPengantaran, setLokasiPengantaran] = useState(row.lokasi_pengantaran ?? "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simpanEdit() {
    if (!nama.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setMenyimpan(true);
    setError(null);
    try {
      await perbaruiUndangan(row.id, {
        kategori,
        sub_kelompok: subKelompok.trim() || null,
        nama: nama.trim(),
        lokasi_parkir: lokasiParkir.trim() || null,
      });
      setEdit(false);
      await onUbah();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function simpanLokasi() {
    setMenyimpan(true);
    setError(null);
    try {
      await perbaruiLokasiPengantaran(row.id, lokasiPengantaran.trim() || null);
      await onUbah();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan lokasi.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (edit) {
    return (
      <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Nama</span>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Kategori</span>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value as KategoriUndangan)}
            className="rounded-lg border border-gray-300 bg-white p-2 text-sm"
          >
            {(Object.keys(LABEL_KATEGORI) as KategoriUndangan[]).map((k) => (
              <option key={k} value={k}>
                {LABEL_KATEGORI[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Folder / Sub-kelompok</span>
          <input
            value={subKelompok}
            onChange={(e) => setSubKelompok(e.target.value)}
            placeholder="mis. Lurah, Media, dll — bebas, bisa apa saja"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Lokasi Parkir (hari-H)</span>
          <input
            value={lokasiParkir}
            onChange={(e) => setLokasiParkir(e.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => setEdit(false)}
            className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold text-brand-text"
          >
            Batal
          </button>
          <button
            onClick={() => void simpanEdit()}
            disabled={menyimpan}
            className="flex-1 rounded-lg bg-brand-masuk p-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {menyimpan ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 p-4">
      {row.lokasi_parkir && (
        <p className="text-xs text-gray-500">Lokasi parkir (hari-H): {row.lokasi_parkir}</p>
      )}
      {row.catatan && <p className="text-xs text-gray-500">Kontak (dari petugas): {row.catatan}</p>}

      {row.tanda_tangan_url && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">
            Bukti penerimaan (tanda tangan)
          </span>
          <LihatTandaTangan path={row.tanda_tangan_url} />
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Lokasi Pengantaran</span>
        <input
          value={lokasiPengantaran}
          onChange={(e) => setLokasiPengantaran(e.target.value)}
          placeholder="mis. Kantor Kelurahan Baciro"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => void simpanLokasi()}
          disabled={menyimpan}
          className="flex-1 rounded-lg bg-brand-masuk p-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : "Simpan Lokasi"}
        </button>
        <button
          onClick={() => setEdit(true)}
          className="rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-brand-text"
        >
          Edit
        </button>
        <button
          onClick={onHapus}
          className="rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600"
        >
          Hapus
        </button>
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
