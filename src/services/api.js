const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";
const TOKEN_KEY = "vtu_access_token";
const SESSION_KEY = "vtu_access_token_session";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function setToken(token, persist = true) {
  if (persist) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = "Request failed";
    if (Array.isArray(data?.detail)) {
      message = data.detail.map((item) => item?.msg || item).join(", ");
    } else if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (typeof data?.message === "string") {
      message = data.message;
    }
    throw new Error(message);
  }
  return data;
}
