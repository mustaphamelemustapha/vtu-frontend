const PROD_API_FALLBACK = "https://vtu-backend-8gsi.onrender.com/api/v1";

function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  return value.replace(/\/+$/, "");
}

function forceHttpsForSecurePage(value) {
  if (typeof window === "undefined") return value;
  if (window.location.protocol !== "https:") return value;
  if (String(value).startsWith("http://")) {
    return `https://${String(value).slice("http://".length)}`;
  }
  return value;
}

function resolveApiBase() {
  if (typeof window !== "undefined") {
    const host = String(window.location.hostname || "").toLowerCase();
    const isAxisDomain =
      host === "axisvtu.com" ||
      host === "www.axisvtu.com" ||
      host === "axisvtu.vercel.app" ||
      host === "vtu-frontend-beta.vercel.app";
    if (isAxisDomain) return "/api/v1";
  }

  const envBase = forceHttpsForSecurePage(normalizeApiBase(import.meta.env.VITE_API_BASE));
  if (envBase && !/[<>]/.test(envBase)) return envBase;

  return "http://localhost:8000/api/v1";
}

const API_BASE = resolveApiBase();
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);
const PURCHASE_API_TIMEOUT_MS = Number(import.meta.env.VITE_PURCHASE_API_TIMEOUT_MS || 40000);
const AUTH_PROFILE_RETRIES = Number(import.meta.env.VITE_AUTH_PROFILE_RETRIES || 2);
const RETRY_BASE_DELAY_MS = Number(import.meta.env.VITE_API_RETRY_BASE_DELAY_MS || 450);
const TOKEN_KEY = "vtu_access_token";
const SESSION_KEY = "vtu_access_token_session";
const REFRESH_KEY = "vtu_refresh_token";
const REFRESH_SESSION_KEY = "vtu_refresh_token_session";
const PROFILE_KEY = "vtu_profile";
const ACTIVE_PROFILE_KEY = "axisvtu_active_profile_v1";
const AUTH_EXPIRED = "AUTH_EXPIRED";
const DATA_PLANS_CACHE_KEY = "axisvtu_data_plans_cache_v3";
const DATA_WALLET_CACHE_KEY = "axisvtu_data_wallet_cache_v1";

let refreshInFlight = null;
let refreshInFlightEpoch = -1;
let authEpoch = 0;

function safeParseJson(raw, fallback = null) {
  try {
    const parsed = JSON.parse(raw || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function decodeJwtPayload(token) {
  try {
    const raw = String(token || "").split(".")[1];
    if (!raw) return {};
    const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4 || 4)) % 4), "=");
    const json = atob(normalized);
    return safeParseJson(json, {}) || {};
  } catch {
    return {};
  }
}

function tokenCacheScope(token) {
  const rawToken = String(token || "").trim();
  const payload = decodeJwtPayload(token);
  const sub = String(payload?.sub || payload?.user_id || payload?.id || "").trim();
  if (sub) return `uid:${sub}`;
  const email = String(payload?.email || "").trim().toLowerCase();
  if (email) return `mail:${email}`;
  if (rawToken) {
    const compact = rawToken.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
    if (compact) return `tok:${compact}`;
  }
  return "";
}

function profileCacheScope(profile) {
  const email = String(profile?.email || "").trim().toLowerCase();
  if (email) return email;
  const fullName = String(profile?.full_name || "").trim().toLowerCase();
  if (fullName) return fullName;
  return "";
}

export function getActiveAuthScope() {
  const fromToken = tokenCacheScope(getToken());
  if (fromToken) return fromToken;
  const fromStored = String(localStorage.getItem(ACTIVE_PROFILE_KEY) || "").trim();
  if (fromStored) return fromStored;
  const fromProfile = profileCacheScope(getProfile());
  if (fromProfile) return `profile:${fromProfile}`;
  return "guest";
}

