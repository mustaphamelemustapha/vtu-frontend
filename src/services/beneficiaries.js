const STORAGE_KEY = "axisvtu_beneficiaries_v1";
const MAX_PER_SERVICE = 10;

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStore() {
  if (!isBrowser()) return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store || {}));
  } catch {
    // Ignore storage quota/private mode failures.
  }
}

function sanitizeText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function hashString(value) {
  const str = String(value || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function normalizeService(serviceType) {
  return sanitizeText(serviceType, 32).toLowerCase();
}

function normalizeFields(fields) {
  const next = {};
  if (!fields || typeof fields !== "object") return next;
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      next[key] = null;
      return;
    }
    if (typeof value === "boolean") {
      next[key] = value;
      return;
    }
    next[key] = sanitizeText(value, 120);
  });
  return next;
}

function normalizeList(serviceType, items) {
  const service = normalizeService(serviceType);
  const list = Array.isArray(items) ? items : [];
  return list
    .map((raw) => {
      const fields = normalizeFields(raw?.fields);
      const fingerprint = sanitizeText(raw?.fingerprint || stableStringify(fields), 500);
      if (!fingerprint) return null;
      const id = sanitizeText(raw?.id || `${service}_${hashString(fingerprint)}`, 80);
      if (!id) return null;
      const now = new Date().toISOString();
      return {
        id,
        service,
        label: sanitizeText(raw?.label || "Saved Beneficiary", 80),
        subtitle: sanitizeText(raw?.subtitle || "", 120),
        fields,
        fingerprint,
        created_at: sanitizeText(raw?.created_at || now, 40),
        last_used_at: sanitizeText(raw?.last_used_at || now, 40),
        usage_count: Number(raw?.usage_count || 0) > 0 ? Number(raw.usage_count) : 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.last_used_at).localeCompare(String(a.last_used_at)))
    .slice(0, MAX_PER_SERVICE);
}

export function loadBeneficiaries(serviceType) {
  const service = normalizeService(serviceType);
  if (!service) return [];
  const store = readStore();
  const list = normalizeList(service, store[service]);
  store[service] = list;
  writeStore(store);
  return list;
}

export function saveBeneficiary(serviceType, payload) {
  const service = normalizeService(serviceType);
  if (!service) return [];
  const store = readStore();
  const list = normalizeList(service, store[service]);

  const fields = normalizeFields(payload?.fields);
  const fingerprint = stableStringify(fields);
  if (!fingerprint || fingerprint === "{}") return list;

  const now = new Date().toISOString();
  const label = sanitizeText(payload?.label || "Saved Beneficiary", 80);
  const subtitle = sanitizeText(payload?.subtitle || "", 120);
  const foundIndex = list.findIndex((item) => item.fingerprint === fingerprint);

  if (foundIndex >= 0) {
    const found = list[foundIndex];
    list[foundIndex] = {
      ...found,
      label: label || found.label,
      subtitle: subtitle || found.subtitle,
      fields,
      last_used_at: now,
      usage_count: Number(found.usage_count || 0) + 1,
    };
  } else {
    list.unshift({
      id: `${service}_${hashString(fingerprint)}`,
      service,
      label,
      subtitle,
      fields,
      fingerprint,
      created_at: now,
      last_used_at: now,
      usage_count: 1,
    });
  }

  const normalized = normalizeList(service, list);
  store[service] = normalized;
  writeStore(store);
  return normalized;
}

export function removeBeneficiary(serviceType, id) {
  const service = normalizeService(serviceType);
  const targetId = sanitizeText(id, 80);
  if (!service || !targetId) return loadBeneficiaries(serviceType);
  const store = readStore();
  const list = normalizeList(service, store[service]).filter((item) => item.id !== targetId);
  store[service] = list;
  writeStore(store);
  return list;
}
