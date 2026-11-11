import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import SearchBarAnimasi from "../../components/SearchBarAnimasi";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { usePresence } from "../../contexts/PresenceContext";
import { tanggalHariIniWIB } from "../../lib/absensi";
import {
  KOTAK_PEGAWAI,
  TANPA_DIVISI,
  cocokCari,
  cocokDivisi,
  cocokSaring,
  hitungKotak,
  urutkanPegawai,
  type SaringPegawai,
} from "../../lib/pegawaiAturan";
import type { Divisi, Profile } from "../../types/database";
import KartuPegawai from "./pegawai/KartuPegawai";
import DetailPegawai, { type Perubahan } from "./pegawai/DetailPegawai";
import FormTambah, { type PegawaiBaru } from "./pegawai/FormTambah";

const KOSONG: Record<SaringPegawai, string> = {
  semua: "Tidak ada pegawai di sini.",
  online: "Belum ada yang online.",
  admin: "Tidak ada admin di sini.",
  magang: "Tidak ada anak magang di sini.",
  nonaktif: "Tidak ada akun nonaktif.",
};

export default function Pegawai() {
  const { profile: saya } = useAuth();
  const { onlineIds } = usePresence();
  const [hariIni] = useState(tanggalHariIniWIB);
  const [list, setList] = useState<Profile[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [dimuat, setDimuat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saring, setSaring] = useState<SaringPegawai>("semua");
  const [divisi, setDivisi] = useState("semua");
  const [cari, setCari] = useState("");
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [tambah, setTambah] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const waktuToast = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let aktif = true;
    void Promise.all([
      supabase.from("profiles").select("*").order("nama"),
      supabase.from("divisi").select("*").order("nama"),
    ]).then(([p, d]) => {
      if (!aktif) return;
      setError(p.error?.message ?? d.error?.message ?? null);
      setList((p.data as Profile[]) ?? []);
      setDivisiList((d.data as Divisi[]) ?? []);
      setDimuat(true);
    });
    const toastSekarang = waktuToast;
    return () => {
      aktif = false;
      if (toastSekarang.current) clearTimeout(toastSekarang.current);
    };
  }, []);

  function beriTahu(pesan: string) {
    if (waktuToast.current) clearTimeout(waktuToast.current);
    setToast(pesan);
    waktuToast.current = setTimeout(() => setToast(null), 2200);
  }

  async function simpan(id: string, perubahan: Perubahan) {
    const { data, error } = await supabase.from("profiles").update(perubahan).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    setList((l) => l.map((p) => (p.id === id ? { ...p, ...(data as Profile) } : p)));
    beriTahu("Tersimpan");
  }

  async function hapus(id: string) {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setDibuka(null);
    setList((l) => l.filter((p) => p.id !== id));
    beriTahu("Pegawai dihapus");
  }

  async function daftarkan(baru: PegawaiBaru) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ ...baru, role: "user" })
      .select()
      .single();
    if (error) throw new Error(error.message.includes("duplicate") ? "Email ini sudah terdaftar." : error.message);
    setList((l) => [...l, data as Profile]);
    setTambah(false);
    beriTahu(`${baru.nama} didaftarkan`);
  }

  const petaDivisi = useMemo(() => new Map(divisiList.map((d) => [d.id, d.nama])), [divisiList]);
  const hasilCari = useMemo(() => list.filter((p) => cocokCari(p, cari)), [list, cari]);
  const perDivisi = useMemo(() => {
    const n: Record<string, number> = {};
    for (const p of hasilCari) {
      const k = p.divisi_id ?? TANPA_DIVISI;
      n[k] = (n[k] ?? 0) + 1;
    }
    return n;
  }, [hasilCari]);
  const diDivisi = useMemo(() => hasilCari.filter((p) => cocokDivisi(p, divisi)), [hasilCari, divisi]);
  const hitungan = hitungKotak(diDivisi, onlineIds);
  const tampil = useMemo(
    () => urutkanPegawai(diDivisi.filter((p) => cocokSaring(p, saring, onlineIds)), onlineIds),
    [diDivisi, saring, onlineIds]
  );

  const chipDivisi = [
    { id: "semua", nama: "Semua", n: hasilCari.length },
    ...divisiList.filter((d) => d.aktif || perDivisi[d.id]).map((d) => ({ id: d.id, nama: d.nama, n: perDivisi[d.id] ?? 0 })),
    ...(perDivisi[TANPA_DIVISI] ? [{ id: TANPA_DIVISI, nama: "Tanpa divisi", n: perDivisi[TANPA_DIVISI] }] : []),
  ];

  const posisi = dibuka ? tampil.findIndex((p) => p.id === dibuka) : -1;
  const pDibuka = posisi >= 0 ? tampil[posisi] : null;
  const tutupDetail = useCallback(() => setDibuka(null), []);
  const tutupTambah = useCallback(() => setTambah(false), []);

  return (
    <div className="flex flex-col gap-4">
      <HeaderHalaman
        judul="Kelola Pegawai"
        aksi={
          <button
            type="button"
            onClick={() => setTambah(true)}
            aria-haspopup="dialog"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-masuk-dark shadow-sm transition active:scale-95"
          >
            + Tambah
          </button>
        }
      />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!dimuat ? (
        <Loading teks="Memuat pegawai..." />
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Saring pegawai">
            {KOTAK_PEGAWAI.map((k) => {
              const aktif = saring === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => setSaring(aktif && k.id !== "semua" ? "semua" : k.id)}
                  className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition active:scale-95 ${
                    aktif ? "bg-brand-masuk text-white shadow-md" : "bg-white text-brand-text shadow-sm ring-1 ring-black/5"
                  }`}
                >
                  <span className="text-xl font-bold leading-none">{hitungan[k.id]}</span>
                  <span className={`mt-1 flex items-center gap-1 text-[11px] font-medium leading-tight ${aktif ? "" : "text-gray-500"}`}>
                    {k.id === "online" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />}
                    {k.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pl-0.5 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]"
              role="group"
              aria-label="Saring divisi"
            >
              {chipDivisi.map((d) => {
                const aktif = divisi === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => setDivisi(d.id)}
                    className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 ${
                      aktif ? "bg-brand-masuk text-white shadow-sm" : "bg-white text-brand-text shadow-sm ring-1 ring-black/5"
                    }`}
                  >
                    {d.nama}
                    <span className={`rounded-full px-1.5 text-[11px] ${aktif ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{d.n}</span>
                  </button>
                );
              })}
            </div>
            <div className="w-11 shrink-0 has-[input]:w-44 sm:has-[input]:w-64">
              <SearchBarAnimasi value={cari} onChange={setCari} placeholder="Cari nama, email, jabatan…" />
            </div>
          </div>

          {tampil.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              {list.length === 0 ? "Belum ada pegawai terdaftar." : cari.trim() ? "Tidak ada pegawai yang cocok dengan pencarian." : KOSONG[saring]}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 px-0.5 sm:grid-cols-2 lg:grid-cols-3">
              {tampil.map((p) => (
                <KartuPegawai
                  key={p.id}
                  p={p}
                  online={onlineIds.has(p.id)}
                  namaDivisi={divisi === "semua" && p.divisi_id ? (petaDivisi.get(p.divisi_id) ?? null) : null}
                  onBuka={() => setDibuka(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {pDibuka && (
        <DetailPegawai
          p={pDibuka}
          online={onlineIds.has(pDibuka.id)}
          divisiList={divisiList.filter((d) => d.aktif || d.id === pDibuka.divisi_id)}
          sayaId={saya?.id}
          hariIni={hariIni}
          posisi={posisi}
          total={tampil.length}
          onSebelum={posisi > 0 ? () => setDibuka(tampil[posisi - 1].id) : null}
          onBerikut={posisi < tampil.length - 1 ? () => setDibuka(tampil[posisi + 1].id) : null}
          onTutup={tutupDetail}
          onSimpan={(x) => simpan(pDibuka.id, x)}
          onHapus={() => hapus(pDibuka.id)}
        />
      )}

      {tambah && <FormTambah divisiList={divisiList.filter((d) => d.aktif)} divisiAwal={divisi !== "semua" && divisi !== TANPA_DIVISI ? divisi : null} onTutup={tutupTambah} onSimpan={daftarkan} />}

      {toast && (
        <div role="status" className="anim-buka fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-text px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
