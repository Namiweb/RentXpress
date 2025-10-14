import { apiRequest } from "./api.js";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const hasBody = contentType && contentType.includes("application/json");
  const data = hasBody ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

// Get all vehicles with optional filtering
export async function getVehicles(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  });
  const queryString = params.toString();
  const response = await apiRequest(`/vehicles${queryString ? `?${queryString}` : ""}`);
  return handleResponse(response);
}
