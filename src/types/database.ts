export type Role = "admin" | "user";
export type ModeAbsen = "kantor" | "luar";
export type StatusAbsen = "hadir" | "telat" | "dinas_luar";
export type PlatformKonten =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "twitter"
  | "website";
export type StatusKonten = "ide" | "draft" | "dijadwalkan" | "tayang" | "batal";

export interface Divisi {
  id: string;
  nama: string;
  aktif: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  nama: string;
  email: string;
  role: Role;
  divisi_id: string | null;
  jabatan: string | null;
  foto_url: string | null;
  aktif: boolean;
  created_at: string;
}

export interface Pengaturan {
  id: number;
  kantor_lat: number | null;
  kantor_lng: number | null;
  radius_meter: number;
  akurasi_maks_meter: number;
  jam_masuk: string;
  jam_pulang: string;
  timezone: string;
}

export interface Absensi {
  id: string;
  user_id: string;
  tanggal: string;
  masuk_at: string | null;
  masuk_lat: number | null;
  masuk_lng: number | null;
  masuk_akurasi: number | null;
  masuk_mode: ModeAbsen | null;
  masuk_foto_path: string | null;
  masuk_catatan: string | null;
  masuk_alamat: string | null;
  masuk_ip: string | null;
  keluar_at: string | null;
  keluar_lat: number | null;
  keluar_lng: number | null;
  keluar_akurasi: number | null;
  keluar_mode: ModeAbsen | null;
  keluar_foto_path: string | null;
  keluar_catatan: string | null;
  keluar_alamat: string | null;
  keluar_ip: string | null;
  status: StatusAbsen;
  ditandai: boolean;
  alasan_tanda: string | null;
  created_at: string;
  updated_at: string;
}

export interface Konten {
  id: string;
  judul: string;
  deskripsi: string | null;
  platform: PlatformKonten;
  tanggal_tayang: string;
  jam_tayang: string | null;
  status: StatusKonten;
  pic_user_id: string | null;
  divisi_id: string | null;
  aset_url: string | null;
  dibuat_oleh: string | null;
  created_at: string;
  updated_at: string;
}
