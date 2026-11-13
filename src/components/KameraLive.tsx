import { useCallback, useEffect, useRef, useState } from "react";
import { ambilUrlTwibbon } from "../lib/twibbon";
import { TWIBBON_BAWAAN } from "../lib/twibbonMeta";
import { EFEK, URUTAN_EFEK, adalahTingkat, blurKanvas, cssHalus, cssWarna, terapkanWarna, type TingkatEfek } from "../lib/efekKamera";

const KUNCI_EFEK = "disparyk:efek-kamera";

function efekTersimpan(): TingkatEfek {
  try {
    const v = localStorage.getItem(KUNCI_EFEK);
    return adalahTingkat(v) ? v : "asli";
  } catch {
    return "asli";
  }
}

const filterKanvasDidukung =
  typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

/** Lapisan lembut (soft-focus): salinan foto yang diburamkan, ditumpuk tipis di atasnya. */
function lapisHalus(ctx: CanvasRenderingContext2D, kanvas: HTMLCanvasElement, radius: number, kekuatan: number) {
  if (radius <= 0 || kekuatan <= 0) return;
  const salinan = document.createElement("canvas");
  salinan.width = kanvas.width;
  salinan.height = kanvas.height;
  const sctx = salinan.getContext("2d");
  if (!sctx) return;
  if (filterKanvasDidukung) {
    sctx.filter = `blur(${radius}px)`;
    sctx.drawImage(kanvas, 0, 0);
  } else {
    // browser lama tanpa ctx.filter: kecilkan bertahap lalu besarkan lagi (hasilnya buram halus)
    const target = Math.max(1, Math.round(kanvas.width / Math.max(2, radius * 2)));
    let sumber: HTMLCanvasElement = kanvas;
    while (sumber.width / 2 >= target) {
      const kecil = document.createElement("canvas");
      kecil.width = Math.max(1, Math.round(sumber.width / 2));
      kecil.height = Math.max(1, Math.round(sumber.height / 2));
      kecil.getContext("2d")?.drawImage(sumber, 0, 0, kecil.width, kecil.height);
      sumber = kecil;
    }
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(sumber, 0, 0, salinan.width, salinan.height);
  }
  ctx.save();
  ctx.globalAlpha = kekuatan;
  ctx.drawImage(salinan, 0, 0);
  ctx.restore();
}

interface KameraLiveProps {
  nama: string;
  lat: number;
  lng: number;
  onFotoSiap: (blob: Blob, dataUrl: string) => void;
  onBatal: () => void;
}

/**
 * Kamera langsung dari getUserMedia — sengaja TIDAK memakai <input type="file">
 * supaya foto tidak bisa diambil dari galeri (lihat spesifikasi 7.1).
 */
