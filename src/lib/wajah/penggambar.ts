// Penggambar efek wajah (WebGL2): satu shader untuk warp (wajah tirus & mata besar),
// penghalusan kulit saja (bilateral, tepi tetap tajam), bibir & pipi merona, lalu
// warna global dengan rumus yang sama seperti filter CSS di efekKamera.ts.
import { gammaCerah, type Efek } from "../efekKamera";
import { ALIS_A, ALIS_B, BIBIR_DALAM, BIBIR_LUAR, MATA_A, MATA_B, OVAL, ambil, kendaliMata, kendaliRamping, type Titik, type Wajah } from "./geometri";

const MAKS_GESER = 6;
const MAKS_SKALA = 2;

// 16 titik cakram (spiral Vogel) untuk penghalusan
const CAKRAM = Array.from({ length: 16 }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / 16);
  const a = i * 2.399963;
  return [Math.cos(a) * r, Math.sin(a) * r];
});

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 warna;
uniform sampler2D uVideo;
uniform sampler2D uMasker;
uniform vec2 uUkuran;
uniform bool uCermin;
uniform bool uAdaWajah;
uniform int uJmlGeser;
uniform vec2 uGeserC[${MAKS_GESER}];
uniform vec2 uGeserM[${MAKS_GESER}];
uniform float uGeserR[${MAKS_GESER}];
uniform int uJmlSkala;
uniform vec2 uSkalaC[${MAKS_SKALA}];
uniform float uSkalaR[${MAKS_SKALA}];
uniform float uSkalaS[${MAKS_SKALA}];
uniform float uKulit, uRadius, uCerahKulit, uBibir, uRona;
uniform float uGamma, uKontras, uJenuh, uHangat;
const vec2 CAKRAM[16] = vec2[16](${CAKRAM.map(([x, y]) => `vec2(${x.toFixed(4)}, ${y.toFixed(4)})`).join(", ")});

