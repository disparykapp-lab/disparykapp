export interface Posisi {
  lat: number;
  lng: number;
  akurasi: number;
}

export function ambilPosisi(): Promise<Posisi> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat kamu tidak mendukung layanan lokasi."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error("Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini di pengaturan HP.")
          );
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Waktu pengambilan lokasi habis. Coba lagi di tempat terbuka."));
        } else {
          reject(new Error("Gagal mengambil lokasi. Coba lagi."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
