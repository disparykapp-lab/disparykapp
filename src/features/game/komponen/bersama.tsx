import { useState, type CSSProperties, type ReactNode } from "react";
import { Info, LogOut, Share2, Volume2, VolumeX, X } from "lucide-react";
import { ASET, avatarCadangan } from "../assets";
import { aturSuara, suaraNyala } from "../suara";

export function Avatar({
  userId,
  foto,
  nama,
  ukuran = 44,
  redup = false,
  lencana,
}: {
  userId: string;
  foto: string | null | undefined;
  nama: string;
  ukuran?: number;
  redup?: boolean;
  lencana?: "benar" | "gambar" | null;
}) {
  const [gagal, setGagal] = useState(false);
  const src = foto && !gagal ? foto : avatarCadangan(userId);
  return (
    <span className="relative inline-block shrink-0" style={{ width: ukuran, height: ukuran }}>
      <img
        src={src}
        alt={nama}
        loading="lazy"
        onError={() => setGagal(true)}
        className={`h-full w-full rounded-full border-2 border-white object-cover shadow ${redup ? "opacity-40 grayscale" : ""}`}
      />
      {lencana && (
        <img
          src={lencana === "benar" ? ASET.ikon.benar : ASET.ikon.gambar}
          alt={lencana === "benar" ? "Sudah menebak benar" : "Sedang menggambar"}
          className="ct-membal absolute -bottom-1 -right-1 drop-shadow"
          style={{ width: ukuran * 0.45, height: ukuran * 0.45 }}
        />
      )}
    </span>
  );
}

export function SlotKosong({ ukuran = 44 }: { ukuran?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400"
      style={{ width: ukuran, height: ukuran }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={ukuran * 0.55} height={ukuran * 0.55} fill="currentColor">
        <circle cx="12" cy="8" r="4.5" />
        <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
      </svg>
    </span>
  );
}

function TombolIkon({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ct-indigo)] shadow transition active:scale-95"
    >
      {children}
    </button>
  );
}

/** Bilah atas: logo + suara + bagikan + aturan + keluar. */
export function Kepala({ onKeluar, linkBagikan }: { onKeluar: () => void; linkBagikan?: string }) {
  const [suara, setSuara] = useState(suaraNyala());
  const [aturan, setAturan] = useState(false);
  const [disalin, setDisalin] = useState(false);

  async function bagikan() {
    if (!linkBagikan) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Main Coret Tebak", text: "Ayo main Coret Tebak bareng!", url: linkBagikan });
        return;
      }
      await navigator.clipboard.writeText(linkBagikan);
      setDisalin(true);
      window.setTimeout(() => setDisalin(false), 1800);
    } catch {
      // dibatalkan pengguna / izin clipboard ditolak
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <img src={ASET.logo} alt="Coret Tebak" className="h-12 w-auto drop-shadow sm:h-14" />
        <div className="flex items-center gap-2">
          <TombolIkon
            onClick={() => {
              aturSuara(!suara);
              setSuara(!suara);
            }}
            label={suara ? "Matikan suara" : "Nyalakan suara"}
          >
            {suara ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </TombolIkon>
          {linkBagikan && (
            <TombolIkon onClick={() => void bagikan()} label="Bagikan link room">
              <Share2 size={18} />
            </TombolIkon>
          )}
          <TombolIkon onClick={() => setAturan(true)} label="Aturan main">
            <Info size={19} />
          </TombolIkon>
          <TombolIkon onClick={onKeluar} label="Keluar">
            <LogOut size={18} />
          </TombolIkon>
        </div>
      </header>
      {disalin && (
        <p className="ct-naik-masuk fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-[var(--ct-tinta)] px-4 py-2 text-sm text-white">
          Link room disalin
        </p>
      )}
      {aturan && <DialogAturan onTutup={() => setAturan(false)} />}
    </>
  );
}

function DialogAturan({ onTutup }: { onTutup: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aturan main"
        className="ct-kartu ct-naik-masuk relative w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onTutup} aria-label="Tutup" className="absolute right-3 top-3 text-slate-400">
          <X size={20} />
        </button>
        <h2 className="ct-judul mb-3 text-xl text-[var(--ct-indigo)]">Aturan Main</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-slate-700">
          <li>Pemain bergiliran menggambar. Penggambar memilih 1 dari 3 kata (10 detik).</li>
          <li>Pemain lain menebak lewat kolom jawaban. Huruf petunjuk terbuka seiring waktu.</li>
          <li>
            Tebakan benar: <b>100 + sisa waktu (maks. 300)</b>, bonus <b>+50</b> untuk yang pertama benar.
          </li>
          <li>
            Penggambar dapat <b>+50</b> per penebak yang benar, <b>+100</b> kalau semua penebak benar.
          </li>
          <li>Tebakan yang hampir benar cuma terlihat olehmu. Jawaban benar tidak ditampilkan ke pemain lain.</li>
          <li>Skor tertinggi setelah semua giliran selesai jadi juara.</li>
        </ol>
      </div>
    </div>
  );
}

export function Konfeti({ jumlah = 60 }: { jumlah?: number }) {
  const [potong] = useState(() =>
    Array.from({ length: jumlah }, (_, i) => ({
      kiri: Math.random() * 100,
      tunda: Math.random() * 0.8,
      durasi: 2.2 + Math.random() * 1.6,
      geser: (Math.random() - 0.5) * 160,
      putar: 360 + Math.random() * 540,
      warna: ["#F5B82E", "#E5484D", "#3FA66B", "#1F6FEB", "#E8743B", "#8B5CF6"][i % 6],
      bulat: i % 3 === 0,
    }))
  );
  return (
    <div aria-hidden="true">
      {potong.map((k, i) => (
        <span
          key={i}
          className="ct-konfeti"
          style={
            {
              left: `${k.kiri}vw`,
              background: k.warna,
              borderRadius: k.bulat ? "999px" : "2px",
              animationDelay: `${k.tunda}s`,
              "--durasi": `${k.durasi}s`,
              "--geser": `${k.geser}px`,
              "--putar": `${k.putar}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
