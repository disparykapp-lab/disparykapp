import { useCallback, useEffect, useState } from "react";
import { ambilSemuaTanya, ambilTanya, dengarTanya, type TanyaTugas } from "./tugas";
import { gabungTanya } from "./tugasAturan";

/** Selama websocket belum/tidak tersambung (mis. migrasi 0042 belum dijalankan), cek pesan baru tiap 15 detik. */
const JEDA_CADANGAN = 15_000;

/**
 * Pesan tanya-jawab yang selalu terbaru: dimuat sekali, lalu pesan baru masuk
 * langsung lewat websocket (Supabase Realtime).
 * - Pegawai: `{ tugasId, pemilik }` — satu percakapan.
 * - Admin: `{ muatAwal: false }` — semua percakapan; isi awal lewat `tambah()`.
 */
export function useTanyaLangsung({
  tugasId = null,
  pemilik = null,
  muatAwal = true,
}: {
  tugasId?: string | null;
  pemilik?: string | null;
  muatAwal?: boolean;
}) {
  const [pesan, setPesan] = useState<TanyaTugas[]>([]);
  const [tersambung, setTersambung] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    let ok = false;
    const cocok = (m: TanyaTugas) => (!tugasId || m.tugas_id === tugasId) && (!pemilik || m.user_id === pemilik);
    const segarkan = () =>
      (tugasId ? ambilTanya(tugasId, pemilik ?? undefined) : ambilSemuaTanya())
        .then((d) => {
          if (batal) return;
          // digabung, bukan diganti: pesan websocket yang tiba selagi memuat tidak hilang
          setPesan((lama) => gabungTanya(lama, d));
          setGalat(null);
        })
        .catch((e: unknown) => !batal && setGalat(e instanceof Error ? e.message : "Gagal memuat percakapan."));

    const berhenti = dengarTanya(
      tugasId,
      (m) => {
        if (!batal && cocok(m)) setPesan((lama) => gabungTanya(lama, [m]));
      },
      (s) => {
        if (batal) return;
        ok = s;
        setTersambung(s);
        // tersambung (lagi): isi pesan yang terlewat selama belum/putus sambungan
        if (s) void segarkan();
      }
    );
    // lewat timer supaya pasang-lepas ganda StrictMode tidak memuat dua kali
    const awal = muatAwal ? window.setTimeout(() => void segarkan(), 0) : undefined;
    const cadangan = window.setInterval(() => {
      if (!ok && document.visibilityState === "visible") void segarkan();
    }, JEDA_CADANGAN);
    // kembali ke tab/aplikasi (HP sering memutus websocket di latar belakang): langsung cek
    const kembali = () => {
      if (!ok && document.visibilityState === "visible") void segarkan();
    };
    document.addEventListener("visibilitychange", kembali);
    return () => {
      batal = true;
      window.clearTimeout(awal);
      window.clearInterval(cadangan);
      document.removeEventListener("visibilitychange", kembali);
      berhenti();
      setTersambung(false);
    };
  }, [tugasId, pemilik, muatAwal]);

  /**
   * Tambahkan pesan dari luar: yang baru terkirim dari perangkat ini (tampil tanpa
   * menunggu websocket), atau hasil muat ulang admin. Selalu digabung, tidak diganti.
   */
  const tambah = useCallback((m: TanyaTugas | TanyaTugas[]) => setPesan((lama) => gabungTanya(lama, Array.isArray(m) ? m : [m])), []);

  return { pesan, tersambung, galat, tambah };
}
