const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

export function getToken() {
  return localStorage.getItem("vtu_access_token");
}

export function setToken(token) {
  localStorage.setItem("vtu_access_token", token);
}

export function clearToken() {
  localStorage.removeItem("vtu_access_token");
}

export async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}
