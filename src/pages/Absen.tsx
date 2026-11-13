import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, MapPin } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import KameraLive from "../components/KameraLive";
import HeaderHalaman from "../components/HeaderHalaman";
import { supabase } from "../lib/supabase";
import { pantauPosisi, type Posisi } from "../lib/geolocation";
import {
  ambilAbsensiHariIni,
  kirimKlarifikasiAbsensi,
  panggilAbsenMasuk,
  panggilAbsenPulang,
  tanggalHariIniWIB,
  unggahFotoAbsen,
} from "../lib/absensi";
import {
  bolehLanjut,
  cekLokasi,
  formatJarak,
  jelaskanGagal,
  riwayatDinas,
  waktuAbsen,
  type AturanKantor,
  type JenisAbsen,
  type ModeAbsen,
} from "../lib/absenAturan";
import { jamPendek } from "../lib/statusHariIni";
import type { Absensi } from "../types/database";
import PitaLangkah from "./absen/PitaLangkah";
import KartuJamLokasi, { type GalatLokasi } from "./absen/KartuJamLokasi";
import PilihMode from "./absen/PilihMode";
import IsianDinas from "./absen/IsianDinas";
import { BarisKeterangan, LembarKeterangan, type IsiKeterangan } from "./absen/Keterangan";
import LayarKirim from "./absen/LayarKirim";
import TiketBukti, { type HasilAbsen } from "./absen/TiketBukti";
import KartuPesan from "./absen/KartuPesan";
import { JUDUL_ABSEN, STIKER_ABSEN, TOMBOL_KEDUA, TOMBOL_UTAMA, jamWIB } from "./absen/gaya";

type Langkah = "siap" | "kamera" | "mengirim" | "sukses" | "gagal";

const URUTAN_LANGKAH: Record<Langkah, number> = { siap: 0, kamera: 1, mengirim: 2, gagal: 2, sukses: 3 };

/** Jeda minimum layar mengirim supaya pesawat sempat sampai, meski server sangat cepat. */
const MIN_KIRIM_MS = 1600;

export default function Absen() {
  const { jenis } = useParams<{ jenis: string }>();
  if (jenis !== "masuk" && jenis !== "pulang") {
    return <p className="p-6 text-center text-red-600">Jenis absen tidak dikenal.</p>;
  }
  // key: pindah Masuk ↔ Pulang dari kartu "sudah absen" memulai alur baru
  return <AlurAbsen key={jenis} jenis={jenis} />;
}

