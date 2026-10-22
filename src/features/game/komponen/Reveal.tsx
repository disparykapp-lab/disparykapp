import { ASET } from "../assets";
import type { StateRoom } from "../useRoom";
import { Avatar, Konfeti } from "./bersama";

/** Hasil satu giliran: jawaban terungkap + siapa dapat poin berapa. */
export default function Reveal({ s }: { s: StateRoom }) {
  const room = s.room!;
  const dapatPoin = [...s.aktif].filter((p) => p.poin_giliran > 0).sort((a, b) => b.poin_giliran - a.poin_giliran);
  const adaBenar = s.aktif.some((p) => p.sudah_benar);

  return (
    <div className="flex flex-col items-center gap-3 p-4 text-center">
      {adaBenar && <Konfeti jumlah={30} />}
      <img src={adaBenar ? ASET.maskot.senang : ASET.wajah.kalah} alt="" className="ct-membal h-28 w-auto" />
      <p className="text-sm font-semibold text-slate-500">Jawabannya adalah</p>
      <p className="ct-judul ct-burst text-3xl uppercase tracking-wide text-[var(--ct-indigo)]">{room.kata_terungkap ?? "—"}</p>
      {!adaBenar && <p className="text-sm text-slate-500">Belum ada yang berhasil menebak.</p>}
      <ul className="flex w-full flex-col gap-1.5">
        {dapatPoin.map((p, i) => (
          <li
            key={p.user_id}
            className="ct-naik-masuk flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <Avatar userId={p.user_id} foto={p.profiles?.foto_url} nama={p.profiles?.nama ?? ""} ukuran={30} />
            <span className="flex-1 truncate text-left text-sm font-semibold">
              {p.profiles?.nama}
              {p.user_id === room.penggambar_id && <span className="font-normal text-slate-400"> (penggambar)</span>}
            </span>
            <span className="font-bold text-[var(--ct-hijau)]">+{p.poin_giliran}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
