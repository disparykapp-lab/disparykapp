import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./toastKonteks";

/**
 * Toast dirender di dalam .sp-root (bukan portal ke body) karena token warna
 * paket dipasang di .sp-root. .sp-toast sudah position: fixed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; pesan: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const tampilkan = useCallback((pesan: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), pesan });
    timer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={tampilkan}>
      {children}
      <div role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="sp-toast sp-anim-slide-up">
            {toast.pesan}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
