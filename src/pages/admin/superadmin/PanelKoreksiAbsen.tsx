import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Trash2 } from "lucide-react";
import StripTanggal from "../../../components/StripTanggal";
import { supabase } from "../../../lib/supabase";
import { formatTanggal } from "../../../lib/tanggal";
import { tambahHari } from "../../../lib/izinAturan";
import {
  buangFileFotoAbsen,
  superAdminHapusAbsensi,
  superAdminSetAbsensi,
  tanggalHariIniWIB,
  unggahFotoKoreksi,
} from "../../../lib/absensi";
import { LABEL_STATUS_ABSEN } from "../../../lib/absensiMeta";
import { jamSekarangWib, keIsoWib, keJamWib, normalJam, tampilJam, type JenisSesi } from "../../../lib/koreksiAbsenAturan";
import type { Absensi, ModeAbsen, Profile, StatusAbsen } from "../../../types/database";
import FotoSesi, { type FotoKoreksi } from "./FotoSesi";
import InputJamDetik from "./InputJamDetik";
import PilihPegawai from "./PilihPegawai";

/** Koreksi boleh sampai 2 tahun ke belakang dan 60 hari ke depan (mis. menandai izin yang sudah pasti). */
const HARI_MUNDUR = 730;
const HARI_MAJU = 60;

interface FormSesi {
  jam: string;
  mode: ModeAbsen;
  akurasi: string;
  ip: string;
}

interface FormKoreksi {
  masuk: FormSesi;
  keluar: FormSesi;
  status: StatusAbsen;
  catatan: string;
}

const SESI_KOSONG: FormSesi = { jam: "", mode: "kantor", akurasi: "", ip: "" };
const FORM_KOSONG: FormKoreksi = { masuk: SESI_KOSONG, keluar: SESI_KOSONG, status: "hadir", catatan: "" };
const FOTO_KOSONG: Record<JenisSesi, FotoKoreksi> = { masuk: null, keluar: null };

function formDariBaris(r: Absensi | null): FormKoreksi {
  if (!r) return FORM_KOSONG;
  return {
    masuk: {
      jam: keJamWib(r.masuk_at),
      mode: r.masuk_mode ?? "kantor",
      akurasi: r.masuk_akurasi != null ? String(r.masuk_akurasi) : "",
      ip: r.masuk_ip ?? "",
    },
    keluar: {
      jam: keJamWib(r.keluar_at),
      mode: r.keluar_mode ?? "kantor",
      akurasi: r.keluar_akurasi != null ? String(r.keluar_akurasi) : "",
      ip: r.keluar_ip ?? "",
    },
    status: r.status,
    catatan: r.catatan_klarifikasi ?? "",
  };
}

const fotoDariBaris = (r: Absensi | null): Record<JenisSesi, FotoKoreksi> => ({
  masuk: r?.masuk_foto_path ? { jenis: "lama", path: r.masuk_foto_path } : null,
  keluar: r?.keluar_foto_path ? { jenis: "lama", path: r.keluar_foto_path } : null,
});

const kelasChip = (aktif: boolean) =>
  `min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${
    aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-brand-text"
  }`;

const angkaAkurasi = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : null;
};

