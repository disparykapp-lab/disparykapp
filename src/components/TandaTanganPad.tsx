import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface TandaTanganPadHandle {
  /** Kosongkan lagi jadi true kalau canvas belum digambar / baru dibersihkan. */
  kosong: () => boolean;
  /** Ambil hasil gambar tanda tangan sebagai Blob PNG, atau null kalau kosong. */
  ambilBlob: () => Promise<Blob | null>;
  bersihkan: () => void;
}

/**
 * Kanvas tanda tangan sederhana (gambar pakai jari/mouse) — dipakai sebagai
 * bukti penerimaan dari tamu undangan saat petugas menandai tugas "Selesai".
 * Hasilnya diunggah ke storage, TIDAK ditampilkan di halaman admin — admin
 * cukup lihat progres (status selesai/belum/kendala) saja.
 */
const TandaTanganPad = forwardRef<TandaTanganPadHandle, { tinggi?: number }>(
  ({ tinggi = 160 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const menggambarRef = useRef(false);
    const pernahGambarRef = useRef(false);
    const [pernahGambar, setPernahGambar] = useState(false);

    const posisiDariEvent = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const skalaX = canvas.width / rect.width;
      const skalaY = canvas.height / rect.height;
      return { x: (e.clientX - rect.left) * skalaX, y: (e.clientY - rect.top) * skalaY };
    }, []);

    const mulai = useCallback(
      (e: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        canvas.setPointerCapture(e.pointerId);
        menggambarRef.current = true;
        const { x, y } = posisiDariEvent(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      },
      [posisiDariEvent]
    );

    const gambar = useCallback(
      (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!menggambarRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const { x, y } = posisiDariEvent(e);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1f2937";
        ctx.lineTo(x, y);
        ctx.stroke();
        if (!pernahGambarRef.current) {
          pernahGambarRef.current = true;
          setPernahGambar(true);
        }
      },
      [posisiDariEvent]
    );

    const selesai = useCallback(() => {
      menggambarRef.current = false;
    }, []);

    const bersihkan = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      pernahGambarRef.current = false;
      setPernahGambar(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        kosong: () => !pernahGambarRef.current,
        bersihkan,
        ambilBlob: () =>
          new Promise((resolve) => {
            const canvas = canvasRef.current;
            if (!canvas || !pernahGambarRef.current) {
              resolve(null);
              return;
            }
            canvas.toBlob((blob) => resolve(blob), "image/png");
          }),
      }),
      [bersihkan]
    );

    return (
      <div className="flex flex-col gap-2">
        <div
          className="relative w-full touch-none overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white"
          style={{ height: tinggi }}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={tinggi * 3}
            className="h-full w-full touch-none"
            onPointerDown={mulai}
            onPointerMove={gambar}
            onPointerUp={selesai}
            onPointerLeave={selesai}
          />
          {!pernahGambar && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-300">
              Minta tamu tanda tangan di sini
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={bersihkan}
          className="self-start text-xs font-medium text-gray-500 underline"
        >
          Bersihkan
        </button>
      </div>
    );
  }
);

TandaTanganPad.displayName = "TandaTanganPad";

export default TandaTanganPad;
