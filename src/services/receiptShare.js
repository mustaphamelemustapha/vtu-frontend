function isBrowser() {
  return typeof window !== "undefined";
}

function formatAmount(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return String(value ?? "0.00");
  return num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildReceiptShareText({
  title = "Transaction Receipt",
  reference = "",
  status = "",
  amount = "",
  fields = [],
} = {}) {
  const lines = [
    `AxisVTU ${title}`,
    reference ? `Reference: ${reference}` : "",
    status ? `Status: ${status}` : "",
    amount !== "" ? `Amount: ₦ ${formatAmount(amount)}` : "",
    ...(Array.isArray(fields)
      ? fields.map((item) => {
          const label = String(item?.label || "").trim();
          const value = String(item?.value ?? "").trim();
          if (!label || !value) return "";
          return `${label}: ${value}`;
        })
      : []),
  ].filter(Boolean);
  return lines.join("\n");
}

export async function shareReceiptText({ title, text }) {
  if (!isBrowser()) return { ok: false, mode: "unavailable" };
  const payload = {
    title: String(title || "AxisVTU Receipt"),
    text: String(text || ""),
  };

  try {
    if (navigator.share) {
      await navigator.share(payload);
      return { ok: true, mode: "native" };
    }
  } catch {
    // Fall through to WhatsApp fallback.
  }

  try {
    const url = `https://wa.me/?text=${encodeURIComponent(payload.text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true, mode: "whatsapp" };
  } catch {
    return { ok: false, mode: "failed" };
  }
}

export function shareReceiptOnWhatsApp(text) {
  if (!isBrowser()) return false;
  try {
    const url = `https://wa.me/?text=${encodeURIComponent(String(text || ""))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}
