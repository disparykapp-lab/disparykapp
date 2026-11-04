import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { namaPendek } from "../../game/logika";
import { buatPilihanTod, putarTod, todCadangan, type TruthOrDare as DataTod } from "../api";
import { avatar } from "../aset";
import { sfx } from "../audio";
import { JURING_RODA, arahRoda, arahRodaTod, jenisJuring, putarRoda, todTerkini } from "../logika";
import { kurangiGerak } from "../preferensi";
import type { StatePenyusupRoom } from "../usePenyusupRoom";

const LAMA_PUTAR = 3000;
/** jeda setelah roda nama berhenti, sebelum roda Truth/Dare berputar */
const JEDA_NAMA = 900;
const LABEL = { truth: "TRUTH", dare: "DARE" } as const;
const WARNA_NAMA = Array.from({ length: 8 }, (_, i) => `var(--divisi-${i + 1})`);
const SEGMEN_TOD = Array.from({ length: JURING_RODA }, (_, i) => ({
  label: LABEL[jenisJuring(i)],
  warna: jenisJuring(i) === "truth" ? "var(--teal-500)" : "var(--orange-500)",
}));

type Tahap = "nama" | "jenis" | "hasil";

/**
 * Hukuman untuk yang kalah di layar akhir — tampilannya sama persis di layar
 * semua pemain. Kalau yang kalah lebih dari satu, roda nama memilih korban
 * dulu; lalu roda TRUTH/DARE; lalu AI (Edge Function penyusup-tod) memberi 3
 * pilihan. Semua keputusan acak dibuat server; "Putar Lagi" boleh berkali-kali.
 */
