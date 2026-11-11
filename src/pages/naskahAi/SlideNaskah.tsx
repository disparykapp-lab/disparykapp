import { useEffect, useRef, useState } from "react";
import { CalendarDays, MapPin, Megaphone, Mic, Tag, Ticket } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { buatNaskahAi, ambilRiwayatNaskahAi, type FormNaskahAi } from "../../lib/naskahAi";
import type { NaskahAi } from "../../types/database";
import {
  ChipSaran,
  Galat,
  Isian,
  KartuGaya,
  KartuHasil,
  KotakCerita,
  Langkah,
  PratinjauKosong,
  RiwayatList,
  SedangMenulis,
  Segmen,
  SubJudul,
  Tips,
  TombolBikin,
  type OpsiGaya,
  type RiwayatBaris,
} from "./bersama";

const GAYA_OPSI: OpsiGaya[] = [
  { value: "berita", gambar: "/naskah-ai/berita.png", judul: "Berita", ket: "Formal ala TV/radio" },
  { value: "siaran_pers", gambar: "/naskah-ai/siaran-pers.png", judul: "Siaran pers", ket: "Resmi untuk media" },
  { value: "caption", gambar: "/naskah-ai/caption.png", judul: "Caption", ket: "Santai buat sosmed" },
  { value: "voice_over", gambar: "/naskah-ai/naskah.png", judul: "Voice-over", ket: "Narasi video" },
];

const PANJANG_OPSI = [
  { value: "pendek", judul: "Pendek", ket: "±100 kata" },
  { value: "sedang", judul: "Sedang", ket: "±200 kata" },
  { value: "panjang", judul: "Panjang", ket: "±400 kata" },
];

const JENIS_ACARA = ["Festival", "Peresmian", "Kunjungan Kerja", "Workshop", "Pameran", "Lomba"];
const PLATFORM = ["Instagram", "TikTok", "Website", "YouTube", "Press release"];
const SARAN_POIN = ["Dibuka jam", "Dihadiri", "Momen seru", "Kutipan", "Penutup"];

const FORM_KOSONG: FormNaskahAi = {
  jenisAcara: "",
  namaAcara: "",
  lokasi: "",
  tanggal: "",
  narasumber: "",
  poinPenting: "",
  gaya: "berita",
  panjang: "sedang",
  platformTujuan: "",
};

