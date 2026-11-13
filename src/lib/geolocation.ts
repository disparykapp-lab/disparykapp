export interface Posisi {
  lat: number;
  lng: number;
  akurasi: number;
}

const TIDAK_DIDUKUNG = "Perangkat kamu tidak mendukung layanan lokasi.";

function pesanGagal(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return "Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini di pengaturan HP.";
  if (err.code === err.TIMEOUT) return "Waktu pengambilan lokasi habis. Coba lagi di tempat terbuka.";
  return "Gagal mengambil lokasi. Coba lagi.";
}

const kePosisi = (pos: GeolocationPosition): Posisi => ({
  lat: pos.coords.latitude,
  lng: pos.coords.longitude,
  akurasi: pos.coords.accuracy,
});

export function ambilPosisi(): Promise<Posisi> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error(TIDAK_DIDUKUNG));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(kePosisi(pos)),
      (err) => reject(new Error(pesanGagal(err))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Pantau lokasi terus-menerus (akurasi GPS biasanya membaik dalam beberapa detik).
 * `izinDitolak` = true kalau pengguna menolak izin lokasi (perlu tindakan di pengaturan HP).
 * Mengembalikan fungsi untuk berhenti memantau.
 */
export function pantauPosisi(onPosisi: (p: Posisi) => void, onGagal: (pesan: string, izinDitolak: boolean) => void): () => void {
  if (!("geolocation" in navigator)) {
    onGagal(TIDAK_DIDUKUNG, false);
    return () => undefined;
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPosisi(kePosisi(pos)),
    (err) => onGagal(pesanGagal(err), err.code === err.PERMISSION_DENIED),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
