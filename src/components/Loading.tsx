export default function Loading({ teks = "Memuat..." }: { teks?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-brand-text/70">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-masuk/30 border-t-brand-masuk" />
      <p className="text-base">{teks}</p>
    </div>
  );
}
