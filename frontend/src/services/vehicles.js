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

// Get pending vehicles for inspection approval
export async function getPendingVehicles() {
  const response = await apiRequest("/vehicles?status=pending");
  return handleResponse(response);
}

// Get vehicle by ID
export async function getVehicleById(vehicleId) {
  const response = await apiRequest(`/vehicles/${vehicleId}`);
  return handleResponse(response);
}
// Approve a vehicle
export async function approveVehicle(vehicleId, inspectionNotes = "") {
  const response = await apiRequest(`/vehicles/${vehicleId}`, {
    method: "PUT",
    body: JSON.stringify({
      status: "approved",
      inspectionStatus: "available",
      lastInspection: {
        inspectedAt: new Date(),
        decision: "available",
        notes: inspectionNotes
      }
    }),
  });
  return handleResponse(response);
}
// Reject a vehicle
export async function rejectVehicle(vehicleId, rejectionReason = "") {
  const response = await apiRequest(`/vehicles/${vehicleId}`, {
    method: "PUT",
    body: JSON.stringify({
      status: "rejected",
      inspectionStatus: "needs_maintenance",
      lastInspection: {
        inspectedAt: new Date(),
        decision: "needs_maintenance",
        issues: rejectionReason,
        notes: rejectionReason
      }
    }),
  });
  return handleResponse(response);
}