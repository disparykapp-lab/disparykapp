import { useCallback, useEffect, useRef, useState } from "react";

const KUNCI = "disparyk:wishlist";

function baca(): string[] {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(KUNCI) ?? "[]");
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Wishlist destinasi/agenda di localStorage (per perangkat, bertahan setelah refresh). */
export function useWishlist(): [Set<string>, (id: string) => boolean] {
  const [ids, setIds] = useState<Set<string>>(() => new Set(baca()));
  const terkini = useRef(ids);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KUNCI) return;
      const next = new Set(baca());
      terkini.current = next;
      setIds(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Mengembalikan status baru: true kalau sekarang tersimpan. */
  const toggle = useCallback((id: string): boolean => {
    const next = new Set(terkini.current);
    const sekarang = !next.has(id);
    if (sekarang) next.add(id);
    else next.delete(id);
    terkini.current = next;
    try {
      window.localStorage.setItem(KUNCI, JSON.stringify([...next]));
    } catch {
      // Storage diblokir: wishlist tetap jalan untuk sesi ini.
    }
    setIds(next);
    return sekarang;
  }, []);

  return [ids, toggle];
}
