import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ArrowUpFromLine, Boxes, History, Plus, RotateCcw, Search, X } from "lucide-react";
import HeaderHalaman from "../components/HeaderHalaman";
import { useAuth } from "../contexts/AuthContext";
import { tanggalHariIniWIB } from "../lib/absensi";
import { ambilBarang, ambilMutasiSejak, pulihkanBarang, type LogDenganPelaku, type MutasiDenganPencatat } from "../lib/inventaris";
import { daftarKategori, formatAngka, perluRestok, ringkasan, saringBarang } from "../lib/inventarisAturan";
import type { BarangInventaris, JenisMutasi } from "../types/database";
import { FotoBarang, LencanaStok } from "./inventaris/bersama";
import { KELAS_BARIS_CHIP, kelasChip } from "./inventaris/gaya";
import LembarDetailBarang from "./inventaris/LembarDetailBarang";
import LembarFormBarang from "./inventaris/LembarFormBarang";
import LembarLog from "./inventaris/LembarLog";
import LembarMutasi from "./inventaris/LembarMutasi";
import TabLog from "./inventaris/TabLog";

type Tab = "barang" | "riwayat";
type LembarAktif =
  | { jenis: "detail"; id: string; pesan?: string }
  | { jenis: "form"; id: string | null }
  | { jenis: "mutasi"; id: string; jenisMutasi: JenisMutasi; mutasi: MutasiDenganPencatat | null }
  | { jenis: "log"; log: LogDenganPelaku }
  | null;

const TAB: { id: Tab; label: string; ikon: typeof Boxes }[] = [
  { id: "barang", label: "Barang", ikon: Boxes },
  { id: "riwayat", label: "Riwayat", ikon: History },
];

function KartuBarang({ barang, onBuka, onKeluar }: { barang: BarangInventaris; onBuka: () => void; onKeluar: () => void }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <button type="button" onClick={onBuka} className="flex flex-1 flex-col text-left transition active:scale-[0.98]">
        <span className="relative block">
          <FotoBarang path={barang.foto_path} kecil alt={barang.nama} className="aspect-square w-full" />
          <LencanaStok barang={barang} className="absolute left-2 top-2 shadow-sm" />
        </span>
        <span className="flex flex-1 flex-col gap-0.5 p-3 pr-12">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-brand-text">{barang.nama}</span>
          {barang.kategori && <span className="truncate text-[11px] text-gray-400">{barang.kategori}</span>}
          <span className="mt-auto pt-1 text-lg font-extrabold leading-tight tabular-nums text-brand-text">
            {formatAngka(barang.stok)} <span className="text-xs font-semibold text-gray-400">{barang.satuan}</span>
          </span>
        </span>
      </button>
      {barang.stok > 0 && (
        <button
          type="button"
          onClick={onKeluar}
          aria-label={`Catat keluar ${barang.nama}`}
          title="Catat keluar"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-lnd-sky text-brand-masuk transition active:scale-90"
        >
          <ArrowUpFromLine size={16} />
        </button>
      )}
    </div>
  );
}