function clearAccountScopedUiCache() {
  if (typeof localStorage === "undefined") return;
  const exactKeys = [
    DATA_PLANS_CACHE_KEY,
    "axisvtu_data_plans_cache_v2",
    "axisvtu_data_plans_cache_v1",
    "axisvtu_data_plans_cache_v3",
    DATA_WALLET_CACHE_KEY,
    "axisvtu_dashboard_cache_v1",
    "axisvtu_notif_items",
    "axisvtu_notif_snapshot",
    "axisvtu_profile_phone",
    "axisvtu_joined_label",
    "axisvtu_beneficiaries_v1",
    "vtu_last_recipient",
  ];
  const scopedPrefixes = [
    "axisvtu_data_plans_cache_v1:",
    "axisvtu_data_plans_cache_v2:",
    "axisvtu_data_plans_cache_v3:",
    "axisvtu_data_wallet_cache_v1:",
    "axisvtu_dashboard_cache_v1:",
    "axisvtu_notif_items:",
    "axisvtu_notif_snapshot:",
    "axisvtu_profile_phone:",
    "axisvtu_joined_label:",
    "axisvtu_beneficiaries_v1:",
    "vtu_last_recipient:",
  ];

  exactKeys.forEach((key) => localStorage.removeItem(key));
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (scopedPrefixes.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

function getBackendOrigin() {
  if (String(API_BASE).startsWith("/")) {
    try {
      return new URL(PROD_API_FALLBACK).origin;
    } catch {
      return "";
    }
  }
  try {
    const parsed = new URL(API_BASE);
    return parsed.origin;
  } catch {
    return String(API_BASE).replace(/\/api\/v1\/?$/, "");
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_SESSION_KEY);
}

export function setAuthTokens(accessToken, refreshToken, persist = true) {
  authEpoch += 1;
  if (persist) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(REFRESH_SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(REFRESH_SESSION_KEY, refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function setToken(token, persist = true) {
  setAuthTokens(token, getRefreshToken(), persist);
}

export function clearToken() {
  authEpoch += 1;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(REFRESH_SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  clearAccountScopedUiCache();
}

export function getAuthPersisted() {
  // true => tokens live in localStorage (remember me)
  // false => tokens live in sessionStorage
  return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(REFRESH_KEY);
}

export function setAuthPersisted(persist) {
  // Move existing tokens between storages without changing token values.
  const access = getToken();
  const refresh = getRefreshToken();
  if (!access) return;
  setAuthTokens(access, refresh || null, !!persist);
}

export function setProfile(profile) {
  const previousProfile = safeParseJson(localStorage.getItem(PROFILE_KEY), {});
  const previousScope = String(localStorage.getItem(ACTIVE_PROFILE_KEY) || "").trim() || profileCacheScope(previousProfile);
  const nextScope = tokenCacheScope(getToken()) || profileCacheScope(profile);
  if (previousScope && nextScope && previousScope !== nextScope) {
    clearAccountScopedUiCache();
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(ACTIVE_PROFILE_KEY, nextScope || "");
}

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function parseError(data) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item?.msg || item).join(", ");
  }
  if (data?.detail && typeof data.detail === "object") {
    const message = data.detail.message || data.detail.detail || data.message;
    const hint = data.detail.hint;
    return [message, hint].filter(Boolean).join(" ");
  }
  if (typeof data?.detail === "string") {
    return data.detail;
  }
  if (typeof data?.message === "string") {
    return data.message;
  }
  return "Request failed";
}

function makeError(message, code) {
  const error = new Error(message);
  if (code) error.code = code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJsonCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 12000));
  const next = { ...options, signal: controller.signal };
  return fetch(url, next).finally(() => clearTimeout(timer));
}

function isAuthProfilePath(path) {
  return path === "/auth/me" || path === "/auth/login" || path === "/auth/refresh";
}

function emitRetryEvent(path, attempt, maxAttempts, reason) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("api:retry", {
      detail: { path, attempt, maxAttempts, reason },
    })
  );
}

async function refreshAccessToken() {
  if (refreshInFlight && refreshInFlightEpoch === authEpoch) return refreshInFlight;
  if (refreshInFlight && refreshInFlightEpoch !== authEpoch) {
    refreshInFlight = null;
    refreshInFlightEpoch = -1;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw makeError("Session expired. Please log in again.", AUTH_EXPIRED);
  }
  const epochAtStart = authEpoch;

  const persist =
    !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(REFRESH_KEY);
  refreshInFlightEpoch = epochAtStart;

  refreshInFlight = (async () => {
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token || !data?.refresh_token) {
      throw makeError("Session expired. Please log in again.", AUTH_EXPIRED);
    }
    if (epochAtStart !== authEpoch || getRefreshToken() !== refreshToken) {
      const latestToken = getToken();
      if (latestToken) return latestToken;
      throw makeError("Session expired. Please log in again.", AUTH_EXPIRED);
    }
    setAuthTokens(data.access_token, data.refresh_token, persist);
    return data.access_token;
  })().finally(() => {
    if (refreshInFlightEpoch === epochAtStart) {
      refreshInFlight = null;
      refreshInFlightEpoch = -1;
    }
  });

  return refreshInFlight;
}

