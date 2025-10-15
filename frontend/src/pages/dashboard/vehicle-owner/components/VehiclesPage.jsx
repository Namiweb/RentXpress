import { useState } from "react";

const inspectionStatusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  available: "Approved",
  needs_maintenance: "Needs Maintenance",
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

function getMediaPreview(asset) {
  if (!asset) return "";
  if (typeof asset === "string") return asset;
  if (asset.preview) return asset.preview;
  if (asset.url) return asset.url;
  if (asset.data && asset.contentType) {
    return `data:${asset.contentType};base64,${asset.data}`;
  }
  return "";
}

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

function VehicleList({ vehicles, bookingsByVehicle, onEdit, onDelete, onToggleAvailability, isLoading }) {
  if (isLoading) {
    return (
      <div className="text-center py-12 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="w-12 h-12 rounded-full border-4 border-neutral-700 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading vehicles...</p>
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <div className="text-center py-16 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="text-5xl mb-4">🚗</div>
        <h4 className="text-xl font-semibold text-white mb-2">No vehicles listed yet</h4>
        <p className="text-gray-400">
          Use the "List a Vehicle" button to add your first vehicle to the fleet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {vehicles.map((vehicle) => {
        const vehicleId = normalizeId(vehicle._id);
        const stats = bookingsByVehicle[vehicleId] || { active: 0, total: 0 };
        const isAvailable = vehicle.availability?.isAvailable !== false;
        const hasActiveBooking = stats.active > 0;
        const availabilityLabel = hasActiveBooking ? "Booked" : isAvailable ? "Available" : "Unavailable";
        const inspectionLabel =
          inspectionStatusLabels[vehicle.inspectionStatus] || vehicle.inspectionStatus || "Pending";
        const approvalLabel = vehicle.status
          ? vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)
          : "Pending";
        const thumbnail = Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : null;
        const thumbnailPreview = getMediaPreview(thumbnail);

        return (
          <div 
            key={vehicleId}
            className="rounded-xl p-6 transition-all duration-300 hover:transform hover:scale-105 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 shadow-2xl"
          >
            <div className="flex gap-4">
              {thumbnailPreview && (
                <div className="flex-shrink-0 rounded-lg overflow-hidden w-24 h-24 border border-neutral-700">
                  <img 
                    className="w-full h-full object-cover"
                    src={thumbnailPreview} 
                    alt={`${vehicle.basicInfo?.make || "Vehicle"} preview`} 
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-white mb-1 truncate">
                      {vehicle.basicInfo?.make} {vehicle.basicInfo?.model} ({vehicle.basicInfo?.year || "n/a"})
                    </h4>
                    <p className="text-gray-400 text-sm truncate">
                      Plate: {vehicle.basicInfo?.licensePlate || "-"} • Category: {vehicle.details?.category || "-"} • 
                      Seats: {vehicle.details?.seatingCapacity || "-"}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <span 
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        hasActiveBooking 
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                          : isAvailable 
                            ? "bg-green-500/20 text-green-300 border-green-500/30" 
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                      }`}
                    >
                      {availabilityLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs font-medium block mb-1 text-gray-400">Approval Status</span>
                    <p className="text-white text-sm">{approvalLabel}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium block mb-1 text-gray-400">Inspection Status</span>
                    <p className="text-white text-sm">{inspectionLabel}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium block mb-1 text-gray-400">Active Bookings</span>
                    <p className="text-white text-sm">{stats.active}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium block mb-1 text-gray-400">Total Bookings</span>
                    <p className="text-white text-sm">{stats.total}</p>
                  </div>
                </div>

                {vehicle.lastInspection?.inspectedAt && (
                  <p className="text-xs mb-3 text-gray-400">
                    Last inspected: {formatDate(vehicle.lastInspection.inspectedAt, true)}
                  </p>
                )}

                {vehicle.lastInspection?.issues && (
                  <div className="rounded-lg p-3 mb-3 bg-red-500/10 border border-red-500/20">
                    <p className="text-xs m-0 text-red-300">
                      <strong>Inspector feedback:</strong> {vehicle.lastInspection.issues}
                    </p>
                  </div>
                )}

                {!vehicle.lastInspection?.issues && vehicle.lastInspection?.notes && (
                  <div className="rounded-lg p-3 mb-3 bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs m-0 text-blue-300">
                      <strong>Inspector notes:</strong> {vehicle.lastInspection.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {/* Edit Button - Disabled when booked */}
                  <button 
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      hasActiveBooking
                        ? "bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed"
                        : "bg-transparent border border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:border-neutral-600 hover:text-white hover:transform hover:scale-105"
                    }`}
                    onClick={() => {
                      if (!hasActiveBooking) {
                        onEdit(vehicle);
                      }
                    }}
                    disabled={hasActiveBooking}
                    title={
                      hasActiveBooking
                        ? "Cannot edit vehicle with active bookings"
                        : "Edit vehicle details"
                    }
                  >
                    {hasActiveBooking ? "Cannot Edit" : "Edit"}
                  </button>
                  
                  {/* Toggle Availability Button - Disabled when not approved OR booked */}
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white border border-transparent shadow-lg hover:shadow-orange-500/25"
                    onClick={() => onToggleAvailability(vehicle)}
                    disabled={vehicle.status !== "approved" || hasActiveBooking}
                    title={
                      vehicle.status !== "approved"
                        ? "Vehicle must be approved before availability can be changed"
                        : hasActiveBooking
                        ? "Cannot change availability with active bookings"
                        : undefined
                    }
                  >
                    {isAvailable ? "Mark Unavailable" : "Mark Available"}
                  </button>
                  
                  {/* Remove Button - Disabled when booked */}
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      hasActiveBooking
                        ? "bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed"
                        : "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/40 hover:transform hover:scale-105"
                    }`}
                    onClick={() => {
                      if (!hasActiveBooking) {
                        onDelete(vehicle);
                      }
                    }}
                    disabled={hasActiveBooking}
                    title={
                      hasActiveBooking
                        ? "Cannot remove vehicle with active bookings"
                        : "Remove vehicle from fleet"
                    }
                  >
                    {hasActiveBooking ? "Cannot Remove" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VehiclesPage({ 
  vehicles, 
  bookingsByVehicle, 
  isLoading, 
  onEdit, 
  onDelete, 
  onToggleAvailability,
  onShowVehicleForm,
  onShowFeedbackModal 
}) {
  return (
    <div className="min-h-screen p-6 bg-black">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Panel */}
        <div className="rounded-2xl p-6 shadow-2xl relative overflow-hidden bg-neutral-900 border border-neutral-800">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-5"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500 rounded-full blur-2xl opacity-5"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 rounded-full bg-gradient-to-b from-orange-500 to-orange-600"></div>
                <h1 className="text-2xl font-bold text-white">My Vehicle Fleet</h1>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:transform hover:scale-105 bg-transparent border border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:border-neutral-600 hover:text-white"
                  onClick={onShowFeedbackModal}
                >
                  View Feedback
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:transform hover:scale-105 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white border border-transparent shadow-lg hover:shadow-orange-500/25"
                  onClick={onShowVehicleForm}
                >
                  List a Vehicle
                </button>
              </div>
            </div>

            {/* Vehicle List */}
            <VehicleList
              vehicles={vehicles}
              bookingsByVehicle={bookingsByVehicle}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleAvailability={onToggleAvailability}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehiclesPage;