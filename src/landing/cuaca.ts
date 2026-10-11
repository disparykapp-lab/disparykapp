// Prakiraan cuaca BMKG (data.bmkg.go.id/prakiraan-cuaca) per kelurahan. API publik,
// tanpa API key, dan mengizinkan CORS — dipanggil langsung dari browser pengunjung,
// bukan lewat server kita. BMKG mewajibkan sumber datanya dicantumkan di tampilan.

export interface EntriCuaca {
  waktu: string;
  suhu: number;
  kondisi: string;
  ikon: string;
}

export interface RingkasanHari {
  tanggal: string;
  label: string;
  suhuMin: number;
  suhuMaks: number;
  kondisi: string;
  ikon: string;
}

export interface DataCuaca {
  desa: string;
  kecamatan: string;
  kotaKab: string;
  sekarang: EntriCuaca | null;
  perHari: RingkasanHari[];
}

interface BarisBmkg {
  t: number;
  weather_desc: string;
  image: string;
  local_datetime: string;
}

interface ResponsBmkg {
  lokasi?: { desa?: string; kecamatan?: string; kotkab?: string };
  data?: { cuaca?: BarisBmkg[][] }[];
}

const KUNCI_CACHE = (kode: string) => `disparyk:cuaca:${kode}`;
/** Selaras dengan header cache-control BMKG sendiri (public, max-age=3600). */
const UMUR_CACHE_MS = 60 * 60 * 1000;

const LABEL_HARI = ["Hari ini", "Besok", "Lusa"];

function jamDari(localDatetime: string): number {
  return Number(localDatetime.slice(11, 13));
}

function formatTanggalPendek(localDatetime: string): string {
  const d = new Date(localDatetime.replace(" ", "T"));
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

/** Satu baris wakil per hari (entri terdekat ke tengah hari) + rentang suhu hari itu. */
function ringkasHari(baris: BarisBmkg[], indeks: number): RingkasanHari {
  const suhu = baris.map((b) => b.t);
  const wakil = baris.reduce((a, b) => (Math.abs(jamDari(b.local_datetime) - 12) < Math.abs(jamDari(a.local_datetime) - 12) ? b : a));
  return {
    tanggal: baris[0].local_datetime.slice(0, 10),
    label: LABEL_HARI[indeks] ?? formatTanggalPendek(baris[0].local_datetime),
    suhuMin: Math.min(...suhu),
    suhuMaks: Math.max(...suhu),
    kondisi: wakil.weather_desc,
    ikon: wakil.image,
  };
}

/**
 * Ambil prakiraan cuaca untuk satu kode wilayah kelurahan (format 4 segmen,
 * mis. "34.71.05.1001"). Dicache di sessionStorage selama 1 jam supaya tidak
 * memanggil berulang-ulang saat pengunjung berpindah halaman. null = gagal
 * (offline, kode salah, atau BMKG sedang gangguan) — pemanggil cukup
 * menyembunyikan widget-nya, bukan menampilkan galat ke pengunjung.
 */
export async function ambilCuaca(kodeWilayah: string): Promise<DataCuaca | null> {
  const kunci = KUNCI_CACHE(kodeWilayah);
  try {
    const simpanan = sessionStorage.getItem(kunci);
    if (simpanan) {
      const { waktu, data } = JSON.parse(simpanan) as { waktu: number; data: DataCuaca };
      if (Date.now() - waktu < UMUR_CACHE_MS) return data;
    }
  } catch {
    // sessionStorage diblokir — lanjut ambil langsung tanpa cache.
  }

  let json: ResponsBmkg;
  try {
    const res = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(kodeWilayah)}`);
    if (!res.ok) return null;
    json = (await res.json()) as ResponsBmkg;
  } catch {
    return null;
  }

  const hariHari = json.data?.[0]?.cuaca?.filter((h) => h.length > 0);
  if (!json.lokasi || !hariHari || hariHari.length === 0) return null;

  const jamPertama = hariHari[0][0];
  const data: DataCuaca = {
    desa: json.lokasi.desa ?? "",
    kecamatan: json.lokasi.kecamatan ?? "",
    kotaKab: json.lokasi.kotkab ?? "",
    sekarang: jamPertama
      ? { waktu: jamPertama.local_datetime, suhu: jamPertama.t, kondisi: jamPertama.weather_desc, ikon: jamPertama.image }
      : null,
    perHari: hariHari.map((h, i) => ringkasHari(h, i)),
  };

  try {
    sessionStorage.setItem(kunci, JSON.stringify({ waktu: Date.now(), data }));
  } catch {
    // storage penuh/diblokir — tidak fatal, cuma tidak sempat dicache.
  }
  return data;
}
