// Gambar stiker AR ke kanvas 2D mengikuti wajah (dipakai pratinjau & foto yang disimpan).
import { letakStiker, type Wajah } from "./geometri";
import { STIKER, rasioStiker, urlStiker, type Stiker } from "./stiker";

const cache = new Map<string, HTMLImageElement>();

export function gambarStikerSiap(s: Stiker): HTMLImageElement {
  let img = cache.get(s.id);
  if (!img) {
    img = new Image();
    img.src = urlStiker(s);
    cache.set(s.id, img);
  }
  return img;
}

export const cariStiker = (id: string | null) => STIKER.find((s) => s.id === id) ?? null;

export function gambarStiker(ctx: CanvasRenderingContext2D, w: Wajah, s: Stiker) {
  const img = gambarStikerSiap(s);
  if (!img.complete || !img.naturalWidth) return;
  const lebarRelatif = s.dasar === "mata" ? (s.lebar * w.jarakMata) / w.lebar : s.lebar;
  const rasio = rasioStiker(s);
  for (const l of letakStiker(w, s.jangkar, lebarRelatif, s.geserAtas)) {
    const tinggi = l.lebar * rasio;
    ctx.save();
    ctx.translate(l.pusat.x, l.pusat.y);
    ctx.rotate(l.sudut);
    ctx.drawImage(img, -l.lebar / 2, -tinggi * s.pivotY, l.lebar, tinggi);
    ctx.restore();
  }
}
