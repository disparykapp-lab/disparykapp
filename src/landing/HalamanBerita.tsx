import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./landing.css";
import FooterLanding from "./FooterLanding";
import DetailArtikel, { type ItemLainArtikel } from "./DetailArtikel";
import { useLenis } from "./efek";
import { tutupTransisi } from "./transisi";
import { useKontenLanding } from "./pratinjau";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Pecah isi lengkap jadi paragraf (baris kosong = pemisah). Kosong = satu paragraf dari ringkasan. */
function pecahParagraf(isiLengkap: string | undefined, ringkasan: string): string[] {
  const teks = isiLengkap?.trim();
  if (!teks) return [ringkasan];
  return teks
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Halaman detail berita (`/berita/:id`). Dibuka dari kartu di landing dengan transisi foto mengembang. */
export default function HalamanBerita() {
  const { id = "" } = useParams();
  const { session, profile } = useAuth();
  const { konten, siap } = useKontenLanding();
  const [toast, setToast] = useState<string | null>(null);

  useLenis();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const semua = konten.berita.isi.items;
  const item = semua.find((b) => b.id === id);

  useEffect(() => {
    if (siap && !item) tutupTransisi();
  }, [siap, item]);

  if (!item) {
    if (!siap) return <div className="min-h-screen bg-white" />;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="eyebrow">Berita</p>
        <h1 className="judul-section">Berita tidak ditemukan</h1>
        <Link to="/" className="link-lnd">
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke beranda
        </Link>
      </div>
    );
  }

  const lainnya: ItemLainArtikel[] = semua
    .filter((b) => b.id !== item.id)
    .map((b): ItemLainArtikel => ({ id: b.id, judul: b.judul, sub: formatTanggal(b.tanggal), foto: b.foto }));

  return (
    <div className="min-h-screen bg-white text-lnd-ink">
      <DetailArtikel
        key={item.id}
        id={item.id}
        eyebrow="Berita"
        judul={item.judul}
        foto={item.foto}
        infoBaris={[{ ikon: <CalendarDays size={14} aria-hidden="true" />, teks: formatTanggal(item.tanggal) }]}
        paragraf={pecahParagraf(item.isiLengkap, item.ringkasan)}
        sumberLabel="Baca sumber asli"
        sumberUrl={item.tautan || undefined}
        logo={konten.navbar.isi.logo}
        kembaliGulir="berita"
        lainnyaJudul="Berita Lainnya"
        lainnyaPath="/berita"
        lainnya={lainnya}
      />
      {konten.footer.tampil && (
        <FooterLanding isi={konten.footer.isi} navbarLogo={konten.navbar.isi.logo} onInfo={setToast} />
      )}
      {session && profile && (
        <Link
          to="/beranda"
          className="fixed bottom-6 right-6 z-[60] rounded-full bg-lnd-merah px-5 py-2.5 text-[14px] font-semibold text-white shadow-lnd-hover"
        >
          Ke Aplikasi
        </Link>
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-lnd-navy px-5 py-2.5 text-[14px] font-medium text-white shadow-lnd-hover"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
