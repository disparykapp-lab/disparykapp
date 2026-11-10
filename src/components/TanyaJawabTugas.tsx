import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { formatWaktu, kirimTanya, type TanyaTugas } from "../lib/tugas";

/**
 * Percakapan tanya-jawab satu tugas antara satu pegawai dan admin (migrasi 0041).
 * Pesannya dari induk (useTanyaLangsung), yang menerima pesan baru lewat websocket
 * (0042) — jadi balasan muncul tanpa memuat ulang halaman.
 */
export default function TanyaJawabTugas({
  tugasId,
  pemilik,
  saya,
  namaPengirim,
  pesan,
  tersambung,
  galatMuat,
  onTerkirim,
}: {
  tugasId: string;
  /** pegawai pemilik percakapan */
  pemilik: string;
  saya: string;
  namaPengirim: (id: string | null) => string;
  pesan: TanyaTugas[];
  /** websocket tersambung: pesan baru masuk otomatis */
  tersambung: boolean;
  galatMuat?: string | null;
  /** pesan yang baru terkirim, supaya langsung tampil tanpa menunggu websocket */
  onTerkirim: (m: TanyaTugas) => void;
}) {
  const [isi, setIsi] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const daftar = useRef<HTMLUListElement>(null);
  const terakhir = pesan.length > 0 ? pesan[pesan.length - 1].id : null;

  // pesan baru (dari siapa pun) → gulir ke paling bawah
  useEffect(() => {
    const el = daftar.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [terakhir]);

  async function kirim() {
    if (!isi.trim() || mengirim) return;
    setMengirim(true);
    setGalat(null);
    try {
      onTerkirim(await kirimTanya(tugasId, pemilik, isi));
      setIsi("");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pesan gagal dikirim.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {pesan.length === 0 ? (
        <p className="text-xs text-gray-400">{pemilik === saya ? "Belum ada pertanyaan. Tanyakan hal yang kurang jelas ke admin di sini." : "Belum ada percakapan."}</p>
      ) : (
        <ul ref={daftar} aria-live="polite" className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {pesan.map((m) => {
            const milikSaya = m.pengirim_id === saya;
            return (
              <li key={m.id} className={`flex flex-col ${milikSaya ? "items-end" : "items-start"}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3 py-2 text-sm ${
                    milikSaya ? "rounded-br-sm bg-brand-masuk text-white" : "rounded-bl-sm bg-gray-100 text-brand-text"
                  }`}
                >
                  {m.isi}
                </span>
                <span className="mt-0.5 text-[10px] text-gray-400">
                  {milikSaya ? "Kamu" : namaPengirim(m.pengirim_id)} · {formatWaktu(m.dibuat_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          rows={1}
          maxLength={1000}
          placeholder={pemilik === saya ? "Tulis pertanyaan…" : "Tulis jawaban…"}
          aria-label={pemilik === saya ? "Pertanyaan untuk admin" : "Jawaban untuk pegawai"}
          className="min-h-[44px] min-w-0 flex-1 resize-y rounded-lg border border-gray-300 p-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void kirim()}
          disabled={mengirim || !isi.trim()}
          aria-label="Kirim"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-masuk text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {tersambung && (
        <p className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
          Langsung — pesan baru muncul otomatis
        </p>
      )}
      {(galat || galatMuat) && <p className="text-xs text-red-600">{galat ?? galatMuat}</p>}
    </div>
  );
}
