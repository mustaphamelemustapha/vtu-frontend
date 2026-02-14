import { useToast } from "../context/toast.jsx";

export default function ToastHost() {
  const { toast, clear } = useToast();
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

