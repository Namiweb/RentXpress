const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8585/api";

export function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function apiRequest(path, options = {}) {
  const requestOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  return fetch(buildUrl(path), requestOptions);
}
