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
    <section className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/40 p-6 backdrop-blur-sm">
      {/* Header Section */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-700/30">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Vehicle Management
          </h3>
          <p className="text-gray-400 mt-1 text-sm">
            Review pending listings, adjust statuses, and onboard vehicles.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="px-4 py-2 bg-transparent hover:bg-neutral-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200 border border-neutral-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
            onClick={handleDownloadReport}
            disabled={filteredVehicles.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Report
          </button>
          <button
            className="px-4 py-2 bg-transparent hover:bg-neutral-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200 border border-neutral-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            className="px-4 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30 flex items-center gap-2"
            type="button"
            onClick={() => setShowAddModal(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Vehicle
          </button>
        </div>
      </header>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <input
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
            type="search"
            placeholder="Search by make, model, owner, or plate..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <svg className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          className="px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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

      {/* Error Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {actionError}
          </p>
        </div>
      )}

      {/* Content Section */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-[#FF5A00] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading vehicles…</span>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-700/50 rounded-lg">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-gray-400">No vehicles found for the current filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-neutral-700/50 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/80 border-b border-neutral-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Pricing</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="hover:bg-neutral-800/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <button
                        className="text-left hover:text-[#FF5A00] transition-colors duration-200 w-full"
                        type="button"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        <div className="flex flex-col">
                          <strong className="text-white font-medium hover:text-[#FF5A00] transition-colors duration-200">
                            {vehicle.basicInfo?.make} {vehicle.basicInfo?.model}
                          </strong>
                          <span className="text-gray-400 text-sm mt-1">
                            {vehicle.basicInfo?.licensePlate || vehicle.vehicleId}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{getOwnerLabel(vehicle)}</td>
                    <td className="px-6 py-4">
                      <StatusPill value={vehicle.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">
                        {formatCurrency(
                          vehicle.pricing?.dailyRate,
                          vehicle.pricing?.currency
                        )}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">/ day</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          className="px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                          className="px-3 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[80px]"
                          type="button"
                          disabled={updatingVehicleId === vehicle._id}
                          onClick={() => handleStatusUpdate(vehicle)}
                        >
                          {updatingVehicleId === vehicle._id ? (
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Saving…
                            </div>
                          ) : "Update"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between p-6 border-b border-neutral-700/50">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedVehicle.basicInfo?.make} {selectedVehicle.basicInfo?.model}
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  {selectedVehicle.basicInfo?.licensePlate || selectedVehicle.vehicleId}
                </p>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-all duration-200"
                type="button"
                onClick={() => setSelectedVehicle(null)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailRows.map((row) => (
                  <div key={row.label} className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/30">
                    <dt className="text-sm font-medium text-gray-400 mb-1">{row.label}</dt>
                    <dd className="text-white font-medium">{row.value ?? "-"}</dd>
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