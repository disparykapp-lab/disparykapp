import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import * as api from "./api";
import type { GameLog, GamePemain, GameRoom, GameTebakan } from "./api";

const INTERVAL_DETAK = 5000;
const BATAS_ONLINE_MS = 40000;

function pesanError(e: unknown, cadangan: string) {
  return e instanceof Error ? e.message : cadangan;
}

/**
 * Seluruh state satu room: data dari database (dengan Realtime postgres_changes),
 * detak kehadiran berkala, dan koreksi jam perangkat terhadap jam server (dari
 * respons game_detak) supaya hitung mundur tetap akurat walau jam HP meleset.
 */
export function useRoom(roomId: string) {
  const { profile } = useAuth();
  const saya = profile?.id ?? "";

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [pemain, setPemain] = useState<GamePemain[]>([]);
  const [tebakan, setTebakan] = useState<GameTebakan[]>([]);
  const [log, setLog] = useState<GameLog[]>([]);
  const [kehadiran, setKehadiran] = useState<Record<string, number>>({});
  const [rahasia, setRahasia] = useState<{ pilihan: string[]; kata: string | null } | null>(null);
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
      const [p, l, t] = await Promise.all([api.ambilPemain(roomId), api.ambilLog(roomId), api.ambilTebakan(roomId, r.giliran_ke)]);
      setRoom(r);
      setPemain(p);
      setLog(l);
      setTebakan(t);
      void muatKehadiran();
    } catch (e) {
      setError(pesanError(e, "Gagal memuat room."));
    } finally {
      setMemuat(false);
    }
  }, [roomId, muatKehadiran]);

  // Realtime: perubahan tabel room/pemain/tebakan/log untuk room ini saja.
  useEffect(() => {
    const ch = supabase
      .channel(`game-db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_room", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          setDitutup(true);
          return;
        }
        setRoom(payload.new as GameRoom);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_pemain", filter: `room_id=eq.${roomId}` }, () =>
        muatPemain()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_tebakan", filter: `room_id=eq.${roomId}` }, (payload) => {
        const t = payload.new as GameTebakan;
        setTebakan((lama) => (lama.some((x) => x.id === t.id) ? lama : [...lama, t]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_log", filter: `room_id=eq.${roomId}` }, (payload) => {
        const l = payload.new as GameLog;
        if (l.jenis === "mulai") {
          api.ambilLog(roomId).then(setLog).catch(() => {});
          return;
        }
        setLog((lama) => (lama.some((x) => x.id === l.id) ? lama : [...lama.slice(-80), l]));
        if (l.jenis === "gabung" || l.jenis === "keluar") void muatKehadiran();
      })
      .subscribe((status) => {
        // termasuk setelah sambungan putus lalu tersambung lagi: isi celah data yang terlewat
        if (status === "SUBSCRIBED") void muatSemua();
      });
    return () => {
      window.clearTimeout(timerPemain.current);
      void supabase.removeChannel(ch);
    };
  }, [roomId, muatSemua, muatPemain, muatKehadiran]);

  // Giliran baru belum punya tebakan (yang lama dihapus server saat permainan
  // diulang); di fase lain muat ulang supaya tidak ada tebakan yang terlewat.
  const giliranKe = room?.giliran_ke;
  const status = room?.status;
  useEffect(() => {
    if (giliranKe === undefined) return;
    if (status === "memilih" || status === "menunggu") {
      setTebakan([]);
      return;
    }
    api.ambilTebakan(roomId, giliranKe).then(setTebakan).catch(() => {});
  }, [roomId, giliranKe, status]);

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

  // Picu server tepat saat tenggat fase / ambang petunjuk huruf, tanpa menunggu detak berikutnya.
  const faseMulai = room?.fase_mulai;
  const faseBerakhir = room?.fase_berakhir;
  useEffect(() => {
    if (!sayaAnggota || !faseBerakhir || !status || !["memilih", "menggambar", "reveal"].includes(status)) return;
    const akhir = new Date(faseBerakhir).getTime();
    const kini = Date.now() + selisihJam;
    const titik = [akhir - kini + 250];
    if (status === "menggambar" && faseMulai) {
      const awal = new Date(faseMulai).getTime();
      for (const porsi of [0.5, 0.6, 0.75]) titik.push(awal + porsi * (akhir - awal) - kini + 250);
    }
    const timer = titik
      .filter((t) => t > 0 && t < 10 * 60_000)
      .map((t) => window.setTimeout(() => void api.detak(roomId).catch(() => {}), t));
    return () => timer.forEach((t) => window.clearTimeout(t));
  }, [roomId, sayaAnggota, status, faseMulai, faseBerakhir, selisihJam]);

  // Kata rahasia: hanya bisa dibaca penggambar giliran ini (dibatasi RLS di server).
  const penggambarId = room?.penggambar_id;
  useEffect(() => {
    if (!penggambarId || penggambarId !== saya || (status !== "memilih" && status !== "menggambar")) {
      setRahasia(null);
      return;
    }
    let batal = false;
    api.ambilRahasia(roomId).then((r) => {
      if (!batal) setRahasia(r);
    });
    return () => {
      batal = true;
    };
  }, [roomId, saya, penggambarId, status, giliranKe]);

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
  const namaPemain = useCallback(
    (userId: string | null) => pemain.find((p) => p.user_id === userId)?.profiles?.nama ?? "Pemain",
    [pemain]
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
    tebakan: room ? tebakan.filter((t) => t.giliran_ke === room.giliran_ke) : [],
    log,
    rahasia,
    memuat,
    ditutup,
    error,
    setError,
    sayaAnggota,
    sayaHost: !!room && room.host_id === saya,
    sayaPenggambar: !!room && room.penggambar_id === saya,
    sekarang,
    online,
    namaPemain,
    mulai: () => jalankan(() => api.mulaiGame(roomId), "Gagal memulai permainan."),
    pilihKata: (i: number) => jalankan(() => api.pilihKata(roomId, i), "Gagal memilih kata."),
    tebak: (teks: string) => jalankan(() => api.kirimTebakan(roomId, teks), "Gagal mengirim jawaban."),
    keluar: () => jalankan(() => api.keluarRoom(roomId), "Gagal keluar dari room."),
    mainLagi: () => jalankan(() => api.mainLagi(roomId), "Gagal memulai ulang."),
    muatUlang: muatSemua,
  };
}

export type StateRoom = ReturnType<typeof useRoom>;