export default function SlideNaskah() {
  const { superAdmin } = useAuth();

  const [form, setForm] = useState<FormNaskahAi>(FORM_KOSONG);
  const [membuat, setMembuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasilTerakhir, setHasilTerakhir] = useState<NaskahAi | null>(null);
  const hasilRef = useRef<HTMLDivElement>(null);

  const [riwayat, setRiwayat] = useState<RiwayatBaris[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [errorRiwayat, setErrorRiwayat] = useState<string | null>(null);

  async function muatRiwayat() {
    setLoadingRiwayat(true);
    setErrorRiwayat(null);
    try {
      setRiwayat(await ambilRiwayatNaskahAi("naskah"));
    } catch (e) {
      setErrorRiwayat(e instanceof Error ? e.message : "Gagal memuat riwayat.");
    } finally {
      setLoadingRiwayat(false);
    }
  }

  useEffect(() => {
    void muatRiwayat();
  }, []);

  const ubah =
    <K extends keyof FormNaskahAi>(k: K) =>
    (v: FormNaskahAi[K]) =>
      setForm((f) => ({ ...f, [k]: v }));

  async function buat() {
    setError(null);
    setMembuat(true);
    // tampilkan animasi "lagi diracik" di tempat hasil
    requestAnimationFrame(() => hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    try {
      const baris = await buatNaskahAi(form);
      setHasilTerakhir(baris);
      requestAnimationFrame(() => hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      await muatRiwayat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat naskah.");
    } finally {
      setMembuat(false);
    }
  }

  function pakai(r: RiwayatBaris) {
    setForm({
      jenisAcara: r.jenis_acara ?? "",
      namaAcara: r.nama_acara ?? "",
      lokasi: r.lokasi ?? "",
      tanggal: r.tanggal ?? "",
      narasumber: r.narasumber ?? "",
      poinPenting: r.poin_penting,
      gaya: GAYA_OPSI.some((g) => g.value === r.gaya) ? r.gaya : FORM_KOSONG.gaya,
      panjang: PANJANG_OPSI.some((p) => p.value === r.panjang) ? r.panjang : FORM_KOSONG.panjang,
      platformTujuan: r.platform_tujuan ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const siap = form.poinPenting.trim().length >= 5;
  const labelGaya = GAYA_OPSI.find((g) => g.value === hasilTerakhir?.gaya)?.judul;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start lg:gap-5">
      <div className="flex min-w-0 flex-col gap-3">
        <Langkah no={1} judul="Ceritain acaranya" ket="Tulis poin-poin atau kronologinya. Makin detail, makin bagus hasilnya.">
          <KotakCerita
            label="Poin-poin penting / kronologi kegiatan"
            value={form.poinPenting}
            onChange={ubah("poinPenting")}
            saran={SARAN_POIN}
            placeholder={"Contoh:\n- Dibuka jam 09.00 oleh Kepala Dinas\n- Dihadiri ±200 pengunjung\n- Ada pertunjukan tari tradisional"}
          />
          <Tips>AI menulis persis dari isianmu — pastikan fakta dan kutipannya benar ya.</Tips>
        </Langkah>

        <Langkah no={2} judul="Detail acara" opsional ket="Biar naskahnya lengkap.">
          <Isian ikon={Tag} label="Jenis acara" value={form.jenisAcara} onChange={ubah("jenisAcara")} placeholder="Ketik atau pilih di bawah">
            <ChipSaran label="Saran jenis acara" opsi={JENIS_ACARA} value={form.jenisAcara} onChange={ubah("jenisAcara")} />
          </Isian>
          <Isian ikon={Ticket} label="Nama acara" value={form.namaAcara} onChange={ubah("namaAcara")} placeholder="mis. Jogja Cultural Week 2026" />
          <div className="grid grid-cols-2 gap-3">
            <Isian ikon={MapPin} label="Lokasi" value={form.lokasi} onChange={ubah("lokasi")} placeholder="mis. Malioboro" />
            <Isian ikon={CalendarDays} label="Tanggal" type="date" value={form.tanggal} onChange={ubah("tanggal")} />
          </div>
          <Isian
            ikon={Mic}
            label="Narasumber / pihak terlibat"
            value={form.narasumber}
            onChange={ubah("narasumber")}
            placeholder="mis. Kepala Dinas Pariwisata, perwakilan UMKM"
          />
        </Langkah>

        <Langkah no={3} judul="Pilih gaya tulisan" ket="Mau dibawakan seperti apa?">
          <KartuGaya label="Gaya naskah" opsi={GAYA_OPSI} value={form.gaya} onChange={ubah("gaya")} />
          <SubJudul>Panjang naskah</SubJudul>
          <Segmen label="Panjang naskah" opsi={PANJANG_OPSI} value={form.panjang} onChange={ubah("panjang")} />
          <Isian ikon={Megaphone} label="Mau dipost di mana? (opsional)" value={form.platformTujuan} onChange={ubah("platformTujuan")} placeholder="Ketik atau pilih di bawah">
            <ChipSaran label="Saran tujuan publikasi" opsi={PLATFORM} value={form.platformTujuan} onChange={ubah("platformTujuan")} />
          </Isian>
        </Langkah>

        {error && <Galat>{error}</Galat>}
        <TombolBikin onClick={() => void buat()} siap={siap} memuat={membuat} teks="Bikin naskah" teksBelumSiap="Isi ceritanya dulu ya" />
      </div>

      <div ref={hasilRef} className="flex min-w-0 scroll-mt-4 flex-col gap-4">
        {membuat ? (
          <SedangMenulis pesan="naskah" />
        ) : hasilTerakhir ? (
          <KartuHasil hasil={hasilTerakhir} label={labelGaya} memuat={membuat} onUlang={() => void buat()} />
        ) : (
          <PratinjauKosong judul="Naskahmu muncul di sini" ket="Isi ceritanya, pilih gaya, lalu tekan Bikin naskah." />
        )}
        <RiwayatList
          riwayat={riwayat}
          loading={loadingRiwayat}
          error={errorRiwayat}
          superAdmin={superAdmin}
          onHapus={() => void muatRiwayat()}
          onPakai={pakai}
          kosongTeks="Belum ada naskah. Yuk bikin yang pertama."
        />
      </div>
    </div>
  );
}
