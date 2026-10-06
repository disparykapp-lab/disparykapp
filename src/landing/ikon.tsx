import {
  Building2, Camera, Compass, Heart, Landmark, Leaf, Luggage, Mountain, Palmtree,
  Trees, Ticket, Umbrella, Users, Utensils,
} from "lucide-react";
import type { NamaIkon } from "./types";

const PETA: Record<NamaIkon, typeof Umbrella> = {
  umbrella: Umbrella,
  mountain: Mountain,
  building: Building2,
  compass: Compass,
  leaf: Leaf,
  palmtree: Palmtree,
  users: Users,
  heart: Heart,
  camera: Camera,
  utensils: Utensils,
  luggage: Luggage,
  landmark: Landmark,
  ticket: Ticket,
  trees: Trees,
};

export function IkonNama({ nama, size = 22, className }: { nama: NamaIkon; size?: number; className?: string }) {
  const Komp = PETA[nama] ?? Compass;
  return <Komp size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}

export const DAFTAR_IKON: NamaIkon[] = Object.keys(PETA) as NamaIkon[];

/** Ikon sosial media sebagai SVG kustom (lucide tidak lengkap untuk merek). */
export function IkonSosial({ nama }: { nama: string }) {
  const n = nama.toLowerCase();
  const isi = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...isi}>
      {n.includes("instagram") && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
        </>
      )}
      {n.includes("facebook") && <path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3H8v8h3v-8h2.6l.4-3H11V8a1 1 0 0 1 1-1h3z" />}
      {n.includes("youtube") && (
        <>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
        </>
      )}
      {!/instagram|facebook|youtube/.test(n) && <circle cx="12" cy="12" r="8.5" />}
    </svg>
  );
}
