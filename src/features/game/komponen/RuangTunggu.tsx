import { useState } from "react";
import { Copy, Lock, Globe } from "lucide-react";
import { ASET } from "../assets";
import { temaById } from "../tema";
import type { StateRoom } from "../useRoom";
import { Avatar, SlotKosong } from "./bersama";

export default function RuangTunggu({ s, linkRoom }: { s: StateRoom; linkRoom: string }) {
  const room = s.room!;
  const tema = temaById(room.tema);
  const [disalin, setDisalin] = useState(false);
  const [memulai, setMemulai] = useState(false);

  const hadir = s.aktif.filter((p) => s.online(p.user_id));
  const cukup = hadir.length >= 2;
  const slotKosong = Math.max(0, room.maks_pemain - s.aktif.length);

  async function salinKode() {
    try {
      await navigator.clipboard.writeText(`${room.kode} — ${linkRoom}`);
      setDisalin(true);
      window.setTimeout(() => setDisalin(false), 1800);
    } catch {
      // clipboard ditolak — kode tetap terlihat di layar
    }
  }

  async function mulai() {
    setMemulai(true);
    await s.mulai();
    setMemulai(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="ct-kartu flex items-center gap-3 p-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl" style={{ background: tema.warna }}>
          <img src={tema.gambar} alt="" className="h-12 w-12 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ct-judul text-lg">Tema {tema.label}</p>
          <p className="text-xs text-slate-500">
            {room.waktu_gambar} dtk/giliran · {room.jumlah_ronde} ronde ·{" "}
            {room.publik ? (
              <span className="inline-flex items-center gap-0.5"><Globe size={11} /> publik</span>
            ) : (
              <span className="inline-flex items-center gap-0.5"><Lock size={11} /> privat</span>
            )}
          </p>
        </div>
        <button type="button" onClick={() => void salinKode()} className="flex flex-col items-center rounded-2xl bg-[var(--ct-krem)] px-3 py-1.5" aria-label="Salin kode room">
          <span className="text-[10px] font-semibold text-slate-500">KODE</span>
          <span className="ct-judul text-xl tracking-widest text-[var(--ct-indigo)]">{room.kode}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
            <Copy size={10} /> {disalin ? "Disalin!" : "Salin"}
          </span>
        </button>
      </section>

      <section className="ct-kartu p-3">
        <h2 className="mb-2 text-sm font-semibold text-slate-500">
          Pemain ({s.aktif.length}/{room.maks_pemain})
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {s.aktif.map((p) => {
            const on = s.online(p.user_id);
            return (
              <li key={p.user_id} className="ct-membal flex items-center gap-2 rounded-2xl bg-slate-50 p-2">
                <Avatar userId={p.user_id} foto={p.profiles?.foto_url} nama={p.profiles?.nama ?? ""} redup={!on} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    {p.profiles?.nama ?? "Pemain"}
                    {p.user_id === room.host_id && <img src={ASET.ui.mahkota} alt="Host" title="Host" className="h-3.5 w-auto shrink-0" />}
                  </p>
                  <p className="text-[11px] text-slate-400">{p.user_id === s.saya ? "Kamu" : on ? "Siap" : "Offline"}</p>
                </div>
              </li>
            );
          })}
          {Array.from({ length: slotKosong }, (_, i) => (
            <li key={`kosong-${i}`} className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-2">
              <SlotKosong />
              <span className="text-sm text-slate-400">Kosong</span>
            </li>
          ))}
        </ul>
      </section>

      {!cukup && (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--ct-krem)] p-3">
          <img src={ASET.maskot.berdiri} alt="" className="ct-napas h-20 w-auto" />
          <p className="text-sm text-slate-700">
            Menunggu pemain lain… Bagikan kode <b>{room.kode}</b> atau link room ke rekan kerja. Minimal 2 pemain.
          </p>
        </div>
      )}

      {s.sayaHost ? (
        <button type="button" onClick={() => void mulai()} disabled={!cukup || memulai} className="ct-tombol ct-tombol-hijau w-full text-lg">
          {memulai ? "Memulai..." : cukup ? "Mulai" : "Mulai (minimal 2 pemain)"}
        </button>
      ) : (
        <p className="rounded-2xl bg-white p-3 text-center text-sm text-slate-500 shadow-sm">
          Menunggu host memulai permainan…
        </p>
      )}
    </div>
  );
}
