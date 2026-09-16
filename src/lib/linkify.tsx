import type { ReactNode } from "react";

const POLA_URL = /(https?:\/\/[^\s]+)/g;

/** Pecah teks jadi bagian biasa + tautan yang bisa diklik untuk setiap URL http(s) di dalamnya. */
export function teksDenganLink(teks: string): ReactNode {
  const bagian = teks.split(POLA_URL);
  return bagian.map((potongan, i) =>
    /^https?:\/\//.test(potongan) ? (
      <a
        key={i}
        href={potongan}
        target="_blank"
        rel="noreferrer"
        className="break-all text-blue-700 underline"
      >
        {potongan}
      </a>
    ) : (
      <span key={i}>{potongan}</span>
    )
  );
}
