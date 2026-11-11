import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import { supabase } from "../../lib/supabase";
import { tanggalHariIniWIB } from "../../lib/absensi";
import type { BarisAbsensi } from "../../lib/rekap";
import { ambilAbsensiTinjau, ambilPegawaiTinjau, urlFotoAbsensi } from "../../lib/tinjauAbsen";
import { hariKerja } from "../../lib/izinAturan";
import { hitungKategori, susunKartu, type Kategori, type KartuTinjau, type PegawaiTinjau } from "../../lib/tinjauAbsenAturan";
import type { Divisi } from "../../types/database";
import PilihTanggal from "./tinjau/PilihTanggal";
import KartuAbsen from "./tinjau/KartuAbsen";
import DetailAbsen from "./tinjau/DetailAbsen";

type Saring = Kategori | "semua";
type Kartu = KartuTinjau<BarisAbsensi>;

/** Kotak ringkasan = legenda warna garis kartu = tombol saring. */
const KOTAK: { id: Saring; label: string; garis: string; aktif: string }[] = [
  { id: "semua", label: "Semua", garis: "ring-1 ring-black/5", aktif: "bg-brand-masuk text-white ring-brand-masuk" },
  { id: "belum", label: "Belum absen", garis: "ring-2 ring-gray-900", aktif: "bg-gray-900 text-white ring-gray-900" },
  { id: "telat", label: "Telat", garis: "ring-2 ring-amber-400", aktif: "bg-amber-400 text-amber-950 ring-amber-400" },
  { id: "izin", label: "Izin/Sakit", garis: "ring-2 ring-red-500", aktif: "bg-red-500 text-white ring-red-500" },
  { id: "hadir", label: "Hadir", garis: "ring-1 ring-black/5", aktif: "bg-brand-masuk text-white ring-brand-masuk" },
];

const KOSONG: Record<Saring, string> = {
  semua: "Tidak ada data pada tanggal ini.",
  belum: "Semua sudah absen 🎉",
  telat: "Tidak ada yang telat.",
  izin: "Tidak ada yang izin/sakit.",
  hadir: "Belum ada yang hadir.",
};

const fmtGrup = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const UMUR_FOTO_MS = 50 * 60 * 1000; // URL foto berlaku 1 jam; minta ulang sebelum kedaluwarsa

