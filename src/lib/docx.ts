import { bacaIsiZip, daftarIsiZip } from "./zipKecil";

// Pratinjau .docx di browser tanpa aplikasi Word: word/document.xml diubah jadi
// elemen HTML sederhana (judul, paragraf, tebal/miring/garis bawah, daftar,
// tabel, link, gambar). Elemen dibuat lewat createElement/textContent saja —
// isi dokumen tidak pernah dimasukkan sebagai HTML mentah.

const MIME_GAMBAR: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
};

/** Atribut ber-prefix (w:val, r:id, r:embed). */
const atr = (el: Element | null | undefined, nama: string) => el?.getAttribute(nama) ?? null;
const anak = (el: Element | null | undefined, nama: string) =>
  el ? (Array.from(el.children).find((c) => c.localName === nama) ?? null) : null;
/** <w:b/> menyala, <w:b w:val="0|false|off"/> mati. */
const nyala = (el: Element | null) => !!el && !["0", "false", "off", "none"].includes(atr(el, "w:val") ?? "");

interface Konteks {
  rels: Map<string, { target: string; eksternal: boolean }>;
  /** numId → bentuk daftar (berpoin / bernomor) */
  daftar: Map<string, "ul" | "ol">;
  gambar: Map<string, string>;
}

export async function docxKeElemen(isi: Blob): Promise<{ elemen: HTMLElement; tutup: () => void }> {
  const buf = await isi.arrayBuffer();
  const entri = daftarIsiZip(buf);
  const baca = async (nama: string) => {
    const e = entri.get(nama);
    return e ? bacaIsiZip(buf, e) : null;
  };
  const xml = async (nama: string) => {
    const b = await baca(nama);
    return b ? new DOMParser().parseFromString(new TextDecoder().decode(b), "application/xml") : null;
  };

  const dokumen = await xml("word/document.xml");
  if (!dokumen || dokumen.getElementsByTagName("parsererror").length > 0) throw new Error("Isi dokumen tidak bisa dibaca.");

  const rels = new Map<string, { target: string; eksternal: boolean }>();
  for (const r of Array.from((await xml("word/_rels/document.xml.rels"))?.getElementsByTagName("Relationship") ?? [])) {
    rels.set(r.getAttribute("Id") ?? "", { target: r.getAttribute("Target") ?? "", eksternal: r.getAttribute("TargetMode") === "External" });
  }

  const daftar = new Map<string, "ul" | "ol">();
  const numbering = await xml("word/numbering.xml");
  if (numbering) {
    const formatAbstrak = new Map<string, "ul" | "ol">();
    for (const a of Array.from(numbering.getElementsByTagNameNS("*", "abstractNum"))) {
      const fmt = atr(anak(anak(a, "lvl"), "numFmt"), "w:val");
      formatAbstrak.set(atr(a, "w:abstractNumId") ?? "", fmt === "bullet" ? "ul" : "ol");
    }
    for (const n of Array.from(numbering.getElementsByTagNameNS("*", "num"))) {
      daftar.set(atr(n, "w:numId") ?? "", formatAbstrak.get(atr(anak(n, "abstractNumId"), "w:val") ?? "") ?? "ul");
    }
  }

  // gambar yang dipakai dokumen → object URL
  const gambar = new Map<string, string>();
  for (const blip of Array.from(dokumen.getElementsByTagNameNS("*", "blip"))) {
    const id = atr(blip, "r:embed");
    const rel = id ? rels.get(id) : undefined;
    if (!id || !rel || rel.eksternal || gambar.has(id)) continue;
    const path = `word/${rel.target.replace(/^\.?\//, "")}`.replace("word/word/", "word/");
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const isiGambar = MIME_GAMBAR[ext] ? await baca(path) : null;
    if (isiGambar) gambar.set(id, URL.createObjectURL(new Blob([isiGambar.slice()], { type: MIME_GAMBAR[ext] })));
  }

  const elemen = document.createElement("div");
  const body = anak(dokumen.documentElement, "body");
  if (body) isiBlok(body, elemen, { rels, daftar, gambar });
  if (!elemen.textContent?.trim() && gambar.size === 0) {
    const kosong = document.createElement("p");
    kosong.textContent = "(Dokumen ini kosong.)";
    elemen.append(kosong);
  }
  return { elemen, tutup: () => gambar.forEach((u) => URL.revokeObjectURL(u)) };
}

