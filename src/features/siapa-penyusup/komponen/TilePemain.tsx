import type { CSSProperties, ReactNode } from "react";
import { namaPendek } from "../../game/logika";
import type { PenyusupPemain } from "../api";
import { avatar, ikon, type StatusAvatar } from "../aset";
import type { StatePenyusupRoom } from "../usePenyusupRoom";

/**
 * Tile pemain (.sp-player): avatar, nama, mahkota host, badge divisi. Jadi tombol
 * kalau `onClick` diisi. `kelas` untuk status (is-ready, is-turn, is-eliminated, …).
 */
export default function TilePemain({
  s,
  p,
  i = 0,
  kelas = "",
  statusAvatar,
  divisi = true,
  onClick,
  label,
  children,
}: {
  s: StatePenyusupRoom;
  p: PenyusupPemain;
  i?: number;
  kelas?: string;
  statusAvatar?: StatusAvatar;
  divisi?: boolean;
  onClick?: () => void;
  label?: string;
  children?: ReactNode;
}) {
  const nama = p.profiles?.nama ?? "Pemain";
  const warna = s.warnaDivisi(p.divisi_id);
  const gaya = { "--dv": warna, "--i": i } as CSSProperties;
  const cls = ["sp-player", p.user_id === s.saya ? "is-me" : "", kelas].filter(Boolean).join(" ");
  const isi = (
    <>
      {p.user_id === s.room?.host_id && <img className="sp-player__host" src={ikon("host")} alt="Host" />}
      <img className="sp-player__avatar" src={avatar(p.avatar, statusAvatar ?? (p.hidup ? "normal" : "tersingkir"))} alt="" />
      <span className="sp-player__name" title={nama}>
        {namaPendek(nama)}
      </span>
      {divisi && (
        <span className="sp-divisi" style={{ "--dv": warna } as CSSProperties}>
          <span>{s.namaDivisi(p.divisi_id) ?? "Tanpa divisi"}</span>
        </span>
      )}
      {children}
    </>
  );
  return onClick ? (
    <button type="button" className={cls} style={gaya} onClick={onClick} aria-label={label}>
      {isi}
    </button>
  ) : (
    <div className={cls} style={gaya}>
      {isi}
    </div>
  );
}
