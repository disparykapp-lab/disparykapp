import { Link } from "react-router-dom";

interface IconTileProps {
  to?: string;
  onClick?: () => void;
  icon?: string;
  iconSrc?: string;
  label: string;
  warna?: string;
  disabled?: boolean;
  keterangan?: string;
  /** Ambil 1 baris penuh (2 kolom) di grid, bukan berbagi kolom. */
  penuh?: boolean;
  /** Berdenyut untuk menarik perhatian, mis. ada tugas mendesak. */
  animasi?: boolean;
}

export default function IconTile({
  to,
  onClick,
  icon,
  iconSrc,
  label,
  warna = "bg-brand-masuk",
  disabled = false,
  keterangan,
  penuh = false,
  animasi = false,
}: IconTileProps) {
  const isi = (
    <div
      className={`relative flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition active:scale-95 ${
        disabled ? "opacity-40" : ""
      } ${animasi && !disabled ? "animate-pulse ring-2 ring-brand-masuk" : ""}`}
    >
      {iconSrc ? (
        <img src={iconSrc} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <span className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl text-white ${warna}`}>
          {icon}
        </span>
      )}
      <span className="text-sm font-semibold leading-tight text-brand-text">{label}</span>
      {keterangan && <span className="text-[10px] text-gray-400">{keterangan}</span>}
      {animasi && !disabled && (
        <span className="absolute right-3 top-3 h-3 w-3 animate-ping rounded-full bg-red-500" />
      )}
    </div>
  );

  const bungkus = penuh ? "col-span-2" : "";

  if (disabled) {
    return <div className={`opacity-60 ${bungkus}`}>{isi}</div>;
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left ${bungkus}`}>
        {isi}
      </button>
    );
  }

  return (
    <Link to={to ?? "#"} className={`block ${bungkus}`}>
      {isi}
    </Link>
  );
}
