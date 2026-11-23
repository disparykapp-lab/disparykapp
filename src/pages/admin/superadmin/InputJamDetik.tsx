import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MAKS_SEGMEN, geserSegmen, isiSegmen, pecahJam, type IndeksSegmen } from "../../../lib/koreksiAbsenAturan";

const NAMA_SEGMEN = ["jam", "menit", "detik"] as const;
const JEDA_ULANG_MS = 380;
const SELA_ULANG_MS = 70;

/**
 * Pemilih jam : menit : detik buatan sendiri. <input type="time" step="1"> di
 * Safari iPhone tidak menampilkan detik, jadi tiap bagian punya tombol ▲/▼
 * (tahan untuk berjalan cepat) dan bisa diketik langsung (2 angka → pindah ke
 * bagian berikutnya). `nilai` "" = kosong; menekan ▲/▼ saat kosong mengisi
 * `awal` (mis. jadwal kantor) dulu.
 */
export default function InputJamDetik({
  nilai,
  onUbah,
  label,
  awal = "00:00:00",
}: {
  nilai: string;
  onUbah: (v: string) => void;
  /** mis. "masuk" → aria-label "Jam masuk", "Menit masuk", … */
  label: string;
  awal?: string;
}) {
  const bagian = pecahJam(nilai);
  const [draf, setDraf] = useState<{ i: IndeksSegmen; teks: string } | null>(null);
  const kolom = useRef<(HTMLInputElement | null)[]>([]);
  const ulang = useRef<{ jeda: number; sela: number } | null>(null);

  // jari masih menahan tombol saat komponen hilang → hentikan pengulang
  useEffect(
    () => () => {
      if (!ulang.current) return;
      window.clearTimeout(ulang.current.jeda);
      window.clearInterval(ulang.current.sela);
    },
    []
  );

  function berhenti() {
    if (!ulang.current) return;
    window.clearTimeout(ulang.current.jeda);
    window.clearInterval(ulang.current.sela);
    ulang.current = null;
  }

  /** Langkah pertama langsung; ditahan = berjalan terus dari nilai saat ditekan. */
  function mulaiGeser(e: PointerEvent, i: IndeksSegmen, arah: 1 | -1) {
    if (e.button !== 0) return;
    berhenti();
    const dasar = nilai || awal;
    if (!nilai) {
      onUbah(dasar);
      return;
    }
    let langkah = 1;
    onUbah(geserSegmen(dasar, i, arah));
    const jeda = window.setTimeout(() => {
      const sela = window.setInterval(() => {
        langkah += 1;
        onUbah(geserSegmen(dasar, i, arah * langkah));
      }, SELA_ULANG_MS);
      if (ulang.current) ulang.current.sela = sela;
    }, JEDA_ULANG_MS);
    ulang.current = { jeda, sela: 0 };
  }

  function ketik(i: IndeksSegmen, mentah: string) {
    const angka = mentah.replace(/\D/g, "").slice(0, 2);
    setDraf({ i, teks: angka });
    if (!angka) return;
    onUbah(isiSegmen(nilai, i, Number(angka)));
    // 2 angka, atau 1 angka yang tidak mungkin diikuti angka lain (mis. "7" di menit tetap ditunggu, "3" di jam langsung lanjut)
    const selesai = angka.length === 2 || Number(angka) * 10 > MAKS_SEGMEN[i];
    if (selesai && i < 2) kolom.current[i + 1]?.focus();
  }

  function tombol(e: KeyboardEvent, i: IndeksSegmen) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setDraf(null);
      onUbah(nilai ? geserSegmen(nilai, i, e.key === "ArrowUp" ? 1 : -1) : awal);
    } else if (e.key === "Backspace" && draf?.i === i && draf.teks === "" && i > 0) {
      kolom.current[i - 1]?.focus();
    }
  }

  return (
    <div className="flex items-start justify-center gap-1" role="group" aria-label={`Jam ${label}`}>
      {([0, 1, 2] as IndeksSegmen[]).map((i) => {
        const tampil = draf?.i === i ? draf.teks : bagian ? String(bagian[i]).padStart(2, "0") : "";
        return (
          <div key={i} className="flex items-start gap-1">
            {i > 0 && <span className="pt-[46px] text-2xl font-extrabold leading-none text-gray-300" aria-hidden="true">:</span>}
            <div className="flex w-[4.5rem] flex-col items-center">
              <div className="flex w-full flex-col items-center overflow-hidden rounded-2xl bg-gray-50 focus-within:ring-2 focus-within:ring-brand-masuk/40">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Tambah ${NAMA_SEGMEN[i]} ${label}`}
                  onPointerDown={(e) => mulaiGeser(e, i, 1)}
                  onPointerUp={berhenti}
                  onPointerLeave={berhenti}
                  onPointerCancel={berhenti}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => e.detail === 0 && onUbah(nilai ? geserSegmen(nilai, i, 1) : awal)}
                  className="flex h-9 w-full touch-manipulation select-none items-center justify-center text-gray-500 transition [-webkit-touch-callout:none] active:scale-90 active:text-brand-masuk"
                >
                  <ChevronUp size={20} />
                </button>
                <input
                  ref={(el) => {
                    kolom.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint={i < 2 ? "next" : "done"}
                  maxLength={2}
                  value={tampil}
                  placeholder="--"
                  aria-label={`${NAMA_SEGMEN[i][0].toUpperCase()}${NAMA_SEGMEN[i].slice(1)} ${label}`}
                  onFocus={() => setDraf({ i, teks: "" })}
                  onBlur={() => setDraf(null)}
                  onChange={(e) => ketik(i, e.target.value)}
                  onKeyDown={(e) => tombol(e, i)}
                  className="h-11 w-full bg-transparent text-center text-3xl font-extrabold leading-none tabular-nums text-brand-text outline-none placeholder:text-gray-300"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Kurangi ${NAMA_SEGMEN[i]} ${label}`}
                  onPointerDown={(e) => mulaiGeser(e, i, -1)}
                  onPointerUp={berhenti}
                  onPointerLeave={berhenti}
                  onPointerCancel={berhenti}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => e.detail === 0 && onUbah(nilai ? geserSegmen(nilai, i, -1) : awal)}
                  className="flex h-9 w-full touch-manipulation select-none items-center justify-center text-gray-500 transition [-webkit-touch-callout:none] active:scale-90 active:text-brand-masuk"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{NAMA_SEGMEN[i]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