export default function KameraLive({ onFotoSiap, onBatal }: KameraLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoHalusRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bingkaiRef = useRef<HTMLImageElement | null>(null);
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilUrl, setHasilUrl] = useState<string | null>(null);
  const [hasilBlob, setHasilBlob] = useState<Blob | null>(null);
  const [bingkaiUrl, setBingkaiUrl] = useState<string | null>(null);
  const [bingkaiSiap, setBingkaiSiap] = useState(false);
  const [tingkat, setTingkat] = useState<TingkatEfek>(efekTersimpan);
  const efek = EFEK[tingkat];

  function pilihEfek(t: TingkatEfek) {
    setTingkat(t);
    try {
      localStorage.setItem(KUNCI_EFEK, t);
    } catch {
      // penyimpanan diblokir — pilihan tetap berlaku sampai halaman ditutup
    }
  }

  // Lapisan lembut pratinjau memutar aliran kamera yang sama dengan video utama.
  useEffect(() => {
    const v = videoHalusRef.current;
    const stream = streamRef.current;
    if (!siap || !v || !stream || efek.halus === 0) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    void v.play().catch(() => undefined);
  }, [siap, efek.halus]);

  useEffect(() => {
    // Preload bingkai twibbon dari awal (paralel sama izin kamera) supaya
    // pas tombol "Ambil Foto" ditekan, gambarnya sudah pasti siap dipakai.
    // Twibbon pilihan admin ada di Storage (beda origin) — dimuat dengan CORS
    // supaya kanvas tetap bisa diekspor. Gagal dimuat = pakai bingkai bawaan.
    let batal = false;
    function muat(url: string) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (batal) return;
        bingkaiRef.current = img;
        setBingkaiUrl(url);
        setBingkaiSiap(true);
      };
      img.onerror = () => {
        if (batal) return;
        if (url !== TWIBBON_BAWAAN) muat(TWIBBON_BAWAAN);
        else setBingkaiSiap(true); // foto tetap bisa diambil tanpa bingkai
      };
      img.src = url;
    }
    void ambilUrlTwibbon()
      .catch(() => TWIBBON_BAWAAN)
      .then(muat);
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    let batal = false;

    async function bukaKamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (batal) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setSiap(true);
      } catch {
        setError("Tidak bisa mengakses kamera. Izinkan akses kamera di browser, lalu coba lagi.");
      }
    }

    void bukaKamera();

    return () => {
      batal = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const ambilFoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Batasi resolusi maksimal supaya ukuran file tidak besar (kamera HP
    // modern bisa >3000px sisi terpanjang) — 900px cukup jelas untuk
    // verifikasi wajah/lokasi tapi jauh lebih hemat penyimpanan.
    const RESOLUSI_MAKS = 900;
    const skala = Math.min(1, RESOLUSI_MAKS / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * skala);
    canvas.height = Math.round(video.videoHeight * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sebagian perangkat mengirim frame kamera depan yang sudah mirror dari
    // sumbernya (bukan cuma soal CSS) — balik lagi di sini supaya wajah di
    // foto yang benar-benar tersimpan tidak terbalik.
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Efek kecantikan — rumus sama dengan pratinjau, hanya pada foto (bukan bingkai).
    if (cssWarna(efek) !== "none") {
      const piksel = ctx.getImageData(0, 0, canvas.width, canvas.height);
      terapkanWarna(piksel.data, efek);
      ctx.putImageData(piksel, 0, 0);
    }
    if (efek.halus > 0) {
      const kotak = video.getBoundingClientRect();
      const skalaTampil = Math.max(kotak.width / video.videoWidth, kotak.height / video.videoHeight);
      lapisHalus(ctx, canvas, blurKanvas(efek, skalaTampil, skala), efek.halus);
    }

    // Bingkai twibbon (punya lubang transparan di tengah) digambar di atas
    // foto, memenuhi seluruh kanvas — bagian tengah foto tetap kelihatan
    // lewat lubangnya, cuma pinggirnya yang ketutupan bingkai emas.
    const bingkai = bingkaiRef.current;
    if (bingkai && bingkai.complete && bingkai.naturalWidth > 0) {
      ctx.drawImage(bingkai, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setHasilUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) setHasilBlob(blob);
      },
      "image/jpeg",
      0.7
    );

    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [efek]);

  const gunakanFoto = useCallback(() => {
    if (hasilBlob && hasilUrl) onFotoSiap(hasilBlob, hasilUrl);
  }, [hasilBlob, hasilUrl, onFotoSiap]);

  const ulangi = useCallback(() => {
    setHasilUrl(null);
    setHasilBlob(null);
    setSiap(false);
    setError(null);
    const bukaLagi = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setSiap(true);
      } catch {
        setError("Tidak bisa mengakses kamera. Izinkan akses kamera di browser, lalu coba lagi.");
      }
    };
    void bukaLagi();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="w-full rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        {!hasilUrl && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[3/4] w-full -scale-x-100 object-cover"
              style={{ filter: cssWarna(efek) }}
            />
            {efek.halus > 0 && (
              <video
                ref={videoHalusRef}
                playsInline
                muted
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
                style={{ filter: cssHalus(efek), opacity: efek.halus }}
              />
            )}
            {/* Preview bingkai supaya wajah bisa diposisikan pas sebelum jepret
                — hasil akhirnya sudah pasti kebingkai juga (digambar di kanvas). */}
            {bingkaiUrl && (
              <img
                src={bingkaiUrl}
                crossOrigin="anonymous"
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-fill"
              />
            )}
          </>
        )}
        {hasilUrl && (
          <img
            src={hasilUrl}
            alt="Pratinjau foto absen"
            className="aspect-[3/4] w-full object-cover"
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!hasilUrl && (
        <div className="flex w-full max-w-sm flex-col gap-1.5">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="Efek wajah">
            {URUTAN_EFEK.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tingkat === t}
                onClick={() => pilihEfek(t)}
                className={`min-h-[38px] rounded-full text-sm font-semibold transition ${
                  tingkat === t ? "bg-brand-masuk text-white shadow-sm" : "text-gray-500"
                }`}
              >
                {EFEK[t].label}
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-400">
            {efek.ket} · bentuk wajah tetap asli
          </p>
        </div>
      )}

      {!hasilUrl ? (
        <div className="flex w-full max-w-sm gap-3">
          <button
            onClick={onBatal}
            className="min-h-[48px] flex-1 rounded-xl border border-gray-300 bg-white font-semibold text-brand-text"
          >
            Batal
          </button>
          <button
            onClick={ambilFoto}
            disabled={!siap || !bingkaiSiap}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-masuk font-semibold text-white disabled:opacity-50"
          >
            <img src="/icon_kamera.png" alt="" className="-ml-1 h-9 w-9 object-contain" />
            Ambil Foto
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-sm gap-3">
          <button
            onClick={ulangi}
            className="min-h-[48px] flex-1 rounded-xl border border-gray-300 bg-white font-semibold text-brand-text"
          >
            Ambil Ulang
          </button>
          <button
            onClick={gunakanFoto}
            className="min-h-[48px] flex-1 rounded-xl bg-brand-masuk font-semibold text-white"
          >
            Gunakan Foto
          </button>
        </div>
      )}
    </div>
  );
}
