import { createContext, useContext } from "react";

export const ToastContext = createContext<(pesan: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}
