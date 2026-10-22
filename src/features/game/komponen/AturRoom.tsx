import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Lock, Minus, Plus } from "lucide-react";
import { buatRoom } from "../api";
import { DAFTAR_TEMA } from "../tema";
import { Kepala } from "./bersama";

export default function AturRoom() {
  const navigate = useNavigate();
  const [tema, setTema] = useState("jogja");
  const [waktu, setWaktu] = useState(90);
  const [ronde, setRonde] = useState(2);
  const [maks, setMaks] = useState(6);
  const [publik, setPublik] = useState(true);
  const [membuat, setMembuat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buat() {
    setMembuat(true);
    setError(null);
    try {
      const id = await buatRoom({ tema, waktu, ronde, maks, publik });
      navigate(`/game/main/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat room.");
      setMembuat(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Kepala onKeluar={() => navigate("/game")} />
      <h1 className="ct-judul text-2xl text-[var(--ct-indigo)]">Atur Room</h1>

      <Bagian judul="Tema kata">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAFTAR_TEMA.map((t) => {
            const aktif = tema === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTema(t.id)}
                aria-pressed={aktif}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition ${
                  aktif ? "-translate-y-1 -rotate-1 ring-4 ring-[var(--ct-emas)]" : "opacity-85"
                }`}
                style={{ background: t.warna }}
              >
                <span className="flex h-14 w-full items-center justify-center">
                  {t.gambar ? (
                    <img src={t.gambar} alt="" loading="lazy" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <span className="text-3xl">{t.emoji}</span>
                  )}
                </span>
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </Bagian>

      <Bagian judul="Waktu menggambar">
        <Pilihan opsi={[60, 90, 120]} nilai={waktu} onUbah={setWaktu} label={(v) => `${v} dtk`} />
      </Bagian>

      <div className="grid grid-cols-2 gap-3">
        <Bagian judul="Jumlah ronde">
          <Stepper nilai={ronde} min={1} max={5} onUbah={setRonde} />
        </Bagian>
        <Bagian judul="Maks. pemain">
          <Stepper nilai={maks} min={2} max={10} onUbah={setMaks} />
        </Bagian>
      </div>

      <Bagian judul="Siapa yang bisa masuk?">
        <div className="grid grid-cols-2 gap-2">
          <PilihanBesar aktif={publik} onClick={() => setPublik(true)} ikon={<Globe size={18} />} judul="Publik" teks="Tampil di daftar lobi" />
          <PilihanBesar aktif={!publik} onClick={() => setPublik(false)} ikon={<Lock size={18} />} judul="Privat" teks="Hanya lewat kode/link" />
        </div>
      </Bagian>

      {error && <p className="ct-goyang rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="button" onClick={() => void buat()} disabled={membuat} className="ct-tombol ct-tombol-hijau w-full text-lg">
        {membuat ? "Membuat room..." : "Buat Room"}
      </button>
    </div>
  );
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <section className="ct-kartu flex flex-col gap-2 p-3">
      <h2 className="text-sm font-semibold text-slate-500">{judul}</h2>
      {children}
    </section>
  );
}

function Pilihan({ opsi, nilai, onUbah, label }: { opsi: number[]; nilai: number; onUbah: (v: number) => void; label: (v: number) => string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {opsi.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onUbah(o)}
          className={`rounded-full py-2.5 font-semibold transition ${nilai === o ? "bg-[var(--ct-biru)] text-white shadow" : "bg-slate-100 text-slate-600"}`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

function Stepper({ nilai, min, max, onUbah }: { nilai: number; min: number; max: number; onUbah: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-full bg-slate-100 p-1">
      <button type="button" onClick={() => onUbah(Math.max(min, nilai - 1))} disabled={nilai <= min} aria-label="Kurangi" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow disabled:opacity-40">
        <Minus size={16} />
      </button>
      <span className="ct-judul text-xl">{nilai}</span>
      <button type="button" onClick={() => onUbah(Math.min(max, nilai + 1))} disabled={nilai >= max} aria-label="Tambah" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow disabled:opacity-40">
        <Plus size={16} />
      </button>
    </div>
  );
}

function PilihanBesar({ aktif, onClick, ikon, judul, teks }: { aktif: boolean; onClick: () => void; ikon: ReactNode; judul: string; teks: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`flex flex-col items-start gap-0.5 rounded-2xl border-2 p-3 text-left transition ${
        aktif ? "border-[var(--ct-biru)] bg-blue-50" : "border-slate-200"
      }`}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {ikon} {judul}
      </span>
      <span className="text-xs text-slate-500">{teks}</span>
    </button>
  );
}