export async function apiFetch(path, options = {}) {
  const {
    _retry = false,
    _suppressRetryToast = false,
    timeoutMs,
    ...requestOptions
  } = options;
  const headers = { ...(requestOptions.headers || {}) };
  const method = String(requestOptions.method || "GET").toUpperCase();
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (!headers["Content-Type"] && requestOptions.body) headers["Content-Type"] = "application/json";

  const maxAttempts = isAuthProfilePath(path) ? Math.max(1, AUTH_PROFILE_RETRIES + 1) : 1;
  let attempt = 0;
  const refreshablePath = path !== "/auth/login" && path !== "/auth/refresh";
  const isPurchasePath =
    path === "/data/purchase" ||
    path.endsWith("/purchase") ||
    path.includes("/services/");
  const isRelativeApiBase = String(API_BASE).startsWith("/");
  const requestBase =
    isPurchasePath && isRelativeApiBase
      ? PROD_API_FALLBACK
      : API_BASE;
  const requestTimeoutMs = Number.isFinite(Number(timeoutMs))
    ? Number(timeoutMs)
    : (isPurchasePath ? Math.max(API_TIMEOUT_MS, PURCHASE_API_TIMEOUT_MS) : API_TIMEOUT_MS);
  const url = `${requestBase}${path}`;

  while (attempt < maxAttempts) {
    attempt += 1;
    let res;
    try {
      res = await fetchWithTimeout(url, { ...requestOptions, headers, cache: "no-store" }, requestTimeoutMs);
    } catch (err) {
      const timedOut = err?.name === "AbortError";
      const retryableNetworkError =
        timedOut || err?.name === "TypeError" || /NetworkError/i.test(String(err?.message || ""));
      if (retryableNetworkError && attempt < maxAttempts) {
        if (!_suppressRetryToast) {
          emitRetryEvent(path, attempt, maxAttempts, timedOut ? "timeout" : "network");
        }
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      if (timedOut) {
        throw makeError("Connection timed out. Please try again.");
      }
      if (err?.name === "TypeError") {
        throw makeError("Unable to reach server. Please check your network and try again.");
      }
      throw err;
    }

    if (res.status === 401 && refreshablePath && !_retry) {
      try {
        await refreshAccessToken();
        return apiFetch(path, { ...requestOptions, _retry: true, _suppressRetryToast: true });
      } catch (err) {
        clearToken();
        throw err;
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let message = parseError(data);
      if (message === "Request failed") {
        if (res.status >= 500) {
          message = "Server is temporarily unavailable. Please try again.";
        } else if (res.status === 404) {
          message = "Service endpoint not found. Please refresh and try again.";
        } else if (res.status === 429) {
          message = "Too many requests. Please wait a moment and retry.";
        } else if (res.status === 401) {
          message = "Session expired. Please log in again.";
        } else if (res.status === 400) {
          message = "Invalid request. Please check your details and try again.";
        }
      }
      const retryableStatus = res.status >= 500 || res.status === 429;
      if (retryableStatus && attempt < maxAttempts) {
        if (!_suppressRetryToast) {
          emitRetryEvent(path, attempt, maxAttempts, `http_${res.status}`);
        }
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      if (res.status === 401 && refreshablePath) {
        clearToken();
        throw makeError(message || "Session expired. Please log in again.", AUTH_EXPIRED);
      }
      throw makeError(message);
    }

    return data;
  }

  throw makeError("Service is busy. Please try again in a moment.");
}

export async function warmBackend(maxWaitMs = 9000) {
  const backendOrigin = getBackendOrigin();
  let hostname = "";
  try {
    hostname = new URL(backendOrigin).hostname;
  } catch {
    hostname = "";
  }

  // In local/mock test environments, pre-warm should not block auth flows.
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(String(hostname).toLowerCase())) {
    return true;
  }

  const deadline = Date.now() + Math.max(1000, Number(maxWaitMs) || 9000);
  const healthUrl = `${backendOrigin}/healthz`;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(healthUrl, { method: "GET" }, 3500);
      if (res.ok) return true;
    } catch {
      // Keep trying until deadline.
    }
    await sleep(Math.min(300 * attempt, 1000));
  }

  return false;
}

export async function prefetchDataPageCache() {
  // Warm Data page dependencies after auth so refresh/open feels instant.
  if (!getToken()) return;

  const [plans, wallet] = await Promise.allSettled([
    apiFetch("/data/plans", { _suppressRetryToast: true }),
    apiFetch("/wallet/me", { _suppressRetryToast: true }),
  ]);
  const scope = getActiveAuthScope();
  const plansKey = scope ? `${DATA_PLANS_CACHE_KEY}:${scope}` : DATA_PLANS_CACHE_KEY;
  const walletKey = scope ? `${DATA_WALLET_CACHE_KEY}:${scope}` : DATA_WALLET_CACHE_KEY;
  const plansV2Key = scope ? `axisvtu_data_plans_cache_v2:${scope}` : "axisvtu_data_plans_cache_v2";
  const plansV3Key = scope ? `axisvtu_data_plans_cache_v3:${scope}` : "axisvtu_data_plans_cache_v3";

  if (plans.status === "fulfilled" && Array.isArray(plans.value)) {
    const payload = {
      plans: plans.value,
      cached_at: Date.now(),
    };
    writeJsonCache(plansKey, payload);
    writeJsonCache(plansV2Key, payload);
    writeJsonCache(plansV3Key, payload);
  }
  if (wallet.status === "fulfilled" && wallet.value && typeof wallet.value === "object") {
    writeJsonCache(walletKey, wallet.value);
  }
}
