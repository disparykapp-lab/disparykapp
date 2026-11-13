import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, RotateCcw, Send } from "lucide-react";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { ambilUrlTwibbon } from "../lib/twibbon";
import { EFEK, URUTAN_EFEK, adalahTingkat, blurKanvas, cssHalus, cssWarna, pakaiWajah, terapkanWarna, type TingkatEfek } from "../lib/efekKamera";
import { susunWajah } from "../lib/wajah/geometri";
import { STIKER, urlStiker } from "../lib/wajah/stiker";
import { cariStiker, gambarStiker, gambarStikerSiap } from "../lib/wajah/gambarStiker";
import { muatDetektor } from "../lib/wajah/detektor";
import { PenggambarWajah } from "../lib/wajah/penggambar";

const KUNCI_EFEK = "disparyk:efek-kamera";
const KUNCI_STIKER = "disparyk:stiker-kamera";
/** sisi terpanjang pratinjau efek wajah (lebih kecil = lebih ringan di HP) */
const SISI_PRATINJAU = 720;

function bacaSimpanan<T>(kunci: string, sah: (x: unknown) => x is T, bawaan: T): T {
  try {
    const v = localStorage.getItem(kunci);
    return sah(v) ? v : bawaan;
  } catch {
    return bawaan;
  }
}
function simpan(kunci: string, nilai: string | null) {
  try {
    if (nilai === null) localStorage.removeItem(kunci);
    else localStorage.setItem(kunci, nilai);
  } catch {
    // penyimpanan diblokir — pilihan tetap berlaku sampai halaman ditutup
  }
}
const adalahStiker = (x: unknown): x is string => typeof x === "string" && STIKER.some((s) => s.id === x);

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
  /** label tombol setelah foto diambil (bawaan "Gunakan Foto") */
  labelKirim?: string;
}

type StatusWajah = "mati" | "memuat" | "siap" | "gagal";

/**
 * Kamera langsung dari getUserMedia — sengaja TIDAK memakai <input type="file">
 * supaya foto tidak bisa diambil dari galeri (lihat spesifikasi 7.1).
 * Efek wajah ala TikTok & stiker memakai MediaPipe + WebGL bila HP mampu; kalau
 * tidak (atau masih memuat), memakai efek sederhana berbasis filter.
 */
