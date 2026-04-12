const FALLBACK_ORIGIN = "https://axisvtu.com";

function resolveOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

function normalizePath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function upsertMetaByName(name, content) {
  if (!name) return;
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("name", name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", String(content || ""));
}

function upsertMetaByProperty(property, content) {
  if (!property) return;
  let node = document.querySelector(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("property", property);
    document.head.appendChild(node);
  }
  node.setAttribute("content", String(content || ""));
}

function upsertCanonical(href) {
  let node = document.querySelector("link[rel='canonical']");
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function upsertMetaById(id, type, json) {
  if (!id || !type || !json) return;
  let node = document.querySelector(`script[data-seo-id="${id}"]`);
  if (!node) {
    node = document.createElement("script");
    node.setAttribute("type", type);
    node.setAttribute("data-seo-id", id);
    document.head.appendChild(node);
  }
  node.textContent = json;
}

export function applySeo({
  title,
  description,
  path = "/",
  noindex = false,
  keywords = "AxisVTU, VTU Nigeria, buy data, buy airtime, cable TV, electricity bill payment",
}) {
  if (typeof document === "undefined") return;

  const origin = resolveOrigin();
  const normalizedPath = normalizePath(path);
  const url = `${origin}${normalizedPath}`;
  const finalTitle = String(title || "AxisVTU");
  const finalDescription = String(description || "AxisVTU");
  const finalKeywords = String(keywords || "");
  const robotsValue = noindex ? "noindex, nofollow" : "index, follow";

  document.title = finalTitle;
  upsertMetaByName("description", finalDescription);
  upsertMetaByName("keywords", finalKeywords);
  upsertMetaByName("robots", robotsValue);
  upsertMetaByProperty("og:type", "website");
  upsertMetaByProperty("og:site_name", "AxisVTU");
  upsertMetaByProperty("og:title", finalTitle);
  upsertMetaByProperty("og:description", finalDescription);
  upsertMetaByProperty("og:url", url);
  upsertMetaByProperty("og:image", `${origin}/pwa/pwa-512-primary.png`);
  upsertMetaByName("twitter:card", "summary_large_image");
  upsertMetaByName("twitter:url", url);
  upsertMetaByName("twitter:title", finalTitle);
  upsertMetaByName("twitter:description", finalDescription);
  upsertMetaByName("twitter:image", `${origin}/pwa/pwa-512-primary.png`);
  upsertCanonical(url);
  upsertMetaById(
    "axisvtu-seo-webpage",
    "application/ld+json",
    JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: finalTitle,
        description: finalDescription,
        url,
        inLanguage: "en-NG",
      },
      null,
      0
    )
  );
}
