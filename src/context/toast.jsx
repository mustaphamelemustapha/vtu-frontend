import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToast({ id, message, type });
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(() => ({ toast, showToast, clear: () => setToast(null) }), [toast, showToast]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast: null, showToast: () => {}, clear: () => {} };
  }
  return ctx;
}

