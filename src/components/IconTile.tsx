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
}: IconTileProps) {
  const isi = (
    <div
      className={`flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition active:scale-95 ${
        disabled ? "opacity-40" : ""
      }`}
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
    </div>
  );

  if (disabled) {
    return <div className="opacity-60">{isi}</div>;
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {isi}
      </button>
    );
  }

  return (
    <Link to={to ?? "#"} className="block">
      {isi}
    </Link>
  );
}
