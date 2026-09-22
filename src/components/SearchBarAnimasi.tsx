import { useEffect, useRef, useState } from "react";

interface SearchBarAnimasiProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Ikon kaca pembesar bulat yang melebar jadi kolom pencarian penuh saat
 * ditekan (terinspirasi animasi search bar ala Instagram), lalu mengecil
 * lagi ke ikon saat ditutup/dikosongkan.
 */
export default function SearchBarAnimasi({
  value,
  onChange,
  placeholder = "Cari...",
}: SearchBarAnimasiProps) {
  const [terbuka, setTerbuka] = useState(value.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terbuka) inputRef.current?.focus();
  }, [terbuka]);

  function tutup() {
    setTerbuka(false);
    onChange("");
  }

  return (
    <div
      className={`flex h-11 items-center rounded-full bg-white shadow-sm transition-[width,padding] duration-300 ease-out ${
        terbuka ? "w-full pl-4 pr-1.5" : "w-11 justify-center"
      }`}
    >
      {terbuka ? (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              if (!value) setTerbuka(false);
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-brand-text outline-none placeholder:text-gray-400"
          />
          <button
            onClick={tutup}
            aria-label="Tutup pencarian"
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-sm font-bold text-white transition active:scale-90"
          >
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={() => setTerbuka(true)}
          aria-label="Buka pencarian"
          className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-gray-500 transition active:scale-90"
        >
          🔍
        </button>
      )}
    </div>
  );
}
