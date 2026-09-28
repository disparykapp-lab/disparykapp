import { usePresence } from "../contexts/PresenceContext";

/** Penunjuk jumlah seluruh pengguna (semua role) yang sedang online. */
export default function KartuOnline() {
  const { jumlahOnline } = usePresence();

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-gray-500">
        <strong className="text-brand-text">{jumlahOnline}</strong> pengguna online
      </span>
    </div>
  );
}
