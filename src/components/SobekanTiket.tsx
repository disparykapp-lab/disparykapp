/** Garis sobekan tiket dengan lekukan kiri-kanan. Induknya harus ber-padding p-5 & overflow-hidden. */
export default function SobekanTiket({ className = "my-4" }: { className?: string }) {
  return (
    <div className={`relative -mx-5 border-t-2 border-dashed border-gray-100 ${className}`} aria-hidden="true">
      <span className="absolute -left-3 -top-[13px] h-6 w-6 rounded-full bg-brand-bg shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]" />
      <span className="absolute -right-3 -top-[13px] h-6 w-6 rounded-full bg-brand-bg shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]" />
    </div>
  );
}