/** Tab "Koreksi Absensi" di Super Admin: tulis ulang satu baris absensi, termasuk jam sampai detik & foto. */
export default function PanelKoreksiAbsen() {
  const hariIni = tanggalHariIniWIB();
  const [pegawaiList, setPegawaiList] = useState<Profile[] | null>(null);
  const [cari, setCari] = useState("");
  const [pegawai, setPegawai] = useState<Profile | null>(null);
  const [tanggal, setTanggal] = useState(hariIni);
  const [baris, setBaris] = useState<Absensi | null>(null);
  const [form, setForm] = useState<FormKoreksi>(FORM_KOSONG);
  const [foto, setFoto] = useState<Record<JenisSesi, FotoKoreksi>>(FOTO_KOSONG);
  const [jadwal, setJadwal] = useState<{ masuk: string; pulang: string } | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [tahap, setTahap] = useState<string | null>(null);
  const [yakinHapus, setYakinHapus] = useState(false);
  const [menghapus, setMenghapus] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: "ok" | "error"; teks: string } | null>(null);
  const permintaan = useRef(0);
  const urlBaru = useRef(new Set<string>());

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("*")
      .eq("aktif", true)
      .order("nama")
      .then(({ data }) => setPegawaiList((data as Profile[]) ?? []));
    void supabase
      .from("pengaturan")
      .select("jam_masuk, jam_pulang")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const masuk = normalJam(data?.jam_masuk);
        const pulang = normalJam(data?.jam_pulang);
        if (masuk && pulang) setJadwal({ masuk, pulang });
      });
    const url = urlBaru.current;
    return () => url.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  /** Lepas pratinjau foto baru yang tidak dipakai lagi. */
  function lepasUrl(...daftar: FotoKoreksi[]) {
    for (const f of daftar) {
      if (f?.jenis === "baru") {
        URL.revokeObjectURL(f.url);
        urlBaru.current.delete(f.url);
      }
    }
  }

  function terapkan(r: Absensi | null) {
    lepasUrl(foto.masuk, foto.keluar);
    setBaris(r);
    setForm(formDariBaris(r));
    setFoto(fotoDariBaris(r));
    setYakinHapus(false);
  }

  async function muat(p: Profile | null, tgl: string) {
    const ke = ++permintaan.current;
    setPesan(null);
    if (!p) {
      terapkan(null);
      return;
    }
    setMemuat(true);
    const { data, error } = await supabase.from("absensi").select("*").eq("user_id", p.id).eq("tanggal", tgl).maybeSingle();
    if (ke !== permintaan.current) return; // sudah ada pilihan yang lebih baru
    setMemuat(false);
    if (error) {
      terapkan(null);
      setPesan({ tipe: "error", teks: `Data absensi gagal dimuat: ${error.message}` });
      return;
    }
    terapkan((data as Absensi) ?? null);
  }

  function pilihPegawai(p: Profile | null) {
    setPegawai(p);
    void muat(p, tanggal);
  }

  function pilihTanggal(t: string) {
    setTanggal(t);
    void muat(pegawai, t);
  }

  const ubahSesi = (s: JenisSesi, ubah: Partial<FormSesi>) => setForm((f) => ({ ...f, [s]: { ...f[s], ...ubah } }));

  function ubahFoto(s: JenisSesi, baru: FotoKoreksi) {
    lepasUrl(foto[s]);
    if (baru?.jenis === "baru") urlBaru.current.add(baru.url);
    setFoto((f) => ({ ...f, [s]: baru }));
  }

  async function simpan() {
    if (!pegawai) return;
    setPesan(null);
    const diunggah: string[] = [];
    try {
      const akhir: Record<JenisSesi, string | null> = { masuk: null, keluar: null };
      for (const s of ["masuk", "keluar"] as const) {
        const f = foto[s];
        if (!form[s].jam || !f) continue; // jam kosong = foto ikut dikosongkan
        if (f.jenis === "lama") {
          akhir[s] = f.path;
        } else {
          setTahap(`Mengunggah foto ${s === "masuk" ? "masuk" : "pulang"}…`);
          const path = await unggahFotoKoreksi(pegawai.id, tanggal, s, f.blob);
          diunggah.push(path);
          akhir[s] = path;
        }
      }
      setTahap("Menyimpan…");
      const hasil = await superAdminSetAbsensi({
        userId: pegawai.id,
        tanggal,
        masukAt: keIsoWib(tanggal, form.masuk.jam),
        masukMode: form.masuk.jam ? form.masuk.mode : null,
        masukAkurasi: form.masuk.jam ? angkaAkurasi(form.masuk.akurasi) : null,
        masukIp: (form.masuk.jam && form.masuk.ip.trim()) || null,
        masukLat: baris?.masuk_lat ?? null,
        masukLng: baris?.masuk_lng ?? null,
        keluarAt: keIsoWib(tanggal, form.keluar.jam),
        keluarMode: form.keluar.jam ? form.keluar.mode : null,
        keluarAkurasi: form.keluar.jam ? angkaAkurasi(form.keluar.akurasi) : null,
        keluarIp: (form.keluar.jam && form.keluar.ip.trim()) || null,
        keluarLat: baris?.keluar_lat ?? null,
        keluarLng: baris?.keluar_lng ?? null,
        status: form.status,
        catatanKlarifikasi: form.catatan.trim() || null,
        foto: akhir,
      });
      terapkan(hasil);
      setPesan({ tipe: "ok", teks: `Koreksi ${pegawai.nama} tanggal ${formatTanggal(tanggal)} tersimpan.` });
    } catch (e) {
      void buangFileFotoAbsen(diunggah).catch(() => undefined);
      setPesan({ tipe: "error", teks: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setTahap(null);
    }
  }

  async function hapus() {
    if (!baris) return;
    setMenghapus(true);
    setPesan(null);
    try {
      await superAdminHapusAbsensi(baris.id);
      terapkan(null);
      setPesan({ tipe: "ok", teks: "Baris absensi dihapus." });
    } catch (e) {
      setPesan({ tipe: "error", teks: e instanceof Error ? e.message : "Gagal menghapus." });
    } finally {
      setMenghapus(false);
    }
  }

  const sibuk = tahap !== null || menghapus;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
        Perubahan di sini langsung menulis ulang data kehadiran pegawai (jam, status, foto, GPS, dan IP) tanpa lewat alur absen
        normal. Setiap aksi tercatat di tab <b>Log Aktivitas</b>.
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Pegawai dan tanggal">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Pegawai</h3>
        <PilihPegawai daftar={pegawaiList} terpilih={pegawai} cari={cari} onCari={setCari} onPilih={pilihPegawai} />
        <h3 className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Tanggal</h3>
        <StripTanggal
          nilai={tanggal}
          hariIni={hariIni}
          min={tambahHari(hariIni, -HARI_MUNDUR)}
          max={tambahHari(hariIni, HARI_MAJU)}
          lompat
          onUbah={pilihTanggal}
        />
      </section>

      {pegawai && memuat && (
        <div className="grid gap-3 lg:grid-cols-2" aria-hidden="true">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      )}

      {pegawai && !memuat && (
        <>
          <p className="flex flex-wrap items-center gap-2 px-1 text-xs text-gray-500">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${baris ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
              {baris ? "Sudah ada data" : "Belum ada data"}
            </span>
            {baris ? `Mengubah absensi ${formatTanggal(tanggal)}.` : `Simpan akan membuat absensi baru untuk ${formatTanggal(tanggal)}.`}
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            {(["masuk", "keluar"] as const).map((s) => (
              <KartuSesi
                key={s}
                jenis={s}
                sesi={form[s]}
                onUbah={(u) => ubahSesi(s, u)}
                foto={foto[s]}
                onFoto={(f) => ubahFoto(s, f)}
                jadwal={jadwal ? (s === "masuk" ? jadwal.masuk : jadwal.pulang) : null}
                nonaktif={sibuk}
              />
            ))}
          </div>

          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Status dan keterangan">
            <div className="flex flex-col gap-1.5">
              <span id="label-status-koreksi" className="text-sm font-semibold text-brand-text">
                Status
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="label-status-koreksi">
                {(Object.keys(LABEL_STATUS_ABSEN) as StatusAbsen[]).map((st) => (
                  <button key={st} type="button" aria-pressed={form.status === st} onClick={() => setForm((f) => ({ ...f, status: st }))} className={kelasChip(form.status === st)}>
                    {LABEL_STATUS_ABSEN[st]}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-brand-text">
                Keterangan <span className="font-normal text-gray-400">(opsional)</span>
              </span>
              <textarea
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                rows={2}
                placeholder="mis. Lupa absen, sudah dikonfirmasi atasan"
                className="resize-none rounded-xl border border-gray-300 p-3 text-base"
              />
            </label>
          </section>

          {pesan && (
            <p
              role={pesan.tipe === "ok" ? "status" : "alert"}
              className={`anim-buka flex items-start gap-2 rounded-xl p-3 text-sm ${pesan.tipe === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
            >
              {pesan.tipe === "ok" && <CheckCircle2 size={18} className="mt-px shrink-0" />}
              {pesan.teks}
            </p>
          )}

          <button
            type="button"
            onClick={() => void simpan()}
            disabled={sibuk}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-masuk text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {tahap ?? (baris ? "Simpan koreksi" : "Buat absensi")}
          </button>

          {baris && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setYakinHapus((v) => !v)}
                disabled={sibuk}
                className="flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
              >
                <Trash2 size={14} /> Hapus baris absensi ini
              </button>
              {yakinHapus && (
                <div className="anim-buka flex w-full items-center gap-2 rounded-xl bg-red-50 p-2.5">
                  <p className="min-w-0 flex-1 text-xs text-red-800">
                    Absensi {pegawai.nama} tanggal {formatTanggal(tanggal)} dihapus permanen.
                  </p>
                  <button
                    type="button"
                    onClick={() => void hapus()}
                    disabled={menghapus}
                    className="min-h-[36px] shrink-0 rounded-lg bg-red-600 px-3 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {menghapus ? "Menghapus…" : "Ya, hapus"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KartuSesi({
  jenis,
  sesi,
  onUbah,
  foto,
  onFoto,
  jadwal,
  nonaktif,
}: {
  jenis: JenisSesi;
  sesi: FormSesi;
  onUbah: (u: Partial<FormSesi>) => void;
  foto: FotoKoreksi;
  onFoto: (f: FotoKoreksi) => void;
  jadwal: string | null;
  nonaktif: boolean;
}) {
  const label = jenis === "masuk" ? "masuk" : "pulang";
  const judul = jenis === "masuk" ? "Masuk" : "Pulang";
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm" aria-label={`Absen ${label}`}>
      <div className="flex items-center gap-3">
        <img src={jenis === "masuk" ? "/beranda/masuk.png" : "/beranda/pulang.png"} alt="" className={`h-10 w-10 object-contain ${sesi.jam ? "" : "opacity-50 grayscale"}`} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-brand-text">{judul}</p>
          <p className="text-[11px] text-gray-500">{sesi.jam ? `${tampilJam(sesi.jam)} WIB` : `Belum absen ${label}`}</p>
        </div>
        {sesi.jam && (
          <button type="button" onClick={() => onUbah({ jam: "" })} disabled={nonaktif} className="min-h-[36px] shrink-0 px-1 text-xs font-semibold text-gray-500">
            Kosongkan
          </button>
        )}
      </div>

      <InputJamDetik nilai={sesi.jam} onUbah={(jam) => onUbah({ jam })} label={label} awal={jadwal ?? (jenis === "masuk" ? "07:30:00" : "16:00:00")} />

      <div className="flex flex-wrap justify-center gap-1.5">
        {jadwal && (
          <button type="button" onClick={() => onUbah({ jam: jadwal })} className={kelasChip(sesi.jam === jadwal)}>
            Jadwal {tampilJam(jadwal)}
          </button>
        )}
        <button type="button" onClick={() => onUbah({ jam: jamSekarangWib() })} className={kelasChip(false)}>
          Sekarang
        </button>
      </div>

      {!sesi.jam ? (
        <p className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-500">
          Kosong = belum absen {label}.{foto ? ` Foto ${label} ikut dihapus saat disimpan.` : " Isi jamnya untuk menambah foto."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-text">Lokasi</span>
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-gray-100 p-1" role="group" aria-label={`Lokasi absen ${label}`}>
              {(["kantor", "luar"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={sesi.mode === m}
                  onClick={() => onUbah({ mode: m })}
                  className={`min-h-[36px] rounded-full text-xs font-semibold transition-colors ${sesi.mode === m ? "bg-brand-masuk text-white" : "text-gray-500"}`}
                >
                  {m === "kantor" ? "Di Kantor" : "Dinas Luar"}
                </button>
              ))}
            </div>
          </div>

          <FotoSesi label={label} foto={foto} onUbah={onFoto} nonaktif={nonaktif} />

          <details className="group rounded-xl bg-gray-50 px-3">
            <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between text-xs font-semibold text-gray-500 [&::-webkit-details-marker]:hidden">
              Akurasi GPS & IP {sesi.akurasi || sesi.ip ? "· terisi" : "(opsional)"}
              <ChevronDown size={16} className="transition group-open:rotate-180" />
            </summary>
            <div className="grid grid-cols-2 gap-2 pb-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">Akurasi GPS (meter)</span>
                <input
                  inputMode="decimal"
                  value={sesi.akurasi}
                  onChange={(e) => onUbah({ akurasi: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="mis. 12"
                  className="min-w-0 rounded-xl border border-gray-300 bg-white p-2.5 text-base"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">Alamat IP</span>
                <input
                  value={sesi.ip}
                  onChange={(e) => onUbah({ ip: e.target.value })}
                  placeholder="mis. 10.0.0.5"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 rounded-xl border border-gray-300 bg-white p-2.5 text-base"
                />
              </label>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
