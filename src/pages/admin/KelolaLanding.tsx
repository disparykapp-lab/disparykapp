import { createContext, useContext, useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode, type Ref } from "react";
import { ChevronDown, Eye, Maximize2, Minimize2, Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import HeaderHalaman from "../../components/HeaderHalaman";
import Loading from "../../components/Loading";
import { useAuth } from "../../contexts/AuthContext";
import {
  ambilLanding,
  ambilStatusLanding,
  simpanLanding,
  simpanStatusLanding,
  unggahFotoLanding,
  type LandingTergabung,
} from "../../lib/landing";
import { BAWAAN } from "../../landing/defaults";
import { DAFTAR_IKON, IkonNama } from "../../landing/ikon";
import { PESAN_PRATINJAU, type PesanPratinjau } from "../../landing/drafPratinjau";
import { SEMUA_KUNCI, type Isi, type KunciLanding, type NamaIkon } from "../../landing/types";

type Obj = Record<string, unknown>;

/** Sumber pilihan untuk field "pilihBanyak": diambil dari draf bagian lain. */
type SumberPilihan = "kategori" | "gaya";

type Field =
  | { tipe: "teks" | "foto" | "tanggal" | "angka" | "ikon" | "csv"; key: string; label: string; hint?: string; lanjutan?: boolean }
  | { tipe: "area"; key: string; label: string; hint?: string; lanjutan?: boolean; baris?: number }
  | { tipe: "pilihSatu"; key: string; label: string; hint?: string; opsi: { nilai: string; label: string }[] }
  | { tipe: "pilihBanyak"; key: string; label: string; hint?: string; sumber: SumberPilihan }
  | { tipe: "subjudul"; key: string; label: string; hint?: string }
  | {
      tipe: "daftar";
      key: string;
      label: string;
      hint?: string;
      item: Field[];
      buatBaru: () => Obj;
      tambah: string;
      /** field yang dipakai sebagai judul ringkas item saat dilipat */
      judulItem: string;
      fotoItem?: string;
      /** item punya halaman detail sendiri: tampilkan tombol untuk membukanya di pratinjau.
       *  Nilainya nama halaman di alamat, mis. "destinasi" untuk /destinasi/:id. */
      pratinjauDetail?: string;
    };

const idBaru = (awalan: string) => `${awalan}-${Math.random().toString(36).slice(2, 7)}`;

interface Bagian {
  judul: string;
  /** Penjelasan singkat letak bagian ini di landing. */
  ket: string;
  /** Bagian inti (navbar, hero, kategori) selalu tampil, tidak bisa disembunyikan. */
  bisaDisembunyikan: boolean;
  /** id elemen di landing, untuk menggulir pratinjau ke bagian ini */
  sasaran: string;
  fields: Field[];
}

const TUJUAN_MENU = [
  { nilai: "destinasi", label: "Destinasi populer" },
  { nilai: "gaya", label: "Gaya wisata" },
  { nilai: "agenda", label: "Agenda unggulan" },
  { nilai: "berita", label: "Berita terkini" },
  { nilai: "testimoni", label: "Testimoni" },
  { nilai: "newsletter", label: "Newsletter" },
];

const SKEMA: Record<KunciLanding, Bagian> = {
  navbar: {
    judul: "Navigasi atas",
    ket: "Logo, menu, dan tombol Masuk/Daftar di bagian paling atas.",
    bisaDisembunyikan: false,
    sasaran: "top",
    fields: [
      { tipe: "teks", key: "logo", label: "Nama logo" },
      {
        tipe: "daftar", key: "menu", label: "Menu", tambah: "Tambah menu", judulItem: "label",
        hint: "Saat diklik, halaman bergulir ke bagian tujuan.",
        buatBaru: () => ({ label: "Menu baru", target: "destinasi" }),
        item: [
          { tipe: "teks", key: "label", label: "Teks menu" },
          { tipe: "pilihSatu", key: "target", label: "Gulir ke bagian", opsi: TUJUAN_MENU },
        ],
      },
      { tipe: "teks", key: "tombolMasuk", label: "Teks tombol masuk" },
      { tipe: "teks", key: "tombolDaftar", label: "Teks tombol daftar" },
    ],
  },
  hero: {
    judul: "Hero (foto utama)",
    ket: "Foto besar, judul, dan kotak pencarian yang pertama dilihat pengunjung.",
    bisaDisembunyikan: false,
    sasaran: "top",
    fields: [
      { tipe: "foto", key: "foto", label: "Foto utama", hint: "Foto mendatar, lebar minimal 2000 px." },
      { tipe: "teks", key: "eyebrow", label: "Teks kecil di atas judul", hint: "Contoh: JOGJA. ISTIMEWA. BERSAMA." },
      { tipe: "area", key: "judul", label: "Judul besar", hint: "Satu baris per kalimat. Tekan Enter untuk baris baru." },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      { tipe: "teks", key: "placeholderCari", label: "Teks contoh di kotak pencarian" },
      { tipe: "teks", key: "captionLokasi", label: "Keterangan foto: lokasi" },
      { tipe: "teks", key: "captionKalimat", label: "Keterangan foto: kalimat" },
    ],
  },
  kategori: {
    judul: "Bar kategori",
    ket: "Deretan ikon di bawah hero untuk menyaring kartu destinasi.",
    bisaDisembunyikan: false,
    sasaran: "top",
    fields: [
      {
        tipe: "daftar", key: "items", label: "Kategori", tambah: "Tambah kategori", judulItem: "label",
        buatBaru: () => ({ id: idBaru("kat"), label: "Kategori baru", icon: "compass" }),
        item: [
          { tipe: "teks", key: "label", label: "Nama kategori" },
          { tipe: "ikon", key: "icon", label: "Ikon" },
          { tipe: "teks", key: "id", label: "ID kategori", hint: "Huruf kecil tanpa spasi. Mengubahnya membuat destinasi kehilangan kategori ini.", lanjutan: true },
        ],
      },
    ],
  },
  destinasi: {
    judul: "Destinasi populer",
    ket: "Kartu destinasi. Kartu yang diklik membuka halaman detail destinasi.",
    bisaDisembunyikan: true,
    sasaran: "destinasi",
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      { tipe: "teks", key: "tautanLabel", label: "Teks tautan di kanan judul" },
      {
        tipe: "daftar", key: "items", label: "Daftar destinasi", tambah: "Tambah destinasi", judulItem: "nama", fotoItem: "foto",
        pratinjauDetail: "destinasi",
        buatBaru: () => ({
          id: idBaru("dst"), nama: "Destinasi baru", negara: "Yogyakarta", tagline: "", foto: "", tags: [],
          deskripsi: "", aktivitas: [], tips: "",
        }),
        item: [
          { tipe: "subjudul", key: "_kartu", label: "Kartu di landing" },
          { tipe: "foto", key: "foto", label: "Foto", hint: "Dipakai di kartu dan sebagai foto layar penuh di halaman detail." },
          { tipe: "teks", key: "nama", label: "Nama destinasi" },
          { tipe: "teks", key: "negara", label: "Lokasi", hint: "Kecamatan atau kabupaten. Contoh: Sleman" },
          { tipe: "area", key: "tagline", label: "Keterangan singkat", hint: "Satu kalimat pendek di kartu." },
          { tipe: "pilihBanyak", key: "tags", label: "Kategori", hint: "Dipakai untuk penyaring di bar kategori.", sumber: "kategori" },

          { tipe: "subjudul", key: "_detail", label: "Halaman detail (saat kartu diklik)", hint: "Isi yang kosong tidak ditampilkan." },
          { tipe: "area", key: "deskripsi", label: "Tentang destinasi", hint: "2–4 kalimat. Kosong = memakai keterangan singkat." },
          {
            tipe: "daftar", key: "aktivitas", label: "Yang bisa dilakukan", tambah: "Tambah aktivitas", judulItem: "judul",
            hint: "Disarankan 3 aktivitas.",
            buatBaru: () => ({ icon: "camera", judul: "Aktivitas baru", teks: "" }),
            item: [
              { tipe: "teks", key: "judul", label: "Judul aktivitas" },
              { tipe: "area", key: "teks", label: "Penjelasan singkat" },
              { tipe: "ikon", key: "icon", label: "Ikon" },
            ],
          },
          { tipe: "area", key: "tips", label: "Tips berkunjung", hint: "Opsional. Contoh: Datang pagi agar tidak ramai." },
          { tipe: "teks", key: "id", label: "ID (alamat halaman detail)", hint: "Dipakai di alamat /destinasi/ID. Mengubahnya membuat tautan lama tidak berlaku.", lanjutan: true },
        ],
      },
    ],
  },
  gaya: {
    judul: "Gaya wisata",
    ket: "Chip pilihan gaya berwisata (santai, keluarga, kuliner, dan lainnya).",
    bisaDisembunyikan: true,
    sasaran: "gaya",
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      {
        tipe: "daftar", key: "items", label: "Chip gaya", tambah: "Tambah gaya", judulItem: "label",
        buatBaru: () => ({ id: idBaru("gaya"), label: "Gaya baru", icon: "compass" }),
        item: [
          { tipe: "teks", key: "label", label: "Nama gaya" },
          { tipe: "ikon", key: "icon", label: "Ikon" },
          { tipe: "teks", key: "id", label: "ID gaya", hint: "Dipakai agenda untuk memilih gaya yang cocok.", lanjutan: true },
        ],
      },
    ],
  },
  paket: {
    judul: "Agenda unggulan",
    ket: "Kartu agenda/itinerary. Disaring sesuai chip gaya wisata. Belum ada agenda = tampil pesan \"segera diumumkan\".",
    bisaDisembunyikan: true,
    sasaran: "agenda",
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      { tipe: "teks", key: "tautanLabel", label: "Teks tautan di kanan judul" },
      { tipe: "teks", key: "kosongJudul", label: "Pesan saat kosong: judul", hint: "Tampil selama belum ada item." },
      { tipe: "area", key: "kosongTeks", label: "Pesan saat kosong: kalimat" },
      {
        tipe: "daftar", key: "items", label: "Daftar agenda", tambah: "Tambah agenda", judulItem: "judul", fotoItem: "foto",
        pratinjauDetail: "agenda",
        buatBaru: () => ({
          id: idBaru("agd"), judul: "Agenda baru", deskripsi: "", negara: "Yogyakarta", durasi: 1, harga: "Info menyusul", foto: "", gaya: [],
          isiLengkap: "",
        }),
        item: [
          { tipe: "subjudul", key: "_kartu", label: "Kartu di landing" },
          { tipe: "foto", key: "foto", label: "Foto", hint: "Dipakai di kartu dan sebagai foto sampul halaman detail." },
          { tipe: "teks", key: "judul", label: "Judul agenda" },
          { tipe: "area", key: "deskripsi", label: "Deskripsi singkat", hint: "1–2 kalimat yang tampil di kartu. Kosong di halaman detail = memakai ini." },
          { tipe: "teks", key: "negara", label: "Lokasi" },
          { tipe: "angka", key: "durasi", label: "Durasi (hari)" },
          { tipe: "teks", key: "harga", label: "Harga / keterangan", hint: "Contoh: Gratis, atau Info menyusul" },
          { tipe: "pilihBanyak", key: "gaya", label: "Gaya yang cocok", sumber: "gaya" },

          { tipe: "subjudul", key: "_detail", label: "Halaman detail (saat kartu diklik)", hint: "Kosong = memakai deskripsi singkat di atas." },
          { tipe: "area", key: "isiLengkap", label: "Isi lengkap", hint: "Boleh beberapa paragraf — pisahkan dengan baris kosong.", baris: 8 },
          { tipe: "teks", key: "id", label: "ID (alamat halaman detail)", hint: "Dipakai di alamat /agenda/ID. Mengubahnya membuat tautan lama tidak berlaku.", lanjutan: true },
        ],
      },
    ],
  },
  berita: {
    judul: "Berita terkini",
    ket: "Kartu berita terbaru. Belum ada berita = tampil pesan \"segera hadir\".",
    bisaDisembunyikan: true,
    sasaran: "berita",
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      { tipe: "teks", key: "kosongJudul", label: "Pesan saat kosong: judul", hint: "Tampil selama belum ada item." },
      { tipe: "area", key: "kosongTeks", label: "Pesan saat kosong: kalimat" },
      {
        tipe: "daftar", key: "items", label: "Daftar berita", tambah: "Tambah berita", judulItem: "judul", fotoItem: "foto",
        pratinjauDetail: "berita",
        buatBaru: () => ({
          id: idBaru("brt"), judul: "Judul berita", ringkasan: "", tanggal: new Date().toISOString().slice(0, 10), foto: "", tautan: "",
          isiLengkap: "",
        }),
        item: [
          { tipe: "subjudul", key: "_kartu", label: "Kartu di landing" },
          { tipe: "foto", key: "foto", label: "Foto" },
          { tipe: "teks", key: "judul", label: "Judul" },
          { tipe: "area", key: "ringkasan", label: "Ringkasan", hint: "1–2 kalimat singkat yang tampil di kartu. Kosong di halaman detail = memakai ini." },
          { tipe: "tanggal", key: "tanggal", label: "Tanggal" },

          { tipe: "subjudul", key: "_detail", label: "Halaman detail (saat kartu diklik)", hint: "Kosong = memakai ringkasan di atas." },
          { tipe: "area", key: "isiLengkap", label: "Isi lengkap berita", hint: "Boleh beberapa paragraf — pisahkan dengan baris kosong.", baris: 10 },
          { tipe: "teks", key: "tautan", label: "Sumber asli (opsional)", hint: "Alamat lengkap, mis. https://... Ditampilkan sebagai tautan di halaman detail, bukan pengganti halaman detail." },
          { tipe: "teks", key: "id", label: "ID (alamat halaman detail)", hint: "Dipakai di alamat /berita/ID. Mengubahnya membuat tautan lama tidak berlaku.", lanjutan: true },
        ],
      },
    ],
  },
  testimoni: {
    judul: "Testimoni pengunjung",
    ket: "Kutipan pengunjung. Isi hanya dengan testimoni asli. Belum ada = tampil pesan \"segera hadir\".",
    bisaDisembunyikan: true,
    sasaran: "testimoni",
    fields: [
      { tipe: "teks", key: "judul", label: "Judul bagian" },
      { tipe: "area", key: "subjudul", label: "Kalimat di bawah judul" },
      { tipe: "teks", key: "kosongJudul", label: "Pesan saat kosong: judul", hint: "Tampil selama belum ada item." },
      { tipe: "area", key: "kosongTeks", label: "Pesan saat kosong: kalimat" },
      {
        tipe: "daftar", key: "items", label: "Daftar testimoni", tambah: "Tambah testimoni", judulItem: "nama", fotoItem: "foto",
        buatBaru: () => ({ id: idBaru("tst"), nama: "Nama", asal: "Asal destinasi", kutipan: "", foto: "" }),
        item: [
          { tipe: "teks", key: "nama", label: "Nama" },
          { tipe: "teks", key: "asal", label: "Berkunjung ke" },
          { tipe: "area", key: "kutipan", label: "Kutipan" },
          { tipe: "foto", key: "foto", label: "Foto (opsional)" },
          { tipe: "teks", key: "id", label: "ID (unik)", lanjutan: true },
        ],
      },
    ],
  },
  newsletter: {
    judul: "Newsletter",
    ket: "Kotak ajakan berlangganan email di bawah halaman.",
    bisaDisembunyikan: true,
    sasaran: "newsletter",
    fields: [
      { tipe: "foto", key: "foto", label: "Foto pita (kiri)" },
      { tipe: "teks", key: "eyebrow", label: "Teks kecil di atas judul" },
      { tipe: "teks", key: "judul", label: "Judul" },
      { tipe: "area", key: "teks", label: "Kalimat ajakan" },
      { tipe: "teks", key: "placeholder", label: "Teks contoh di kolom email" },
      { tipe: "teks", key: "tombol", label: "Teks tombol" },
      { tipe: "area", key: "catatanPrivasi", label: "Catatan privasi" },
    ],
  },
  footer: {
    judul: "Footer",
    ket: "Bagian paling bawah: tagline, kolom tautan, dan media sosial.",
    bisaDisembunyikan: true,
    sasaran: "footer",
    fields: [
      { tipe: "area", key: "tagline", label: "Tagline" },
      { tipe: "teks", key: "hak", label: "Teks hak cipta", hint: "Tampil setelah © dan tahun." },
      {
        tipe: "daftar", key: "kolom", label: "Kolom tautan", tambah: "Tambah kolom", judulItem: "judul",
        buatBaru: () => ({ judul: "Kolom baru", tautan: [] }),
        item: [
          { tipe: "teks", key: "judul", label: "Judul kolom" },
          { tipe: "csv", key: "tautan", label: "Teks tautan", hint: "Pisahkan dengan koma. Contoh: Destinasi, Event, Panduan" },
        ],
      },
      {
        tipe: "daftar", key: "sosial", label: "Media sosial", tambah: "Tambah akun", judulItem: "nama",
        buatBaru: () => ({ nama: "Instagram", url: "" }),
        item: [
          { tipe: "teks", key: "nama", label: "Nama (Instagram, Facebook, YouTube)" },
          { tipe: "teks", key: "url", label: "Tautan profil", hint: "Kosong = ikon tidak ditampilkan." },
        ],
      },
    ],
  },
};

