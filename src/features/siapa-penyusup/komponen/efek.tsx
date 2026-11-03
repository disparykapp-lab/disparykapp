import { useEffect, useState, type CSSProperties } from "react";
import { kurangiGerak } from "../preferensi";

const WARNA = ["#E5484D", "#F28C28", "#F2C14E", "#14A3A8", "#9B5DE5", "#3FA55B"];

/** Confetti CSS (.sp-confetti) selama 5 detik. Tidak tampil kalau "kurangi gerakan" aktif. */
export function Konfeti({ jumlah = 60 }: { jumlah?: number }) {
  const [potong] = useState(() =>
    Array.from({ length: jumlah }, (_, i) => ({
      x: Math.random() * 100,
      d: 2 + Math.random() * 2,
      drift: (Math.random() - 0.5) * 200,
      tunda: Math.random() * 0.6,
      c: WARNA[i % WARNA.length],
    }))
  );
  const [tampil, setTampil] = useState(() => !kurangiGerak());
  useEffect(() => {
    const t = window.setTimeout(() => setTampil(false), 5000);
    return () => window.clearTimeout(t);
  }, []);
  if (!tampil) return null;
  return (
    <div aria-hidden="true">
      {potong.map((k, i) => (
        <i
          key={i}
          className="sp-confetti"
          style={{ "--x": `${k.x}%`, "--d": `${k.d}s`, "--c": k.c, "--drift": k.drift, animationDelay: `${k.tunda}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Kilatan merah saat penyusup terungkap. Tidak tampil kalau "kurangi gerakan" aktif. */
export function FlashMerah() {
  const [tampil] = useState(() => !kurangiGerak());
  return tampil ? <div className="sp-flash-merah" aria-hidden="true" /> : null;
}
