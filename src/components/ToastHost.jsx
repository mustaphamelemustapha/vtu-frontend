import { useEffect } from "react";
import { useToast } from "../context/toast.jsx";

export default function ToastHost() {
  const { toast, clear, showToast } = useToast();

  useEffect(() => {
    const onRetry = (event) => {
      const detail = event?.detail || {};
      const attempt = Number(detail.attempt || 1);
      const maxAttempts = Number(detail.maxAttempts || 1);
      if (attempt >= maxAttempts) return;
      showToast(`Service busy, retrying (${attempt + 1}/${maxAttempts})...`, "info");
    };
    window.addEventListener("api:retry", onRetry);
    return () => window.removeEventListener("api:retry", onRetry);
  }, [showToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
      onClick={clear}
    >
      {toast.message}
    </div>
  );
}
