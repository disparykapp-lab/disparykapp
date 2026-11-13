import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import {
  ambilTwibbonPath,
  gantiTwibbon,
  hapusTwibbon,
  periksaTwibbon,
  urlTwibbon,
  type HasilPeriksaTwibbon,
} from "../../lib/twibbon";
import { KETENTUAN_TWIBBON, TWIBBON_CONTOH, formatUkuranFile } from "../../lib/twibbonMeta";

const K = KETENTUAN_TWIBBON;

export default function KelolaTwibbon() {
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calon, setCalon] = useState<HasilPeriksaTwibbon | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  useEffect(() => {
    ambilTwibbonPath()
      .then(setPath)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat twibbon."))
      .finally(() => setLoading(false));
  }, []);

  // object URL pratinjau dilepas begitu calon diganti/dibatalkan
  useEffect(() => {
    if (!calon) return;
    return () => URL.revokeObjectURL(calon.pratinjau);
  }, [calon]);

  async function pilihFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await periksa(file);
  }

  /** Pakai contoh twibbon (bingkai lama aplikasi): diperiksa & dipratinjau dulu, lalu Simpan. */
  async function pakaiContoh() {
    setError(null);
    try {
      const res = await fetch(TWIBBON_CONTOH);
      if (!res.ok) throw new Error();
      await periksa(new File([await res.blob()], "twibbon-contoh.png", { type: "image/png" }));
    } catch {
      setError("Contoh twibbon tidak bisa dimuat.");
    }
  }

  async function periksa(file: File) {
    setError(null);
    setSukses(null);
    setMemeriksa(true);
    try {
      setCalon(await periksaTwibbon(file));
    } catch (err) {
      setCalon(null);
      setError(err instanceof Error ? err.message : "Gambar tidak bisa dibaca.");
    } finally {
      setMemeriksa(false);
    }
  }

  async function simpan() {
    if (!calon || calon.masalah.length > 0) return;
    setMenyimpan(true);
    setError(null);
    try {
      setPath(await gantiTwibbon(calon.blob, path));
      setCalon(null);
      setSukses("Twibbon baru sudah dipakai. Pegawai melihatnya saat membuka kamera absen berikutnya.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan twibbon.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function lepas() {
    if (!window.confirm("Hapus twibbon? Kamera absen jadi tanpa bingkai, dan file twibbon yang sekarang dihapus.")) return;
    setMenyimpan(true);
    setError(null);
    setSukses(null);
    try {
      await hapusTwibbon(path);
      setPath(null);
      setSukses("Twibbon dihapus — kamera absen sekarang tanpa bingkai.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus twibbon.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (loading) return <Loading teks="Memuat twibbon..." />;

  const lolos = !!calon && calon.masalah.length === 0;

  return (
    <div className="kolom-sempit flex flex-col gap-4 pb-6">
      <HeaderHalaman judul="Twibbon Foto Absen" />

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {sukses && <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{sukses}</div>}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-brand-text">Twibbon yang dipakai sekarang</p>
          <p className="text-xs text-gray-500">
            Bingkai ini tampil di kamera absen dan ikut tersimpan di foto absen semua pegawai.
          </p>
        </div>

        <div className={`mx-auto grid w-full gap-3 ${calon ? "max-w-md grid-cols-2" : "max-w-[220px]"}`}>
          <Pratinjau src={urlTwibbon(path)} label={path ? "Sekarang" : "Sekarang: tanpa twibbon"} />
          {calon && <Pratinjau src={calon.pratinjau} label="Baru" sorot={lolos} />}
        </div>

        {calon && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-xs text-gray-500">
              {calon.lebar} × {calon.tinggi} px · {formatUkuranFile(calon.ukuranByte)}
              {lolos && calon.blob.size < calon.ukuranByte && ` → dikecilkan jadi ${formatUkuranFile(calon.blob.size)}`}
            </p>
            {lolos ? (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                ✅ Gambar memenuhi semua ketentuan. Cek pratinjau di atas, lalu tekan Simpan.
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Gambar belum bisa dipakai:</p>
                <ul className="mt-1 list-disc pl-5">
                  {calon.masalah.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-brand-text ${
              memeriksa || menyimpan ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {memeriksa ? "Memeriksa gambar..." : calon ? "Pilih Gambar Lain" : "🖼️ Pilih Twibbon Baru (PNG)"}
            <input
              type="file"
              accept="image/png"
              onChange={(e) => void pilihFile(e)}
              disabled={memeriksa || menyimpan}
              className="sr-only"
            />
          </label>

          {calon && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCalon(null)}
                disabled={menyimpan}
                className="min-h-[48px] flex-1 rounded-xl border border-gray-300 bg-white font-semibold text-brand-text disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void simpan()}
                disabled={!lolos || menyimpan}
                className="min-h-[48px] flex-1 rounded-xl bg-brand-masuk font-semibold text-white disabled:opacity-50"
              >
                {menyimpan ? "Menyimpan..." : "Simpan & Pakai"}
              </button>
            </div>
          )}

          {path && !calon && (
            <button
              type="button"
              onClick={() => void lepas()}
              disabled={menyimpan}
              className="min-h-[44px] rounded-xl text-sm font-semibold text-red-600 disabled:opacity-60"
            >
              Hapus Twibbon (tanpa bingkai)
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-text">📐 Ketentuan Ukuran Twibbon</p>

        <div className="flex gap-4">
          <DenahArea />
          <ul className="flex flex-1 flex-col gap-2 text-sm text-gray-600">
            <Butir judul="Rasio 3:4 (potret)">
              Disarankan <strong>{K.lebarSaran} × {K.tinggiSaran} px</strong>, minimal {K.lebarMin} × {K.tinggiMin} px.
            </Butir>
            <Butir judul="Format PNG transparan">Bukan JPG — JPG tidak bisa punya bagian transparan.</Butir>
            <Butir judul="Maksimal 2 MB">Gambar di atas {K.lebarSaran} × {K.tinggiSaran} px otomatis dikecilkan.</Butir>
          </ul>
        </div>

        <ul className="flex flex-col gap-2 text-sm text-gray-600">
          <Butir judul="Area wajah harus transparan">
            Kotak putus-putus di denah (± 40% lebar × 40% tinggi di tengah) minimal {Math.round(K.wajahTembusMin * 100)}%
            tembus pandang supaya wajah pegawai terlihat.
          </Butir>
          <Butir judul="Ornamen di pinggir">
            Logo, teks, dan hiasan taruh di bagian atas, bawah, atau sisi kiri-kanan. Jangan menaruh teks penting terlalu mepet tepi.
          </Butir>
          <Butir judul="Pakai rasio yang pas">
            Ukuran twibbon media sosial 1080 × 1080 (1:1) atau 1080 × 1350 (4:5) akan ditolak karena bingkainya jadi gepeng/melar.
          </Butir>
        </ul>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={TWIBBON_CONTOH}
            download="twibbon-contoh.png"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-gray-100 px-2 text-center text-sm font-semibold text-brand-text"
          >
            ⬇️ Unduh Contoh
          </a>
          <button
            type="button"
            onClick={() => void pakaiContoh()}
            disabled={memeriksa || menyimpan}
            className="min-h-[44px] rounded-xl bg-gray-100 px-2 text-sm font-semibold text-brand-text disabled:opacity-60"
          >
            Pakai Contoh Twibbon
          </button>
        </div>
        <p className="-mt-2 text-center text-[11px] text-gray-400">Contoh = bingkai Hari Batik lama, bisa dijadikan template desain.</p>
      </div>
    </div>
  );
}

/** Bingkai di atas "foto" contoh (siluet wajah) dengan rasio kamera absen 3:4. */
function Pratinjau({ src, label, sorot = false }: { src: string | null; label: string; sorot?: boolean }) {
  return (
    <figure className="flex flex-col gap-1">
      <div
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-linear-to-b from-slate-400 to-slate-700 ${
          sorot ? "ring-2 ring-brand-masuk ring-offset-2" : ""
        }`}
      >
        <Siluet />
        {src ? (
          <img src={src} alt={`Twibbon ${label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-fill" />
        ) : (
          <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold text-white/90">Tanpa bingkai</span>
        )}
      </div>
      <figcaption className="text-center text-xs font-medium text-gray-500">{label}</figcaption>
    </figure>
  );
}

function Siluet() {
  return (
    <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <circle cx="150" cy="170" r="58" fill="rgb(255 255 255 / 0.35)" />
      <ellipse cx="150" cy="380" rx="118" ry="96" fill="rgb(255 255 255 / 0.35)" />
    </svg>
  );
}

/** Denah 3:4: kotak putus-putus = area wajah yang wajib transparan. */
function DenahArea() {
  const a = K.areaWajah;
  return (
    <div className="relative aspect-[3/4] w-24 shrink-0 rounded-lg border-2 border-brand-masuk bg-brand-masuk/10">
      <div
        className="absolute flex items-center justify-center rounded border-2 border-dashed border-brand-masuk bg-white text-center text-[10px] font-semibold leading-tight text-brand-masuk"
        style={{
          left: `${a.x1 * 100}%`,
          right: `${(1 - a.x2) * 100}%`,
          top: `${a.y1 * 100}%`,
          bottom: `${(1 - a.y2) * 100}%`,
        }}
      >
        wajah
      </div>
      <span className="absolute inset-x-0 top-1 text-center text-[9px] font-medium text-brand-masuk">ornamen</span>
      <span className="absolute inset-x-0 bottom-1 text-center text-[9px] font-medium text-brand-masuk">ornamen</span>
    </div>
  );
}

function Butir({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <li>
      <p className="font-semibold text-brand-text">{judul}</p>
      <p className="text-xs text-gray-500">{children}</p>
    </li>
  );
}
