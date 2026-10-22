import { useEffect } from "react";
import { dengarSuara, suaraNyala } from "./suara";

const VOLUME = 0.3; // pelan, supaya efek suara (benar/hampir) tetap terdengar jelas

/**
 * Musik latar selama berada di halaman game (lobi sampai podium), berulang terus.
 * Browser memblokir audio bersuara sebelum ada interaksi pengguna, jadi kalau
 * percobaan pertama ditolak, musik dimulai pada ketukan/tombol berikutnya.
 * Ikut tombol speaker game, berhenti saat tab disembunyikan atau keluar dari game.
 */
export function useMusikLatar(src: string) {
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";

    const putar = () => {
      if (!suaraNyala() || document.hidden) return;
      audio.play().then(lepasGestur, pasangGestur);
    };
    const onGestur = () => putar();
    function pasangGestur() {
      document.addEventListener("pointerdown", onGestur);
      document.addEventListener("keydown", onGestur);
    }
    function lepasGestur() {
      document.removeEventListener("pointerdown", onGestur);
      document.removeEventListener("keydown", onGestur);
    }
    const onTampil = () => (document.hidden ? audio.pause() : putar());
    const berhentiDengar = dengarSuara((nyala) => (nyala ? putar() : audio.pause()));

    document.addEventListener("visibilitychange", onTampil);
    putar();

    return () => {
      berhentiDengar();
      lepasGestur();
      document.removeEventListener("visibilitychange", onTampil);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [src]);
}
