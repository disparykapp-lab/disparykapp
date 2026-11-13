// Pemuat MediaPipe Face Landmarker — dimuat malas (hanya saat efek wajah/stiker dipilih).
// Mesin WASM disalin ke /mediapipe/wasm oleh scripts/salin-mediapipe.mjs; model di /mediapipe.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let janji: Promise<FaceLandmarker | null> | null = null;

export function muatDetektor(): Promise<FaceLandmarker | null> {
  janji ??= (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const dasar = `${import.meta.env.BASE_URL}mediapipe`;
      const fileset = await FilesetResolver.forVisionTasks(`${dasar}/wasm`);
      const opsi = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: `${dasar}/face_landmarker.task`, delegate },
        runningMode: "VIDEO" as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        return await FaceLandmarker.createFromOptions(fileset, opsi("GPU"));
      } catch {
        return await FaceLandmarker.createFromOptions(fileset, opsi("CPU"));
      }
    } catch (e) {
      console.warn("Efek wajah tidak tersedia:", e);
      janji = null; // boleh dicoba lagi lain kali
      return null;
    }
  })();
  return janji;
}
