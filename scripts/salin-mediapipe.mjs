// Salin mesin WASM MediaPipe dari node_modules ke public/mediapipe/wasm (tidak di-commit).
// Dijalankan otomatis sebelum `npm run dev` & `npm run build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const akar = join(dirname(fileURLToPath(import.meta.url)), "..");
const sumber = join(akar, "node_modules/@mediapipe/tasks-vision/wasm");
const tujuan = join(akar, "public/mediapipe/wasm");
const berkas = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

mkdirSync(tujuan, { recursive: true });
for (const f of berkas) {
  const a = join(sumber, f);
  const b = join(tujuan, f);
  if (!existsSync(a)) throw new Error(`Tidak ada ${a} — jalankan npm install dulu.`);
  if (existsSync(b) && statSync(b).size === statSync(a).size) continue;
  copyFileSync(a, b);
}
console.log("mediapipe wasm siap di public/mediapipe/wasm");
