function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForImages(root, timeoutMs = 3000) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return;
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      await Promise.race([
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
        wait(timeoutMs),
      ]);
    })
  );
}

function mountCaptureClone(sourceNode) {
  const clone = sourceNode.cloneNode(true);
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "0";
  mount.style.top = "0";
  mount.style.transform = "translate(-300vw, -300vh)";
  mount.style.pointerEvents = "none";
  mount.style.opacity = "1";
  mount.style.zIndex = "-1";
  mount.style.width = `${Math.max(sourceNode.offsetWidth || 430, 430)}px`;
  mount.appendChild(clone);
  document.body.appendChild(mount);
  return { clone, mount };
}

function blobToFile(blob, fileName) {
  try {
    return new File([blob], fileName, { type: "image/png" });
  } catch {
    return blob;
  }
}

function openWhatsAppWithText(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(String(text || ""))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
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

export async function shareReceiptCapture({
  sourceNode,
  title = "AxisVTU Receipt",
  text = "",
  fileName = `axisvtu-receipt-${Date.now()}.png`,
  backgroundColor = "#f4f7fb",
  scale = 2,
} = {}) {
  if (!isBrowser() || !sourceNode) return { ok: false, mode: "unavailable" };

  try {
    const { default: html2canvas } = await import("html2canvas");
    const { clone, mount } = mountCaptureClone(sourceNode);
    try {
      await waitForImages(clone);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const canvas = await html2canvas(clone, {
        scale,
        backgroundColor,
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        windowWidth: clone.scrollWidth || clone.offsetWidth || 430,
        windowHeight: clone.scrollHeight || clone.offsetHeight || 700,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return { ok: false, mode: "capture_failed" };
      const file = blobToFile(blob, fileName);

      if (navigator.share) {
        try {
          const canFileShare =
            typeof navigator.canShare === "function"
              ? navigator.canShare({ files: [file] })
              : true;
          if (canFileShare) {
            await navigator.share({
              title: String(title || "AxisVTU Receipt"),
              text: String(text || ""),
              files: [file],
            });
            return { ok: true, mode: "native_file" };
          }
        } catch {
          // Fall through to download fallback.
        }
      }

      downloadBlob(blob, fileName);
      return { ok: true, mode: "download_fallback" };
    } finally {
      mount.remove();
    }
  } catch {
    return { ok: false, mode: "failed" };
  }
}

export async function shareReceiptCaptureOnWhatsApp({
  sourceNode,
  title = "AxisVTU Receipt",
  text = "",
  fileName = `axisvtu-receipt-${Date.now()}.png`,
  backgroundColor = "#f4f7fb",
  scale = 2,
} = {}) {
  const result = await shareReceiptCapture({
    sourceNode,
    title,
    text,
    fileName,
    backgroundColor,
    scale,
  });

  if (!result.ok) return result;
  if (result.mode === "native_file") return result;

  try {
    openWhatsAppWithText(
      `${text}\n\nReceipt image was downloaded to your device. Attach it in WhatsApp.`
    );
    return { ok: true, mode: "whatsapp_text_with_image_download" };
  } catch {
    return result;
  }
}