function AlurAbsen({ jenis }: { jenis: JenisAbsen }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userId = profile?.id;
  const [tanggal] = useState(tanggalHariIniWIB);

  const [langkah, setLangkah] = useState<Langkah>("siap");
  const [kantor, setKantor] = useState<AturanKantor | null | undefined>(undefined);
  const [hariIni, setHariIni] = useState<Absensi | null | undefined>(undefined);
  const [riwayat, setRiwayat] = useState<string[]>([]);
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [galat, setGalat] = useState<GalatLokasi | null>(null);
  const [putaran, setPutaran] = useState(0);
  const [sekarang, setSekarang] = useState(() => Date.now());
  const [mode, setMode] = useState<ModeAbsen>("kantor");
  const [catatan, setCatatan] = useState("");
  const [ket, setKet] = useState<IsiKeterangan>({ isi: "", bukti: "" });
  const [lembarKet, setLembarKet] = useState(false);
  const [posisiKirim, setPosisiKirim] = useState<Posisi | null>(null);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [tahapKirim, setTahapKirim] = useState(0);
  const [hasil, setHasil] = useState<HasilAbsen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modeDisentuh = useRef(false);

  // Data awal: aturan kantor, absen hari ini, dan riwayat dinas luar (untuk chip "pakai lagi").
  useEffect(() => {
    if (!userId) return;
    let aktif = true;
    void supabase
      .from("pengaturan")
      .select("kantor_lat, kantor_lng, radius_meter, akurasi_maks_meter, jam_masuk, jam_pulang")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (!aktif) return;
        setKantor(
          e || !data
            ? null
            : {
                lat: data.kantor_lat,
                lng: data.kantor_lng,
                radius: data.radius_meter,
                akurasiMaks: data.akurasi_maks_meter,
                jamMasuk: data.jam_masuk,
                jamPulang: data.jam_pulang,
              }
        );
      });
    ambilAbsensiHariIni(userId)
      .then((a) => {
        if (!aktif) return;
        setHariIni(a);
        // pulang dari dinas luar: mode & keterangannya ikut terisi
        if (jenis === "pulang" && a?.masuk_mode === "luar" && !modeDisentuh.current) {
          setMode("luar");
          setCatatan(a.masuk_catatan ?? "");
        }
      })
      .catch(() => aktif && setHariIni(null));
    void supabase
      .from("absensi")
      .select("masuk_catatan, keluar_catatan")
      .eq("user_id", userId)
      .or("masuk_mode.eq.luar,keluar_mode.eq.luar")
      .order("tanggal", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (aktif && data) setRiwayat(riwayatDinas(data));
      });
    return () => {
      aktif = false;
    };
  }, [userId, jenis]);

  // Lokasi dipantau sejak halaman dibuka (akurasi GPS membaik dalam beberapa detik).
  useEffect(() => {
    if (langkah !== "siap") return;
    return pantauPosisi(
      (p) => {
        setPosisi(p);
        setGalat(null);
      },
      (pesan, izinDitolak) => setGalat({ pesan, izinDitolak })
    );
  }, [langkah, putaran]);

  // Jam berjalan hanya di layar persiapan.
  useEffect(() => {
    if (langkah !== "siap") return;
    const t = setInterval(() => setSekarang(Date.now()), 1000);
    return () => clearInterval(t);
  }, [langkah]);

  useEffect(() => {
    if (langkah !== "sukses") return;
    new Audio("/iphone_sfx.mp3").play().catch(() => {
      // autoplay diblokir — animasi tetap jalan tanpa suara
    });
  }, [langkah]);

  const cek = useMemo(() => cekLokasi(posisi, kantor ?? null), [posisi, kantor]);
  const waktu = waktuAbsen(jenis, mode, sekarang, tanggal, kantor ?? null);
  const lanjut =
    !posisi && galat
      ? { boleh: false, alasan: "Lokasi belum didapat — ikuti petunjuk di atas lalu ketuk Coba lagi." }
      : kantor === undefined
        ? { boleh: false, alasan: "Menyiapkan…" }
        : bolehLanjut(mode, posisi, cek, kantor, catatan);
  const izinHariIni = jenis === "masuk" && hariIni?.status === "izin" && !hariIni.masuk_at;
  const tahapan = ["Mengunggah foto", `Mencatat ${JUDUL_ABSEN[jenis].toLowerCase()}`, ...(ket.isi.trim().length >= 3 ? ["Menyimpan keterangan"] : [])];

  function pilihMode(m: ModeAbsen) {
    modeDisentuh.current = true;
    setMode(m);
  }

  function perbaruiLokasi() {
    setPosisi(null);
    setGalat(null);
    setPutaran((n) => n + 1);
  }

  function keKamera() {
    // posisi dibekukan saat lanjut: yang dikirim = yang dilihat pegawai
    setPosisiKirim(posisi);
    setLangkah("kamera");
  }

  const kirim = useCallback(
    async (blob: Blob, url: string) => {
      const p = posisiKirim;
      if (!userId || !p) return;
      setFoto({ blob, url });
      setLangkah("mengirim");
      setTahapKirim(0);
      setError(null);
      const mulai = Date.now();
      const isiKet = ket.isi.trim();
      try {
        const fotoPath = await unggahFotoAbsen(userId, jenis === "masuk" ? "masuk" : "keluar", blob);
        setTahapKirim(1);
        const params = { lat: p.lat, lng: p.lng, akurasi: p.akurasi, mode, catatan: mode === "luar" ? catatan.trim() : null, fotoPath };
        const respon = jenis === "masuk" ? await panggilAbsenMasuk(params) : await panggilAbsenPulang(params);
        setTahapKirim(2);
        let ketGagal = false;
        if (isiKet.length >= 3) {
          try {
            await kirimKlarifikasiAbsensi(tanggal, isiKet, ket.bukti.trim());
          } catch {
            ketGagal = true; // absen sudah tercatat — keterangan gagal tidak menggagalkan absen
          }
          setTahapKirim(3);
        }
        const sisa = MIN_KIRIM_MS - (Date.now() - mulai);
        if (sisa > 0) await new Promise((r) => setTimeout(r, sisa));
        const kini = Date.now();
        setHasil({
          waktu: kini,
          jam: jamWIB(kini),
          status: respon.status,
          jarak: respon.jarak_m,
          mode,
          fotoUrl: url,
          keterangan: isiKet.length >= 3 ? isiKet : "",
          ketGagal,
          kerjaMenit: jenis === "pulang" && hariIni?.masuk_at ? Math.max(0, Math.round((kini - Date.parse(hariIni.masuk_at)) / 60_000)) : null,
        });
        setLangkah("sukses");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Absen gagal. Coba lagi.");
        setLangkah("gagal");
      }
    },
    [userId, posisiKirim, jenis, mode, catatan, ket, tanggal, hariIni]
  );

  const hambatan = langkah === "siap" ? cariHambatan(jenis, hariIni) : null;

  return (
    <div className="kolom-sempit-sm flex min-h-[80vh] flex-col">
      <HeaderHalaman judul={JUDUL_ABSEN[jenis]} kembaliKe="/beranda" />

      {hambatan ? (
        <KartuPesan
          gambar={<img src={hambatan.gambar} alt="" className="h-20 w-20 object-contain" />}
          judul={hambatan.judul}
          aksi={
            <>
              <button type="button" className={TOMBOL_KEDUA} onClick={() => navigate("/beranda")}>
                Beranda
              </button>
              {hambatan.ke && (
                <button type="button" className={TOMBOL_UTAMA} onClick={() => navigate(hambatan.ke!.url)}>
                  {hambatan.ke.label}
                </button>
              )}
            </>
          }
        >
          {hambatan.ket}
        </KartuPesan>
      ) : (
        <>
          <PitaLangkah aktif={URUTAN_LANGKAH[langkah]} />

          {langkah === "siap" && hariIni === undefined && <div className="h-64 animate-pulse rounded-2xl bg-white/70" aria-label="Memuat" />}

          {langkah === "siap" && hariIni !== undefined && (
            <div className="flex flex-col gap-4">
              {izinHariIni && (
                <p role="note" className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
                  Hari ini kamu tercatat <strong>izin</strong>. Kalau absen masuk sekarang, izin hari ini dihapus dan statusmu jadi hadir. Izin di hari lain tetap
                  berlaku.
                </p>
              )}

              <KartuJamLokasi
                jenis={jenis}
                mode={mode}
                sekarang={sekarang}
                waktu={waktu}
                posisi={posisi}
                cek={cek}
                kantor={kantor}
                galat={galat}
                onPerbarui={perbaruiLokasi}
              />

              <div>
                <h2 className="mb-2 px-1 text-sm font-bold text-brand-text">Kamu sedang di mana?</h2>
                <PilihMode mode={mode} onPilih={pilihMode} posisi={posisi} cek={cek} />
              </div>

              {mode === "luar" && <IsianDinas nilai={catatan} onUbah={setCatatan} riwayat={riwayat} />}

              <BarisKeterangan nilai={ket} saran={waktu.saran} onBuka={() => setLembarKet(true)} />

              <div className="flex flex-col gap-2 pb-2">
                {!lanjut.boleh && lanjut.alasan && (
                  <p className="text-center text-xs text-gray-500" aria-live="polite">
                    {lanjut.alasan}
                  </p>
                )}
                <button
                  type="button"
                  onClick={keKamera}
                  disabled={!lanjut.boleh}
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-brand-masuk text-base font-bold text-white shadow-sm transition active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                >
                  <img src="/icon_kamera.png" alt="" className="h-9 w-9 object-contain" />
                  Lanjut Foto
                </button>
              </div>

              {lembarKet && (
                <LembarKeterangan
                  awal={ket}
                  saran={waktu.saran}
                  onTutup={() => setLembarKet(false)}
                  onSimpan={(v) => {
                    setKet(v);
                    setLembarKet(false);
                  }}
                />
              )}
            </div>
          )}

          {langkah === "kamera" && posisiKirim && profile && (
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold text-brand-text shadow-sm">
                  <MapPin size={13} className="text-brand-masuk" aria-hidden="true" />
                  {mode === "luar" ? "Dinas Luar" : cek.jarak !== null ? `Di Kantor · ${formatJarak(cek.jarak)}` : "Di Kantor"}
                </span>
                <span className="text-gray-500">Ambil foto wajah kamu</span>
              </div>
              <KameraLive
                nama={profile.nama}
                lat={posisiKirim.lat}
                lng={posisiKirim.lng}
                labelKirim={`Kirim ${JUDUL_ABSEN[jenis]}`}
                onFotoSiap={(blob, url) => void kirim(blob, url)}
                onBatal={() => setLangkah("siap")}
              />
            </div>
          )}

          {langkah === "mengirim" && <LayarKirim jenis={jenis} tahapan={tahapan} tahap={tahapKirim} fotoUrl={foto?.url ?? null} />}

          {langkah === "sukses" && hasil && profile && (
            <TiketBukti
              jenis={jenis}
              nama={profile.nama}
              jadwal={kantor?.jamMasuk ? jamPendek(kantor.jamMasuk) : null}
              hasil={hasil}
              onBeranda={() => navigate("/beranda")}
            />
          )}

          {langkah === "gagal" && (
            <KartuGagal
              pesan={error ?? "Absen gagal. Coba lagi."}
              adaFoto={!!foto}
              onKirimUlang={() => foto && void kirim(foto.blob, foto.url)}
              onDinas={() => {
                pilihMode("luar");
                setLangkah("siap");
              }}
              onLokasi={() => {
                perbaruiLokasi();
                setLangkah("siap");
              }}
              onUlangi={() => setLangkah("siap")}
              onBeranda={() => navigate("/beranda")}
            />
          )}
        </>
      )}
    </div>
  );
}

