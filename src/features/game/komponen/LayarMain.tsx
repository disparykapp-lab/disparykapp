import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Clock, Send } from "lucide-react";
import { ASET } from "../assets";
import { infoRonde, jumlahHuruf, kotakPetunjuk, peringkat } from "../logika";
import { bunyikan, getar } from "../suara";
import type { StateRoom } from "../useRoom";
import { Avatar } from "./bersama";
import Kanvas from "./Kanvas";
import { MenungguPilih, PilihKata } from "./PilihKata";
import Reveal from "./Reveal";

function useSisaDetik(s: StateRoom) {
  const akhir = s.room?.fase_berakhir;
  const sekarang = s.sekarang;
  const [sisa, setSisa] = useState(0);
  useEffect(() => {
    if (!akhir) return;
    const hitung = () => setSisa(Math.max(0, (new Date(akhir).getTime() - sekarang()) / 1000));
    hitung();
    const iv = window.setInterval(hitung, 200);
    return () => window.clearInterval(iv);
  }, [akhir, sekarang]);
  return akhir ? sisa : 0;
}

type Umpan = { jenis: "benar"; poin: number } | { jenis: "hampir" } | { jenis: "info"; teks: string } | null;

export default function LayarMain({ s }: { s: StateRoom }) {
  const room = s.room!;
  const sisa = useSisaDetik(s);
  const total = room.status === "menggambar" ? room.waktu_gambar : room.status === "memilih" ? 10 : 6;
  const ronde = infoRonde(room.urutan.length, room.jumlah_ronde, room.giliran_ke);
  const namaPenggambar = s.namaPemain(room.penggambar_id);
  const namaDepanPenggambar = namaPenggambar.split(" ")[0];
  const saya = s.aktif.find((p) => p.user_id === s.saya);
  const urut = useMemo(() => peringkat(s.aktif), [s.aktif]);

  const [tab, setTab] = useState<"jawaban" | "log">("jawaban");
  const [teks, setTeks] = useState("");
  const [umpan, setUmpan] = useState<Umpan>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [spanduk, setSpanduk] = useState<string | null>(null);
  const timerUmpan = useRef<number | undefined>(undefined);

  // efek & suara saat fase berganti
  const statusSebelum = useRef(room.status);
  useEffect(() => {
    const lama = statusSebelum.current;
    statusSebelum.current = room.status;
    if (room.status === "memilih" && lama !== "memilih") {
      bunyikan("giliran");
      setSpanduk(room.penggambar_id === s.saya ? "Giliranmu menggambar!" : `Giliran ${namaPenggambar} menggambar!`);
    }
    if (room.status === "reveal" && lama === "menggambar" && !s.aktif.some((p) => p.sudah_benar)) bunyikan("habis");
  }, [room.status, room.giliran_ke, room.penggambar_id, s.saya, namaPenggambar, s.aktif]);

  useEffect(() => {
    if (!spanduk) return;
    const t = window.setTimeout(() => setSpanduk(null), 2200);
    return () => window.clearTimeout(t);
  }, [spanduk]);

  // pemain lain menebak benar / bergabung
  const logTerakhir = s.log[s.log.length - 1];
  const logSebelum = useRef(logTerakhir?.id);
  useEffect(() => {
    if (!logTerakhir || logTerakhir.id === logSebelum.current) return;
    logSebelum.current = logTerakhir.id;
    if (logTerakhir.user_id === s.saya) return;
    if (logTerakhir.jenis === "benar") bunyikan("gabung");
  }, [logTerakhir, s.saya]);

  function tampilkanUmpan(u: Umpan, ms = 1400) {
    window.clearTimeout(timerUmpan.current);
    setUmpan(u);
    timerUmpan.current = window.setTimeout(() => setUmpan(null), ms);
  }

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const isi = teks.trim();
    if (!isi) return;
    setTeks("");
    const hasil = await s.tebak(isi);
    if (!hasil) return;
    switch (hasil.hasil) {
      case "benar":
        bunyikan("benar");
        getar(40);
        tampilkanUmpan({ jenis: "benar", poin: hasil.poin ?? 0 }, 1600);
        break;
      case "hampir":
        bunyikan("hampir");
        setTeks(isi); // biarkan tebakannya supaya tinggal diperbaiki
        formRef.current?.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(0)" }],
          { duration: 300, easing: "ease-in-out" }
        );
        tampilkanUmpan({ jenis: "hampir" }, 1200);
        break;
      case "salah":
        bunyikan("salah");
        break;
      case "sudah":
        tampilkanUmpan({ jenis: "info", teks: "Kamu sudah menebak benar giliran ini." });
        break;
      case "tutup":
        tampilkanUmpan({ jenis: "info", teks: "Waktu menebak sudah habis." });
        break;
    }
  }

  const bisaMenebak = room.status === "menggambar" && !s.sayaPenggambar && !saya?.sudah_benar;
  const kritis = room.status === "menggambar" && sisa <= 10;

  return (
    <div className="flex flex-col gap-3">
      {/* status giliran + waktu */}
      <div className="ct-kartu flex items-center gap-2 px-3 py-2">
        <img src={ASET.ui.pensil} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
        <p className="min-w-0 flex-1 truncate text-sm">
          {room.status === "reveal" ? (
            "Hasil giliran"
          ) : (
            <>
              <b>{s.sayaPenggambar ? "Kamu" : namaDepanPenggambar}</b> {room.status === "memilih" ? "memilih kata" : "menggambar"}
            </>
          )}
          <span className="text-slate-400"> · Ronde {ronde.ronde}/{ronde.total}</span>
        </p>
        <span className={`flex items-center gap-1 font-bold tabular-nums ${kritis ? "ct-waktu-kritis text-[var(--ct-merah)]" : ""}`}>
          {kritis ? <img src={ASET.lencana.api} alt="" aria-hidden="true" className="h-5 w-5" /> : <Clock size={15} />} {Math.ceil(sisa)}
        </span>
      </div>
      <div className="-mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${kritis ? "bg-[var(--ct-merah)]" : "bg-[var(--ct-hijau)]"}`}
          style={{ width: `${Math.min(100, (sisa / total) * 100)}%` }}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
        <DaftarPemain s={s} urut={urut} />

        <div className="flex min-w-0 flex-col gap-2">
          {room.status === "memilih" &&
            (s.sayaPenggambar ? (
              <div className="ct-kartu">
                {s.rahasia?.pilihan?.length ? (
                  <PilihKata key={room.giliran_ke} pilihan={s.rahasia.pilihan} sisa={sisa} onPilih={(i) => void s.pilihKata(i)} />
                ) : (
                  <p className="p-6 text-center text-sm text-slate-500">Menyiapkan kata…</p>
                )}
              </div>
            ) : (
              <div className="ct-kartu">
                <MenungguPilih nama={namaPenggambar} />
              </div>
            ))}

          {room.status === "reveal" && (
            <div className="ct-kartu">
              <Reveal s={s} />
            </div>
          )}

          {room.status === "menggambar" && (
            <Petunjuk pola={room.petunjuk ?? ""} kataPenggambar={s.sayaPenggambar ? s.rahasia?.kata ?? null : null} />
          )}

          <div className={`relative w-full lg:mx-auto lg:max-w-[600px] ${room.status === "memilih" ? "hidden" : ""}`}>
            <Kanvas
              roomId={room.id}
              saya={s.saya}
              penggambarId={room.penggambar_id}
              giliranKe={room.giliran_ke}
              bolehMenggambar={s.sayaPenggambar && room.status === "menggambar"}
              menungguSinkron={room.status === "menggambar"}
            />
            {spanduk && (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <p className="ct-spanduk rounded-full bg-[var(--ct-indigo)] px-5 py-2 text-base font-bold text-white shadow-lg">{spanduk}</p>
              </div>
            )}
            {umpan?.jenis === "benar" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="ct-burst relative flex h-44 w-44 flex-col items-center justify-center">
                  <Ledakan />
                  <span className="ct-judul relative text-3xl text-white [text-shadow:0_2px_0_#1b1f3b,0_0_6px_#1b1f3b]">BENAR!</span>
                  <span className="ct-judul relative text-xl text-white [text-shadow:0_2px_0_#1b1f3b]">+{umpan.poin}</span>
                </div>
              </div>
            )}
          </div>

          <StripPemain s={s} urut={urut} />

          {/* JAWABAN / LOG: tab di HP, berdampingan di desktop */}
          <div className="ct-kartu overflow-hidden">
            <div className="flex border-b border-slate-100 lg:hidden">
              {(["jawaban", "log"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-bold uppercase tracking-wide ${tab === t ? "bg-[var(--ct-biru)] text-white" : "text-slate-500"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
              {(["jawaban", "log"] as const).map((t) => (
                <div key={t} className={tab === t ? "" : "hidden lg:block"}>
                  <p className="hidden bg-[var(--ct-biru)] py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white lg:block">{t}</p>
                  <div className="flex h-36 flex-col-reverse overflow-y-auto p-2 lg:h-32">
                    <div className="flex flex-col gap-1">{t === "jawaban" ? <DaftarJawaban s={s} /> : <DaftarLog s={s} />}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* kolom jawaban */}
          {!s.sayaPenggambar && room.status !== "reveal" && (
            <div className="relative">
              {umpan?.jenis === "hampir" && (
                <p className="ct-membal ct-sebentar absolute -top-11 left-2 rounded-2xl bg-[var(--ct-oranye)] px-3 py-1.5 text-sm font-bold text-white shadow">
                  💡 Hampir benar!
                </p>
              )}
              {umpan?.jenis === "info" && (
                <p className="ct-naik-masuk absolute -top-10 left-2 rounded-2xl bg-[var(--ct-tinta)] px-3 py-1.5 text-xs text-white shadow">{umpan.teks}</p>
              )}
              <form ref={formRef} onSubmit={(e) => void kirim(e)} className="flex gap-2">
                <input
                  value={teks}
                  onChange={(e) => setTeks(e.target.value)}
                  onFocus={(e) => window.setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  disabled={!bisaMenebak}
                  maxLength={60}
                  autoComplete="off"
                  enterKeyHint="send"
                  placeholder={
                    saya?.sudah_benar ? "Kamu sudah benar! Tunggu yang lain…" : room.status === "memilih" ? "Tunggu gambar dimulai…" : "Jawab di sini…"
                  }
                  className="min-w-0 flex-1 rounded-full border-2 border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-[var(--ct-biru)] disabled:bg-slate-100"
                  aria-label="Jawaban"
                />
                <button type="submit" disabled={!bisaMenebak || !teks.trim()} className="ct-tombol h-12 w-12 px-0" aria-label="Kirim jawaban">
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

          {s.error && <p className="rounded-2xl bg-red-50 p-2 text-sm text-red-700">{s.error}</p>}
        </div>
      </div>
    </div>
  );
}

function Petunjuk({ pola, kataPenggambar }: { pola: string; kataPenggambar: string | null }) {
  if (kataPenggambar) {
    return (
      <p className="ct-kartu px-3 py-2 text-center text-sm">
        Gambar: <span className="ct-judul text-xl uppercase tracking-widest text-[var(--ct-indigo)]">{kataPenggambar}</span>
      </p>
    );
  }
  const kotak = kotakPetunjuk(pola);
  return (
    <div className="ct-kartu flex flex-wrap items-end justify-center gap-1 px-3 py-2" aria-label={`Petunjuk: ${jumlahHuruf(pola)} huruf`}>
      {kotak.map((h, i) =>
        h === null ? (
          <span key={i} className="w-3" />
        ) : (
          <span
            key={`${i}-${h}`}
            className={`flex h-8 w-6 items-center justify-center border-b-[3px] border-[var(--ct-tinta)] text-lg font-bold uppercase ${h ? "ct-huruf-buka text-[var(--ct-biru)]" : ""}`}
          >
            {h}
          </span>
        )
      )}
      <span className="ml-2 self-center rounded-full bg-[var(--ct-indigo)] px-2 py-0.5 text-xs font-bold text-white">{jumlahHuruf(pola)}</span>
    </div>
  );
}

type Urut = ReturnType<typeof peringkat<StateRoom["aktif"][number]>>;

function lencanaPemain(s: StateRoom, userId: string, sudahBenar: boolean) {
  if (s.room?.penggambar_id === userId && s.room.status !== "reveal") return "gambar" as const;
  if (sudahBenar) return "benar" as const;
  return null;
}

function DaftarPemain({ s, urut }: { s: StateRoom; urut: Urut }) {
  return (
    <aside className="ct-kartu hidden flex-col gap-1 self-start p-2 lg:flex">
      <h2 className="px-2 pb-1 text-sm font-bold text-[var(--ct-indigo)]">Daftar Pemain</h2>
      {urut.map((p) => (
        <div
          key={p.user_id}
          className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition ${p.user_id === s.saya ? "bg-blue-50" : ""}`}
        >
          {p.posisi <= 3 && p.skor > 0 ? (
            <img src={ASET.medali[p.posisi - 1]} alt={`Peringkat ${p.posisi}`} className="h-6 w-6 shrink-0 object-contain" />
          ) : (
            <span className="w-6 shrink-0 text-center text-xs text-slate-400">{p.posisi}</span>
          )}
          <Avatar
            userId={p.user_id}
            foto={p.profiles?.foto_url}
            nama={p.profiles?.nama ?? ""}
            ukuran={34}
            redup={!s.online(p.user_id)}
            lencana={lencanaPemain(s, p.user_id, p.sudah_benar)}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.profiles?.nama}</span>
          <span className="text-sm font-bold tabular-nums">{p.skor}</span>
        </div>
      ))}
    </aside>
  );
}

function StripPemain({ s, urut }: { s: StateRoom; urut: Urut }) {
  const [buka, setBuka] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setBuka(!buka)} className="flex w-full gap-3 overflow-x-auto py-1" aria-expanded={buka} aria-label="Lihat skor pemain">
        {urut.map((p) => (
          <span key={p.user_id} className="flex shrink-0 flex-col items-center gap-0.5">
            <Avatar
              userId={p.user_id}
              foto={p.profiles?.foto_url}
              nama={p.profiles?.nama ?? ""}
              ukuran={40}
              redup={!s.online(p.user_id)}
              lencana={lencanaPemain(s, p.user_id, p.sudah_benar)}
            />
            <span className="max-w-[56px] truncate text-[11px] font-semibold">{p.profiles?.nama?.split(" ")[0]}</span>
            <span className="text-[11px] font-bold tabular-nums text-[var(--ct-biru)]">{p.skor}</span>
          </span>
        ))}
      </button>
      {buka && (
        <div className="ct-kartu ct-naik-masuk mt-1 flex flex-col gap-1 p-2">
          {urut.map((p) => (
            <div key={p.user_id} className="flex items-center gap-2 px-1 text-sm">
              <span className="w-5 text-center text-xs text-slate-400">{p.posisi}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{p.profiles?.nama}</span>
              {p.sudah_benar && <img src={ASET.ui.checklist} alt="Sudah benar" className="h-4 w-4" />}
              <span className="font-bold tabular-nums">{p.skor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DaftarJawaban({ s }: { s: StateRoom }) {
  if (s.tebakan.length === 0) return <p className="py-3 text-center text-xs text-slate-400">Belum ada tebakan.</p>;
  return (
    <>
      {s.tebakan.map((t) => (
        <p key={t.id} className="ct-naik-masuk flex flex-wrap items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-sm">
          <b>{t.user_id === s.saya ? "Kamu" : s.namaPemain(t.user_id)}:</b>
          {t.hasil === "benar" ? (
            <span className="font-semibold text-[var(--ct-hijau)]">menebak benar ✔</span>
          ) : (
            <span>{t.teks}</span>
          )}
          {t.hasil === "hampir" && (
            <span className="rounded-full bg-orange-100 px-2 text-xs font-semibold text-[var(--ct-oranye)]">hampir benar!</span>
          )}
        </p>
      ))}
    </>
  );
}

function DaftarLog({ s }: { s: StateRoom }) {
  const isi = s.log
    .map((l) => {
      const nama = l.user_id === s.saya ? "Kamu" : s.namaPemain(l.user_id);
      switch (l.jenis) {
        case "gabung":
          return { id: l.id, teks: `${nama} bergabung`, warna: "text-slate-500" };
        case "keluar":
          return { id: l.id, teks: `${nama} keluar`, warna: "text-slate-400" };
        case "giliran":
          return { id: l.id, teks: `Giliran ${nama} menggambar`, warna: "text-[var(--ct-biru)]" };
        case "benar":
          return { id: l.id, teks: `✔ ${nama} menebak benar!`, warna: "font-semibold text-[var(--ct-hijau)]" };
        case "reveal":
          return { id: l.id, teks: `Jawaban: ${String(l.data?.kata ?? "-")}`, warna: "text-[var(--ct-indigo)]" };
        case "mulai":
          return { id: l.id, teks: "Permainan dimulai!", warna: "font-semibold" };
        case "selesai":
          return { id: l.id, teks: "Permainan selesai", warna: "font-semibold" };
        default:
          return null;
      }
    })
    .filter((x): x is { id: number; teks: string; warna: string } => x !== null);

  if (isi.length === 0) return <p className="py-3 text-center text-xs text-slate-400">Belum ada aktivitas.</p>;
  return (
    <>
      {isi.map((x) => (
        <p key={x.id} className={`ct-naik-masuk px-2 text-sm ${x.warna}`}>
          {x.teks}
        </p>
      ))}
    </>
  );
}

/** Stiker "ledakan" emas bergaris indigo (gaya komik) di belakang tulisan BENAR!. */
function Ledakan() {
  const titik = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 36;
    const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-lg" aria-hidden="true">
      <polygon points={titik} fill="#F5B82E" stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="78" cy="22" r="3" fill="#fff" />
    </svg>
  );
}