/** Isi blok (body, sel tabel, sdtContent): paragraf, tabel, daftar. */
function isiBlok(induk: Element, tujuan: HTMLElement, k: Konteks) {
  let daftarAktif: { el: HTMLElement; numId: string } | null = null;
  for (const c of Array.from(induk.children)) {
    if (c.localName === "p") {
      const numPr = anak(anak(c, "pPr"), "numPr");
      if (numPr) {
        const numId = atr(anak(numPr, "numId"), "w:val") ?? "";
        if (!daftarAktif || daftarAktif.numId !== numId) {
          daftarAktif = { el: document.createElement(k.daftar.get(numId) ?? "ul"), numId };
          tujuan.append(daftarAktif.el);
        }
        const li = document.createElement("li");
        const tingkat = Number(atr(anak(numPr, "ilvl"), "w:val") ?? 0);
        if (tingkat > 0) li.style.marginLeft = `${Math.min(tingkat, 6) * 1.25}rem`;
        li.append(...Array.from(paragraf(c, k).childNodes));
        daftarAktif.el.append(li);
        continue;
      }
      daftarAktif = null;
      tujuan.append(paragraf(c, k));
    } else if (c.localName === "tbl") {
      daftarAktif = null;
      tujuan.append(tabel(c, k));
    } else if (c.localName === "sdt") {
      const isiSdt = anak(c, "sdtContent");
      if (isiSdt) isiBlok(isiSdt, tujuan, k);
    }
  }
}

function paragraf(p: Element, k: Konteks): HTMLElement {
  const pPr = anak(p, "pPr");
  const gaya = (atr(anak(pPr, "pStyle"), "w:val") ?? "").toLowerCase();
  // Title → h2, Heading1 → h3, Heading2 → h4, … (h1 dipakai judul halaman)
  const nomor = /^(?:heading|judul)\s?(\d)$/.exec(gaya)?.[1];
  const tag = gaya === "title" ? "h2" : nomor ? `h${Math.min(Number(nomor) + 2, 6)}` : "p";
  const el = document.createElement(tag);
  const rata = atr(anak(pPr, "jc"), "w:val");
  if (rata === "center" || rata === "right") el.style.textAlign = rata;
  else if (rata === "both" || rata === "distribute") el.style.textAlign = "justify";
  isiBaris(p, el, k);
  if (!el.childNodes.length) el.append(document.createElement("br"));
  return el;
}

/** Isi sebaris paragraf: run, link, perubahan terlacak, dll. */
function isiBaris(induk: Element, tujuan: HTMLElement, k: Konteks) {
  for (const c of Array.from(induk.children)) {
    if (c.localName === "r") tujuan.append(...run(c, k));
    else if (c.localName === "hyperlink") {
      const rel = k.rels.get(atr(c, "r:id") ?? "");
      if (rel?.eksternal && /^(https?:|mailto:)/i.test(rel.target)) {
        const a = document.createElement("a");
        a.href = rel.target;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        isiBaris(c, a, k);
        tujuan.append(a);
      } else isiBaris(c, tujuan, k);
    } else if (["ins", "smartTag", "fldSimple"].includes(c.localName)) isiBaris(c, tujuan, k);
    else if (c.localName === "sdt") {
      const isiSdt = anak(c, "sdtContent");
      if (isiSdt) isiBaris(isiSdt, tujuan, k);
    }
  }
}

function run(r: Element, k: Konteks): Node[] {
  const rPr = anak(r, "rPr");
  const hasil: Node[] = [];
  for (const c of Array.from(r.children)) {
    if (c.localName === "t") hasil.push(document.createTextNode(c.textContent ?? ""));
    else if (c.localName === "tab") hasil.push(document.createTextNode("\t"));
    else if (c.localName === "br" || c.localName === "cr") hasil.push(document.createElement("br"));
    else if (c.localName === "drawing" || c.localName === "pict") {
      for (const blip of Array.from(c.getElementsByTagNameNS("*", "blip"))) {
        const url = k.gambar.get(atr(blip, "r:embed") ?? "");
        if (!url) continue;
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        hasil.push(img);
      }
    }
  }
  if (hasil.length === 0) return hasil;
  let node: Node;
  if (hasil.length === 1) node = hasil[0];
  else {
    const span = document.createElement("span");
    span.append(...hasil);
    node = span;
  }
  for (const [tag, nama] of [["strong", "b"], ["em", "i"], ["s", "strike"]] as const) {
    if (nyala(anak(rPr, nama))) {
      const w = document.createElement(tag);
      w.append(node);
      node = w;
    }
  }
  const garis = atr(anak(rPr, "u"), "w:val");
  if (anak(rPr, "u") && garis !== "none") {
    const u = document.createElement("u");
    u.append(node);
    node = u;
  }
  return [node];
}

function tabel(tbl: Element, k: Konteks): HTMLElement {
  const bungkus = document.createElement("div");
  bungkus.className = "tabel";
  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  for (const tr of Array.from(tbl.children).filter((c) => c.localName === "tr")) {
    const baris = document.createElement("tr");
    for (const tc of Array.from(tr.children).filter((c) => c.localName === "tc")) {
      const td = document.createElement("td");
      const lebar = Number(atr(anak(anak(tc, "tcPr"), "gridSpan"), "w:val") ?? 1);
      if (lebar > 1) td.colSpan = Math.min(lebar, 50);
      isiBlok(tc, td, k);
      baris.append(td);
    }
    tbody.append(baris);
  }
  table.append(tbody);
  bungkus.append(table);
  return bungkus;
}
