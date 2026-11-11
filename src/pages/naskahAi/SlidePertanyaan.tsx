import { useEffect, useRef, useState } from "react";
import { CalendarDays, MapPin, Mic, Tag, Ticket } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { buatPertanyaanWawancara, ambilRiwayatNaskahAi, type FormPertanyaanWawancara } from "../../lib/naskahAi";
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
  TombolBikin,
  type OpsiGaya,
  type RiwayatBaris,
} from "./bersama";

const GAYA_OPSI: OpsiGaya[] = [
  { value: "formal", gambar: "/naskah-ai/formal.png", judul: "Formal", ket: "Pejabat / narasumber resmi" },
  { value: "santai", gambar: "/naskah-ai/caption.png", judul: "Santai", ket: "Buat konten sosmed" },
];

const JUMLAH_OPSI = [3, 5, 8].map((j) => ({ value: j, judul: String(j), ket: "pertanyaan" }));
const JENIS_ACARA = ["Festival", "Peresmian", "Kunjungan Kerja", "Workshop", "Pameran", "Lomba"];
const SARAN_POIN = ["Latar belakang", "Target", "Tantangan", "Dampak", "Rencana ke depan"];

const FORM_KOSONG: FormPertanyaanWawancara = {
  jenisAcara: "",
  namaAcara: "",
  lokasi: "",
  tanggal: "",
  narasumber: "",
  poinPenting: "",
  gaya: "formal",
  jumlahPertanyaan: 5,
};

export default function SlidePertanyaan() {
  const { superAdmin } = useAuth();

  const [form, setForm] = useState<FormPertanyaanWawancara>(FORM_KOSONG);
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
      setRiwayat(await ambilRiwayatNaskahAi("pertanyaan"));
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
    <K extends keyof FormPertanyaanWawancara>(k: K) =>
    (v: FormPertanyaanWawancara[K]) =>
      setForm((f) => ({ ...f, [k]: v }));

  async function buat() {
    setError(null);
    setMembuat(true);
    requestAnimationFrame(() => hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    try {
      const baris = await buatPertanyaanWawancara(form);
      setHasilTerakhir(baris);
      requestAnimationFrame(() => hasilRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      await muatRiwayat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat pertanyaan.");
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
      jumlahPertanyaan: JUMLAH_OPSI.find((j) => j.value === r.jumlah_pertanyaan)?.value ?? FORM_KOSONG.jumlahPertanyaan,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const siap = form.poinPenting.trim().length >= 5;
  const labelGaya = GAYA_OPSI.find((g) => g.value === hasilTerakhir?.gaya)?.judul;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start lg:gap-5">
      <div className="flex min-w-0 flex-col gap-3">
        <Langkah no={1} judul="Mau tanya soal apa?" ket="Topik atau poin yang ingin digali dari narasumber.">
          <KotakCerita
            label="Topik / poin yang ingin digali"
            value={form.poinPenting}
            onChange={ubah("poinPenting")}
            saran={SARAN_POIN}
            placeholder={"Contoh:\n- Latar belakang acara ini diadakan\n- Target jumlah pengunjung\n- Rencana ke depan"}
          />
        </Langkah>

        <Langkah no={2} judul="Narasumber & acara" opsional ket="Biar pertanyaannya pas dengan narasumbernya.">
          <Isian
            ikon={Mic}
            label="Narasumber yang diwawancara"
            value={form.narasumber}
            onChange={ubah("narasumber")}
            placeholder="mis. Kepala Dinas Pariwisata Kota Yogyakarta"
          />
          <Isian ikon={Tag} label="Jenis acara" value={form.jenisAcara} onChange={ubah("jenisAcara")} placeholder="Ketik atau pilih di bawah">
            <ChipSaran label="Saran jenis acara" opsi={JENIS_ACARA} value={form.jenisAcara} onChange={ubah("jenisAcara")} />
          </Isian>
          <Isian ikon={Ticket} label="Nama acara" value={form.namaAcara} onChange={ubah("namaAcara")} placeholder="mis. Jogja Cultural Week 2026" />
          <div className="grid grid-cols-2 gap-3">
            <Isian ikon={MapPin} label="Lokasi" value={form.lokasi} onChange={ubah("lokasi")} placeholder="mis. Malioboro" />
            <Isian ikon={CalendarDays} label="Tanggal" type="date" value={form.tanggal} onChange={ubah("tanggal")} />
          </div>
        </Langkah>

        <Langkah no={3} judul="Pilih gaya bertanya" ket="Sesuaikan dengan narasumbernya.">
          <KartuGaya label="Gaya wawancara" opsi={GAYA_OPSI} value={form.gaya} onChange={ubah("gaya")} />
          <SubJudul>Jumlah pertanyaan</SubJudul>
          <Segmen label="Jumlah pertanyaan" opsi={JUMLAH_OPSI} value={form.jumlahPertanyaan} onChange={ubah("jumlahPertanyaan")} />
        </Langkah>

        {error && <Galat>{error}</Galat>}
        <TombolBikin onClick={() => void buat()} siap={siap} memuat={membuat} teks="Bikin pertanyaan" teksBelumSiap="Isi topiknya dulu ya" />
      </div>

      <div ref={hasilRef} className="flex min-w-0 scroll-mt-4 flex-col gap-4">
        {membuat ? (
          <SedangMenulis pesan="pertanyaan" />
        ) : hasilTerakhir ? (
          <KartuHasil hasil={hasilTerakhir} label={labelGaya} memuat={membuat} onUlang={() => void buat()} />
        ) : (
          <PratinjauKosong judul="Pertanyaanmu muncul di sini" ket="Isi topiknya, pilih gaya, lalu tekan Bikin pertanyaan." />
        )}
        <RiwayatList
          riwayat={riwayat}
          loading={loadingRiwayat}
          error={errorRiwayat}
          superAdmin={superAdmin}
          onHapus={() => void muatRiwayat()}
          onPakai={pakai}
          kosongTeks="Belum ada pertanyaan. Yuk bikin yang pertama."
        />
      </div>
    </div>
  );
}
