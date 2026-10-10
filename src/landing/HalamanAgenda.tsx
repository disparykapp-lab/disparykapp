import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Route, Tag } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./landing.css";
import FooterLanding from "./FooterLanding";
import DetailArtikel, { type ItemLainArtikel } from "./DetailArtikel";
import { useLenis } from "./efek";
import { tutupTransisi } from "./transisi";
import { useKontenLanding } from "./pratinjau";

/** Pecah isi lengkap jadi paragraf (baris kosong = pemisah). Kosong = satu paragraf dari deskripsi singkat. */
function pecahParagraf(isiLengkap: string | undefined, deskripsi: string): string[] {
  const teks = isiLengkap?.trim();
  if (!teks) return [deskripsi];
  return teks
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Halaman detail agenda (`/agenda/:id`). Dibuka dari kartu di landing dengan transisi foto mengembang. */
export default function HalamanAgenda() {
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

  const semua = konten.paket.isi.items;
  const item = semua.find((p) => p.id === id);

  useEffect(() => {
    if (siap && !item) tutupTransisi();
  }, [siap, item]);

  if (!item) {
    if (!siap) return <div className="min-h-screen bg-white" />;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="eyebrow">Agenda</p>
        <h1 className="judul-section">Agenda tidak ditemukan</h1>
        <Link to="/" className="link-lnd">
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke beranda
        </Link>
      </div>
    );
  }

  const lainnya: ItemLainArtikel[] = semua
    .filter((p) => p.id !== item.id)
    .map((p): ItemLainArtikel => ({ id: p.id, judul: p.judul, sub: p.negara, foto: p.foto }));

  return (
    <div className="min-h-screen bg-white text-lnd-ink">
      <DetailArtikel
        key={item.id}
        id={item.id}
        eyebrow="Agenda"
        judul={item.judul}
        foto={item.foto}
        infoBaris={[
          { ikon: <MapPin size={14} aria-hidden="true" />, teks: item.negara },
          { ikon: <Route size={14} aria-hidden="true" />, teks: `${item.durasi} hari` },
          { ikon: <Tag size={14} aria-hidden="true" />, teks: item.harga },
        ]}
        paragraf={pecahParagraf(item.isiLengkap, item.deskripsi)}
        logo={konten.navbar.isi.logo}
        kembaliGulir="agenda"
        lainnyaJudul="Agenda Lainnya"
        lainnyaPath="/agenda"
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