function cariHambatan(jenis: JenisAbsen, a: Absensi | null | undefined) {
  if (a === undefined) return null;
  const jam = (iso: string) => jamWIB(Date.parse(iso));
  if (jenis === "masuk" && a?.masuk_at) {
    return {
      gambar: STIKER_ABSEN.masuk,
      judul: "Kamu sudah absen masuk",
      ket: `Tercatat pukul ${jam(a.masuk_at)}${a.keluar_at ? ` dan pulang pukul ${jam(a.keluar_at)}` : ""}. Sampai jumpa di absen berikutnya!`,
      ke: a.keluar_at ? null : { label: "Absen Pulang", url: "/absen/pulang" },
    };
  }
  if (jenis === "pulang" && !a?.masuk_at) {
    return {
      gambar: STIKER_ABSEN.masuk,
      judul: "Belum absen masuk",
      ket: "Absen pulang baru bisa setelah absen masuk hari ini.",
      ke: { label: "Absen Masuk", url: "/absen/masuk" },
    };
  }
  if (jenis === "pulang" && a?.keluar_at) {
    return {
      gambar: STIKER_ABSEN.pulang,
      judul: "Kamu sudah absen pulang",
      ket: `Tercatat pukul ${jam(a.keluar_at)}. Istirahat yang cukup ya!`,
      ke: null,
    };
  }
  return null;
}