export default function TruthOrDare({ s }: { s: StatePenyusupRoom }) {
  const room = s.room!;
  const roomId = room.id;
  const gameKe = room.game_ke;
  const [lokal, setLokal] = useState<DataTod | null>(null);
  const [gagal, setGagal] = useState(false);
  const [menekan, setMenekan] = useState(false);
  const [tampil, setTampil] = useState<{ kunci: string; tahap: Tahap } | null>(null);
  const [sudutNama, setSudutNama] = useState(0);
  const [sudutJenis, setSudutJenis] = useState(0);
  const [durasi, setDurasi] = useState(LAMA_PUTAR);
  const sudut = useRef({ nama: 0, jenis: 0 });
  const diputar = useRef<string | null>(null);
  const dimintakan = useRef(new Set<string>());
  const sekarang = useRef(s.sekarang);
  useEffect(() => {
    sekarang.current = s.sekarang;
  });

  const tod = todTerkini(gameKe, room.tod, lokal);
  const ke = tod?.ke ?? 0;
  const kunci = `${gameKe}:${ke}`;
  const status = tod?.status;
  const jenis = tod?.jenis;
  const korbanId = tod?.korban_id;
  const calon = tod?.calon ?? [];
  const kunciCalon = calon.join(",");
  const dibuatAt = tod?.dibuat_at;

  // Putaran pertama dibuat otomatis begitu layar akhir terbuka.
  useEffect(() => {
    let batal = false;
    putarTod(roomId).then(
      (x) => !batal && setLokal(x),
      () => !batal && setGagal(true) // mis. migrasi 0037 belum dijalankan
    );
    return () => {
      batal = true;
    };
  }, [roomId, gameKe]);

  // Putaran yang belum punya pilihan: minta ke AI. Semua layar ikut meminta (jeda acak)
  // supaya tetap jalan walau yang menekan Putar Lagi menutup aplikasi; server memastikan
  // OpenAI cuma dipanggil sekali per putaran.
  useEffect(() => {
    if (status !== "menunggu_ai") return;
    const t = window.setTimeout(() => {
      if (dimintakan.current.has(kunci)) return;
      dimintakan.current.add(kunci);
      buatPilihanTod(roomId)
        .then((x) => x && setLokal(x))
        .catch(() => {}); // Edge Function belum di-deploy / gagal — cadangan menyusul
    }, 300 + Math.random() * 900);
    return () => window.clearTimeout(t);
  }, [roomId, kunci, status]);

  // Selama belum siap, minta pilihan cadangan berkala; server yang memutuskan
  // sudah waktunya (12 dtk tanpa AI, atau AI macet 40 dtk) atau belum.
  useEffect(() => {
    if (!status || status === "siap" || status === "tidak_ada") return;
    const iv = window.setInterval(() => {
      todCadangan(roomId)
        .then((x) => x && setLokal(x))
        .catch(() => {});
    }, 15_000);
    return () => window.clearInterval(iv);
  }, [roomId, kunci, status]);

  // Animasi tiap putaran: roda nama (kalau yang kalah > 1) → roda TRUTH/DARE → hasil.
  // Dilewati kalau "kurangi gerakan" aktif atau putarannya sudah lama (muat ulang).
  useEffect(() => {
    if (!korbanId || !jenis) return;
    const daftar = kunciCalon ? kunciCalon.split(",") : [];
    const pakaiNama = daftar.length > 1;
    const timer: number[] = [];
    const nanti = (ms: number, f: () => void) => timer.push(window.setTimeout(f, ms));
    const keNama = () => {
      const i = Math.max(0, daftar.indexOf(korbanId));
      sudut.current.nama = putarRoda(sudut.current.nama, arahRoda(i, daftar.length, Math.random()));
      setSudutNama(sudut.current.nama);
    };
    const keJenis = () => {
      sudut.current.jenis = putarRoda(sudut.current.jenis, arahRodaTod(jenis, Math.random()));
      setSudutJenis(sudut.current.jenis);
    };

    nanti(60, () => {
      const lama = !dibuatAt || sekarang.current() - Date.parse(dibuatAt) > 20_000;
      if (diputar.current === kunci || kurangiGerak() || lama) {
        // tanpa animasi (atau efek dijalankan ulang di tengah animasi): langsung ke hasil
        diputar.current = kunci;
        setDurasi(0);
        if (pakaiNama) keNama();
        keJenis();
        setTampil({ kunci, tahap: "hasil" });
        return;
      }
      diputar.current = kunci;
      setDurasi(LAMA_PUTAR);
      const mulaiJenis = () => {
        setTampil({ kunci, tahap: "jenis" });
        nanti(60, () => {
          keJenis();
          sfx("sfx_hitung_mundur");
        });
        nanti(60 + LAMA_PUTAR, () => {
          setTampil({ kunci, tahap: "hasil" });
          sfx("sfx_vote_stempel");
        });
      };
      if (!pakaiNama) {
        mulaiJenis();
        return;
      }
      setTampil({ kunci, tahap: "nama" });
      keNama();
      sfx("sfx_hitung_mundur");
      nanti(LAMA_PUTAR, () => sfx("sfx_pop"));
      nanti(LAMA_PUTAR + JEDA_NAMA, mulaiJenis);
    });
    return () => timer.forEach((t) => window.clearTimeout(t));
  }, [kunci, korbanId, jenis, kunciCalon, dibuatAt]);

  if (gagal || status === "tidak_ada") return null;

  const tahap: Tahap = tampil?.kunci === kunci ? tampil.tahap : calon.length > 1 ? "nama" : "jenis";
  const nama = namaPendek(s.namaPemain(korbanId ?? null));
  const korban = korbanId ? s.pemain.find((p) => p.user_id === korbanId) : undefined;
  const pertanyaan = status === "siap" ? tod?.pertanyaan ?? [] : [];
  const riwayat = tod?.riwayat ?? [];
  const sudahKena = new Set([...riwayat.map((r) => r.korban_id), korbanId]);
  const belumKena = calon.filter((id) => !sudahKena.has(id));
  const siapPutarLagi = status === "siap" && tahap === "hasil" && !menekan;

  async function putarLagi() {
    sfx("sfx_klik");
    setMenekan(true);
    try {
      const x = await putarTod(roomId, ke);
      if (x) setLokal(x);
    } catch {
      sfx("sfx_error");
    } finally {
      setMenekan(false);
    }
  }

  const segmenNama = calon.map((id, i) => ({
    label: namaPendek(s.namaPemain(id)),
    // juring terakhir jangan sewarna dengan juring pertama yang bersebelahan
    warna: WARNA_NAMA[calon.length % 8 === 1 && i === calon.length - 1 ? 2 : i % 8],
  }));

  return (
    <section className={`sp-panel sp-tod ${jenis ? `sp-tod--${jenis}` : ""} sp-anim-slide-up`} aria-live="polite">
      <p className="sp-panel__title sp-tod__judul">
        Hukuman buat yang kalah{ke > 1 ? ` · Putaran ${ke}` : ""}
      </p>

      {tahap === "nama" ? (
        <Roda key="nama" segmen={segmenNama} sudut={sudutNama} durasi={durasi} pusat={<span aria-hidden="true">?</span>} />
      ) : (
        <Roda
          key="jenis"
          segmen={SEGMEN_TOD}
          sudut={sudutJenis}
          durasi={durasi}
          pusat={korban ? <img src={avatar(korban.avatar)} alt="" /> : <span aria-hidden="true">?</span>}
        />
      )}

      {!korbanId && <p className="sp-tod__info">Menyiapkan hukuman…</p>}
      {korbanId && tahap === "nama" && <p className="sp-tod__info">Memilih siapa yang kena dari {calon.length} pemain yang kalah…</p>}
      {korbanId && tahap === "jenis" && <p className="sp-tod__hasil sp-anim-pop-in">{nama}… Truth atau Dare?</p>}
      {tahap === "hasil" && jenis && (
        <>
          <p className="sp-tod__hasil sp-anim-pop-in">
            {nama} kena <b>{LABEL[jenis]}</b>!
          </p>
          <p className="sp-tod__info">
            {jenis === "truth"
              ? `${nama}, pilih satu pertanyaan dan jawab jujur.`
              : `${nama}, pilih satu tantangan dan lakukan sekarang.`}
          </p>
          {pertanyaan.length === 0 ? (
            <p className="sp-tod__memuat">AI lagi nyiapin 3 pilihan</p>
          ) : (
            <ol className="sp-tod__pilihan sp-anim-stagger">
              {pertanyaan.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          )}
          {tod?.sumber === "cadangan" && <p className="sp-status-kecil">Pilihan cadangan — AI sedang tidak tersedia.</p>}
        </>
      )}

      {riwayat.length > 0 && (
        <div className="sp-tod__riwayat">
          <small>Sudah kena</small>
          <ul>
            {riwayat.map((r) => (
              <li key={r.ke} className={`sp-tod__chip sp-tod__chip--${r.jenis}`}>
                {namaPendek(s.namaPemain(r.korban_id))} · {LABEL[r.jenis]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {calon.length > 1 && tahap === "hasil" && (
        <p className="sp-tod__info">
          {belumKena.length > 0
            ? `Belum kebagian: ${belumKena.map((id) => namaPendek(s.namaPemain(id))).join(", ")}`
            : "Semua yang kalah sudah kebagian — putar lagi untuk ronde berikutnya!"}
        </p>
      )}

      <button
        type="button"
        className="sp-btn sp-btn--teal sp-btn--block sp-tod__putar"
        disabled={!siapPutarLagi}
        onClick={() => void putarLagi()}
      >
        {status !== "siap" && tahap === "hasil" ? "Menunggu pilihan AI…" : menekan ? "Memutar…" : "🎡 Putar Lagi"}
      </button>
    </section>
  );
}

function Roda({ segmen, sudut, durasi, pusat }: { segmen: { label: string; warna: string }[]; sudut: number; durasi: number; pusat: ReactNode }) {
  const lebar = 360 / Math.max(segmen.length, 1);
  const latar = `conic-gradient(${segmen.map((x, i) => `${x.warna} ${i * lebar}deg ${(i + 1) * lebar}deg`).join(", ")})`;
  return (
    <div className="sp-tod__roda-wrap">
      <div className="sp-tod__jarum" aria-hidden="true" />
      <div
        className="sp-tod__roda"
        style={{ background: latar, transform: `rotate(${sudut}deg)`, transitionDuration: `${durasi}ms` }}
        aria-hidden="true"
      >
        {segmen.map((x, i) => (
          <span key={i} className="sp-tod__label" style={{ "--sudut": `${i * lebar + lebar / 2}deg` } as CSSProperties}>
            {x.label}
          </span>
        ))}
      </div>
      <div className="sp-tod__pusat">{pusat}</div>
    </div>
  );
}
