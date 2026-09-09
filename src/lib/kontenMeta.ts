import type { PlatformKonten, StatusKonten } from "../types/database";

export const IKON_PLATFORM: Record<PlatformKonten, string> = {
  instagram: "📷",
  tiktok: "🎵",
  facebook: "👍",
  youtube: "▶️",
  twitter: "𝕏",
  website: "🌐",
};

export const LABEL_PLATFORM: Record<PlatformKonten, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "Twitter/X",
  website: "Website",
};

export const LABEL_STATUS_KONTEN: Record<StatusKonten, string> = {
  ide: "Ide",
  draft: "Draft",
  dijadwalkan: "Dijadwalkan",
  tayang: "Tayang",
  batal: "Batal",
};

export const WARNA_STATUS_KONTEN: Record<StatusKonten, string> = {
  ide: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-700",
  dijadwalkan: "bg-blue-100 text-blue-700",
  tayang: "bg-green-100 text-green-700",
  batal: "bg-red-100 text-red-700",
};

export const URUTAN_STATUS: StatusKonten[] = ["ide", "draft", "dijadwalkan", "tayang", "batal"];
