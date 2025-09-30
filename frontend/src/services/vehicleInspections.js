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

export async function getInspectorAssignments(inspectorId, options = {}) {
  const params = new URLSearchParams({ ...options });
  const queryString = params.toString() ? `?${params}` : "";
  const response = await apiRequest(
    `/vehicle-inspections/inspector/${inspectorId}${queryString}`
  );
  return handleResponse(response);
}

export async function getVehicleInspectionHistory(vehicleId) {
  const response = await apiRequest(`/vehicle-inspections/vehicle/${vehicleId}/history`);
  return handleResponse(response);
}

export async function updateVehicleInspection(inspectionId, payload) {
  const response = await apiRequest(`/vehicle-inspections/${inspectionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function assignVehicleInspection(payload) {
  const response = await apiRequest(`/vehicle-inspections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function startManualVehicleInspection(payload) {
  const response = await apiRequest(`/vehicle-inspections/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function getVehicleInspectionsList(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  });
  const queryString = params.toString();
  const response = await apiRequest(`/vehicle-inspections${queryString ? `?${queryString}` : ""}`);
  return handleResponse(response);
}

export async function deleteVehicleInspection(inspectionId) {
  const response = await apiRequest(`/vehicle-inspections/${inspectionId}`, {
    method: "DELETE",
  });
  return handleResponse(response);
}

export async function getVehicleInspection(inspectionId) {
  const response = await apiRequest(`/vehicle-inspections/${inspectionId}`);
  return handleResponse(response);
}
