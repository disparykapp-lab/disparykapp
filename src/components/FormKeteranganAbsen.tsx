import { useEffect, useId, useState } from "react";
import { CalendarRange, HeartPulse, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { tanggalHariIniWIB } from "../lib/absensi";
import { PESAN_IZIN_BELUM_AKTIF, ambilIzinSaya, batalIzin, simpanIzin, type IzinPegawai } from "../lib/izin";
import {
  cekRentang,
  hariDalamRentang,
  hariKerja,
  hariKerjaBerikutnya,
  hariKerjaDalamRentang,
  keadaanIzin,
  rentangAkhir,
  ringkasIzin,
  selesaiUntukDurasi,
  type HariAbsenSaya,
  type PilihanRentang,
} from "../lib/izinAturan";
import InputBukti from "./InputBukti";
import KalenderRentang, { type TandaHari } from "./KalenderRentang";

const fmtPendek = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fmtTahun = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const tgl = (ymd: string, tahun = false) => (tahun ? fmtTahun : fmtPendek).format(new Date(`${ymd}T00:00:00Z`));
const teksRentang = (mulai: string, selesai: string) => (mulai === selesai ? tgl(mulai, true) : `${tgl(mulai)} – ${tgl(selesai, true)}`);
const DURASI = [1, 2, 3, 5];

/**
 * Tombol bulat "Izin/Sakit" (di Beranda, di tengah antara Absen Masuk & Pulang)
 * yang membuka form izin: pilih rentang tanggal sekali (semua hari kerjanya
 * otomatis izin), keterangan, dan foto bukti. Izin yang sudah ada bisa diubah
 * atau dibatalkan. `className` mengatur posisinya di induk.
 */
export default function FormKeteranganAbsen({
  className = "",
  onTersimpan,
}: {
  className?: string;
  onTersimpan?: () => void;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [sukses, setSukses] = useState<string | null>(null);

  useEffect(() => {
    if (!sukses) return;
    const t = window.setTimeout(() => setSukses(null), 3000);
    return () => window.clearTimeout(t);
  }, [sukses]);

  return (
    <>
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        aria-haspopup="dialog"
        className={`flex h-[62px] w-[62px] flex-col items-center justify-center gap-0.5 rounded-full border-2 border-brand-pulang/30 bg-white text-brand-pulang shadow-md ring-4 ring-brand-bg transition active:scale-95 ${className}`}
      >
        <HeartPulse size={22} strokeWidth={2.2} aria-hidden="true" />
        <span className="text-[9px] font-bold leading-none text-brand-text">Izin/Sakit</span>
      </button>

      {terbuka && (
        <ModalIzin
          onTutup={() => setTerbuka(false)}
          onTersimpan={(pesan) => {
            setTerbuka(false);
            setSukses(pesan);
            onTersimpan?.();
          }}
        />
      )}

      {sukses && (
        <p
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-text px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          ✓ {sukses}
        </p>
      )}
    </>
  );
}

type Data = { izin: IzinPegawai[]; hari: HariAbsenSaya[]; aktif: boolean };

function ModalIzin({ onTutup, onTersimpan }: { onTutup: () => void; onTersimpan: (pesan: string) => void }) {
  const idJudul = useId();
  const { profile } = useAuth();
  const hariIni = tanggalHariIniWIB();
  const [data, setData] = useState<Data | null>(null);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  /** null = daftar izin, "baru" = ajukan izin baru, selain itu izin yang diubah */
  const [form, setForm] = useState<"baru" | IzinPegawai | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      document.removeEventListener("keydown", onKey);
    };
  }, [onTutup]);

  useEffect(() => {
    if (!profile) return;
    let batal = false;
    ambilIzinSaya(profile.id, hariIni)
      .then((d) => {
        if (batal) return;
        setData(d);
        // belum pernah izin (30 hari terakhir): langsung ke form
        if (d.izin.length === 0) setForm("baru");
      })
      .catch((e: unknown) => {
        if (batal) return;
        setGalatMuat(e instanceof Error ? e.message : "Gagal memuat izin.");
        setData({ izin: [], hari: [], aktif: true });
        setForm("baru");
      });
    return () => {
      batal = true;
    };
  }, [profile, hariIni]);

  async function batalkan(i: IzinPegawai) {
    if (!window.confirm(`Batalkan izin ${teksRentang(i.mulai, i.selesai)}? Hari-hari izinnya akan dihapus.`)) return;
    setError(null);
    try {
      await batalIzin(i.id);
      onTersimpan("Izin dibatalkan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membatalkan izin.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id={idJudul} className="flex items-center gap-2 text-base font-bold text-brand-text">
            <HeartPulse size={20} className="text-brand-pulang" aria-hidden="true" />
            {form === null || form === "baru" ? "Izin / Sakit" : "Ubah izin"}
          </h2>
          <button type="button" onClick={onTutup} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {!data ? (
          <p className="animate-pulse py-6 text-center text-sm text-gray-400">Memuat…</p>
        ) : form === null ? (
          <DaftarIzin data={data} hariIni={hariIni} onUbah={setForm} onBatal={(i) => void batalkan(i)} onBaru={() => setForm("baru")} error={error} />
        ) : (
          <FormIzin
            key={form === "baru" ? "baru" : form.id}
            izin={form === "baru" ? null : form}
            data={data}
            hariIni={hariIni}
            galatMuat={galatMuat}
            onKembali={data.izin.length > 0 ? () => setForm(null) : onTutup}
            onTersimpan={onTersimpan}
          />
        )}
      </div>
    </div>
  );
}

function DaftarIzin({
  data,
  hariIni,
  onUbah,
  onBatal,
  onBaru,
  error,
}: {
  data: Data;
  hariIni: string;
  onUbah: (i: IzinPegawai) => void;
  onBatal: (i: IzinPegawai) => void;
  onBaru: () => void;
  error: string | null;
}) {
  return (
    <>
      <p className="-mt-1 text-xs text-gray-500">Izin kamu. Salah tanggal atau ternyata masuk lebih cepat? Ubah atau batalkan di sini.</p>
      <ul className="flex flex-col gap-2">
        {data.izin.map((i) => {
          const r = ringkasIzin(i, data.hari);
          const k = keadaanIzin(i, hariIni);
          return (
            <li key={i.id} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-brand-text">{teksRentang(i.mulai, i.selesai)}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    k === "berlangsung" ? "bg-amber-100 text-amber-800" : k === "akan datang" ? "bg-blue-50 text-brand-info" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {k === "berlangsung" ? "Berlangsung" : k === "akan datang" ? "Akan datang" : "Selesai"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {r.izin.length} hari kerja izin
                {r.masuk.length > 0 && ` · ${r.masuk.length} hari masuk kerja`}
              </p>
              <p className="line-clamp-2 break-words text-xs text-gray-700">{i.catatan}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onUbah(i)}
                  className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-xs font-semibold text-brand-text"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => onBatal(i)}
                  className="min-h-[36px] rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600"
                >
                  Batalkan
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={onBaru} className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-masuk text-sm font-semibold text-white">
        <CalendarRange size={16} aria-hidden="true" /> Ajukan izin baru
      </button>
    </>
  );
}

function FormIzin({
  izin,
  data,
  hariIni,
  galatMuat,
  onKembali,
  onTersimpan,
}: {
  izin: IzinPegawai | null;
  data: Data;
  hariIni: string;
  galatMuat: string | null;
  onKembali: () => void;
  onTersimpan: (pesan: string) => void;
}) {
  // bawaan rentang lengkap (izin 1 hari), jadi ketukan pertama di kalender selalu = tanggal mulai
  const [pilihan, setPilihan] = useState<PilihanRentang>(() => {
    if (izin) return { mulai: izin.mulai, selesai: izin.selesai };
    const hari = hariKerjaBerikutnya(hariIni);
    return { mulai: hari, selesai: hari };
  });
  const [catatan, setCatatan] = useState(izin?.catatan ?? "");
  const [bukti, setBukti] = useState(izin?.bukti_url ?? "");
  const [mengunggah, setMengunggah] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rentang = rentangAkhir(pilihan);
  // hari yang sudah absen tidak diubah jadi izin
  const masuk = new Set(data.hari.filter((h) => h.masuk_at).map((h) => h.tanggal));
  const hariIzin = rentang ? hariKerjaDalamRentang(rentang.mulai, rentang.selesai).filter((d) => !masuk.has(d)) : [];
  const adaAkhirPekan = rentang ? hariDalamRentang(rentang.mulai, rentang.selesai).some((d) => !hariKerja(d)) : false;
  const sudahMasuk = rentang ? hariKerjaDalamRentang(rentang.mulai, rentang.selesai).filter((d) => masuk.has(d)).length : 0;

  const tanda: Record<string, TandaHari> = {};
  for (const h of data.hari) {
    if (h.masuk_at) tanda[h.tanggal] = "masuk";
    else if (h.status === "izin" && (!izin || h.izin_id !== izin.id)) tanda[h.tanggal] = "izin";
  }

  function pilihDurasi(n: number) {
    const mulai = pilihan.mulai ?? hariKerjaBerikutnya(hariIni);
    setPilihan({ mulai, selesai: selesaiUntukDurasi(mulai, n) });
    setError(null);
  }

  async function kirim() {
    if (!rentang) return setError("Pilih tanggal izin dulu.");
    const salah = cekRentang(rentang.mulai, rentang.selesai, hariIni);
    if (salah) return setError(salah);
    if (catatan.trim().length < 3) return setError("Isi keterangan dulu (minimal 3 huruf).");
    setMengirim(true);
    setError(null);
    try {
      await simpanIzin({ id: izin?.id ?? null, mulai: rentang.mulai, selesai: rentang.selesai, catatan: catatan.trim(), bukti, hariIni });
      onTersimpan(`Izin tersimpan · ${hariIzin.length} hari kerja`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan izin.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <>
      <p className="-mt-1 text-xs text-gray-500">
        Ketuk tanggal mulai lalu tanggal selesai. Semua hari kerja di antaranya otomatis tercatat izin — tidak perlu izin tiap hari.
      </p>
      {galatMuat && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{galatMuat}</p>}
      {!data.aktif && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          {PESAN_IZIN_BELUM_AKTIF} Sementara ini hanya bisa izin 1 hari (hari ini atau sebelumnya).
        </p>
      )}

      <KalenderRentang
        pilihan={pilihan}
        onPilih={(p) => {
          setPilihan(p);
          setError(null);
        }}
        hariIni={hariIni}
        tanda={tanda}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lama izin">
        {DURASI.map((n) => {
          const aktif = !!pilihan.mulai && (pilihan.selesai ?? pilihan.mulai) === selesaiUntukDurasi(pilihan.mulai, n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => pilihDurasi(n)}
              aria-pressed={aktif}
              className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold ${aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 text-brand-text"}`}
            >
              {n} hari
            </button>
          );
        })}
      </div>

      {rentang && (
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Mulai</p>
              <p className="font-semibold text-brand-text">{tgl(rentang.mulai, true)}</p>
            </div>
            <div>
              <p className="text-gray-400">Selesai</p>
              <p className="font-semibold text-brand-text">{pilihan.selesai ? tgl(rentang.selesai, true) : "—"}</p>
            </div>
          </div>
          <p className="mt-2 text-sm font-bold text-brand-masuk">{hariIzin.length} hari kerja izin</p>
          <ul className="mt-0.5 flex flex-col text-[11px] text-gray-500">
            {!pilihan.selesai && <li>Sekarang ketuk tanggal selesai — atau langsung Simpan untuk izin 1 hari.</li>}
            {adaAkhirPekan && <li>Sabtu & Minggu tidak dihitung.</li>}
            {sudahMasuk > 0 && <li>{sudahMasuk} hari sudah absen masuk — tetap tercatat hadir.</li>}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Keterangan</span>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Contoh: Sakit demam, istirahat sesuai surat dokter"
          className="rounded-lg border border-gray-300 p-2 text-sm"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Foto bukti (opsional)</span>
        <InputBukti nilai={bukti} onUbah={setBukti} onSibuk={setMengunggah} />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onKembali}
          className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text"
        >
          {data.izin.length > 0 ? "Kembali" : "Batal"}
        </button>
        <button
          type="button"
          onClick={() => void kirim()}
          disabled={mengirim || mengunggah}
          className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-60"
        >
          {mengirim ? "Menyimpan..." : mengunggah ? "Tunggu unggahan..." : izin ? "Simpan perubahan" : "Simpan"}
        </button>
      </div>
    </>
  );
}
