import { ASET } from "../assets";
import type { StateRoom } from "../useRoom";
import { Avatar, Konfeti } from "./bersama";

/** Hasil satu giliran: jawaban terungkap + siapa dapat poin berapa. */
export default function Reveal({ s }: { s: StateRoom }) {
  const room = s.room!;
  const dapatPoin = [...s.aktif].filter((p) => p.poin_giliran > 0).sort((a, b) => b.poin_giliran - a.poin_giliran);
  const adaBenar = s.aktif.some((p) => p.sudah_benar);

  // bonus giliran ini: +50 penebak benar pertama (dari log "benar" setelah log "giliran"
  // terakhir), +100 penggambar kalau semua penebak benar (poinnya = 50×benar + 100)
  const awalGiliran = s.log.map((l) => l.jenis).lastIndexOf("giliran");
  const pertamaId = s.log.slice(awalGiliran + 1).find((l) => l.jenis === "benar" && l.data?.pertama === true)?.user_id;
  const jumlahBenar = s.aktif.filter((p) => p.sudah_benar && p.user_id !== room.penggambar_id).length;
  const penggambar = s.aktif.find((p) => p.user_id === room.penggambar_id);
  const bonusSemua = !!penggambar && jumlahBenar > 0 && penggambar.poin_giliran === 50 * jumlahBenar + 100;

  return (
    <div className="flex flex-col items-center gap-3 p-4 text-center">
      {adaBenar && <Konfeti jumlah={30} />}
      <img src={adaBenar ? ASET.maskot.senang : ASET.maskot.salah} alt="" className="ct-membal h-28 w-auto" />
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
            <Avatar
              userId={p.user_id}
              foto={p.profiles?.foto_url}
              nama={p.profiles?.nama ?? ""}
              ukuran={30}
              lencana={p.user_id === room.penggambar_id ? "gambar" : null}
            />
            <span className="line-clamp-2 min-w-0 flex-1 break-words text-left text-sm font-semibold leading-tight">{p.profiles?.nama}</span>
            {p.user_id === pertamaId && (
              <img src={ASET.poin.lima_puluh} alt="Bonus tercepat +50" title="Bonus tercepat" className="h-5 w-auto shrink-0" />
            )}
            {p.user_id === room.penggambar_id && bonusSemua && (
              <img src={ASET.poin.seratus} alt="Bonus semua benar +100" title="Bonus semua penebak benar" className="h-5 w-auto shrink-0" />
            )}
            <span className="shrink-0 font-bold text-[var(--ct-hijau)]">+{p.poin_giliran}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
