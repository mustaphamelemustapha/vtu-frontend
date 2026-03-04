function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIOSLike() {
  if (!isBrowser()) return false;
  const ua = window.navigator.userAgent || "";
  const touchMac = ua.includes("Macintosh") && "ontouchend" in document;
  return /iPad|iPhone|iPod/i.test(ua) || touchMac;
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

function saveBlobWithFallback(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (isIOSLike()) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function savePdf(pdf, fileName) {
  try {
    pdf.save(fileName);
    return true;
  } catch {
    // Fall through to blob fallback.
  }
  try {
    const blob = pdf.output("blob");
    if (!blob) return false;
    saveBlobWithFallback(blob, fileName);
    return true;
  } catch {
    return false;
  }
}

export async function downloadReceiptPdf({
  sourceNode,
  fileName,
  backgroundColor = "#f4f7fb",
  scale = 2,
} = {}) {
  if (!isBrowser() || !sourceNode || !fileName) {
    throw new Error("receipt_download_unavailable");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

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
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const renderWidth = canvas.width * ratio;
    const renderHeight = canvas.height * ratio;
    const x = (pageWidth - renderWidth) / 2;
    const y = margin;
    pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");

    if (!savePdf(pdf, fileName)) {
      throw new Error("receipt_pdf_save_failed");
    }
  } finally {
    mount.remove();
  }
}