interface Draf {
  isi: Obj;
  tampil: boolean;
}

interface KonteksEditor {
  kunci: string;
  pilihan: Record<SumberPilihan, { id: string; label: string; icon: NamaIkon }[]>;
  bukaDetail: (halaman: string, id: string) => void;
}

const Editor = createContext<KonteksEditor | null>(null);
const useEditor = () => useContext(Editor)!;

const jsonDraf = (d: Draf) => JSON.stringify(d);

function useLayarLebar(): boolean {
  const kueri = "(min-width: 1024px)";
  const [lebar, setLebar] = useState(() => window.matchMedia(kueri).matches);
  useEffect(() => {
    const mq = window.matchMedia(kueri);
    const ubah = () => setLebar(mq.matches);
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, []);
  return lebar;
}

export default function KelolaLanding() {
  const { profile } = useAuth();
  const [draf, setDraf] = useState<Record<string, Draf> | null>(null);
  const [tersimpan, setTersimpan] = useState<Record<string, string>>({});
  const [terbuka, setTerbuka] = useState<KunciLanding | null>(null);
  const [status, setStatus] = useState<{ kunci: string; pesan: string; galat: boolean } | null>(null);
  const [menyimpan, setMenyimpan] = useState<string | null>(null);
  const [aktif, setAktif] = useState<boolean | null>(null);
  const [statusAktif, setStatusAktif] = useState<string | null>(null);

  const lebar = useLayarLebar();
  const [pratinjauBuka, setPratinjauBuka] = useState(false);
  const [layarPenuh, setLayarPenuh] = useState(false);
  const [jalur, setJalur] = useState("/");
  const iframe = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    ambilStatusLanding().then(setAktif);
  }, []);

  useEffect(() => {
    ambilLanding().then((d) => {
      const awal: Record<string, Draf> = {};
      const simpan: Record<string, string> = {};
      for (const k of SEMUA_KUNCI) {
        awal[k] = { isi: d[k].isi as unknown as Obj, tampil: d[k].tampil };
        simpan[k] = jsonDraf(awal[k]);
      }
      setDraf(awal);
      setTersimpan(simpan);
    });
  }, []);

  // Draf diteruskan ke landing di iframe pratinjau (dibaca lewat window.parent).
  useEffect(() => {
    if (!draf) return;
    const gabung = {} as Record<string, { kunci: string; isi: Obj; tampil: boolean }>;
    for (const k of SEMUA_KUNCI) gabung[k] = { kunci: k, ...draf[k] };
    window.__pratinjauLanding = gabung as unknown as LandingTergabung;
    const t = window.setTimeout(() => kirimKePratinjau({ tipe: PESAN_PRATINJAU }), 250);
    return () => window.clearTimeout(t);
  }, [draf]);

  useEffect(() => () => void delete window.__pratinjauLanding, []);

  if (!draf) return <Loading teks="Memuat landing page..." />;

  const tampilPratinjau = lebar || pratinjauBuka;
  const belumDisimpan = SEMUA_KUNCI.filter((k) => draf[k] && jsonDraf(draf[k]) !== tersimpan[k]);

  function kirimKePratinjau(pesan: PesanPratinjau) {
    iframe.current?.contentWindow?.postMessage(pesan, window.location.origin);
  }

  function ubahIsi(k: KunciLanding, isiBaru: Obj) {
    setDraf((d) => (d ? { ...d, [k]: { ...d[k], isi: isiBaru } } : d));
  }

  function ubahTampil(k: KunciLanding, tampil: boolean) {
    setDraf((d) => (d ? { ...d, [k]: { ...d[k], tampil } } : d));
  }

  function bukaBagian(k: KunciLanding) {
    const buka = terbuka === k ? null : k;
    setTerbuka(buka);
    if (!buka) return;
    if (jalur !== "/") setJalur("/");
    else kirimKePratinjau({ tipe: PESAN_PRATINJAU, gulir: SKEMA[buka].sasaran });
  }

  function bukaDetail(halaman: string, id: string) {
    setJalur(`/${halaman}/${id}`);
    if (!lebar) setPratinjauBuka(true);
  }

  function kembalikanBawaan(k: KunciLanding) {
    if (!window.confirm("Ganti isi bagian ini dengan isi bawaan? Perubahan yang belum disimpan akan hilang.")) return;
    setDraf((d) => (d ? { ...d, [k]: { ...d[k], isi: BAWAAN[k] as unknown as Obj } } : d));
    setStatus({ kunci: k, pesan: "Isi bawaan dimuat. Tekan Simpan untuk menerapkannya.", galat: false });
  }

  async function simpan(k: KunciLanding): Promise<boolean> {
    if (!profile || !draf) return false;
    setMenyimpan(k);
    setStatus(null);
    try {
      await simpanLanding(k, draf[k].isi as unknown as Isi[KunciLanding], draf[k].tampil, profile.id);
      setTersimpan((t) => ({ ...t, [k]: jsonDraf(draf[k]) }));
      setStatus({ kunci: k, pesan: "Tersimpan. Pengunjung sudah melihat versi ini.", galat: false });
      return true;
    } catch (e) {
      setStatus({ kunci: k, pesan: e instanceof Error ? e.message : "Gagal menyimpan.", galat: true });
      return false;
    } finally {
      setMenyimpan(null);
    }
  }

  async function simpanSemua() {
    for (const k of belumDisimpan) {
      if (!(await simpan(k))) {
        setTerbuka(k);
        return;
      }
    }
    setStatus({ kunci: "*", pesan: "Semua perubahan tersimpan.", galat: false });
  }

  async function ubahAktif(nilai: boolean) {
    if (!profile) return;
    setStatusAktif(null);
    try {
      await simpanStatusLanding(nilai, profile.id);
      setAktif(nilai);
      setStatusAktif(nilai ? "Landing dinyalakan. Pengunjung bisa melihatnya." : "Landing dimatikan. Pengunjung langsung diarahkan ke login.");
    } catch (e) {
      setStatusAktif(e instanceof Error ? e.message : "Gagal mengubah status.");
    }
  }

  const konteks: KonteksEditor = {
    kunci: "",
    pilihan: {
      kategori: ((draf.kategori.isi.items as KonteksEditor["pilihan"]["kategori"]) ?? []),
      gaya: ((draf.gaya.isi.items as KonteksEditor["pilihan"]["gaya"]) ?? []),
    },
    bukaDetail,
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <HeaderHalaman judul="Landing Page" kembaliKe="/kelola" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-brand-text">
                Landing page:{" "}
                <span className={aktif ? "text-green-700" : "text-gray-500"}>{aktif === null ? "..." : aktif ? "Aktif" : "Nonaktif"}</span>
              </p>
              <p className="text-xs text-gray-500">
                {aktif === false ? "Alamat utama langsung ke halaman login." : "Alamat utama menampilkan landing page untuk pengunjung."}
              </p>
              {statusAktif && <p className="mt-1 text-xs text-gray-600">{statusAktif}</p>}
            </div>
            <Saklar nyala={aktif === true} disabled={aktif === null} onUbah={() => void ubahAktif(!aktif)} label="Nyalakan atau matikan landing page" />
          </div>

          <ol className="grid grid-cols-2 gap-2 rounded-xl bg-white p-4 text-xs text-gray-600 shadow-sm sm:grid-cols-4">
            {["Buka bagian yang ingin diubah", "Ubah teks atau foto", "Cek di pratinjau", "Tekan Simpan"].map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-masuk text-[11px] font-bold text-white">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>

          {status?.kunci === "*" && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{status.pesan}</p>}

          <Editor.Provider value={konteks}>
            {SEMUA_KUNCI.map((k, nomor) => {
              const bagian = SKEMA[k];
              const buka = terbuka === k;
              const d = draf[k];
              if (!d) return null;
              const berubah = belumDisimpan.includes(k);
              return (
                <section key={k} className={`rounded-xl bg-white shadow-sm ring-1 transition ${buka ? "ring-brand-masuk/40" : "ring-transparent"}`}>
                  <button type="button" onClick={() => bukaBagian(k)} aria-expanded={buka} className="flex w-full items-center gap-3 p-4 text-left">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-masuk/10 text-sm font-bold text-brand-masuk">
                      {nomor + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-brand-text">{bagian.judul}</span>
                        {bagian.bisaDisembunyikan && (
                          <Lencana warna={d.tampil ? "hijau" : "abu"}>{d.tampil ? "Tampil" : "Disembunyikan"}</Lencana>
                        )}
                        {berubah && <Lencana warna="oranye">Belum disimpan</Lencana>}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">{bagian.ket}</span>
                    </span>
                    <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>

                  {buka && (
                    <Editor.Provider value={{ ...konteks, kunci: k }}>
                      <div className="flex flex-col gap-5 border-t border-gray-100 p-4">
                        {bagian.bisaDisembunyikan && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                            <span className="text-sm text-gray-700">
                              <span className="font-semibold">Tampilkan di landing</span>
                              <span className="block text-xs text-gray-500">Kalau dimatikan, bagian ini tidak dilihat pengunjung.</span>
                            </span>
                            <Saklar nyala={d.tampil} onUbah={() => ubahTampil(k, !d.tampil)} label={`Tampilkan ${bagian.judul}`} />
                          </div>
                        )}

                        <FieldList fields={bagian.fields} nilai={d.isi} onUbah={(n) => ubahIsi(k, n)} />

                        {status?.kunci === k && (
                          <p className={`rounded-lg p-3 text-sm ${status.galat ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{status.pesan}</p>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => kembalikanBawaan(k)}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-brand-text"
                          >
                            <RotateCcw size={15} aria-hidden="true" /> Pakai isi bawaan
                          </button>
                          {!lebar && (
                            <button
                              type="button"
                              onClick={() => setPratinjauBuka(true)}
                              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-brand-masuk text-sm font-semibold text-brand-masuk"
                            >
                              <Eye size={15} aria-hidden="true" /> Pratinjau
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void simpan(k)}
                            disabled={menyimpan === k || !berubah}
                            className="min-h-[44px] flex-1 rounded-lg bg-brand-masuk text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {menyimpan === k ? "Menyimpan..." : berubah ? "Simpan" : "Tersimpan"}
                          </button>
                        </div>
                      </div>
                    </Editor.Provider>
                  )}
                </section>
              );
            })}
          </Editor.Provider>
        </div>

        {tampilPratinjau && (
          <PanelPratinjau
            ref={iframe}
            jalur={jalur}
            onJalur={setJalur}
            layarPenuh={layarPenuh || !lebar}
            bisaLayarPenuh={lebar}
            onLayarPenuh={setLayarPenuh}
            onTutup={lebar ? undefined : () => setPratinjauBuka(false)}
          />
        )}
      </div>

      {/* Bilah bawah: ringkasan perubahan yang belum disimpan + tombol pratinjau di HP */}
      {(belumDisimpan.length > 0 || !lebar) && !pratinjauBuka && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-2 lg:max-w-5xl">
            <p className="min-w-0 flex-1 text-xs text-gray-600">
              {belumDisimpan.length > 0 ? (
                <>
                  <strong className="text-orange-600">{belumDisimpan.length} bagian</strong> belum disimpan
                </>
              ) : (
                "Semua perubahan tersimpan"
              )}
            </p>
            {!lebar && (
              <button
                type="button"
                onClick={() => setPratinjauBuka(true)}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-brand-masuk px-3 text-sm font-semibold text-brand-masuk"
              >
                <Eye size={15} aria-hidden="true" /> Pratinjau
              </button>
            )}
            {belumDisimpan.length > 0 && (
              <button
                type="button"
                onClick={() => void simpanSemua()}
                disabled={menyimpan !== null}
                className="min-h-[40px] rounded-lg bg-brand-masuk px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {menyimpan ? "Menyimpan..." : "Simpan semua"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Saklar({ nyala, disabled, onUbah, label }: { nyala: boolean; disabled?: boolean; onUbah: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      disabled={disabled}
      onClick={onUbah}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${nyala ? "bg-brand-masuk" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${nyala ? "left-[22px]" : "left-0.5"}`} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Lencana({ warna, children }: { warna: "hijau" | "abu" | "oranye"; children: ReactNode }) {
  const kelas = {
    hijau: "bg-green-100 text-green-700",
    abu: "bg-gray-200 text-gray-600",
    oranye: "bg-orange-100 text-orange-700",
  }[warna];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${kelas}`}>{children}</span>;
}

/* ---------------- Pratinjau ---------------- */

const PERANGKAT = {
  hp: { lebar: 390, tinggi: 844, label: "HP", Ikon: Smartphone },
  desktop: { lebar: 1280, tinggi: 800, label: "Desktop", Ikon: Monitor },
} as const;

function PanelPratinjau({
  ref,
  jalur,
  onJalur,
  layarPenuh,
  bisaLayarPenuh,
  onLayarPenuh,
  onTutup,
}: {
  ref: Ref<HTMLIFrameElement>;
  jalur: string;
  onJalur: (j: string) => void;
  layarPenuh: boolean;
  bisaLayarPenuh: boolean;
  onLayarPenuh: (v: boolean) => void;
  onTutup?: () => void;
}) {
  const [perangkat, setPerangkat] = useState<keyof typeof PERANGKAT>("hp");
  const wadah = useRef<HTMLDivElement>(null);
  const [ukuran, setUkuran] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setUkuran({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // HP di layar HP: pakai lebar layar apa adanya. Selain itu perangkat diperkecil agar muat.
  const p = PERANGKAT[perangkat];
  const pasLayar = !bisaLayarPenuh && perangkat === "hp";
  // Ukuran ditulis dalam piksel/posisi absolut: Safari iPhone menghitung tinggi 100% di dalam
  // kotak flex sebagai 0, sehingga pratinjau tampak kosong.
  const skala = pasLayar || ukuran.w === 0 ? 1 : Math.min(1, (ukuran.w - 24) / p.lebar, (ukuran.h - 12) / p.tinggi);
  const gaya: CSSProperties = pasLayar
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : {
        position: "absolute",
        top: 0,
        left: Math.max(0, (ukuran.w - p.lebar * skala) / 2),
        width: p.lebar,
        height: p.tinggi,
        transform: `scale(${skala})`,
        transformOrigin: "top left",
      };
  const namaJalur = jalur === "/" ? "Beranda landing" : `Detail: ${jalur.replace(/^\/(destinasi|berita|agenda)\//, "")}`;

  return (
    <aside
      aria-label="Pratinjau landing page"
      className={
        layarPenuh
          ? "fixed inset-0 z-50 flex h-[100dvh] flex-col bg-gray-900"
          : "sticky top-4 mt-4 flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-xl bg-gray-900 shadow-sm lg:mt-0"
      }
    >
      <div className="flex items-center gap-2 px-3 py-2 text-white">
        <Eye size={16} aria-hidden="true" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pratinjau</p>
          <p className="truncate text-[11px] text-white/60">{namaJalur} · ikut berubah sebelum disimpan</p>
        </div>
        {jalur !== "/" && (
          <button type="button" onClick={() => onJalur("/")} className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold">
            Ke beranda
          </button>
        )}
        {bisaLayarPenuh && (
          <div className="flex rounded-md bg-white/10 p-0.5">
            {(Object.keys(PERANGKAT) as (keyof typeof PERANGKAT)[]).map((k) => {
              const { Ikon, label } = PERANGKAT[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPerangkat(k)}
                  aria-pressed={perangkat === k}
                  title={label}
                  className={`rounded p-1.5 ${perangkat === k ? "bg-white text-gray-900" : "text-white/70"}`}
                >
                  <Ikon size={14} aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </button>
              );
            })}
          </div>
        )}
        {bisaLayarPenuh && (
          <button type="button" onClick={() => onLayarPenuh(!layarPenuh)} title={layarPenuh ? "Kecilkan" : "Layar penuh"} className="rounded-md p-1.5 text-white/80 hover:bg-white/10">
            {layarPenuh ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            <span className="sr-only">{layarPenuh ? "Kecilkan pratinjau" : "Pratinjau layar penuh"}</span>
          </button>
        )}
        {onTutup && (
          <button type="button" onClick={onTutup} className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900">
            <X size={14} aria-hidden="true" /> Tutup
          </button>
        )}
      </div>
      <div ref={wadah} className="relative min-h-0 flex-1 overflow-hidden">
        <iframe
          ref={ref}
          key={jalur}
          src={jalur}
          title="Pratinjau landing page"
          style={gaya}
          className={`block border-0 bg-white ${pasLayar ? "" : "rounded-lg"}`}
        />
      </div>
    </aside>
  );
}

/* ---------------- Field ---------------- */

function FieldList({ fields, nilai, onUbah }: { fields: Field[]; nilai: Obj; onUbah: (n: Obj) => void }) {
  const biasa = fields.filter((f) => !("lanjutan" in f && f.lanjutan));
  const lanjutan = fields.filter((f) => "lanjutan" in f && f.lanjutan);
  return (
    <div className="flex flex-col gap-4">
      {biasa.map((f) => (
        <FieldView key={f.key} field={f} nilai={nilai} onUbah={onUbah} />
      ))}
      {lanjutan.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-gray-500">Pengaturan teknis (jarang perlu diubah)</summary>
          <div className="mt-3 flex flex-col gap-4">
            {lanjutan.map((f) => (
              <FieldView key={f.key} field={f} nilai={nilai} onUbah={onUbah} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const kelasInput = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-brand-masuk focus:outline-none focus:ring-2 focus:ring-brand-masuk/20";

function Label({ htmlFor, label, hint }: { htmlFor?: string; label: string; hint?: string }) {
  const isi = (
    <>
      {label}
      {hint && <span className="mt-0.5 block text-xs font-normal text-gray-500">{hint}</span>}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-gray-700">
      {isi}
    </label>
  ) : (
    <p className="mb-1 text-sm font-semibold text-gray-700">{isi}</p>
  );
}

function FieldView({ field, nilai, onUbah }: { field: Field; nilai: Obj; onUbah: (n: Obj) => void }) {
  const nilaiField = nilai[field.key];
  const set = (v: unknown) => onUbah({ ...nilai, [field.key]: v });
  const id = useId();

  switch (field.tipe) {
    case "subjudul":
      return (
        <div className="-mb-1 border-b border-gray-200 pb-1 pt-1">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-masuk">{field.label}</p>
          {field.hint && <p className="text-xs text-gray-500">{field.hint}</p>}
        </div>
      );
    case "daftar":
      return <DaftarField field={field} nilai={(Array.isArray(nilaiField) ? nilaiField : []) as Obj[]} onUbah={set} />;
    case "foto":
      return <FotoField label={field.label} hint={field.hint} url={String(nilaiField ?? "")} onUbah={set} />;
    case "ikon":
      return <IkonField label={field.label} nilai={String(nilaiField ?? "")} onUbah={set} />;
    case "pilihBanyak":
      return <PilihBanyakField field={field} nilai={Array.isArray(nilaiField) ? (nilaiField as string[]) : []} onUbah={set} />;
    case "pilihSatu":
      return (
        <div>
          <Label htmlFor={id} label={field.label} hint={field.hint} />
          <select id={id} value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelasInput}>
            {field.opsi.map((o) => (
              <option key={o.nilai} value={o.nilai}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "area":
      return (
        <div>
          <Label htmlFor={id} label={field.label} hint={field.hint} />
          <textarea id={id} rows={field.baris ?? 3} value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelasInput} />
        </div>
      );
    case "csv":
      return <CsvField id={id} field={field} nilai={Array.isArray(nilaiField) ? (nilaiField as string[]) : []} onUbah={set} />;
    case "angka":
      return (
        <div>
          <Label htmlFor={id} label={field.label} hint={field.hint} />
          <input id={id} type="number" min={1} value={Number(nilaiField ?? 1)} onChange={(e) => set(Number(e.target.value) || 1)} className={kelasInput} />
        </div>
      );
    case "tanggal":
      return (
        <div>
          <Label htmlFor={id} label={field.label} hint={field.hint} />
          <input id={id} type="date" value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelasInput} />
        </div>
      );
    default:
      return (
        <div>
          <Label htmlFor={id} label={field.label} hint={field.hint} />
          <input id={id} type="text" value={String(nilaiField ?? "")} onChange={(e) => set(e.target.value)} className={kelasInput} />
        </div>
      );
  }
}

/** Daftar teks dipisah koma. Teks ketikan disimpan lokal supaya koma di akhir tidak langsung hilang. */
function CsvField({ id, field, nilai, onUbah }: { id: string; field: Field; nilai: string[]; onUbah: (v: string[]) => void }) {
  const [teks, setTeks] = useState(nilai.join(", "));
  const pecah = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);
  // Nilai berubah dari luar (mis. "Pakai isi bawaan"): ikuti.
  if (pecah(teks).join("|") !== pecah(nilai.join(",")).join("|")) setTeks(nilai.join(", "));
  return (
    <div>
      <Label htmlFor={id} label={field.label} hint={field.hint} />
      <input
        id={id}
        type="text"
        value={teks}
        onChange={(e) => {
          setTeks(e.target.value);
          onUbah(pecah(e.target.value));
        }}
        className={kelasInput}
      />
    </div>
  );
}

function DaftarField({ field, nilai, onUbah }: { field: Extract<Field, { tipe: "daftar" }>; nilai: Obj[]; onUbah: (v: Obj[]) => void }) {
  const { bukaDetail } = useEditor();
  const [buka, setBuka] = useState<number | null>(null);

  function pindah(i: number, ke: number) {
    const hasil = [...nilai];
    [hasil[i], hasil[ke]] = [hasil[ke], hasil[i]];
    onUbah(hasil);
    if (buka === i) setBuka(ke);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label label={`${field.label} (${nilai.length})`} hint={field.hint} />
      {nilai.map((item, i) => {
        const terbuka = buka === i;
        const judul = String(item[field.judulItem] ?? "").trim() || "(tanpa judul)";
        const foto = field.fotoItem ? String(item[field.fotoItem] ?? "") : "";
        return (
          <div key={i} className={`overflow-hidden rounded-lg border bg-gray-50 ${terbuka ? "border-brand-masuk/40" : "border-gray-200"}`}>
            <button type="button" onClick={() => setBuka(terbuka ? null : i)} aria-expanded={terbuka} className="flex w-full items-center gap-3 p-2.5 text-left">
              {field.fotoItem && (
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-linear-to-br from-rose-100 to-rose-300">
                  {foto && <img src={foto} alt="" className="h-full w-full object-cover" />}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-text">
                <span className="mr-1.5 text-gray-400">{i + 1}.</span>
                {judul}
              </span>
              <span className="shrink-0 text-xs text-brand-masuk">{terbuka ? "Tutup" : "Ubah"}</span>
              <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${terbuka ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {terbuka && (
              <div className="flex flex-col gap-3 border-t border-gray-200 p-3">
                <FieldList fields={field.item} nilai={item} onUbah={(n) => onUbah(nilai.map((x, j) => (j === i ? n : x)))} />
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" disabled={i === 0} onClick={() => pindah(i, i - 1)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
                    ↑ Naik
                  </button>
                  <button type="button" disabled={i === nilai.length - 1} onClick={() => pindah(i, i + 1)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
                    ↓ Turun
                  </button>
                  {field.pratinjauDetail && (
                    <button
                      type="button"
                      onClick={() => bukaDetail(field.pratinjauDetail!, String(item.id ?? ""))}
                      className="flex items-center gap-1 rounded-md border border-brand-masuk bg-white px-3 py-1.5 font-semibold text-brand-masuk"
                    >
                      <Eye size={13} aria-hidden="true" /> Lihat halaman detail
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Hapus "${judul}"?`)) return;
                      onUbah(nilai.filter((_, j) => j !== i));
                      setBuka(null);
                    }}
                    className="ml-auto rounded-md border border-red-200 bg-white px-3 py-1.5 text-red-600"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onUbah([...nilai, field.buatBaru()]);
          setBuka(nilai.length);
        }}
        className="min-h-[40px] rounded-lg border border-dashed border-brand-masuk text-sm font-semibold text-brand-masuk"
      >
        + {field.tambah}
      </button>
    </div>
  );
}

function IkonField({ label, nilai, onUbah }: { label: string; nilai: string; onUbah: (v: string) => void }) {
  return (
    <div>
      <Label label={label} />
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {DAFTAR_IKON.map((n) => {
          const aktif = n === nilai;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={aktif}
              title={n}
              onClick={() => onUbah(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-gray-700 hover:border-brand-masuk"
              }`}
            >
              <IkonNama nama={n} size={18} />
              <span className="sr-only">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PilihBanyakField({
  field,
  nilai,
  onUbah,
}: {
  field: Extract<Field, { tipe: "pilihBanyak" }>;
  nilai: string[];
  onUbah: (v: string[]) => void;
}) {
  const { pilihan } = useEditor();
  const opsi = pilihan[field.sumber];
  const dikenal = new Set(opsi.map((o) => o.id));
  const yatim = nilai.filter((v) => !dikenal.has(v));
  return (
    <div>
      <Label label={field.label} hint={field.hint} />
      <div className="flex flex-wrap gap-1.5">
        {opsi.map((o) => {
          const aktif = nilai.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={aktif}
              onClick={() => onUbah(aktif ? nilai.filter((v) => v !== o.id) : [...nilai, o.id])}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                aktif ? "border-brand-masuk bg-brand-masuk text-white" : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              <IkonNama nama={o.icon} size={14} /> {o.label}
            </button>
          );
        })}
        {opsi.length === 0 && <p className="text-xs text-gray-500">Belum ada pilihan. Tambahkan dulu di bagian {field.sumber === "kategori" ? "Bar kategori" : "Gaya wisata"}.</p>}
      </div>
      {yatim.length > 0 && (
        <p className="mt-1 text-xs text-orange-600">
          Tidak dikenal lagi: {yatim.join(", ")}.{" "}
          <button type="button" onClick={() => onUbah(nilai.filter((v) => dikenal.has(v)))} className="underline">
            Hapus
          </button>
        </p>
      )}
    </div>
  );
}

function FotoField({ label, hint, url, onUbah }: { label: string; hint?: string; url: string; onUbah: (v: string) => void }) {
  const { kunci } = useEditor();
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function unggah(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setGalat("File harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    setMemuat(true);
    setGalat(null);
    try {
      onUbah(await unggahFotoLanding(file, kunci));
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div>
      <Label label={label} hint={hint} />
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-rose-100 to-rose-300 text-[11px] text-rose-800">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : "Belum ada foto"}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-brand-text">
            {memuat ? "Mengunggah..." : url ? "Ganti foto" : "Unggah foto"}
            <input type="file" accept="image/*" onChange={unggah} disabled={memuat} className="sr-only" />
          </label>
          {url && (
            <button type="button" onClick={() => onUbah("")} className="text-left text-xs text-red-600">
              Hapus foto
            </button>
          )}
        </div>
      </div>
      {galat && <p className="mt-1 text-xs text-red-600">{galat}</p>}
    </div>
  );
}
