import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ASET } from "../assets";
import { peringkat } from "../logika";
import { temaById } from "../tema";
import { bunyikan } from "../suara";
import type { StateRoom } from "../useRoom";
import { Avatar, Konfeti } from "./bersama";

// tinggi balok podium & urutan tampil (kiri juara 2, tengah juara 1, kanan juara 3)
const BALOK = [
  { posisiKe: 2, tinggi: 96, warna: "#C9C3B8", tunda: 600 },
  { posisiKe: 1, tinggi: 136, warna: "#F5B82E", tunda: 1200 },
  { posisiKe: 3, tinggi: 72, warna: "#E8743B", tunda: 0 },
];

export default function Podium({ s, onKeluar }: { s: StateRoom; onKeluar: () => void }) {
  const room = s.room!;
  const urut = useMemo(() => peringkat(s.pemain.filter((p) => p.aktif || p.skor > 0)), [s.pemain]);
  const [memulai, setMemulai] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => bunyikan("menang"), 1300);
    return () => window.clearTimeout(t);
  }, []);

  // juara per posisi (skor sama = posisi sama; ambil satu wakil untuk balok)
  const diBalok = (posisi: number) => urut.find((p) => p.posisi === posisi && p.skor > 0);
  const sayaJuara = urut.find((p) => p.user_id === s.saya)?.posisi === 1;

  async function mainLagi() {
    setMemulai(true);
    await s.mainLagi();
    setMemulai(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Konfeti jumlah={70} />

      <div className="flex items-center justify-center gap-2">
        <img src={ASET.maskot.senang} alt="" className="ct-lompat h-24 w-auto shrink-0" />
        <div>
          <p className="ct-judul text-3xl leading-tight text-[var(--ct-indigo)]">{sayaJuara ? "Kamu Juara!" : "Permainan Selesai!"}</p>
          <p className="text-sm text-slate-500">Tema {temaById(room.tema).label} · {room.jumlah_ronde} ronde</p>
        </div>
      </div>

      <section className="ct-kartu relative overflow-hidden px-2 pb-0 pt-6">
        <img src={ASET.ornamen.gunungan} alt="" className="absolute right-2 top-2 h-16 w-auto opacity-30" />
        <div className="mx-auto flex max-w-sm items-end justify-center gap-2">
          {BALOK.map((b) => {
            const juara = diBalok(b.posisiKe);
            return (
              <div key={b.posisiKe} className="flex w-1/3 flex-col items-center">
                {juara && (
                  <div className="ct-jatuh relative mb-1 flex flex-col items-center" style={{ animationDelay: `${b.tunda + 500}ms` }}>
                    {b.posisiKe === 1 && (
                      <Mahkota className="ct-mahkota absolute -top-7 z-10 h-8 w-auto" style={{ animationDelay: `${b.tunda + 1100}ms` }} />
                    )}
                    <Avatar userId={juara.user_id} foto={juara.profiles?.foto_url} nama={juara.profiles?.nama ?? ""} ukuran={b.posisiKe === 1 ? 64 : 52} />
                    <p className="mt-1 max-w-full truncate text-xs font-bold">{juara.profiles?.nama?.split(" ")[0]}</p>
                    <p className="text-xs font-bold text-[var(--ct-biru)]">{juara.skor}</p>
                  </div>
                )}
                <div
                  className="ct-balok flex w-full items-start justify-center rounded-t-2xl border-[3px] border-b-0 border-[var(--ct-tinta)] pt-2"
                  style={{ height: b.tinggi, background: b.warna, animationDelay: `${b.tunda}ms` }}
                >
                  <img src={ASET.medali[b.posisiKe - 1]} alt={`Juara ${b.posisiKe}`} className="h-10 w-auto drop-shadow" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ct-kartu flex flex-col gap-1 p-3">
        <h2 className="mb-1 text-sm font-semibold text-slate-500">Skor akhir</h2>
        {urut.map((p, i) => (
          <div
            key={p.user_id}
            className={`ct-naik-masuk flex items-center gap-2 rounded-xl px-2 py-1.5 ${p.user_id === s.saya ? "bg-blue-50" : ""}`}
            style={{ animationDelay: `${1600 + i * 80}ms` }}
          >
            <span className="w-6 text-center font-bold text-slate-400">{p.posisi}</span>
            <Avatar userId={p.user_id} foto={p.profiles?.foto_url} nama={p.profiles?.nama ?? ""} ukuran={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.profiles?.nama}</span>
            <span className="font-bold tabular-nums">{p.skor}</span>
          </div>
        ))}
      </section>

      {s.error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}

      <div className="grid grid-cols-2 gap-2">
        {s.sayaHost ? (
          <button type="button" onClick={() => void mainLagi()} disabled={memulai} className="ct-tombol">
            {memulai ? "..." : "Main Lagi"}
          </button>
        ) : (
          <p className="flex items-center justify-center rounded-full bg-white px-3 text-center text-xs text-slate-500 shadow-sm">
            Menunggu host untuk main lagi…
          </p>
        )}
        <button type="button" onClick={onKeluar} className="ct-tombol ct-tombol-merah">
          Keluar
        </button>
      </div>
    </div>
  );
}

/** Mahkota juara: emas, garis indigo tebal, permata indigo (gaya STYLE LOCK di brief). */
function Mahkota({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 50" className={className} style={style} aria-hidden="true">
      <g stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round">
        <path d="M7 40 L4 15 L19 27 L32 9 L45 27 L60 15 L57 40 Z" fill="#F5B82E" />
        <rect x="7" y="36" width="50" height="9" rx="3" fill="#E8A21B" />
        <circle cx="4" cy="13" r="4" fill="#F5B82E" />
        <circle cx="32" cy="7" r="4" fill="#F5B82E" />
        <circle cx="60" cy="13" r="4" fill="#F5B82E" />
        <circle cx="32" cy="27" r="4.5" fill="#2B3A8C" />
      </g>
      <path d="M12 20 L14 33" stroke="#FFF6E5" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
