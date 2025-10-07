import { useCallback, useMemo, useState } from "react";
import { getUserName } from "../../utils/getUserName";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "../../utils/formatCurrency";
import { apiRequest } from "../../services/api";
import StatusPill from "../StatusPill";
import AddVehicleModal from "./AddVehicleModal";

const VEHICLE_STATUSES = ["pending", "approved", "rejected"];

const VehicleManagementPanel = ({
  vehicles = [],
  owners = [],
  isLoading,
  error,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingVehicleId, setUpdatingVehicleId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const ownerMap = useMemo(() => {
    const map = new Map();
    owners.forEach((owner) => {
      map.set(owner._id, owner);
    });
    return map;
  }, [owners]);

  const vehicleOwners = useMemo(
    () =>
      owners.filter(
        (owner) => owner.role === "vehicle_owner" || owner.role === "admin"
      ),
    [owners]
  );

  const getOwnerLabel = useCallback(
    (vehicle) => {
      const owner = ownerMap.get(vehicle.ownerId);
      if (!owner) return vehicle.ownerId || "Unknown";
      return `${getUserName(owner)} · ${owner.email}`;
    },
    [ownerMap]
  );

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles
      .filter((vehicle) =>
        statusFilter === "all" ? true : vehicle.status === statusFilter
      )
      .filter((vehicle) => {
        if (!term) return true;
        const owner = ownerMap.get(vehicle.ownerId);
        const haystack = [
          vehicle.vehicleId,
          vehicle.basicInfo?.make,
          vehicle.basicInfo?.model,
          vehicle.basicInfo?.licensePlate,
          vehicle.details?.category,
          owner?.email,
          owner?.profile?.firstName,
          owner?.profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [vehicles, statusFilter, searchTerm, ownerMap]);

  const handleDownloadReport = useCallback(() => {
    if (!filteredVehicles.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    doc.setFontSize(18);
    doc.text("Vehicle Management Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(
      `Total vehicles: ${filteredVehicles.length}`,
      marginLeft,
      headerY + 35
    );

    const activeFilters = [];
    if (statusFilter !== "all")
      activeFilters.push(`Status: ${statusFilter.replace(/_/g, " ")}`);
    if (searchTerm.trim()) activeFilters.push(`Search: "${searchTerm.trim()}"`);
    if (activeFilters.length > 0) {
      doc.text(
        `Filters: ${activeFilters.join(" | ")}`,
        marginLeft,
        headerY + 50
      );
    }

    autoTable(doc, {
      startY: headerY + 75,
      head: [
        ["#", "Vehicle", "Plate", "Owner", "Status", "Daily rate", "Created"],
      ],
      body: filteredVehicles.map((vehicle, index) => [
        index + 1,
        `${
          [vehicle.basicInfo?.make, vehicle.basicInfo?.model]
            .filter(Boolean)
            .join(" ") ||
          vehicle.vehicleId ||
          "-"
        }`,
        vehicle.basicInfo?.licensePlate || vehicle.vehicleId || "-",
        getOwnerLabel(vehicle),
        vehicle.status ? vehicle.status.replace(/_/g, " ") : "-",
        formatCurrency(vehicle.pricing?.dailyRate, vehicle.pricing?.currency),
        vehicle.createdAt
          ? new Date(vehicle.createdAt).toLocaleDateString()
          : "-",
      ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [17, 24, 39] },
      columnStyles: {
        0: { halign: "center", cellWidth: 40 },
        5: { halign: "right" },
      },
    });

    doc.save("vehicle-management-report.pdf");
  }, [filteredVehicles, getOwnerLabel, searchTerm, statusFilter]);

  const handleStatusDraftChange = (vehicleId, newStatus) => {
    setStatusDrafts((prev) => ({ ...prev, [vehicleId]: newStatus }));
  };

  const handleStatusUpdate = async (vehicle) => {
    const desiredStatus = statusDrafts[vehicle._id] || vehicle.status;
    if (!desiredStatus || desiredStatus === vehicle.status) return;

    setActionError("");
    setUpdatingVehicleId(vehicle._id);
    try {
      const payload = { status: desiredStatus };
      if (desiredStatus === "approved") {
        payload.inspectionStatus = "available";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: true,
        };
      } else if (desiredStatus === "rejected") {
        payload.inspectionStatus = "needs_maintenance";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: false,
        };
      } else if (desiredStatus === "pending") {
        payload.inspectionStatus = "pending";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: false,
        };
      }

      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update vehicle");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingVehicleId("");
    }
  };

  const handleCreateVehicle = async (payload) => {
    setActionError("");
    setIsCreating(true);
    try {
      const response = await apiRequest("/vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create vehicle");
      }
      await onRefresh();
      setShowAddModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const detailRows = useMemo(() => {
    if (!selectedVehicle) return [];
    const vehicle = selectedVehicle;
    return [
      { label: "Vehicle ID", value: vehicle.vehicleId },
      { label: "Owner", value: getOwnerLabel(vehicle) },
      { label: "Status", value: vehicle.status },
      { label: "Inspection", value: vehicle.inspectionStatus },
      { label: "Make", value: vehicle.basicInfo?.make },
      { label: "Model", value: vehicle.basicInfo?.model },
      { label: "Year", value: vehicle.basicInfo?.year },
      { label: "Color", value: vehicle.basicInfo?.color },
      { label: "License plate", value: vehicle.basicInfo?.licensePlate },
      { label: "Chassis", value: vehicle.basicInfo?.chassisNumber },
      { label: "Engine", value: vehicle.basicInfo?.engineNumber },
      { label: "Category", value: vehicle.details?.category },
      { label: "Fuel", value: vehicle.details?.fuelType },
      { label: "Transmission", value: vehicle.details?.transmission },
      { label: "Condition", value: vehicle.details?.condition },
      { label: "Seating", value: vehicle.details?.seatingCapacity },
      { label: "Mileage", value: vehicle.details?.mileage },
      {
        label: "Features",
        value: vehicle.details?.features?.length
          ? vehicle.details.features.join(", ")
          : "-",
      },
      {
        label: "Daily rate",
        value: formatCurrency(
          vehicle.pricing?.dailyRate,
          vehicle.pricing?.currency
        ),
      },
      {
        label: "Weekly rate",
        value: formatCurrency(
          vehicle.pricing?.weeklyRate,
          vehicle.pricing?.currency
        ),
      },
      {
        label: "Monthly rate",
        value: formatCurrency(
          vehicle.pricing?.monthlyRate,
          vehicle.pricing?.currency
        ),
      },
      {
        label: "Deposit",
        value: formatCurrency(
          vehicle.pricing?.securityDeposit,
          vehicle.pricing?.currency
        ),
      },
      { label: "Address", value: vehicle.location?.address },
      { label: "City", value: vehicle.location?.city },
      { label: "Province", value: vehicle.location?.province },
      {
        label: "Created",
        value: vehicle.createdAt
          ? new Date(vehicle.createdAt).toLocaleString()
          : "-",
      },
    ];
  }, [selectedVehicle, getOwnerLabel]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Vehicle Management</h3>
          <p className="panel-subtitle">
            Review pending listings, adjust statuses, and onboard vehicles.
          </p>
        </div>
        <div className="row-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleDownloadReport}
            disabled={filteredVehicles.length === 0}
          >
            Download report
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            Refresh
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => setShowAddModal(true)}
          >
            Add vehicle
          </button>
        </div>
      </header>
      <div className="filter-grid">
        <input
          className="input-control"
          type="search"
          placeholder="Search by make, model, owner, or plate"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="input-control"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {VEHICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      {isLoading ? (
        <p>Loading vehicles…</p>
      ) : filteredVehicles.length === 0 ? (
        <p>No vehicles found for the current filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="management-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Pricing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle._id}>
                  <td>
                    <button
                      className="btn-text"
                      type="button"
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <div className="cell-stack">
                        <strong>
                          {vehicle.basicInfo?.make} {vehicle.basicInfo?.model}
                        </strong>
                        <span className="muted">
                          {vehicle.basicInfo?.licensePlate || vehicle.vehicleId}
                        </span>
                      </div>
                    </button>
                  </td>
                  <td>{getOwnerLabel(vehicle)}</td>
                  <td>
                    <StatusPill value={vehicle.status} />
                  </td>
                  <td>
                    {formatCurrency(
                      vehicle.pricing?.dailyRate,
                      vehicle.pricing?.currency
                    )}{" "}
                    / day
                  </td>
                  <td>
                    <div className="row-inline">
                      <select
                        className="input-control"
                        value={statusDrafts[vehicle._id] || vehicle.status}
                        onChange={(event) =>
                          handleStatusDraftChange(
                            vehicle._id,
                            event.target.value
                          )
                        }
                      >
                        {VEHICLE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={updatingVehicleId === vehicle._id}
                        onClick={() => handleStatusUpdate(vehicle)}
                      >
                        {updatingVehicleId === vehicle._id
                          ? "Saving…"
                          : "Update"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVehicle && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedVehicle(null)}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>
                  {selectedVehicle.basicInfo?.make}{" "}
                  {selectedVehicle.basicInfo?.model}
                </h3>
                <p className="panel-subtitle">
                  {selectedVehicle.basicInfo?.licensePlate ||
                    selectedVehicle.vehicleId}
                </p>
              </div>
              <button
                className="close-button"
                type="button"
                onClick={() => setSelectedVehicle(null)}
              >
                ×
              </button>
            </header>
            <div className="modal-body">
              <dl className="vehicle-detail-grid">
                {detailRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value ?? "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddVehicleModal
          owners={vehicleOwners}
          onClose={() => {
            if (!isCreating) setShowAddModal(false);
          }}
          onSubmit={handleCreateVehicle}
          isSubmitting={isCreating}
        />
      )}
    </section>
  );
}

export default VehicleManagementPanel;