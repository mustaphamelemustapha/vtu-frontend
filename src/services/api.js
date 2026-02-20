const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);
const AUTH_PROFILE_RETRIES = Number(import.meta.env.VITE_AUTH_PROFILE_RETRIES || 2);
const RETRY_BASE_DELAY_MS = Number(import.meta.env.VITE_API_RETRY_BASE_DELAY_MS || 450);
const TOKEN_KEY = "vtu_access_token";
const SESSION_KEY = "vtu_access_token_session";
const REFRESH_KEY = "vtu_refresh_token";
const REFRESH_SESSION_KEY = "vtu_refresh_token_session";
const PROFILE_KEY = "vtu_profile";
const AUTH_EXPIRED = "AUTH_EXPIRED";

let refreshInFlight = null;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_SESSION_KEY);
}

export function setAuthTokens(accessToken, refreshToken, persist = true) {
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(REFRESH_SESSION_KEY);
  localStorage.removeItem(PROFILE_KEY);
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
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw makeError("Session expired. Please log in again.", AUTH_EXPIRED);
  }

  const persist =
    !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(REFRESH_KEY);

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
    setAuthTokens(data.access_token, data.refresh_token, persist);
    return data.access_token;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiFetch(path, options = {}) {
  const {
    _retry = false,
    _suppressRetryToast = false,
    ...requestOptions
  } = options;
  const headers = { ...(requestOptions.headers || {}) };
  const method = String(requestOptions.method || "GET").toUpperCase();
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (!headers["Content-Type"] && requestOptions.body) headers["Content-Type"] = "application/json";

  const maxAttempts = isAuthProfilePath(path) ? Math.max(1, AUTH_PROFILE_RETRIES + 1) : 1;
  let attempt = 0;
  const url = `${API_BASE}${path}`;
  const refreshablePath = path !== "/auth/login" && path !== "/auth/refresh";

  while (attempt < maxAttempts) {
    attempt += 1;
    let res;
    try {
      res = await fetchWithTimeout(url, { ...requestOptions, headers });
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
        throw makeError("Request timed out. Please try again.");
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
      const message = parseError(data);
      const retryableStatus = res.status === 503 || res.status === 502 || res.status === 504 || res.status === 429;
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

  throw makeError(`Service is busy. Please try again in a moment. [${method} ${path}]`);
}
