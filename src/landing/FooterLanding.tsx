import { IkonSosial } from "./ikon";
import type { IsiFooter } from "./types";

export default function FooterLanding({ isi, navbarLogo, onInfo }: { isi: IsiFooter; navbarLogo: string; onInfo: (p: string) => void }) {
  const tahun = new Date().getFullYear();
  const sosialAktif = isi.sosial.filter((s) => s.url.trim());

  return (
    <footer className="bg-white pb-8 pt-14">
      <div className="container-lnd">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-lnd-serif text-[22px] font-bold text-lnd-navy">{navbarLogo}</p>
            <p className="mt-2 max-w-[220px] text-[14px] text-lnd-muted">{isi.tagline}</p>
          </div>

          {isi.kolom.map((k) => (
            <div key={k.judul}>
              <h3 className="text-[14px] font-semibold text-lnd-navy">{k.judul}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {k.tautan.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => onInfo("Segera hadir")} className="text-left text-[14px] text-lnd-muted transition-colors hover:text-lnd-blue">
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {sosialAktif.length > 0 && (
            <div>
              <h3 className="text-[14px] font-semibold text-lnd-navy">Ikuti Kami</h3>
              <ul className="mt-3 flex gap-2">
                {sosialAktif.map((s) => (
                  <li key={s.nama}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.nama}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-lnd-line text-lnd-navy transition hover:border-lnd-blue hover:text-lnd-blue"
                    >
                      <IkonSosial nama={s.nama} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-lnd-line pt-6 text-[13px] text-lnd-muted md:flex-row md:items-center md:justify-between">
          <p>© {tahun} {isi.hak}</p>
          <div className="flex gap-5">
            {["Kebijakan Privasi", "Syarat Layanan", "Preferensi Cookie"].map((t) => (
              <button key={t} type="button" onClick={() => onInfo("Segera hadir")} className="transition-colors hover:text-lnd-blue">
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
