import { useEffect, useState, type ReactNode } from "react";
import { HeartPulse } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tanggalHariIniWIB } from "../lib/absensi";
import { formatDurasi, jamPada, jamPendek, keadaanHariIni, type KeadaanHariIni } from "../lib/statusHariIni";
import { teksDenganLink } from "../lib/linkify";
import type { Absensi } from "../types/database";
import FotoAbsenHariIni from "./FotoAbsenHariIni";

const jamWIB = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

const CHIP: Record<string, { teks: string; kelas: string }> = {
  belum: { teks: "Belum absen", kelas: "bg-gray-900 text-white" },
  libur: { teks: "Akhir pekan", kelas: "bg-gray-100 text-gray-600" },
  izin: { teks: "Izin/Sakit", kelas: "bg-red-100 text-red-700" },
  hadir: { teks: "Tepat waktu", kelas: "bg-green-100 text-green-700" },
  telat: { teks: "Telat", kelas: "bg-amber-100 text-amber-800" },
  dinas_luar: { teks: "Dinas Luar", kelas: "bg-sky-100 text-sky-700" },
};

/**
 * Kartu "Status Hari Ini" bergaya tiket: Masuk → Pulang dengan pesawat yang
 * maju sesuai jam kerja (diperbarui tiap 30 detik, bukan animasi berulang).
 */
export default function StatusHariIni({ absensi, wajibAbsen }: { absensi: Absensi | null; wajibAbsen: boolean }) {
  const [tanggal] = useState(tanggalHariIniWIB);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [jam, setJam] = useState<{ masuk: string; pulang: string } | null>(null);

  useEffect(() => {
    let aktif = true;
    void supabase
      .from("pengaturan")
      .select("jam_masuk, jam_pulang")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (aktif && data) setJam({ masuk: data.jam_masuk, pulang: data.jam_pulang });
      });
    const t = setInterval(() => setSekarang(Date.now()), 30_000);
    return () => {
      aktif = false;
      clearInterval(t);
    };
  }, []);

  const k = keadaanHariIni(absensi, sekarang, tanggal, jam?.masuk ?? null, jam?.pulang ?? null);
  const chip = k.tahap === "kerja" || k.tahap === "selesai" ? (CHIP[absensi!.status] ?? CHIP.hadir) : CHIP[k.tahap];
  const adaFoto = !!(absensi?.masuk_foto_path || absensi?.keluar_foto_path);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm" aria-label="Status hari ini">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">Status Hari Ini</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip.kelas}`}>{chip.teks}</span>
      </div>

      {k.tahap === "izin" ? <PanelIzin absensi={absensi!} /> : <Rute k={k} absensi={absensi} jam={jam} tanggal={tanggal} wajibAbsen={wajibAbsen} />}

      {/* sobekan tiket */}
      <div className="relative -mx-5 my-4 border-t-2 border-dashed border-gray-100" aria-hidden="true">
        <span className="absolute -left-3 -top-[13px] h-6 w-6 rounded-full bg-brand-bg shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]" />
        <span className="absolute -right-3 -top-[13px] h-6 w-6 rounded-full bg-brand-bg shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Pesan k={k} />
        {absensi && adaFoto && <FotoAbsenHariIni absensi={absensi} />}
      </div>
    </section>
  );
}

function Rute({
  k,
  absensi,
  jam,
  tanggal,
  wajibAbsen,
}: {
  k: KeadaanHariIni;
  absensi: Absensi | null;
  jam: { masuk: string; pulang: string } | null;
  tanggal: string;
  wajibAbsen: boolean;
}) {
  const masukAt = absensi?.masuk_at ?? null;
  const keluarAt = absensi?.keluar_at ?? null;
  const mode = (m: string | null | undefined) => (m === "luar" ? "Dinas Luar" : "Di Kantor");

  let ketMasuk: ReactNode = masukAt ? mode(absensi?.masuk_mode) : "jadwal masuk";
  if (!masukAt && k.tahap === "belum" && wajibAbsen && k.menujuMasuk !== null) {
    ketMasuk =
      k.menujuMasuk > 0 ? (
        `${formatDurasi(k.menujuMasuk)} lagi`
      ) : (
        <span className="font-semibold text-amber-600">lewat {formatDurasi(-k.menujuMasuk)}</span>
      );
  }

  let ketPulang: ReactNode = keluarAt ? mode(absensi?.keluar_mode) : "jadwal pulang";
  if (k.tahap === "kerja" && k.menujuPulang !== null) {
    ketPulang = k.menujuPulang > 0 ? `${formatDurasi(k.menujuPulang)} lagi` : <span className="font-semibold text-green-600">sudah bisa pulang</span>;
  }

  const jadwal = jam ? Math.round((jamPada(tanggal, jam.pulang) - jamPada(tanggal, jam.masuk)) / 60_000) : null;
  const tengah =
    k.tahap === "kerja"
      ? `${formatDurasi(k.kerjaMenit)} berjalan`
      : k.tahap === "selesai"
        ? `${formatDurasi(k.kerjaMenit)} total`
        : jadwal && jadwal > 0
          ? `${formatDurasi(jadwal)} kerja`
          : "";

  return (
    <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
      <Titik gambar="/beranda/masuk.png" label="Masuk" jam={masukAt ? jamWIB(masukAt) : jam ? jamPendek(jam.masuk) : "--.--"} sudah={!!masukAt} ket={ketMasuk} />
      <div className="flex flex-col items-center">
        <div className="relative mt-[27px] h-0.5 w-full">
          <div className="absolute inset-x-0 top-0 border-t-2 border-dashed border-gray-200" />
          <div className="absolute left-0 top-0 h-0.5 rounded-full bg-brand-masuk transition-[width] duration-700" style={{ width: `${k.progres * 100}%` }} />
          <img
            src="/beranda/pesawat.png"
            alt=""
            aria-hidden="true"
            className={`absolute top-0 h-6 w-8 -translate-x-1/2 -translate-y-1/2 -scale-x-100 object-contain transition-[left] duration-700 ${
              k.tahap === "belum" || k.tahap === "libur" ? "opacity-40 grayscale" : ""
            }`}
            style={{ left: `calc(16px + (100% - 32px) * ${k.progres})` }}
          />
        </div>
        {tengah && <p className="mt-4 text-center text-[11px] font-medium text-gray-400">{tengah}</p>}
      </div>
      <Titik gambar="/beranda/pulang.png" label="Pulang" jam={keluarAt ? jamWIB(keluarAt) : jam ? jamPendek(jam.pulang) : "--.--"} sudah={!!keluarAt} ket={ketPulang} kanan />
    </div>
  );
}

function Titik({ gambar, label, jam, sudah, ket, kanan = false }: { gambar: string; label: string; jam: string; sudah: boolean; ket: ReactNode; kanan?: boolean }) {
  return (
    <div className={`flex min-w-[76px] flex-col ${kanan ? "items-end text-right" : "items-start"}`}>
      <img src={gambar} alt="" className={`h-14 w-14 object-contain transition ${sudah ? "" : "opacity-50 grayscale"}`} />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-2xl font-bold leading-tight tabular-nums ${sudah ? "text-brand-text" : "text-gray-300"}`}>{jam}</p>
      <p className="text-[11px] text-gray-500">{ket}</p>
    </div>
  );
}

