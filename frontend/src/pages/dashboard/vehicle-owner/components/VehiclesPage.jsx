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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading vehicles...</p>
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🚗</div>
        <h4 style={{ margin: '0 0 0.5rem', color: '#374151' }}>No vehicles listed yet</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Use the "List a Vehicle" button to add your first vehicle to the fleet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {vehicles.map((vehicle) => {
        const vehicleId = normalizeId(vehicle._id);
        const stats = bookingsByVehicle[vehicleId] || { active: 0, total: 0 };
        const isAvailable = vehicle.availability?.isAvailable !== false;
        const hasActiveBooking = stats.active > 0;
        const availabilityLabel = hasActiveBooking ? "Booked" : isAvailable ? "Available" : "Unavailable";
        const statusClass = hasActiveBooking
          ? "status-pending"
          : isAvailable
          ? "status-approved"
          : "status-rejected";
        const inspectionLabel =
          inspectionStatusLabels[vehicle.inspectionStatus] || vehicle.inspectionStatus || "Pending";
        const approvalLabel = vehicle.status
          ? vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)
          : "Pending";
        const thumbnail = Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : null;
        const thumbnailPreview = getMediaPreview(thumbnail);

        return (
          <div key={vehicleId} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {thumbnailPreview && (
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid #e5e7eb'
                }}>
                  <img 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                    src={thumbnailPreview} 
                    alt={`${vehicle.basicInfo?.make || "Vehicle"} preview`} 
                  />
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '18px', fontWeight: '600' }}>
                      {vehicle.basicInfo?.make} {vehicle.basicInfo?.model} ({vehicle.basicInfo?.year || "n/a"})
                    </h4>
                    <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                      Plate: {vehicle.basicInfo?.licensePlate || "-"} • Category: {vehicle.details?.category || "-"} • 
                      Seats: {vehicle.details?.seatingCapacity || "-"}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: 
                        statusClass === 'status-pending' ? '#fef3c7' :
                        statusClass === 'status-approved' ? '#dcfce7' : '#fee2e2',
                      color:
                        statusClass === 'status-pending' ? '#92400e' :
                        statusClass === 'status-approved' ? '#166534' : '#991b1b'
                    }}>
                      {availabilityLabel}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Approval Status</span>
                    <p style={{ margin: '2px 0 0', fontSize: '14px' }}>{approvalLabel}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Inspection Status</span>
                    <p style={{ margin: '2px 0 0', fontSize: '14px' }}>{inspectionLabel}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Active Bookings</span>
                    <p style={{ margin: '2px 0 0', fontSize: '14px' }}>{stats.active}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Total Bookings</span>
                    <p style={{ margin: '2px 0 0', fontSize: '14px' }}>{stats.total}</p>
                  </div>
                </div>

                {vehicle.lastInspection?.inspectedAt && (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '12px', color: '#6b7280' }}>
                    Last inspected: {formatDate(vehicle.lastInspection.inspectedAt, true)}
                  </p>
                )}

                {vehicle.lastInspection?.issues && (
                  <p style={{ 
                    margin: '0 0 0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#fee2e2', 
                    borderRadius: '6px',
                    fontSize: '12px', 
                    color: '#991b1b' 
                  }}>
                    Inspector feedback: {vehicle.lastInspection.issues}
                  </p>
                )}

                {!vehicle.lastInspection?.issues && vehicle.lastInspection?.notes && (
                  <p style={{ 
                    margin: '0 0 0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '6px',
                    fontSize: '12px', 
                    color: '#0369a1' 
                  }}>
                    Inspector notes: {vehicle.lastInspection.notes}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    onClick={() => onEdit(vehicle)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '14px',
                      cursor: vehicle.status !== "approved" ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      opacity: vehicle.status !== "approved" ? 0.6 : 1
                    }}
                    onClick={() => onToggleAvailability(vehicle)}
                    disabled={vehicle.status !== "approved"}
                    title={
                      vehicle.status !== "approved"
                        ? "Vehicle must be approved before availability can be changed"
                        : undefined
                    }
                  >
                    {isAvailable ? "Mark Unavailable" : "Mark Available"}
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dc2626',
                      borderRadius: '6px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    onClick={() => onDelete(vehicle)}
                  >
                    Remove
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="driver-panel">
        <header className="panel-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <h3>My Vehicle Fleet</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                border: '1px solid #6b7280',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={onShowFeedbackModal}
            >
              View Feedback
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={onShowVehicleForm}
            >
              List a Vehicle
            </button>
          </div>
        </header>

        <VehicleList
          vehicles={vehicles}
          bookingsByVehicle={bookingsByVehicle}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleAvailability={onToggleAvailability}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}

export default VehiclesPage;