function KartuGagal({
  pesan,
  adaFoto,
  onKirimUlang,
  onDinas,
  onLokasi,
  onUlangi,
  onBeranda,
}: {
  pesan: string;
  adaFoto: boolean;
  onKirimUlang: () => void;
  onDinas: () => void;
  onLokasi: () => void;
  onUlangi: () => void;
  onBeranda: () => void;
}) {
  const { judul, aksi } = jelaskanGagal(pesan);
  return (
    <KartuPesan
      gambar={
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-brand-pulang" aria-hidden="true">
          <AlertTriangle size={30} />
        </span>
      }
      judul={judul}
      aksi={
        aksi === "dinas" ? (
          <>
            <button type="button" className={TOMBOL_KEDUA} onClick={onLokasi}>
              Cek Lokasi
            </button>
            <button type="button" className={TOMBOL_UTAMA} onClick={onDinas}>
              Dinas Luar
            </button>
          </>
        ) : aksi === "lokasi" ? (
          <>
            <button type="button" className={TOMBOL_KEDUA} onClick={onBeranda}>
              Beranda
            </button>
            <button type="button" className={TOMBOL_UTAMA} onClick={onLokasi}>
              Cek Lokasi
            </button>
          </>
        ) : aksi === "beranda" ? (
          <button type="button" className={TOMBOL_UTAMA} onClick={onBeranda}>
            Kembali ke Beranda
          </button>
        ) : (
          <>
            <button type="button" className={TOMBOL_KEDUA} onClick={onUlangi}>
              Dari Awal
            </button>
            {adaFoto && (
              <button type="button" className={TOMBOL_UTAMA} onClick={onKirimUlang}>
                Kirim Ulang
              </button>
            )}
          </>
        )
      }
    >
      {pesan}
    </KartuPesan>
  );
}