/** Inventaris barang (mis. merchandise promosi): stok, foto, catatan masuk/keluar, dan log CRUD. */
export default function Inventaris() {
  const idDasar = useId();
  const { profile } = useAuth();
  const hariIni = tanggalHariIniWIB();
  const [tab, setTab] = useState<Tab>("barang");
  const [barang, setBarang] = useState<BarangInventaris[] | null>(null);
  const [mutasiBulan, setMutasiBulan] = useState<Awaited<ReturnType<typeof ambilMutasiSejak>>>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [saringan, setSaringan] = useState("semua");
  const [lembar, setLembar] = useState<LembarAktif>(null);
  const [versiLog, setVersiLog] = useState(0);
  const [kabar, setKabar] = useState<{ teks: string; urungkan?: string } | null>(null);

  const muat = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([ambilBarang(), ambilMutasiSejak(`${hariIni.slice(0, 8)}01`)]);
      setBarang(b);
      setMutasiBulan(m);
      setGalat(null);
      return b;
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Data inventaris gagal dimuat.");
      setBarang((lama) => lama ?? []);
      return null;
    }
  }, [hariIni]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const daftar = useMemo(() => barang ?? [], [barang]);
  const kategori = useMemo(() => daftarKategori(daftar), [daftar]);
  const tampil = useMemo(() => saringBarang(daftar, cari, saringan), [daftar, cari, saringan]);
  const r = ringkasan(daftar, mutasiBulan);
  const cariById = (id: string) => daftar.find((b) => b.id === id) ?? null;

  /** Setelah ada perubahan: muat ulang stok & log. */
  async function segarkan() {
    setVersiLog((v) => v + 1);
    return muat();
  }

  async function urungkanHapus(id: string) {
    setKabar(null);
    try {
      await pulihkanBarang(id);
      await segarkan();
      setLembar({ jenis: "detail", id, pesan: "Barang dipulihkan." });
    } catch (e) {
      setKabar({ teks: e instanceof Error ? e.message : "Gagal memulihkan barang." });
    }
  }

  const bukaLembar = lembar?.jenis === "detail" || lembar?.jenis === "form" || lembar?.jenis === "mutasi" ? lembar : null;
  const barangLembar = bukaLembar && bukaLembar.id ? cariById(bukaLembar.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman
        judul="Inventaris"
        kembaliKe="/beranda"
        aksi={
          <button
            type="button"
            onClick={() => setLembar({ jenis: "form", id: null })}
            className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-bold text-brand-masuk shadow-sm transition active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} /> Barang
          </button>
        }
      />

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon_inventaris.png" alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-bold text-brand-text">Inventaris barang</p>
            <p className="text-xs text-gray-500">Merchandise & barang promosi — catat yang masuk dan keluar, lengkap dengan fotonya.</p>
          </div>
        </div>
        <div role="tablist" aria-label="Bagian inventaris" className="grid grid-cols-2 gap-1.5 rounded-full bg-gray-100 p-1 lg:w-80 lg:shrink-0">
          {TAB.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${idDasar}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${idDasar}-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-brand-masuk text-white" : "text-gray-500"
              }`}
            >
              <t.ikon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </section>

      {kabar && (
        <div role="status" className="anim-buka flex items-center gap-3 rounded-2xl bg-gray-900 p-3 pl-4 text-sm text-white shadow-md">
          <p className="min-w-0 flex-1">{kabar.teks}</p>
          {kabar.urungkan && (
            <button
              type="button"
              onClick={() => void urungkanHapus(kabar.urungkan!)}
              className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-bold"
            >
              <RotateCcw size={14} /> Urungkan
            </button>
          )}
          <button type="button" onClick={() => setKabar(null)} aria-label="Tutup pesan" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70">
            <X size={16} />
          </button>
        </div>
      )}

      {galat && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{galat}</p>}

      <div role="tabpanel" id={`${idDasar}-panel-barang`} aria-labelledby={`${idDasar}-tab-barang`} hidden={tab !== "barang"} className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-extrabold leading-none tabular-nums text-brand-text">{barang ? formatAngka(r.jenis) : "–"}</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-gray-500">Jenis barang</p>
          </div>
          <button
            type="button"
            onClick={() => setSaringan((s) => (s === "restok" ? "semua" : "restok"))}
            aria-pressed={saringan === "restok"}
            disabled={r.restok === 0}
            className={`rounded-2xl p-3 text-left shadow-sm transition active:scale-95 disabled:active:scale-100 ${
              saringan === "restok" ? "bg-amber-400 text-amber-950" : r.restok > 0 ? "bg-amber-50 text-amber-800" : "bg-white text-brand-text"
            }`}
          >
            <p className="text-2xl font-extrabold leading-none tabular-nums">{barang ? formatAngka(r.restok) : "–"}</p>
            <p className={`mt-1 text-[11px] font-semibold leading-tight ${r.restok > 0 ? "" : "text-gray-500"}`}>Perlu restok</p>
          </button>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-extrabold leading-none tabular-nums text-brand-masuk">{barang ? formatAngka(r.keluarBulanIni) : "–"}</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-gray-500">Keluar bulan ini</p>
          </div>
        </div>

        {daftar.length > 0 && (
          <>
            <label className="flex items-center gap-2 rounded-2xl bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-masuk/30">
              <Search size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari barang, kategori, keterangan…"
                aria-label="Cari barang"
                className="min-h-[48px] w-full min-w-0 bg-transparent text-base outline-none"
              />
            </label>
            <div className={KELAS_BARIS_CHIP} role="group" aria-label="Saring barang">
              <button type="button" aria-pressed={saringan === "semua"} onClick={() => setSaringan("semua")} className={kelasChip(saringan === "semua")}>
                Semua ({daftar.length})
              </button>
              {r.restok > 0 && (
                <button type="button" aria-pressed={saringan === "restok"} onClick={() => setSaringan("restok")} className={kelasChip(saringan === "restok")}>
                  Perlu restok ({r.restok})
                </button>
              )}
              {kategori.map((k) => {
                const id = `kategori:${k.nama}`;
                return (
                  <button key={k.nama} type="button" aria-pressed={saringan === id} onClick={() => setSaringan(saringan === id ? "semua" : id)} className={kelasChip(saringan === id)}>
                    {k.nama} ({k.jumlah})
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!barang && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {barang && daftar.length === 0 && !galat && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
            <img src="/icon_inventaris.png" alt="" className="h-24 w-24 rounded-full object-cover" />
            <div>
              <p className="font-bold text-brand-text">Belum ada barang</p>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan menambahkan merchandise pertama — fotonya, stoknya sekarang, selesai.</p>
            </div>
            <button
              type="button"
              onClick={() => setLembar({ jenis: "form", id: null })}
              className="flex min-h-[48px] items-center gap-2 rounded-xl bg-brand-masuk px-5 text-sm font-bold text-white shadow-sm transition active:scale-95"
            >
              <Plus size={18} /> Tambah barang
            </button>
          </div>
        )}

        {daftar.length > 0 && tampil.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-brand-text">Tidak ada barang yang cocok.</p>
            <button
              type="button"
              onClick={() => {
                setCari("");
                setSaringan("semua");
              }}
              className="text-sm font-semibold text-brand-masuk"
            >
              Tampilkan semua barang
            </button>
          </div>
        )}

        {tampil.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tampil.map((b) => (
              <KartuBarang
                key={b.id}
                barang={b}
                onBuka={() => setLembar({ jenis: "detail", id: b.id })}
                onKeluar={() => setLembar({ jenis: "mutasi", id: b.id, jenisMutasi: "keluar", mutasi: null })}
              />
            ))}
          </div>
        )}

        {daftar.some(perluRestok) && saringan !== "restok" && tampil.length > 0 && (
          <p className="text-center text-[11px] text-gray-400">Tanda “Menipis” muncul saat stok sudah di bawah batas yang diatur per barang.</p>
        )}
      </div>

      <div role="tabpanel" id={`${idDasar}-panel-riwayat`} aria-labelledby={`${idDasar}-tab-riwayat`} hidden={tab !== "riwayat"}>
        {tab === "riwayat" && <TabLog hariIni={hariIni} versi={versiLog} onBuka={(log) => setLembar({ jenis: "log", log })} />}
      </div>

      {/* ---------- lembar (satu yang tampil sekaligus) ---------- */}

      {lembar?.jenis === "detail" && barangLembar && (
        <LembarDetailBarang
          barang={barangLembar}
          hariIni={hariIni}
          pesan={lembar.pesan ?? null}
          onTutup={() => setLembar(null)}
          onCatat={(j) => setLembar({ jenis: "mutasi", id: barangLembar.id, jenisMutasi: j, mutasi: null })}
          onBukaCatatan={(m) => setLembar({ jenis: "mutasi", id: barangLembar.id, jenisMutasi: m.jenis, mutasi: m })}
          onUbah={() => setLembar({ jenis: "form", id: barangLembar.id })}
          onDihapus={() => {
            setLembar(null);
            setKabar({ teks: `${barangLembar.nama} dihapus dari daftar.`, urungkan: barangLembar.id });
            void segarkan();
          }}
        />
      )}

      {lembar?.jenis === "form" && (lembar.id === null || barangLembar) && (
        <LembarFormBarang
          barang={lembar.id ? barangLembar : null}
          namaLain={daftar.filter((b) => b.id !== lembar.id).map((b) => b.nama)}
          kategoriAda={kategori.map((k) => k.nama)}
          onTutup={() => setLembar(lembar.id ? { jenis: "detail", id: lembar.id } : null)}
          onTersimpan={async (id) => {
            await segarkan();
            setLembar({ jenis: "detail", id, pesan: lembar.id ? "Perubahan tersimpan." : "Barang baru tersimpan." });
          }}
        />
      )}

      {lembar?.jenis === "mutasi" && barangLembar && (
        <LembarMutasi
          barang={barangLembar}
          jenisAwal={lembar.jenisMutasi}
          mutasi={lembar.mutasi}
          bolehUbah={!lembar.mutasi || profile?.role === "admin" || lembar.mutasi.user_id === profile?.id}
          hariIni={hariIni}
          onKembali={() => setLembar({ jenis: "detail", id: barangLembar.id })}
          onTutup={() => setLembar(null)}
          onTersimpan={async (pesan) => {
            await segarkan();
            setLembar({ jenis: "detail", id: barangLembar.id, pesan });
          }}
        />
      )}

      {lembar?.jenis === "log" && (
        <LembarLog
          log={lembar.log}
          hariIni={hariIni}
          onTutup={() => setLembar(null)}
          onBukaBarang={(b) => setLembar({ jenis: "detail", id: b.id })}
          onDipulihkan={async (b) => {
            await segarkan();
            setLembar({ jenis: "detail", id: b.id, pesan: "Barang dipulihkan." });
          }}
        />
      )}
    </div>
  );
}