function PanelIzin({ absensi }: { absensi: Absensi }) {
  return (
    <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-pulang shadow-sm" aria-hidden="true">
        <HeartPulse size={22} />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-brand-text">Kamu izin hari ini</p>
        {absensi.catatan_klarifikasi ? (
          <p className="mt-0.5 break-words text-sm text-gray-600">“{teksDenganLink(absensi.catatan_klarifikasi)}”</p>
        ) : (
          <p className="mt-0.5 text-sm text-gray-600">Istirahat yang cukup ya.</p>
        )}
      </div>
    </div>
  );
}

function Pesan({ k }: { k: KeadaanHariIni }) {
  const [judul, ket] =
    k.tahap === "belum"
      ? ["Belum absen masuk", "Tekan Absen Masuk di bawah untuk memulai hari ini."]
      : k.tahap === "libur"
        ? ["Selamat berakhir pekan", "Tetap bisa absen kalau hari ini masuk kerja."]
        : k.tahap === "izin"
          ? ["Ternyata masuk kerja?", "Tekan Absen Masuk — izin hari ini otomatis jadi hadir."]
          : k.tahap === "kerja"
            ? k.menujuPulang !== null && k.menujuPulang <= 0
              ? ["Waktunya pulang", "Jangan lupa Absen Pulang sebelum meninggalkan kantor."]
              : ["Sedang bekerja", `Sudah ${formatDurasi(k.kerjaMenit)} — semangat!`]
            : ["Selesai untuk hari ini", `Total ${formatDurasi(k.kerjaMenit)} bekerja. Sampai besok!`];
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-brand-text">{judul}</p>
      <p className="text-xs text-gray-500">{ket}</p>
    </div>
  );
}
