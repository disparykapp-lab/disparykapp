import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PE, type ReactNode } from "react";
import { Eraser, Pencil, Trash2, Undo2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

// Koordinat coretan dinormalkan 0..1000 (x terhadap lebar, y terhadap tinggi)
// supaya sama di semua ukuran layar. Coretan dikirim lewat Realtime Broadcast,
// tidak disimpan di database.

interface Garis {
  id: string;
  warna: string;
  lebar: number;
  titik: number[];
}

const WARNA = [
  "#1B1F3B", "#8A8F98", "#E5484D", "#E8743B", "#F5B82E", "#3FA66B",
  "#14B8A6", "#3B9AE1", "#2B3A8C", "#8B5CF6", "#EC4899", "#8B5A2B",
];
const UKURAN = [6, 14, 30];
const LATAR = "#FFFFFF";

interface Props {
  roomId: string;
  saya: string;
  penggambarId: string | null;
  giliranKe: number;
  bolehMenggambar: boolean;
  menungguSinkron: boolean;
}

export default function Kanvas({ roomId, saya, penggambarId, giliranKe, bolehMenggambar, menungguSinkron }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const kanvas = useRef<HTMLCanvasElement>(null);
  const garisRef = useRef<Garis[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const siap = useRef(false);
  const tunda = useRef<{ id: string; titik: number[] } | null>(null);
  const sedang = useRef<Garis | null>(null);

  const [warna, setWarna] = useState(WARNA[0]);
  const [ukuran, setUkuran] = useState(UKURAN[1]);
  const [alat, setAlat] = useState<"pensil" | "hapus">("pensil");

  // nilai terbaru untuk handler broadcast (yang didaftarkan sekali saja)
  const info = useRef({ penggambarId, giliranKe, saya });
  useLayoutEffect(() => {
    info.current = { penggambarId, giliranKe, saya };
  }, [penggambarId, giliranKe, saya]);

  const gambarGaris = useCallback((g: Garis, dari = 0) => {
    const c = kanvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || g.titik.length < 2) return;
    const sx = c.width / 1000;
    const sy = c.height / 1000;
    ctx.strokeStyle = g.warna;
    ctx.fillStyle = g.warna;
    ctx.lineWidth = g.lebar * sx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (g.titik.length === 2) {
      ctx.beginPath();
      ctx.arc(g.titik[0] * sx, g.titik[1] * sy, (g.lebar * sx) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const mulai = Math.max(0, dari - 2);
    ctx.beginPath();
    ctx.moveTo(g.titik[mulai] * sx, g.titik[mulai + 1] * sy);
    for (let i = mulai + 2; i < g.titik.length; i += 2) ctx.lineTo(g.titik[i] * sx, g.titik[i + 1] * sy);
    ctx.stroke();
  }, []);

  const gambarUlang = useCallback(() => {
    const c = kanvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = LATAR;
    ctx.fillRect(0, 0, c.width, c.height);
    for (const g of garisRef.current) gambarGaris(g);
  }, [gambarGaris]);

  // ukuran kanvas mengikuti lebar wadah (rasio 4:3), tajam di layar HiDPI
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const c = kanvas.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth;
      c.width = Math.round(w * dpr);
      c.height = Math.round(((w * 3) / 4) * dpr);
      gambarUlang();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [gambarUlang]);

  // giliran baru = kanvas kosong
  useEffect(() => {
    garisRef.current = [];
    sedang.current = null;
    tunda.current = null;
    gambarUlang();
  }, [giliranKe, gambarUlang]);

  const kirim = useCallback((event: string, payload: Record<string, unknown>) => {
    if (!siap.current || !channelRef.current) return;
    void channelRef.current.send({
      type: "broadcast",
      event,
      payload: { ...payload, uid: info.current.saya, giliran: info.current.giliranKe },
    });
  }, []);

  // channel broadcast coretan untuk room ini
  useEffect(() => {
    const sah = (p: { uid?: string; giliran?: number }) =>
      p.uid === info.current.penggambarId && p.giliran === info.current.giliranKe && p.uid !== info.current.saya;

    const ch = supabase.channel(`coret-tebak:${roomId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "garis" }, ({ payload }) => {
      if (!sah(payload)) return;
      const p = payload as { id: string; warna: string; lebar: number; titik: number[] };
      let g = garisRef.current.find((x) => x.id === p.id);
      if (!g) {
        g = { id: p.id, warna: p.warna, lebar: p.lebar, titik: [] };
        garisRef.current.push(g);
      }
      const dari = g.titik.length;
      g.titik.push(...p.titik);
      gambarGaris(g, dari);
    })
      .on("broadcast", { event: "urung" }, ({ payload }) => {
        if (!sah(payload)) return;
        garisRef.current = garisRef.current.filter((x) => x.id !== payload.id);
        gambarUlang();
      })
      .on("broadcast", { event: "bersih" }, ({ payload }) => {
        if (!sah(payload)) return;
        garisRef.current = [];
        gambarUlang();
      })
      .on("broadcast", { event: "sinkron" }, ({ payload }) => {
        if (!sah(payload)) return;
        garisRef.current = (payload.garis as Garis[]) ?? [];
        gambarUlang();
      })
      .on("broadcast", { event: "minta" }, ({ payload }) => {
        // penebak yang baru masuk / tersambung ulang minta seluruh gambar
        if (info.current.penggambarId !== info.current.saya || payload.giliran !== info.current.giliranKe) return;
        let garis = garisRef.current;
        while (JSON.stringify(garis).length > 180_000 && garis.length > 1) garis = garis.slice(1);
        kirim("sinkron", { garis });
      })
      .subscribe((status) => {
        siap.current = status === "SUBSCRIBED";
        if (siap.current && info.current.penggambarId && info.current.penggambarId !== info.current.saya) {
          kirim("minta", {});
        }
      });
    channelRef.current = ch;
    return () => {
      siap.current = false;
      channelRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [roomId, gambarGaris, gambarUlang, kirim]);

  // giliran baru dimulai saat kanvas sudah terbuka: penebak minta gambar terbaru
  useEffect(() => {
    if (menungguSinkron && penggambarId && penggambarId !== saya) kirim("minta", {});
  }, [menungguSinkron, penggambarId, saya, giliranKe, kirim]);

  // kirim titik yang terkumpul tiap 50 ms (bukan per gerakan, supaya hemat)
  useEffect(() => {
    if (!bolehMenggambar) return;
    const iv = window.setInterval(() => {
      const t = tunda.current;
      if (!t || t.titik.length === 0) return;
      const g = garisRef.current.find((x) => x.id === t.id);
      if (!g) return;
      kirim("garis", { id: t.id, warna: g.warna, lebar: g.lebar, titik: t.titik });
      tunda.current = { id: t.id, titik: [] };
    }, 50);
    return () => window.clearInterval(iv);
  }, [bolehMenggambar, kirim]);

  function posisi(e: PE<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(Math.min(1000, Math.max(0, ((e.clientX - r.left) / r.width) * 1000))),
      Math.round(Math.min(1000, Math.max(0, ((e.clientY - r.top) / r.height) * 1000))),
    ];
  }

  function onDown(e: PE<HTMLCanvasElement>) {
    if (!bolehMenggambar) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = posisi(e);
    const g: Garis = {
      id: Math.random().toString(36).slice(2, 10),
      warna: alat === "hapus" ? LATAR : warna,
      lebar: alat === "hapus" ? ukuran * 1.6 : ukuran,
      titik: [x, y],
    };
    garisRef.current.push(g);
    sedang.current = g;
    tunda.current = { id: g.id, titik: [x, y] };
    gambarGaris(g);
  }

  function onMove(e: PE<HTMLCanvasElement>) {
    const g = sedang.current;
    if (!g) return;
    const [x, y] = posisi(e);
    const lx = g.titik[g.titik.length - 2];
    const ly = g.titik[g.titik.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 3) return;
    const dari = g.titik.length;
    g.titik.push(x, y);
    tunda.current?.titik.push(x, y);
    gambarGaris(g, dari);
  }

  function onUp() {
    const g = sedang.current;
    sedang.current = null;
    const t = tunda.current;
    if (g && t && t.titik.length > 0) {
      kirim("garis", { id: g.id, warna: g.warna, lebar: g.lebar, titik: t.titik });
      tunda.current = null;
    }
  }

  function urung() {
    const g = garisRef.current.pop();
    if (!g) return;
    gambarUlang();
    kirim("urung", { id: g.id });
  }

  function bersihkan() {
    garisRef.current = [];
    gambarUlang();
    kirim("bersih", {});
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={wadah} className="ct-kanvas-bingkai relative w-full overflow-hidden rounded-2xl">
        <canvas
          ref={kanvas}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="block w-full"
          style={{ aspectRatio: "4 / 3", touchAction: bolehMenggambar ? "none" : "auto", cursor: bolehMenggambar ? "crosshair" : "default" }}
          aria-label={bolehMenggambar ? "Kanvas menggambar" : "Gambar dari penggambar"}
        />
      </div>

      {bolehMenggambar && (
        <div className="ct-kartu flex flex-col gap-2 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <TombolAlat aktif={alat === "pensil"} onClick={() => setAlat("pensil")} label="Pensil">
              <Pencil size={18} />
            </TombolAlat>
            <TombolAlat aktif={alat === "hapus"} onClick={() => setAlat("hapus")} label="Penghapus">
              <Eraser size={18} />
            </TombolAlat>
            <span className="mx-1 h-6 w-px bg-slate-200" />
            {UKURAN.map((u, i) => (
              <TombolAlat key={u} aktif={ukuran === u} onClick={() => setUkuran(u)} label={["Kecil", "Sedang", "Besar"][i]}>
                <span className="rounded-full bg-[var(--ct-tinta)]" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
              </TombolAlat>
            ))}
            <span className="ml-auto flex gap-1.5">
              <TombolAlat onClick={urung} label="Urungkan">
                <Undo2 size={18} />
              </TombolAlat>
              <TombolAlat onClick={bersihkan} label="Bersihkan kanvas">
                <Trash2 size={18} />
              </TombolAlat>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WARNA.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setWarna(w);
                  setAlat("pensil");
                }}
                aria-label={`Warna ${w}`}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  warna === w && alat === "pensil" ? "scale-110 border-[var(--ct-tinta)]" : "border-white shadow"
                }`}
                style={{ background: w }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TombolAlat({
  aktif,
  onClick,
  label,
  children,
}: {
  aktif?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
        aktif ? "bg-[var(--ct-biru)] text-white" : "bg-slate-100 text-[var(--ct-tinta)]"
      }`}
    >
      {children}
    </button>
  );
}
