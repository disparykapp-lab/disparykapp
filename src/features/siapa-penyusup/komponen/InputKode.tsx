import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { PANJANG_KODE, rapikanKode } from "../logika";

/**
 * Lima kotak huruf kode room. Mengetik pindah ke kotak berikutnya, Backspace di
 * kotak kosong mundur, dan menempel kode utuh mengisi semua kotak sekaligus.
 */
export default function InputKode({ nilai, onUbah }: { nilai: string; onUbah: (kode: string) => void }) {
  const kotak = useRef<(HTMLInputElement | null)[]>([]);
  const huruf = Array.from({ length: PANJANG_KODE }, (_, i) => nilai[i] ?? "");

  function isi(mulai: number, teks: string) {
    const bersih = rapikanKode(teks);
    const baru = [...huruf];
    if (!bersih) {
      baru[mulai] = "";
    } else {
      [...bersih].slice(0, PANJANG_KODE - mulai).forEach((c, j) => (baru[mulai + j] = c));
    }
    // kotak kosong di tengah tidak boleh "menggeser" huruf berikutnya
    onUbah(baru.map((c) => c || " ").join("").trimEnd());
    if (bersih) kotak.current[Math.min(PANJANG_KODE - 1, mulai + bersih.length)]?.focus();
  }

  function onKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !huruf[i] && i > 0) {
      e.preventDefault();
      isi(i - 1, "");
      kotak.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      kotak.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < PANJANG_KODE - 1) {
      kotak.current[i + 1]?.focus();
    }
  }

  function onTempel(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    isi(i, e.clipboardData.getData("text"));
  }

  return (
    <div className="sp-kode">
      {huruf.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            kotak.current[i] = el;
          }}
          value={c.trim()}
          onChange={(e) => {
            // mengetik di kotak yang sudah berisi: ambil huruf barunya saja
            const v = e.target.value;
            isi(i, c.trim() && v.length === 2 && v.includes(c) ? v.replace(c, "") : v);
          }}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={(e) => onTempel(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Huruf kode ke-${i + 1}`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint={i === PANJANG_KODE - 1 ? "go" : "next"}
        />
      ))}
    </div>
  );
}