vec3 ambil(vec2 p) {
  vec2 uv = clamp(p / uUkuran, vec2(0.0), vec2(1.0));
  if (uCermin) uv.x = 1.0 - uv.x;
  return texture(uVideo, uv).rgb;
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uUkuran;
  vec4 m = vec4(0.0);
  if (uAdaWajah) {
    m = texture(uMasker, p / uUkuran);
    for (int i = 0; i < ${MAKS_GESER}; i++) {
      if (i >= uJmlGeser) break;
      vec2 d = p - uGeserC[i];
      float u = dot(d, d) / (uGeserR[i] * uGeserR[i]);
      if (u < 1.0) p -= (1.0 - u) * (1.0 - u) * uGeserM[i];
    }
    for (int i = 0; i < ${MAKS_SKALA}; i++) {
      if (i >= uJmlSkala) break;
      vec2 d = p - uSkalaC[i];
      float r = length(d);
      if (r < uSkalaR[i]) {
        float t = r / uSkalaR[i];
        float g = 1.0 - t * t;
        p = uSkalaC[i] + d * (1.0 - uSkalaS[i] * g * g);
      }
    }
  }
  vec3 c = ambil(p);

  if (uAdaWajah) {
    // rata-rata lokal (bebas noise) — dipakai untuk menilai "warna kulit" & sebagai pemandu bilateral
    vec3 sampel[16];
    vec3 rata = c;
    if (m.r > 0.01) {
      for (int i = 0; i < 16; i++) {
        sampel[i] = ambil(p + CAKRAM[i] * uRadius);
        rata += sampel[i];
      }
      rata /= 17.0;
    }
    // peluang "warna kulit" (YCbCr) dari rata-rata lokal, supaya kacamata, rambut, & mata tidak
    // ikut dihaluskan — dan piksel noise tidak salah digolongkan (jadi bintik)
    float cb = 128.0 + (-0.168736 * rata.r - 0.331264 * rata.g + 0.5 * rata.b) * 255.0;
    float cr = 128.0 + (0.5 * rata.r - 0.418688 * rata.g - 0.081312 * rata.b) * 255.0;
    float kulit = smoothstep(68.0, 82.0, cb) * (1.0 - smoothstep(128.0, 142.0, cb)) * smoothstep(126.0, 138.0, cr) * (1.0 - smoothstep(172.0, 186.0, cr));
    float mk = m.r * mix(1.0, kulit, 0.9);
    if (mk > 0.01 && uKulit > 0.0) {
      // bilateral berpemandu: bobot dibandingkan dengan rata-rata lokal, jadi bintik & noise
      // kamera di cahaya redup ikut terhapus; tepi besar tetap tertahan.
      vec3 d0 = c - rata;
      float bobot = exp(-dot(d0, d0) / 0.02);
      vec3 jumlah = c * bobot;
      for (int i = 0; i < 16; i++) {
        vec3 dc = sampel[i] - rata;
        float w = exp(-dot(dc, dc) / 0.02) * exp(-dot(CAKRAM[i], CAKRAM[i]) * 0.8);
        jumlah += sampel[i] * w;
        bobot += w;
      }
      // garis tegas (bingkai kacamata, bulu mata, tepi wajah) jauh beda dari sekitarnya → jangan dihaluskan;
      // yang dihaluskan hanya beda kecil (noise, bintik, pori)
      float struktur = smoothstep(0.09, 0.18, length(d0));
      c = mix(c, jumlah / max(bobot, 1e-4), mk * uKulit * (1.0 - struktur));
    }
    // kilau kulit: "screen" dengan dirinya sendiri (mengangkat bayangan kulit) + sedikit hangat
    c = mix(c, clamp(1.0 - (1.0 - c) * (1.0 - c) + vec3(0.015, 0.006, 0.0), 0.0, 1.0), mk * uCerahKulit * 0.35);
  }

  // cerah: angkat bayangan (gamma) — wajah di ruangan redup ikut terang tanpa membakar bagian terang;
  // bibir sedikit saja supaya tidak memucat
  c = pow(c, vec3(mix(uGamma, 1.0, m.g * 0.6)));
  if (uAdaWajah) {
    // rona bibir & pipi sesudah pencerahan (tidak luntur): MENAMBAH merah muda, tidak menggelapkan
    c = mix(c, clamp(c * vec3(1.06, 0.9, 0.95) + vec3(0.08, 0.0, 0.03), 0.0, 1.0), m.g * uBibir);
    c = mix(c, clamp(c + vec3(0.06, 0.012, 0.024), 0.0, 1.0), m.b * uRona);
  }
  c = clamp((c - 0.5) * uKontras + 0.5, 0.0, 1.0);
  float s = uJenuh;
  mat3 js = mat3(0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s,
                 0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s,
                 0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s);
  c = clamp(js * c, 0.0, 1.0);
  float b = 1.0 - uHangat;
  mat3 sp = mat3(0.393 + 0.607 * b, 0.349 - 0.349 * b, 0.272 - 0.272 * b,
                 0.769 - 0.769 * b, 0.686 + 0.314 * b, 0.534 - 0.534 * b,
                 0.189 - 0.189 * b, 0.168 - 0.168 * b, 0.131 + 0.869 * b);
  c = clamp(sp * c, 0.0, 1.0);
  warna = vec4(c, 1.0);
}`;

function buatShader(gl: WebGL2RenderingContext, jenis: number, sumber: string): WebGLShader {
  const sh = gl.createShader(jenis)!;
  gl.shaderSource(sh, sumber);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader gagal");
  return sh;
}

function poligon(ctx: CanvasRenderingContext2D, titik: Titik[]) {
  ctx.beginPath();
  titik.forEach((t, i) => (i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y)));
  ctx.closePath();
}

const filterDidukung = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

/**
 * Masker RGB di ruang keluaran: R = kulit wajah (tanpa mata, alis, bibir),
 * G = bibir (tanpa rongga mulut), B = rona pipi. Selalu buram (opak) supaya
 * nilai kanal tidak tercampur alfa.
 */
export function gambarMasker(ctx: CanvasRenderingContext2D, w: Wajah, lebar: number, tinggi: number, skala: number) {
  ctx.save();
  ctx.setTransform(skala, 0, 0, skala, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, lebar, tinggi);
  if (filterDidukung) ctx.filter = `blur(${Math.max(1, w.jarakMata * 0.05 * skala)}px)`;
  ctx.fillStyle = "#f00";
  poligon(ctx, ambil(w, OVAL));
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineJoin = "round";
  for (const k of [MATA_A, MATA_B]) {
    poligon(ctx, ambil(w, k));
    ctx.lineWidth = w.jarakMata * 0.3;
    ctx.fill();
    ctx.stroke();
  }
  for (const k of [ALIS_A, ALIS_B]) {
    poligon(ctx, ambil(w, k));
    ctx.lineWidth = w.jarakMata * 0.16;
    ctx.fill();
    ctx.stroke();
  }
  poligon(ctx, ambil(w, BIBIR_LUAR));
  ctx.lineWidth = w.jarakMata * 0.05;
  ctx.fill();
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#0f0";
  poligon(ctx, ambil(w, BIBIR_LUAR));
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  poligon(ctx, ambil(w, BIBIR_DALAM));
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "none";
  for (const p of [w.pipiKiri, w.pipiKanan]) {
    const r = w.lebar * 0.15;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, "rgba(0,0,255,0.95)");
    g.addColorStop(1, "rgba(0,0,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.restore();
}

export class PenggambarWajah {
  readonly kanvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private texVideo: WebGLTexture;
  private texMasker: WebGLTexture;
  private masker: HTMLCanvasElement;
  private maskerCtx: CanvasRenderingContext2D;
  private u: Record<string, WebGLUniformLocation | null> = {};

  constructor(kanvas: HTMLCanvasElement) {
    this.kanvas = kanvas;
    const gl = kanvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 tidak tersedia");
    this.gl = gl;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, buatShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, buatShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "program gagal");
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const buatTex = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.texVideo = buatTex();
    this.texMasker = buatTex();
    this.masker = document.createElement("canvas");
    this.maskerCtx = this.masker.getContext("2d")!;
    for (const n of [
      "uVideo", "uMasker", "uUkuran", "uCermin", "uAdaWajah", "uJmlGeser", "uGeserC", "uGeserM", "uGeserR", "uJmlSkala", "uSkalaC", "uSkalaR", "uSkalaS",
      "uKulit", "uRadius", "uCerahKulit", "uBibir", "uRona", "uGamma", "uKontras", "uJenuh", "uHangat",
    ]) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    gl.uniform1i(this.u.uVideo, 0);
    gl.uniform1i(this.u.uMasker, 1);
  }

  /** Gambar satu frame ke kanvas berukuran lebar×tinggi (ruang keluaran, dicerminkan). */
  gambar(video: HTMLVideoElement, wajah: Wajah | null, efek: Efek, lebar: number, tinggi: number) {
    const gl = this.gl;
    if (this.kanvas.width !== lebar || this.kanvas.height !== tinggi) {
      this.kanvas.width = lebar;
      this.kanvas.height = tinggi;
    }
    gl.viewport(0, 0, lebar, tinggi);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texVideo);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    const e = efek.wajah;
    const ada = !!wajah;
    gl.uniform2f(this.u.uUkuran, lebar, tinggi);
    gl.uniform1i(this.u.uCermin, 1);
    gl.uniform1i(this.u.uAdaWajah, ada ? 1 : 0);
    if (wajah) {
      const skala = 1 / 3;
      const mw = Math.max(1, Math.round(lebar * skala));
      const mh = Math.max(1, Math.round(tinggi * skala));
      if (this.masker.width !== mw || this.masker.height !== mh) {
        this.masker.width = mw;
        this.masker.height = mh;
      }
      gambarMasker(this.maskerCtx, wajah, lebar, tinggi, skala);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texMasker);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.masker);

      const geser = kendaliRamping(wajah, e.ramping).slice(0, MAKS_GESER);
      const skalaMata = kendaliMata(wajah, e.mataBesar).slice(0, MAKS_SKALA);
      gl.uniform1i(this.u.uJmlGeser, geser.length);
      if (geser.length) {
        gl.uniform2fv(this.u.uGeserC, geser.flatMap((k) => [k.c.x, k.c.y]));
        gl.uniform2fv(this.u.uGeserM, geser.flatMap((k) => [k.m.x, k.m.y]));
        gl.uniform1fv(this.u.uGeserR, geser.map((k) => k.r));
      }
      gl.uniform1i(this.u.uJmlSkala, skalaMata.length);
      if (skalaMata.length) {
        gl.uniform2fv(this.u.uSkalaC, skalaMata.flatMap((k) => [k.c.x, k.c.y]));
        gl.uniform1fv(this.u.uSkalaR, skalaMata.map((k) => k.r));
        gl.uniform1fv(this.u.uSkalaS, skalaMata.map((k) => k.s));
      }
      gl.uniform1f(this.u.uKulit, e.kulit);
      gl.uniform1f(this.u.uRadius, Math.max(2, wajah.lebar * 0.021));
      gl.uniform1f(this.u.uCerahKulit, e.cerahKulit);
      gl.uniform1f(this.u.uBibir, e.bibir);
      gl.uniform1f(this.u.uRona, e.rona);
    }
    gl.uniform1f(this.u.uGamma, gammaCerah(e.cerah));
    gl.uniform1f(this.u.uKontras, e.kontras);
    gl.uniform1f(this.u.uJenuh, efek.jenuh);
    gl.uniform1f(this.u.uHangat, efek.hangat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  hapus() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
