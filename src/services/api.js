const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";
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

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw makeError("Session expired. Please log in again.", AUTH_EXPIRED);
  }

  const persist =
    !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(REFRESH_KEY);

  refreshInFlight = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
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
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const isRetry = options._retry === true;
  const refreshablePath = path !== "/auth/login" && path !== "/auth/refresh";
  if (res.status === 401 && refreshablePath && !isRetry) {
    try {
      await refreshAccessToken();
      return apiFetch(path, { ...options, _retry: true });
    } catch (err) {
      clearToken();
      throw err;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = parseError(data);
    if (res.status === 401 && refreshablePath) {
      clearToken();
      throw makeError(message || "Session expired. Please log in again.", AUTH_EXPIRED);
    }
    throw makeError(message);
  }
  return data;
}
