import { useCallback, useEffect, useRef, useState } from "react";

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
export default function KameraLive({ nama, lat, lng, onFotoSiap, onBatal }: KameraLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilUrl, setHasilUrl] = useState<string | null>(null);
  const [hasilBlob, setHasilBlob] = useState<Blob | null>(null);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const waktu = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
    const baris = [nama, waktu, `${lat.toFixed(5)}, ${lng.toFixed(5)}`];

    const ukuranFont = Math.max(14, Math.round(canvas.width / 32));
    const tinggiBaris = ukuranFont * 1.4;
    const tinggiOverlay = tinggiBaris * baris.length + 16;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, canvas.height - tinggiOverlay, canvas.width, tinggiOverlay);

    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${ukuranFont}px sans-serif`;
    ctx.textBaseline = "top";
    baris.forEach((teks, i) => {
      ctx.fillText(teks, 12, canvas.height - tinggiOverlay + 8 + i * tinggiBaris);
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setHasilUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) setHasilBlob(blob);
      },
      "image/jpeg",
      0.85
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
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[3/4] w-full object-cover"
          />
        )}
        {hasilUrl && (
          <img src={hasilUrl} alt="Pratinjau foto absen" className="aspect-[3/4] w-full object-cover" />
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
            className="min-h-[48px] flex-1 rounded-xl bg-brand-masuk font-semibold text-white disabled:opacity-50"
          >
            📸 Ambil Foto
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
