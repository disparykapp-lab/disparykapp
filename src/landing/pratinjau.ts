import { useEffect, useState } from "react";
import { ambilLanding, bawaanTergabung, type LandingTergabung } from "../lib/landing";
import { gulirKe } from "./efek";
import { drafPratinjau, PESAN_PRATINJAU, type PesanPratinjau } from "./drafPratinjau";

/** Isi landing: dari server untuk pengunjung, atau draf admin saat di iframe pratinjau. */
export function useKontenLanding(): { konten: LandingTergabung; siap: boolean } {
  const [konten, setKonten] = useState<LandingTergabung>(() => drafPratinjau() ?? bawaanTergabung());
  const [siap, setSiap] = useState(() => drafPratinjau() !== null);

  useEffect(() => {
    if (drafPratinjau()) {
      const onPesan = (e: MessageEvent<PesanPratinjau>) => {
        if (e.origin !== window.location.origin || e.data?.tipe !== PESAN_PRATINJAU) return;
        const d = drafPratinjau();
        if (d) setKonten(d);
        if (e.data.gulir) gulirKe(e.data.gulir);
      };
      window.addEventListener("message", onPesan);
      return () => window.removeEventListener("message", onPesan);
    }
    let batal = false;
    ambilLanding().then((d) => {
      if (batal) return;
      setKonten(d);
      setSiap(true);
    });
    return () => {
      batal = true;
    };
  }, []);

  return { konten, siap };
}
