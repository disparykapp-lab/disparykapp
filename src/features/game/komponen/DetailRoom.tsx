import type { ReactNode } from "react";
import { Globe, Lock } from "lucide-react";
import { ASET } from "../assets";
import type { RoomLobi } from "../api";
import { aksiRoom, statusMatch } from "../logika";
import { temaById } from "../tema";
import { Avatar, ChipStatus } from "./bersama";
import Lembar from "./Lembar";

/** Detail satu room di lobi: info room, status match, daftar pemain, dan aksi utama. */
export default function DetailRoom({
  room,
  bergabung,
  onGabung,
  onLanjut,
  onTutup,
}: {
  room: RoomLobi;
  bergabung: boolean;
  onGabung: () => void;
  onLanjut: () => void;
  onTutup: () => void;
}) {
  const tema = temaById(room.tema);
  const st = statusMatch(room.status, room.giliran_ke, room.total_giliran, room.jumlah_ronde);
  const online = room.pemain.filter((p) => p.online).length;
  const aksi = aksiRoom(room.status, room.saya_anggota, online, room.maks_pemain);
  const sedangMain = st.nada === "main";
  const penggambar = room.penggambar_nama ?? "Seseorang";

  return (
    <Lembar
      judul={<span className="line-clamp-2 break-words">Room {room.host_nama ?? "Tanpa nama"}</span>}
      ikon={
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tema.warna }}>
          <img src={tema.gambar} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
        </span>
      }
      onTutup={onTutup}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col items-start gap-1">
          <ChipStatus label={st.label} nada={st.nada} />
          {sedangMain && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <img src={ASET.ui.pensil} alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
              {room.status === "reveal" ? (
                "Sedang menampilkan hasil giliran"
              ) : (
                <span className="min-w-0">
                  <b className="break-words">{penggambar}</b> {room.status === "memilih" ? "sedang memilih kata" : "sedang menggambar"}
                </span>
              )}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Tema">{tema.label}</Info>
          <Info label="Waktu gambar">{room.waktu_gambar} detik</Info>
          <Info label="Ronde">{room.jumlah_ronde} ronde</Info>
          <Info label="Pemain online">
            {online}/{room.maks_pemain}
          </Info>
          <Info label="Akses">
            <span className="inline-flex items-center gap-1">
              {room.publik ? <Globe size={13} /> : <Lock size={13} />} {room.publik ? "Publik" : "Privat"}
            </span>
          </Info>
          <Info label="Kode room">
            <span className="font-bold tracking-widest text-[var(--ct-indigo)]">{room.kode}</span>
          </Info>
        </dl>

        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-slate-500">
            {sedangMain ? "Skor sementara" : "Pemain"} ({room.pemain.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {room.pemain.map((p, i) => (
              <li key={p.user_id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
                {sedangMain && <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>}
                <span className="relative shrink-0">
                  <Avatar userId={p.user_id} foto={p.foto_url} nama={p.nama} ukuran={34} redup={!p.online} />
                  {p.user_id === room.host_id && (
                    <img src={ASET.ui.mahkota} alt="Host" title="Host" className="absolute -top-2 left-1/2 h-3.5 w-auto -translate-x-1/2 -rotate-6" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-sm font-semibold leading-tight">{p.nama}</span>
                  {!p.online && <span className="text-[11px] text-slate-400">Offline</span>}
                </span>
                {sedangMain && <span className="shrink-0 font-bold tabular-nums">{p.skor}</span>}
              </li>
            ))}
          </ul>
        </section>

        {aksi === "lanjut" && (
          <button data-fokus-awal type="button" onClick={onLanjut} className="ct-tombol w-full">
            Lanjutkan ke Room
          </button>
        )}
        {aksi === "gabung" && (
          <button data-fokus-awal type="button" onClick={onGabung} disabled={bergabung} className="ct-tombol ct-tombol-hijau w-full">
            {bergabung ? "Bergabung..." : "Gabung"}
          </button>
        )}
        {aksi === "penuh" && (
          <button type="button" disabled className="ct-tombol w-full">
            Room penuh
          </button>
        )}
        {aksi === "berjalan" && (
          <p className="rounded-2xl bg-orange-50 p-3 text-center text-sm text-orange-800">
            Permainan sedang berlangsung, pemain baru belum bisa masuk. Tunggu sampai selesai atau buat room sendiri.
          </p>
        )}
      </div>
    </Lembar>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