export default function TinjauAbsensi() {
  const [hariIni] = useState(tanggalHariIniWIB);
  const [dari, setDari] = useState(hariIni);
  const [sampai, setSampai] = useState(hariIni);

  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [pegawai, setPegawai] = useState<PegawaiTinjau[] | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [error, setError] = useState<string | null>(null);
  // rentang yang datanya sudah dimuat; beda dengan rentang terpilih = sedang memuat
  const [dimuat, setDimuat] = useState<string | null>(null);
  const loading = dimuat !== `${dari}|${sampai}`;

  const [divisiId, setDivisiId] = useState("semua");
  const [saring, setSaring] = useState<Saring>("semua");
  const [cari, setCari] = useState("");
  const [dibuka, setDibuka] = useState<string | null>(null);

  const [fotoUrl, setFotoUrl] = useState<Record<string, string | null>>({});
  const sudahDiminta = useRef(new Set<string>());
  const waktuFoto = useRef(0);
  const nomorMuat = useRef(0);

  useEffect(() => {
    ambilPegawaiTinjau()
      .then(setPegawai)
      .catch((e: unknown) => {
        setPegawai([]);
        setError(e instanceof Error ? e.message : "Gagal memuat daftar pegawai.");
      });
    supabase
      .from("divisi")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setDivisiList((data as Divisi[]) ?? []));
  }, []);

  const muat = useCallback(async () => {
    const ke = ++nomorMuat.current;
    let data: BarisAbsensi[] = [];
    let galat: string | null = null;
    try {
      data = await ambilAbsensiTinjau(dari, sampai);
    } catch (e) {
      galat = e instanceof Error ? e.message : "Gagal memuat absensi.";
    }
    if (ke !== nomorMuat.current) return; // sudah ada permintaan yang lebih baru
    if (waktuFoto.current && Date.now() - waktuFoto.current > UMUR_FOTO_MS) {
      sudahDiminta.current.clear();
      waktuFoto.current = 0;
      setFotoUrl({});
    }
    setRows(data);
    setError(galat);
    setDimuat(`${dari}|${sampai}`);
  }, [dari, sampai]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const semuaKartu = useMemo(
    () => (pegawai ? susunKartu(rows, pegawai, dari, sampai, hariIni) : []),
    [rows, pegawai, dari, sampai, hariIni]
  );

  const cariNormal = cari.trim().toLowerCase();
  const cocokCari = useMemo(
    () => (cariNormal ? semuaKartu.filter((k) => k.nama.toLowerCase().includes(cariNormal)) : semuaKartu),
    [semuaKartu, cariNormal]
  );
  const perDivisi = useMemo(() => {
    const n: Record<string, number> = {};
    for (const k of cocokCari) if (k.divisiId) n[k.divisiId] = (n[k.divisiId] ?? 0) + 1;
    return n;
  }, [cocokCari]);
  const diDivisi = useMemo(
    () => (divisiId === "semua" ? cocokCari : cocokCari.filter((k) => k.divisiId === divisiId)),
    [cocokCari, divisiId]
  );
  const hitungan = hitungKategori(diDivisi);
  const tampil = useMemo(() => (saring === "semua" ? diDivisi : diDivisi.filter((k) => k.kategori === saring)), [diDivisi, saring]);
  const bisaDibuka = useMemo(() => tampil.filter((k): k is Kartu & { row: BarisAbsensi } => k.row !== null), [tampil]);

  // URL foto absen untuk kartu yang tampil (sekali minta per foto; gambar dimuat malas oleh browser)
  useEffect(() => {
    const perlu: string[] = [];
    for (const k of bisaDibuka) {
      for (const p of [k.row.masuk_foto_path, k.row.keluar_foto_path]) {
        if (p && !sudahDiminta.current.has(p)) {
          sudahDiminta.current.add(p);
          perlu.push(p);
        }
      }
    }
    if (perlu.length === 0) return;
    if (!waktuFoto.current) waktuFoto.current = Date.now();
    void urlFotoAbsensi(perlu).then((h) => setFotoUrl((m) => ({ ...m, ...h })));
  }, [bisaDibuka]);

  const petaPegawai = useMemo(() => new Map((pegawai ?? []).map((p) => [p.id, p])), [pegawai]);
  const petaDivisi = useMemo(() => new Map(divisiList.map((d) => [d.id, d.nama])), [divisiList]);
  const namaDivisi = (id: string | null) => (id ? (petaDivisi.get(id) ?? null) : null);

  const grup = useMemo(() => {
    const hasil: { tanggal: string; kartu: Kartu[] }[] = [];
    for (const k of tampil) {
      const akhir = hasil[hasil.length - 1];
      if (akhir && akhir.tanggal === k.tanggal) akhir.kartu.push(k);
      else hasil.push({ tanggal: k.tanggal, kartu: [k] });
    }
    return hasil;
  }, [tampil]);

  const posisi = dibuka ? bisaDibuka.findIndex((k) => k.kunci === dibuka) : -1;
  const kartuDibuka = posisi >= 0 ? bisaDibuka[posisi] : null;
  const satuHari = dari === sampai;
  const tutupDetail = useCallback(() => setDibuka(null), []);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman judul="Tinjau Absensi" />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PilihTanggal
          dari={dari}
          sampai={sampai}
          hariIni={hariIni}
          onUbah={(d, s) => {
            setDari(d);
            setSampai(s);
            setDibuka(null);
          }}
        />

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pl-0.5 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]"
              role="group"
              aria-label="Saring divisi"
            >
              {[{ id: "semua", nama: "Semua divisi" }, ...divisiList].map((d) => {
                const aktif = divisiId === d.id;
                const n = d.id === "semua" ? cocokCari.length : (perDivisi[d.id] ?? 0);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => setDivisiId(d.id)}
                    className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 ${
                      aktif ? "bg-brand-masuk text-white shadow-sm" : "bg-white text-brand-text shadow-sm ring-1 ring-black/5"
                    }`}
                  >
                    {d.nama}
                    <span className={`rounded-full px-1.5 text-[11px] ${aktif ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="w-11 shrink-0 has-[input]:w-44 sm:has-[input]:w-56">
              <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama…" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Saring kehadiran">
            {KOTAK.map((k) => {
              const aktif = saring === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => setSaring(aktif && k.id !== "semua" ? "semua" : k.id)}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition active:scale-95 ${
                    aktif ? `${k.aktif} shadow-md` : `bg-white text-brand-text shadow-sm ${k.garis}`
                  }`}
                >
                  <span className="text-xl font-bold leading-none">{loading || !pegawai ? "–" : hitungan[k.id]}</span>
                  <span className={`mt-1 text-[11px] font-medium leading-tight ${aktif ? "" : "text-gray-500"}`}>{k.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading || !pegawai ? (
        <Loading teks="Memuat data absensi..." />
      ) : tampil.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          {saring === "semua" && satuHari && !hariKerja(dari) ? "Akhir pekan — tidak ada yang wajib absen." : KOSONG[saring]}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {grup.map((g) => {
            const belum = g.kartu.filter((k) => k.kategori === "belum").length;
            return (
              <section key={g.tanggal} className="flex flex-col gap-3" aria-label={fmtGrup.format(new Date(`${g.tanggal}T00:00:00Z`))}>
                {!satuHari && (
                  <h2 className="flex items-baseline gap-2 text-sm font-bold capitalize text-brand-text">
                    {fmtGrup.format(new Date(`${g.tanggal}T00:00:00Z`))}
                    <span className="text-xs font-normal normal-case text-gray-400">
                      {g.kartu.length} orang{belum > 0 && saring !== "belum" ? ` · ${belum} belum absen` : ""}
                    </span>
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-3 px-0.5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.kartu.map((k) => (
                    <KartuAbsen
                      key={k.kunci}
                      kartu={k}
                      fotoUrl={fotoUrl}
                      fotoProfil={petaPegawai.get(k.userId)?.foto_url}
                      namaDivisi={divisiId === "semua" ? namaDivisi(k.divisiId) : null}
                      onBuka={() => setDibuka(k.kunci)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {kartuDibuka && (
        <DetailAbsen
          kartu={kartuDibuka}
          posisi={posisi}
          total={bisaDibuka.length}
          fotoUrl={fotoUrl}
          fotoProfil={petaPegawai.get(kartuDibuka.userId)?.foto_url}
          namaDivisi={namaDivisi(kartuDibuka.divisiId)}
          onSebelum={posisi > 0 ? () => setDibuka(bisaDibuka[posisi - 1].kunci) : null}
          onBerikut={posisi < bisaDibuka.length - 1 ? () => setDibuka(bisaDibuka[posisi + 1].kunci) : null}
          onTutup={tutupDetail}
          onUbah={muat}
        />
      )}
    </div>
  );
}