export default function KameraLive({ onFotoSiap, onBatal, labelKirim = "Gunakan Foto" }: KameraLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoHalusRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const lapisRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bingkaiRef = useRef<HTMLImageElement | null>(null);
  const detektorRef = useRef<FaceLandmarker | null>(null);
  const penggambarRef = useRef<PenggambarWajah | null>(null);
  const landmarkRef = useRef<NormalizedLandmark[] | null>(null);
  const adaWajahRef = useRef(false);
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilUrl, setHasilUrl] = useState<string | null>(null);
  const [hasilBlob, setHasilBlob] = useState<Blob | null>(null);
  const [bingkaiUrl, setBingkaiUrl] = useState<string | null>(null);
  const [bingkaiSiap, setBingkaiSiap] = useState(false);
  /** kilat putih sekali saat jepret (umpan balik, bukan animasi berulang) */
  const [kilat, setKilat] = useState(0);
  const [tingkat, setTingkat] = useState<TingkatEfek>(() => bacaSimpanan(KUNCI_EFEK, adalahTingkat, "asli"));
  const [stikerId, setStikerId] = useState<string | null>(() => bacaSimpanan<string | null>(KUNCI_STIKER, adalahStiker, null));
  const efek = EFEK[tingkat];
  const butuhWajah = pakaiWajah(efek) || stikerId !== null;
  const [statusWajah, setStatusWajah] = useState<StatusWajah>(() => (butuhWajah ? "memuat" : "mati"));
  const [adaWajah, setAdaWajah] = useState(false);
  const modeWajah = butuhWajah && statusWajah === "siap";
  const efekRef = useRef(efek);
  const stikerRef = useRef(stikerId);
  useEffect(() => {
    efekRef.current = efek;
    stikerRef.current = stikerId;
  });

  const siapkanWajah = useCallback(async () => {
    const d = await muatDetektor();
    detektorRef.current = d;
    setStatusWajah(d ? "siap" : "gagal");
  }, []);

  // pilihan tersimpan butuh efek wajah → muat sejak awal
  useEffect(() => {
    if (butuhWajah) void siapkanWajah();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pastikanWajah() {
    if (statusWajah === "mati") {
      setStatusWajah("memuat");
      void siapkanWajah();
    }
  }

  function pilihEfek(t: TingkatEfek) {
    setTingkat(t);
    simpan(KUNCI_EFEK, t);
    if (pakaiWajah(EFEK[t])) pastikanWajah();
  }

  function pilihStiker(id: string | null) {
    setStikerId(id);
    simpan(KUNCI_STIKER, id);
    if (id) {
      const s = cariStiker(id);
      if (s) gambarStikerSiap(s);
      pastikanWajah();
    }
  }

  useEffect(() => {
    // Preload bingkai twibbon dari awal (paralel sama izin kamera) supaya
    // pas tombol "Ambil Foto" ditekan, gambarnya sudah pasti siap dipakai.
    // Twibbon pilihan admin ada di Storage (beda origin) — dimuat dengan CORS
    // supaya kanvas tetap bisa diekspor. Belum dipasang / gagal dimuat = tanpa bingkai.
    let batal = false;
    function muat(url: string | null) {
      if (!url) {
        setBingkaiSiap(true);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (batal) return;
        bingkaiRef.current = img;
        setBingkaiUrl(url);
        setBingkaiSiap(true);
      };
      img.onerror = () => {
        if (!batal) setBingkaiSiap(true); // foto tetap bisa diambil tanpa bingkai
      };
      img.src = url;
    }
    void ambilUrlTwibbon()
      .catch(() => null)
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
      penggambarRef.current?.hapus();
      penggambarRef.current = null;
    };
  }, []);

  // Efek sederhana: lapisan lembut pratinjau memutar aliran kamera yang sama dengan video utama.
  useEffect(() => {
    const v = videoHalusRef.current;
    const stream = streamRef.current;
    if (!siap || !v || !stream || modeWajah || efek.halus === 0) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    void v.play().catch(() => undefined);
  }, [siap, efek.halus, modeWajah]);

  // Efek wajah: tiap frame — deteksi titik wajah, gambar efek di WebGL, lalu stiker.
  useEffect(() => {
    if (!modeWajah || !siap) return;
    let id = 0;
    let frameAkhir = -1;
    let urutan = 0;
    let lamaDeteksi = 0; // rata-rata bergerak (ms)
    const putar = () => {
      id = requestAnimationFrame(putar);
      const v = videoRef.current;
      const gl = glRef.current;
      const lapis = lapisRef.current;
      if (!v || !gl || !lapis || v.readyState < 2 || !v.videoWidth) return;
      if (penggambarRef.current?.kanvas !== gl) {
        penggambarRef.current?.hapus();
        try {
          penggambarRef.current = new PenggambarWajah(gl);
        } catch (e) {
          console.warn("Efek wajah tidak tersedia:", e);
          penggambarRef.current = null;
          setStatusWajah("gagal");
          return;
        }
      }
      const skala = Math.min(1, SISI_PRATINJAU / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * skala);
      const h = Math.round(v.videoHeight * skala);
      // HP lambat (deteksi > 30 ms): deteksi selang satu frame, posisi wajah terakhir tetap dipakai
      const lewati = lamaDeteksi > 30 && urutan++ % 2 === 1;
      if (v.currentTime !== frameAkhir && detektorRef.current && !lewati) {
        frameAkhir = v.currentTime;
        const mulai = performance.now();
        try {
          landmarkRef.current = detektorRef.current.detectForVideo(v, mulai).faceLandmarks[0] ?? null;
        } catch {
          landmarkRef.current = null;
        }
        lamaDeteksi = lamaDeteksi * 0.9 + (performance.now() - mulai) * 0.1;
        const ada = !!landmarkRef.current;
        if (ada !== adaWajahRef.current) {
          adaWajahRef.current = ada;
          setAdaWajah(ada);
        }
      }
      const wajah = landmarkRef.current ? susunWajah(landmarkRef.current, w, h, true) : null;
      penggambarRef.current.gambar(v, wajah, efekRef.current, w, h);
      if (lapis.width !== w || lapis.height !== h) {
        lapis.width = w;
        lapis.height = h;
      }
      const ctx = lapis.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const s = cariStiker(stikerRef.current);
      if (wajah && s) gambarStiker(ctx, wajah, s);
    };
    id = requestAnimationFrame(putar);
    return () => cancelAnimationFrame(id);
  }, [modeWajah, siap]);

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

    const penggambar = penggambarRef.current;
    if (modeWajah && penggambar) {
      // jalur yang sama dengan pratinjau, digambar ulang di ukuran foto
      const lm = landmarkRef.current;
      const wajah = lm ? susunWajah(lm, canvas.width, canvas.height, true) : null;
      penggambar.gambar(video, wajah, efek, canvas.width, canvas.height);
      ctx.drawImage(penggambar.kanvas, 0, 0, canvas.width, canvas.height);
      const s = cariStiker(stikerId);
      if (wajah && s) gambarStiker(ctx, wajah, s);
    } else {
      // Sebagian perangkat mengirim frame kamera depan yang sudah mirror dari
      // sumbernya (bukan cuma soal CSS) — balik lagi di sini supaya wajah di
      // foto yang benar-benar tersimpan tidak terbalik.
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Efek sederhana — rumus sama dengan pratinjau, hanya pada foto (bukan bingkai).
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
    setKilat((n) => n + 1);

    canvas.toBlob(
      (blob) => {
        if (blob) setHasilBlob(blob);
      },
      "image/jpeg",
      0.7
    );

    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [efek, modeWajah, stikerId]);

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

  const petunjuk = !butuhWajah
    ? efek.ket
    : statusWajah === "memuat"
      ? "Menyiapkan efek wajah… (sekali saja)"
      : statusWajah === "gagal"
        ? "HP ini belum mendukung efek wajah & stiker — memakai efek sederhana."
        : !adaWajah && siap
          ? "Hadapkan wajah ke kamera supaya efek & stiker menempel."
          : efek.ket;

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="w-full rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* lebar dibatasi tinggi layar supaya tombol jepret tetap terlihat tanpa menggulir */}
      <div className="relative w-full max-w-[min(24rem,max(15rem,calc((100dvh-16rem)*0.75)))] overflow-hidden rounded-2xl bg-black">
        {!hasilUrl && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={
                modeWajah
                  ? "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
                  : "aspect-[3/4] w-full -scale-x-100 object-cover"
              }
              style={modeWajah ? undefined : { filter: cssWarna(efek) }}
            />
            {!modeWajah && efek.halus > 0 && (
              <video
                ref={videoHalusRef}
                playsInline
                muted
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
                style={{ filter: cssHalus(efek), opacity: efek.halus }}
              />
            )}
            {modeWajah && (
              <>
                <canvas ref={glRef} className="aspect-[3/4] w-full object-cover" aria-label="Pratinjau kamera dengan efek" />
                <canvas ref={lapisRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
              </>
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
        {kilat > 0 && <div key={kilat} className="animasi-kilat pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!hasilUrl ? (
        <div className="grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={onBatal}
            className="justify-self-start rounded-full px-4 py-2 text-sm font-semibold text-gray-500 transition active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={ambilFoto}
            disabled={!siap || !bingkaiSiap}
            aria-label="Ambil foto"
            className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-white shadow-md ring-4 ring-brand-masuk transition active:scale-90 disabled:opacity-50 disabled:ring-gray-300"
          >
            <img src="/icon_kamera.png" alt="" className="h-12 w-12 object-contain" />
          </button>
          <span />
        </div>
      ) : (
        <div className="flex w-full max-w-sm gap-3">
          <button
            type="button"
            onClick={ulangi}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white font-semibold text-brand-text transition active:scale-[0.98]"
          >
            <RotateCcw size={16} aria-hidden="true" /> Ulangi
          </button>
          <button
            type="button"
            onClick={gunakanFoto}
            disabled={!hasilBlob}
            className="flex min-h-[52px] flex-[1.6] items-center justify-center gap-2 rounded-xl bg-brand-masuk font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {labelKirim} <Send size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {!hasilUrl && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <div className="grid grid-cols-4 gap-1 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="Efek wajah">
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
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]" role="radiogroup" aria-label="Stiker">
            <button
              type="button"
              role="radio"
              aria-checked={stikerId === null}
              aria-label="Tanpa stiker"
              title="Tanpa stiker"
              onClick={() => pilihStiker(null)}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 transition active:scale-95 ${
                stikerId === null ? "ring-2 ring-brand-masuk" : "ring-1 ring-black/10"
              }`}
            >
              <Ban size={22} aria-hidden="true" />
            </button>
            {STIKER.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={stikerId === s.id}
                aria-label={s.label}
                title={s.label}
                disabled={statusWajah === "gagal"}
                onClick={() => pilihStiker(s.id)}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white transition active:scale-95 disabled:opacity-40 ${
                  stikerId === s.id ? "ring-2 ring-brand-masuk" : "ring-1 ring-black/10"
                }`}
              >
                <img src={urlStiker(s)} alt="" className="h-9 w-9 object-contain" />
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-400" aria-live="polite">
            {petunjuk}
          </p>
        </div>
      )}

    </div>
  );
}
