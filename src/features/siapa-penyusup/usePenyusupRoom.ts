import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import * as api from "./api";
import type { DivisiRingkas, PenyusupLog, PenyusupPemain, PenyusupRoom } from "./api";
import { nomorWarnaDivisi } from "./logika";

const INTERVAL_DETAK = 5000;
const BATAS_ONLINE_MS = 40000;
const FASE_BERWAKTU = ["bagikan", "petunjuk", "diskusi", "voting", "hasil_vote", "tebakan_terakhir"];

function pesanError(e: unknown, cadangan: string) {
  return e instanceof Error ? e.message : cadangan;
}

/**
 * Seluruh state satu room Siapa Penyusup: data dari database (Realtime
 * postgres_changes), detak kehadiran berkala, dan koreksi jam perangkat terhadap
 * jam server (dari respons penyusup_detak) supaya hitung mundur tetap akurat.
 * Pola sama dengan useRoom milik Coret Tebak.
 */
export function usePenyusupRoom(roomId: string) {
  const { profile } = useAuth();
  const saya = profile?.id ?? "";

  const [room, setRoom] = useState<PenyusupRoom | null>(null);
  const [pemain, setPemain] = useState<PenyusupPemain[]>([]);
  const [log, setLog] = useState<PenyusupLog[]>([]);
  const [divisi, setDivisi] = useState<DivisiRingkas[]>([]);
  const [kehadiran, setKehadiran] = useState<Record<string, number>>({});
  /** Kejadian realtime terbaru (gabung/keluar/…), untuk efek suara & toast. Riwayat lama tidak ikut. */
  const [kejadian, setKejadian] = useState<PenyusupLog | null>(null);
  const [selisihJam, setSelisihJam] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [ditutup, setDitutup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerPemain = useRef<number | undefined>(undefined);

  const muatPemain = useCallback(() => {
    window.clearTimeout(timerPemain.current);
    timerPemain.current = window.setTimeout(() => {
      api.ambilPemain(roomId).then(setPemain).catch(() => {});
    }, 150);
  }, [roomId]);

  const muatKehadiran = useCallback(async () => {
    try {
      const daftar = await api.ambilKehadiran(roomId);
      setKehadiran(Object.fromEntries(daftar.map((k) => [k.user_id, new Date(k.terakhir_aktif).getTime()])));
    } catch {
      // tidak fatal
    }
  }, [roomId]);

  const muatSemua = useCallback(async () => {
    try {
      const r = await api.ambilRoom(roomId);
      if (!r) {
        setDitutup(true);
        return;
      }
      const [p, l] = await Promise.all([api.ambilPemain(roomId), api.ambilLog(roomId)]);
      setRoom(r);
      setPemain(p);
      setLog(l);
      void muatKehadiran();
    } catch (e) {
      setError(pesanError(e, "Gagal memuat room."));
    } finally {
      setMemuat(false);
    }
  }, [roomId, muatKehadiran]);

  useEffect(() => {
    api.ambilDivisi().then(setDivisi).catch(() => {});
  }, []);

  // Realtime: perubahan tabel room/pemain/log untuk room ini saja.
  useEffect(() => {
    const ch = supabase
      .channel(`penyusup-db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "penyusup_room", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          setDitutup(true);
          return;
        }
        setRoom(payload.new as PenyusupRoom);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "penyusup_pemain", filter: `room_id=eq.${roomId}` }, () =>
        muatPemain()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "penyusup_log", filter: `room_id=eq.${roomId}` }, (payload) => {
        const l = payload.new as PenyusupLog;
        setLog((lama) => (lama.some((x) => x.id === l.id) ? lama : [...lama.slice(-60), l]));
        // muat pemain dulu supaya nama pemain yang baru masuk sudah ada saat toast tampil
        api
          .ambilPemain(roomId)
          .then(setPemain)
          .catch(() => {})
          .finally(() => setKejadian(l));
        if (l.jenis === "gabung" || l.jenis === "keluar" || l.jenis === "dikeluarkan") void muatKehadiran();
      })
      .subscribe((status) => {
        // termasuk setelah sambungan putus lalu tersambung lagi: isi celah data yang terlewat
        if (status === "SUBSCRIBED") void muatSemua();
      });
    // langsung dimuat juga, tanpa menunggu Realtime (yang bisa lambat / diblokir jaringan);
    // lewat timer supaya pemasangan ganda StrictMode tidak memuat dua kali
    const muatAwal = window.setTimeout(() => void muatSemua(), 0);
    return () => {
      window.clearTimeout(muatAwal);
      window.clearTimeout(timerPemain.current);
      void supabase.removeChannel(ch);
    };
  }, [roomId, muatSemua, muatPemain, muatKehadiran]);

  // Detak kehadiran berkala + saat tab kembali terlihat.
  const sayaAnggota = pemain.some((p) => p.user_id === saya && p.aktif);
  useEffect(() => {
    if (!sayaAnggota) return;
    let batal = false;
    async function denyut() {
      const t0 = Date.now();
      try {
        const server = await api.detak(roomId);
        const baru = server - (t0 + Date.now()) / 2;
        if (!batal) setSelisihJam((lama) => (Math.abs(lama - baru) > 300 ? baru : lama));
      } catch {
        // gagal sesaat (sinyal) — detak berikutnya mencoba lagi
      }
    }
    void denyut();
    const iv = window.setInterval(denyut, INTERVAL_DETAK);
    const kehadiranIv = window.setInterval(() => void muatKehadiran(), 10000);
    const onVis = () => {
      if (document.visibilityState === "visible") void denyut();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      batal = true;
      window.clearInterval(iv);
      window.clearInterval(kehadiranIv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [roomId, sayaAnggota, muatKehadiran]);

  // Picu server tepat saat tenggat fase, tanpa menunggu detak berikutnya.
  const status = room?.status;
  const faseBerakhir = room?.fase_berakhir;
  useEffect(() => {
    if (!sayaAnggota || !faseBerakhir || !status || !FASE_BERWAKTU.includes(status)) return;
    const sisa = new Date(faseBerakhir).getTime() - (Date.now() + selisihJam) + 250;
    if (sisa <= 0 || sisa > 10 * 60_000) return;
    const t = window.setTimeout(() => void api.detak(roomId).catch(() => {}), sisa);
    return () => window.clearTimeout(t);
  }, [roomId, sayaAnggota, status, faseBerakhir, selisihJam]);

  const sekarang = useCallback(() => Date.now() + selisihJam, [selisihJam]);

  const online = useCallback(
    (userId: string) => {
      if (userId === saya) return true;
      const t = kehadiran[userId];
      return !!t && Date.now() + selisihJam - t < BATAS_ONLINE_MS;
    },
    [kehadiran, saya, selisihJam]
  );

  const aktif = useMemo(() => pemain.filter((p) => p.aktif), [pemain]);
  const urutanDivisi = useMemo(() => divisi.map((d) => d.id), [divisi]);

  const namaPemain = useCallback(
    (userId: string | null) => pemain.find((p) => p.user_id === userId)?.profiles?.nama ?? "Pemain",
    [pemain]
  );
  const namaDivisi = useCallback((divisiId: string | null) => divisi.find((d) => d.id === divisiId)?.nama ?? null, [divisi]);
  /** Nilai CSS untuk --dv: warna divisi, abu-abu untuk pemain tanpa divisi. */
  const warnaDivisi = useCallback(
    (divisiId: string | null) => {
      const n = nomorWarnaDivisi(divisiId, urutanDivisi);
      return n ? `var(--divisi-${n})` : "var(--gray-400)";
    },
    [urutanDivisi]
  );

  async function jalankan<T>(aksi: () => Promise<T>, cadangan: string): Promise<T | undefined> {
    setError(null);
    try {
      return await aksi();
    } catch (e) {
      setError(pesanError(e, cadangan));
      return undefined;
    }
  }

  return {
    saya,
    room,
    pemain,
    aktif,
    log,
    kejadian,
    memuat,
    ditutup,
    error,
    setError,
    sayaAnggota,
    sayaPemain: pemain.find((p) => p.user_id === saya) ?? null,
    sayaHost: !!room && room.host_id === saya,
    sekarang,
    online,
    namaPemain,
    namaDivisi,
    warnaDivisi,
    keluar: () => jalankan(() => api.keluarRoom(roomId), "Gagal keluar dari room."),
    keluarkan: (userId: string) => jalankan(() => api.keluarkanPemain(roomId, userId), "Gagal mengeluarkan pemain."),
    aturSiap: (siap: boolean) => jalankan(() => api.aturSiap(roomId, siap), "Gagal mengubah status siap."),
    pilihAvatar: (avatar: number) => jalankan(() => api.pilihAvatar(roomId, avatar), "Gagal mengganti karakter."),
    muatUlang: muatSemua,
  };
}

export type StatePenyusupRoom = ReturnType<typeof usePenyusupRoom>;
