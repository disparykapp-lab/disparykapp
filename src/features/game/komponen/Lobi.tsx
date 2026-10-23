import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { ASET } from "../assets";
import { ambilRoomLobi, gabungRoom, type RoomLobi } from "../api";
import { aksiRoom, statusMatch } from "../logika";
import { temaById } from "../tema";
import { Avatar, ChipStatus, Kepala } from "./bersama";
import DetailRoom from "./DetailRoom";

export default function Lobi() {
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomLobi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [kode, setKode] = useState("");
  const [bergabung, setBergabung] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const milikSaya = room.filter((r) => r.saya_anggota);
  const publik = room.filter((r) => !r.saya_anggota);
  const detail = room.find((r) => r.id === detailId) ?? null;

  function kirimKode(e: FormEvent) {
    e.preventDefault();
    const k = kode.trim().toUpperCase();
    if (k.length >= 4) void gabung(k);
  }

  return (
    <div className="flex flex-col gap-4">
      <Kepala onKeluar={() => navigate("/beranda")} keBeranda />

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
              <img src={ASET.ui.tambah} alt="" aria-hidden="true" className="h-6 w-6 rounded-full bg-white" /> Buat Room
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

      {milikSaya.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="ct-judul text-lg text-[var(--ct-indigo)]">Room Kamu</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {milikSaya.map((r) => (
              <KartuRoom
                key={r.id}
                r={r}
                bergabung={bergabung === r.kode}
                onDetail={() => setDetailId(r.id)}
                onAksi={() => navigate(`/game/main/${r.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="ct-judul text-lg text-[var(--ct-indigo)]">Room Publik</h2>
          <button type="button" onClick={() => void muat()} className="flex items-center gap-1 text-sm text-slate-500" aria-label="Muat ulang">
            <RefreshCw size={15} /> Muat ulang
          </button>
        </div>

        {!memuat && publik.length === 0 && (
          <div className="ct-kartu flex flex-col items-center gap-2 p-6 text-center">
            <img src={ASET.maskot.menunjuk} alt="" className="h-28 w-auto" />
            <p className="font-semibold">Belum ada room publik yang aktif.</p>
            <p className="text-sm text-slate-500">Buat room baru, lalu bagikan kodenya ke rekan kerja.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {publik.map((r) => (
            <KartuRoom
              key={r.id}
              r={r}
              bergabung={bergabung === r.kode}
              onDetail={() => setDetailId(r.id)}
              onAksi={() => void gabung(r.kode)}
            />
          ))}
        </div>
      </section>

      {detail && (
        <DetailRoom
          room={detail}
          bergabung={bergabung === detail.kode}
          onGabung={() => void gabung(detail.kode)}
          onLanjut={() => navigate(`/game/main/${detail.id}`)}
          onTutup={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

/** Kartu room di lobi: ketuk kartu untuk detail; tombol kanan = aksi cepat (gabung/lanjutkan). */
function KartuRoom({
  r,
  bergabung,
  onDetail,
  onAksi,
}: {
  r: RoomLobi;
  bergabung: boolean;
  onDetail: () => void;
  onAksi: () => void;
}) {
  const tema = temaById(r.tema);
  const st = statusMatch(r.status, r.giliran_ke, r.total_giliran, r.jumlah_ronde, true);
  const online = r.pemain.filter((p) => p.online);
  const aksi = aksiRoom(r.status, r.saya_anggota, online.length, r.maks_pemain);

  return (
    <div className="ct-kartu ct-naik-masuk relative flex min-w-0 items-center gap-2.5 p-3 text-left transition active:scale-[0.99] sm:gap-3">
      {/* tombol tak terlihat selebar kartu: ketuk di mana saja untuk detail */}
      <button
        type="button"
        onClick={onDetail}
        aria-label={`Lihat detail room ${r.host_nama ?? ""}`}
        className="absolute inset-0 rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ct-biru)]"
      />
      <span className="pointer-events-none flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14" style={{ background: tema.warna }}>
        <img src={tema.gambar} alt="" className="h-9 w-9 object-contain sm:h-11 sm:w-11" loading="lazy" />
      </span>
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <p className="line-clamp-2 break-words font-semibold leading-tight">{r.host_nama ?? "Tanpa nama"}</p>
        <ChipStatus label={st.label} nada={st.nada} />
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {online.slice(0, 4).map((p) => (
              <Avatar key={p.user_id} userId={p.user_id} foto={p.foto_url} nama={p.nama} ukuran={22} />
            ))}
          </div>
          <span className="ml-1 flex items-center gap-0.5 text-xs text-slate-500">
            <img src={ASET.ui.grup} alt="" aria-hidden="true" className="h-3.5 w-auto" /> {online.length}/{r.maks_pemain} · {tema.label}
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={aksi === "penuh" || bergabung}
        onClick={() => (aksi === "berjalan" ? onDetail() : onAksi())}
        className={`ct-tombol relative z-10 min-h-[40px] shrink-0 px-3 text-sm sm:px-4 ${
          aksi === "gabung" ? "ct-tombol-hijau" : aksi === "berjalan" ? "ct-tombol-putih" : ""
        }`}
      >
        {bergabung ? "..." : aksi === "lanjut" ? "Lanjutkan" : aksi === "gabung" ? "Gabung" : aksi === "penuh" ? "Penuh" : "Detail"}
      </button>
    </div>
  );
}
