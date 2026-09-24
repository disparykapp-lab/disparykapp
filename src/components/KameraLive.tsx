import { useCallback, useEffect, useRef, useState } from "react";

interface KameraLiveProps {
  nama: string;
  lat: number;
  lng: number;
  onFotoSiap: (blob: Blob, dataUrl: string) => void;
  onBatal: () => void;
}

// Batas area transparan (lubang foto) pada bingkai twibbon.png, dalam
// persentase lebar/tinggi gambar bingkainya sendiri — dipakai supaya
// watermark teks digambar di dalam lubang, tidak ketutupan bingkai emas
// yang solid di pinggir (diukur langsung dari file twibbon.png).
const BINGKAI_LUBANG = { kiri: 0.19, kanan: 0.8, atas: 0.19, bawah: 0.86 };

/**
 * Kamera langsung dari getUserMedia — sengaja TIDAK memakai <input type="file">
 * supaya foto tidak bisa diambil dari galeri (lihat spesifikasi 7.1).
 */
export default function KameraLive({ nama, lat, lng, onFotoSiap, onBatal }: KameraLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bingkaiRef = useRef<HTMLImageElement | null>(null);
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilUrl, setHasilUrl] = useState<string | null>(null);
  const [hasilBlob, setHasilBlob] = useState<Blob | null>(null);

  useEffect(() => {
    // Preload bingkai twibbon dari awal (paralel sama izin kamera) supaya
    // pas tombol "Ambil Foto" ditekan, gambarnya sudah pasti siap dipakai.
    const img = new Image();
    img.src = "/twibbon.png";
    bingkaiRef.current = img;
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
    // foto yang benar-benar tersimpan tidak terbalik. Teks watermark di
    // bawah digambar normal (di luar transform ini) supaya tetap terbaca.
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Bingkai twibbon (punya lubang transparan di tengah) digambar di atas
    // foto, memenuhi seluruh kanvas — bagian tengah foto tetap kelihatan
    // lewat lubangnya, cuma pinggirnya yang ketutupan bingkai emas.
    const bingkai = bingkaiRef.current;
    if (bingkai && bingkai.complete && bingkai.naturalWidth > 0) {
      ctx.drawImage(bingkai, 0, 0, canvas.width, canvas.height);
    }

    const waktu = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
    const baris = [nama, waktu, `${lat.toFixed(5)}, ${lng.toFixed(5)}`];

    // Watermark digambar di DALAM lubang bingkai (bukan mepet tepi kanvas)
    // supaya tidak ketutupan bingkai emas yang solid.
    const batasKiri = canvas.width * BINGKAI_LUBANG.kiri;
    const batasKanan = canvas.width * BINGKAI_LUBANG.kanan;
    const batasBawah = canvas.height * BINGKAI_LUBANG.bawah;
    const lebarLubang = batasKanan - batasKiri;

    const ukuranFont = Math.max(12, Math.round(lebarLubang / 26));
    const tinggiBaris = ukuranFont * 1.35;
    const tinggiOverlay = tinggiBaris * baris.length + 14;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(batasKiri, batasBawah - tinggiOverlay, lebarLubang, tinggiOverlay);

    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${ukuranFont}px sans-serif`;
    ctx.textBaseline = "top";
    baris.forEach((teks, i) => {
      ctx.fillText(teks, batasKiri + 8, batasBawah - tinggiOverlay + 6 + i * tinggiBaris);
    });

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
  }, [nama, lat, lng]);

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
            />
            {/* Preview bingkai supaya wajah bisa diposisikan pas sebelum jepret
                — hasil akhirnya sudah pasti kebingkai juga (digambar di kanvas). */}
            <img
              src="/twibbon.png"
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-fill"
            />
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
            disabled={!siap}
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
