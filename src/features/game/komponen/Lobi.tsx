import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Users } from "lucide-react";
import { ASET } from "../assets";
import { ambilRoomLobi, gabungRoom, type RoomLobi } from "../api";
import { temaById } from "../tema";
import { Avatar, Kepala } from "./bersama";

export default function Lobi() {
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomLobi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [kode, setKode] = useState("");
  const [bergabung, setBergabung] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setRoom(await ambilRoomLobi());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar room.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
    const iv = window.setInterval(() => void muat(), 6000);
    return () => window.clearInterval(iv);
  }, [muat]);

  async function gabung(k: string) {
    setError(null);
    setBergabung(k);
    try {
      const id = await gabungRoom(k);
      navigate(`/game/main/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal bergabung.");
    } finally {
      setBergabung(null);
    }
  }

  function kirimKode(e: FormEvent) {
    e.preventDefault();
    const k = kode.trim().toUpperCase();
    if (k.length >= 4) void gabung(k);
  }

  return (
    <div className="flex flex-col gap-4">
      <Kepala onKeluar={() => navigate("/beranda")} />

      <section className="ct-kartu relative overflow-hidden">
        <img src={ASET.latar.jalan} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]" />
        <div className="relative flex items-end gap-3 p-4">
          <img src={ASET.maskot.berdiri} alt="" className="ct-napas h-32 w-auto shrink-0 drop-shadow sm:h-44" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 pb-1">
            <div>
              <p className="ct-judul text-xl leading-tight text-[var(--ct-indigo)] sm:text-2xl">Gambar · Tebak · Menang!</p>
              <p className="text-sm text-slate-600">Main bareng rekan kantor, 2–10 pemain.</p>
            </div>
            <button type="button" onClick={() => navigate("/game/baru")} className="ct-tombol w-full">
              <Plus size={20} /> Buat Room
            </button>
            <form onSubmit={kirimKode} className="flex gap-2">
              <input
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="Kode"
                maxLength={8}
                className="w-0 min-w-0 flex-1 rounded-full border-2 border-[var(--ct-biru)] bg-white px-3 text-center font-semibold uppercase tracking-widest outline-none"
                aria-label="Kode room"
              />
              <button type="submit" disabled={kode.trim().length < 4 || !!bergabung} className="ct-tombol ct-tombol-putih px-4">
                Masuk
              </button>
            </form>
          </div>
        </div>
      </section>

      {error && <p className="ct-goyang rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="ct-judul text-lg text-[var(--ct-indigo)]">Room Publik</h2>
          <button type="button" onClick={() => void muat()} className="flex items-center gap-1 text-sm text-slate-500" aria-label="Muat ulang">
            <RefreshCw size={15} /> Muat ulang
          </button>
        </div>

        {!memuat && room.length === 0 && (
          <div className="ct-kartu flex flex-col items-center gap-2 p-6 text-center">
            <img src={ASET.maskot.menunjuk} alt="" className="h-28 w-auto" />
            <p className="font-semibold">Belum ada room yang menunggu pemain.</p>
            <p className="text-sm text-slate-500">Buat room baru, lalu bagikan kodenya ke rekan kerja.</p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {room.map((r) => {
            const tema = temaById(r.tema);
            const penuh = r.pemain.length >= r.maks_pemain;
            return (
              <div key={r.id} className="ct-kartu ct-naik-masuk flex items-center gap-3 p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: tema.warna }}>
                  {tema.gambar ? <img src={tema.gambar} alt="" className="h-11 w-11 object-contain" loading="lazy" /> : <span className="text-2xl">{tema.emoji}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">Room {r.host_nama ?? "tanpa nama"}</p>
                  <p className="text-xs text-slate-500">
                    {tema.label} · {r.waktu_gambar} dtk · {r.jumlah_ronde} ronde
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {r.pemain.slice(0, 4).map((p) => (
                        <Avatar key={p.user_id} userId={p.user_id} foto={p.foto_url} nama={p.nama} ukuran={22} />
                      ))}
                    </div>
                    <span className="ml-1 flex items-center gap-0.5 text-xs text-slate-500">
                      <Users size={12} /> {r.pemain.length}/{r.maks_pemain}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={penuh || bergabung === r.kode}
                  onClick={() => void gabung(r.kode)}
                  className="ct-tombol ct-tombol-hijau min-h-[40px] px-4 text-sm"
                >
                  {penuh ? "Penuh" : bergabung === r.kode ? "..." : "Gabung"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
