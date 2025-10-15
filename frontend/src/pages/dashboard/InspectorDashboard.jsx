import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getVehicleInspectionHistory,
  startManualVehicleInspection,
  updateVehicleInspection,
  getVehicleInspectionsList,
  getInspectorAssignments,
  deleteVehicleInspection,
  getVehicleInspection,
} from "../../services/vehicleInspections.js";
import {
  getPendingVehicles,
  approveVehicle,
  rejectVehicle,
} from "../../services/vehicles.js";
import InspectorNavigation from "./inspector/components/InspectorNavigation.jsx";
import InspectorHero from "./inspector/components/InspectorHero.jsx";
import ProfilePage from "./inspector/components/ProfilePage.jsx";

const CHECKLIST_ITEMS = [
  { key: "brakes", label: "Brakes" },
  { key: "tires", label: "Tires" },
  { key: "lights", label: "Lights" },
  { key: "fluids", label: "Fluids" },
  { key: "insurance", label: "Insurance" },
  { key: "registration", label: "Registration" },
  { key: "safetyEquipment", label: "Safety Equipment" },
  { key: "documents", label: "Vehicle Documents" },
];

const decisionLabels = {
  pending: "Pending",
  available: "Available",
  needs_maintenance: "Needs Maintenance",
};

const statusLabels = {
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  pending: "Pending",
  available: "Available",
  needs_maintenance: "Needs Maintenance",
  not_required: "Not Required",
};

const fuelLevelOptions = [
  { value: "", label: "Select fuel level" },
  { value: "full", label: "Full" },
  { value: "three_quarters", label: "Three Quarters" },
  { value: "half", label: "Half" },
  { value: "quarter", label: "Quarter" },
  { value: "low", label: "Low" },
  { value: "empty", label: "Empty" },
];

const conditionOptions = [
  { value: "", label: "Select condition" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const DECISION_FILTER_OPTIONS = [
  { value: "", label: "All decisions" },
  { value: "available", label: "Available" },
  { value: "needs_maintenance", label: "Needs Maintenance" },
  { value: "pending", label: "Pending" },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "car", label: "Car" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
  { value: "motorcycle", label: "Motorcycle" },
];

const INITIAL_RECORD_FILTERS = {
  plate: "",
  status: "",
  decision: "",
  category: "",
  from: "",
  to: "",
};

function createEmptyChecklist() {
  return CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = { status: "pending", notes: "" };
    return acc;
  }, {});
}

function mergeChecklistState(source) {
  const base = createEmptyChecklist();
  if (!source) return base;

  CHECKLIST_ITEMS.forEach((item) => {
    if (source[item.key]) {
      base[item.key] = {
        status: source[item.key].status || "pending",
        notes: source[item.key].notes || "",
      };
    }
  });

  return base;
}

function formatDate(input) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getImageSrc(image) {
  if (!image) return null;

  if (typeof image === "string") {
    return image.trim();
  }

  if (image.url && typeof image.url === "string") {
    return image.url.trim();
  }

  if (image.data && image.contentType) {
    const cleanData = image.data.replace(/^data:[^;]*;base64,/, '');
    return `data:${image.contentType};base64,${cleanData}`;
  }

  if (image.data) {
    const cleanData = image.data.replace(/^data:[^;]*;base64,/, '');
    return `data:image/jpeg;base64,${cleanData}`;
  }

  return null;
}

function VehicleSummary({ vehicle, enteredPlate }) {
  if (!vehicle && !enteredPlate) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <p className="text-gray-400">Enter a license plate to begin an inspection.</p>
      </div>
    );
  }

  const info = vehicle?.basicInfo || {};
  const details = vehicle?.details || {};
  const inspectionStatus = vehicle?.inspectionStatus || "pending";
  const statusClass = inspectionStatus === "not_required" ? "bg-yellow-500/20 text-yellow-300" : 
                     inspectionStatus === "available" ? "bg-green-500/20 text-green-300" :
                     inspectionStatus === "needs_maintenance" ? "bg-red-500/20 text-red-300" : 
                     "bg-gray-500/20 text-gray-300";

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-2">
      <div className="flex justify-between items-center">
        <strong className="text-white">License Plate:</strong> 
        <span className="text-gray-300">{info.licensePlate || enteredPlate || "-"}</span>
      </div>
      {vehicle ? (
        <>
          <div className="flex justify-between items-center">
            <strong className="text-white">Vehicle:</strong> 
            <span className="text-gray-300">{info.make || "Unknown"} {info.model || ""}{info.year ? ` (${info.year})` : ""}</span>
          </div>
          <div className="flex justify-between items-center">
            <strong className="text-white">Category:</strong> 
            <span className="text-gray-300">{details.category || "-"}</span>
          </div>
          <div className="flex justify-between items-center">
            <strong className="text-white">Inspection Status:</strong> 
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
              {statusLabels[inspectionStatus] || inspectionStatus}
            </span>
          </div>
          {vehicle.lastInspection?.inspectedAt && (
            <div className="flex justify-between items-center">
              <strong className="text-white">Last Inspected:</strong> 
              <span className="text-gray-300">{formatDate(vehicle.lastInspection.inspectedAt)}</span>
            </div>
          )}
          {vehicle.lastInspection?.decision && (
            <div className="flex justify-between items-center">
              <strong className="text-white">Last Decision:</strong> 
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                vehicle.lastInspection.decision === "available" ? "bg-green-500/20 text-green-300" :
                vehicle.lastInspection.decision === "needs_maintenance" ? "bg-red-500/20 text-red-300" :
                "bg-yellow-500/20 text-yellow-300"
              }`}>
                {decisionLabels[vehicle.lastInspection.decision] || vehicle.lastInspection.decision}
              </span>
            </div>
          )}
          {vehicle.lastInspection?.issues && (
            <div className="flex justify-between items-center">
              <strong className="text-white">Recorded Issues:</strong> 
              <span className="text-gray-300">{vehicle.lastInspection.issues}</span>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-center">No matching vehicle found yet.</p>
      )}
    </div>
  );
}

function AttachmentEditor({ label, items, onChange, disabled }) {
  const handleChange = (index, field, value) => {
    if (disabled) return;
    onChange(items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold">{label}</h4>
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          onClick={() => {
            if (disabled) return;
            onChange([...items, { label: "", url: "" }]);
          }}
          disabled={disabled}
        >
          Add
        </button>
      </div>
      {items.length === 0 && <p className="text-gray-400">No {label.toLowerCase()} added.</p>}
      {items.map((item, index) => (
        <div className="flex gap-4 items-start" key={`${label}-${index}`}>
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
            placeholder="Label"
            value={item.label || ""}
            onChange={(event) => handleChange(index, "label", event.target.value)}
            disabled={disabled}
          />
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
            placeholder="URL"
            value={item.url || ""}
            onChange={(event) => handleChange(index, "url", event.target.value)}
            disabled={disabled}
          />
          <button
            className="text-red-400 hover:text-red-300 px-3 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
            type="button"
            onClick={() => {
              if (disabled) return;
              onChange(items.filter((_, idx) => idx !== index));
            }}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

function ChecklistEditor({ checklist, onChange, disabled }) {
  const handleStatusChange = (key, value) => {
    if (disabled) return;
    onChange({ ...checklist, [key]: { ...checklist[key], status: value } });
  };

  const handleNotesChange = (key, value) => {
    if (disabled) return;
    onChange({ ...checklist, [key]: { ...checklist[key], notes: value } });
  };

  return (
    <section className="space-y-6">
      <h4 className="text-white font-semibold">Inspection Checklist</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHECKLIST_ITEMS.map((item) => (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3" key={item.key}>
            <label className="block space-y-2">
              <span className="text-white font-medium">{item.label}</span>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                value={checklist[item.key]?.status || "pending"}
                onChange={(event) => handleStatusChange(item.key, event.target.value)}
                disabled={disabled}
              >
                <option value="pending" className="bg-gray-800">Pending</option>
                <option value="pass" className="bg-gray-800">Pass</option>
                <option value="fail" className="bg-gray-800">Fail</option>
              </select>
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent resize-none disabled:opacity-50"
              placeholder="Notes"
              rows={2}
              value={checklist[item.key]?.notes || ""}
              onChange={(event) => handleNotesChange(item.key, event.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryPanel({ entries, isLoading }) {
  return (
    <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
      <header className="mb-6">
        <h3 className="text-xl font-bold text-white">Inspection History</h3>
      </header>
      {isLoading && <p className="text-gray-400">Loading history...</p>}
      {!isLoading && entries.length === 0 && <p className="text-gray-400">No inspection history available.</p>}
      {!isLoading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry._id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-white">{formatDate(entry.completedAt || entry.createdAt)}</strong>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  entry.decision === "available" ? "bg-green-500/20 text-green-300" :
                  entry.decision === "needs_maintenance" ? "bg-red-500/20 text-red-300" :
                  "bg-yellow-500/20 text-yellow-300"
                }`}>
                  {decisionLabels[entry.decision] || entry.decision}
                </span>
              </div>
              <div className="space-y-1 text-gray-300">
                <p>Inspector: {entry.inspector?.profile?.firstName || ""} {entry.inspector?.profile?.lastName || ""}</p>
                {entry.notes && <p>Notes: {entry.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AssignmentsPanel({
  assignments,
  onSelect,
  onCreateNew,
  isLoading,
  error,
  activeInspectionId,
}) {
  return (
    <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">My inspections</h3>
          <p className="text-gray-400">Switch between vehicles you are handling</p>
        </div>
        <button 
          type="button" 
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          onClick={onCreateNew}
        >
          New manual inspection
        </button>
      </header>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {isLoading ? (
        <p className="text-gray-400">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="text-gray-400">No active assignments. Start a manual inspection to begin.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((item) => {
            const vehicle = item.vehicle || {};
            const title = `${vehicle.basicInfo?.make || ""} ${vehicle.basicInfo?.model || ""}`.trim() ||
              "Vehicle";
            const plate = vehicle.basicInfo?.licensePlate || item.inspectionId;
            const isActive = activeInspectionId && item._id === activeInspectionId;
            const statusLabel = statusLabels[item.status] || item.status || "-";
            const decisionLabel = decisionLabels[item.decision] || item.decision || "";
            return (
              <div key={item._id} className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <div className="flex-1">
                  <strong className="text-white block">{title}</strong>
                  <p className="text-gray-300">Plate: {plate || "-"}</p>
                  <p className="text-gray-400 text-sm">
                    {statusLabel}
                    {decisionLabel && decisionLabel !== "Pending" ? ` · ${decisionLabel}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? 'bg-[#FF5A00] text-white cursor-default' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  onClick={() => onSelect?.(item)}
                  disabled={isActive}
                >
                  {isActive ? "Active" : "Open"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InspectorDashboard() {
  const { user, logout } = useAuth();
  const inspectorId = user?._id;
  const [activeTab, setActiveTab] = useState("overview");
  const [licensePlate, setLicensePlate] = useState("");
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [activeInspection, setActiveInspection] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formState, setFormState] = useState({
    mileage: "",
    notes: "",
    checklist: createEmptyChecklist(),
    photos: [],
    documents: [],
    inspectionLocation: "",
    weatherConditions: "",
    fuelLevel: "",
    generalCondition: "",
    exteriorCondition: "",
    interiorCondition: "",
    safetyConcerns: "",
  });
  const [inspectionRecords, setInspectionRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [recordFilters, setRecordFilters] = useState(INITIAL_RECORD_FILTERS);
  const [recordFiltersDraft, setRecordFiltersDraft] = useState(INITIAL_RECORD_FILTERS);
  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [actionBusyId, setActionBusyId] = useState(null);

  // Vehicle approval states
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [approvalModal, setApprovalModal] = useState(null);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");

  const heroMetrics = useMemo(() => {
    const records = Array.isArray(inspectionRecords) ? inspectionRecords : [];
    const stats = {
      active: 0,
      completedSeven: 0,
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    records.forEach((record) => {
      const status = record?.status;
      if (status === "assigned" || status === "in_progress") {
        stats.active += 1;
      }

      if (status === "completed") {
        const completedValue = record.completedAt || record.updatedAt || record.createdAt;
        if (completedValue) {
          const completedAt = new Date(completedValue);
          if (!Number.isNaN(completedAt.getTime()) && completedAt >= sevenDaysAgo) {
            stats.completedSeven += 1;
          }
        }
      }
    });

    return [
      { label: "Active", value: stats.active.toLocaleString() },
      { label: "Completed (7d)", value: stats.completedSeven.toLocaleString() },
    ];
  }, [inspectionRecords]);

  const overviewCards = useMemo(() => {
    const records = Array.isArray(inspectionRecords) ? inspectionRecords : [];
    const summary = {
      assigned: 0,
      inProgress: 0,
      available: 0,
      needsMaintenance: 0,
    };

    records.forEach((record) => {
      const status = record?.status;
      const decision = record?.decision;

      if (status === "assigned") {
        summary.assigned += 1;
      }
      if (status === "in_progress") {
        summary.inProgress += 1;
      }
      if (decision === "available") {
        summary.available += 1;
      }
      if (decision === "needs_maintenance") {
        summary.needsMaintenance += 1;
      }
    });

    return [
      {
        title: "Assigned vehicles",
        value: summary.assigned.toLocaleString(),
        hint: "Waiting on inspection",
      },
      {
        title: "In progress",
        value: summary.inProgress.toLocaleString(),
        hint: "Currently being inspected",
      },
      {
        title: "Available fleet",
        value: summary.available.toLocaleString(),
        hint: "Ready for dispatch",
      },
      {
        title: "Needs maintenance",
        value: summary.needsMaintenance.toLocaleString(),
        hint: "Follow-up required",
      },
    ];
  }, [inspectionRecords]);

  const sanitizeAttachments = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item && typeof item.url === "string" && item.url.trim().length > 0)
      .map((item) => ({
        label: item.label?.trim() || undefined,
        url: item.url.trim(),
      }));
  }, []);

  const loadHistory = useCallback(
    async (vehicleId) => {
      if (!vehicleId) {
        setHistory([]);
        return;
      }
      setIsLoadingHistory(true);
      try {
        const data = await getVehicleInspectionHistory(vehicleId);
        setHistory(data);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
      } finally {
        setIsLoadingHistory(false);
      }
    },
    []
  );

  const loadInspectionRecords = useCallback(async () => {
    if (!inspectorId) return;
    setRecordsLoading(true);
    setRecordsError("");
    try {
      const data = await getVehicleInspectionsList({
        inspectorId,
        licensePlate: recordFilters.plate,
        status: recordFilters.status,
        decision: recordFilters.decision,
        category: recordFilters.category,
        from: recordFilters.from,
        to: recordFilters.to,
      });
      setInspectionRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      setRecordsError(error.message);
    } finally {
      setRecordsLoading(false);
    }
  }, [recordFilters, inspectorId]);

  const loadAssignments = useCallback(async () => {
    if (!inspectorId) return;
    setIsLoadingAssignments(true);
    setAssignmentsError("");
    try {
      const data = await getInspectorAssignments(inspectorId, { status: "active" });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      setAssignmentsError(error.message);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [inspectorId]);

  const loadPendingVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    setVehiclesError("");
    try {
      const data = await getPendingVehicles();
      console.log('Loaded pending vehicles:', data);
      setPendingVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pending vehicles:', error);
      setVehiclesError(error.message);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  const filteredPendingVehicles = useMemo(() => {
    if (!vehicleSearchTerm.trim()) {
      return pendingVehicles;
    }
    
    const searchTerm = vehicleSearchTerm.toLowerCase();
    return pendingVehicles.filter((vehicle) => {
      const vehicleName = `${vehicle.basicInfo?.make || ""} ${vehicle.basicInfo?.model || ""} ${vehicle.basicInfo?.year || ""}`.toLowerCase();
      const licensePlate = (vehicle.basicInfo?.licensePlate || "").toLowerCase();
      const category = (vehicle.details?.category || "").toLowerCase();
      
      return (
        vehicleName.includes(searchTerm) ||
        licensePlate.includes(searchTerm) ||
        category.includes(searchTerm)
      );
    });
  }, [pendingVehicles, vehicleSearchTerm]);

  const handleCreateNewInspection = useCallback(() => {
    setActiveInspection(null);
    setActiveVehicle(null);
    setLicensePlate("");
    setHistory([]);
    setActiveTab("inspections");
  }, []);

  const handleSelectAssignment = useCallback(
    (inspection) => {
      if (!inspection) return;
      setActiveInspection(inspection);
      setActiveVehicle(inspection.vehicle || null);
      const nextPlate =
        inspection.vehicle?.basicInfo?.licensePlate || inspection.manualEntry?.licensePlate || "";
      setLicensePlate(nextPlate);
      setActiveTab("inspections");
    },
    []
  );

  const handleEditInspectionRecord = useCallback(
    async (inspectionId) => {
      if (!inspectionId) return;
      setActionBusyId(`edit:${inspectionId}`);
      try {
        const inspection = await getVehicleInspection(inspectionId);
        setActiveInspection(inspection);
        setActiveVehicle(inspection.vehicle || null);
        const nextPlate =
          inspection.vehicle?.basicInfo?.licensePlate || inspection.manualEntry?.licensePlate || "";
        setLicensePlate(nextPlate);
        setActiveTab("inspections");
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
      } finally {
        setActionBusyId(null);
      }
    },
    [setFeedback]
  );

  const handleDeleteInspectionRecord = useCallback(
    async (record) => {
      if (!record?._id) return;
      if (!window.confirm("Delete this inspection report?")) {
        return;
      }
      setActionBusyId(`delete:${record._id}`);
      try {
        await deleteVehicleInspection(record._id);
        if (activeInspection?._id === record._id) {
          setActiveInspection(null);
          setActiveVehicle(null);
          setLicensePlate("");
          setHistory([]);
        }
        setFeedback({ type: "success", message: "Inspection report deleted." });
        loadAssignments();
        loadInspectionRecords();
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
      } finally {
        setActionBusyId(null);
      }
    },
    [activeInspection?._id, loadAssignments, loadInspectionRecords, setFeedback]
  );

  const handleDownloadReports = useCallback(() => {
    if (!inspectionRecords.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 48;
    const headerY = 60;
    const now = new Date();

    doc.setFontSize(18);
    doc.text("Inspection Reports", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Total records: ${inspectionRecords.length}`, marginLeft, headerY + 35);

    const activeFilters = [];
    if (recordFilters.plate) activeFilters.push(`Plate: ${recordFilters.plate}`);
    if (recordFilters.status) {
      const statusLabel = STATUS_FILTER_OPTIONS.find((option) => option.value === recordFilters.status)?.label;
      if (statusLabel) activeFilters.push(`Status: ${statusLabel}`);
    }
    if (recordFilters.decision) {
      const decisionLabel = DECISION_FILTER_OPTIONS.find((option) => option.value === recordFilters.decision)?.label;
      if (decisionLabel) activeFilters.push(`Decision: ${decisionLabel}`);
    }
    if (recordFilters.category) {
      const categoryLabel = CATEGORY_FILTER_OPTIONS.find((option) => option.value === recordFilters.category)?.label;
      if (categoryLabel) activeFilters.push(`Category: ${categoryLabel}`);
    }
    if (recordFilters.from) activeFilters.push(`From: ${recordFilters.from}`);
    if (recordFilters.to) activeFilters.push(`To: ${recordFilters.to}`);

    if (activeFilters.length > 0) {
      doc.text(`Filters: ${activeFilters.join(" | ")}`, marginLeft, headerY + 50);
    }

    const rows = inspectionRecords.map((record, index) => {
      const vehicle = record.vehicle || {};
      const vehicleInfo = vehicle.basicInfo || {};
      const details = vehicle.details || {};
      const plate = vehicleInfo.licensePlate || record.inspectionId || "-";
      const vehicleName = `${vehicleInfo.make || ""} ${vehicleInfo.model || ""}`.trim() || "-";
      const inspectedAt = record.completedAt || record.updatedAt || record.createdAt;
      const inspectorName = record.inspector?.profile
        ? `${record.inspector.profile.firstName || ""} ${record.inspector.profile.lastName || ""}`.trim()
        : record.inspector?.email || "-";

      return [
        index + 1,
        plate,
        vehicleName,
        details.category || "-",
        statusLabels[record.status] || record.status || "-",
        decisionLabels[record.decision] || record.decision || "-",
        formatDate(inspectedAt),
        inspectorName || "-",
      ];
    });

    autoTable(doc, {
      startY: headerY + 75,
      head: [["#", "Plate", "Vehicle", "Category", "Status", "Decision", "Inspected", "Inspector"]],
      body: rows,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
      },
    });

    doc.save("inspection-reports.pdf");
  }, [inspectionRecords, recordFilters]);

  useEffect(() => {
    loadInspectionRecords();
  }, [loadInspectionRecords]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (activeTab === "vehicles") {
      loadPendingVehicles();
    }
  }, [activeTab, loadPendingVehicles]);

  useEffect(() => {
    if (activeVehicle?.basicInfo?.licensePlate) {
      setLicensePlate(activeVehicle.basicInfo.licensePlate);
    }
    if (activeVehicle?._id) {
      loadHistory(activeVehicle._id);
    } else {
      setHistory([]);
    }
  }, [activeVehicle, loadHistory]);

  useEffect(() => {
    if (!activeInspection) {
      setFormState({
        mileage: "",
        notes: "",
        checklist: createEmptyChecklist(),
        photos: [],
        documents: [],
        inspectionLocation: "",
        weatherConditions: "",
        fuelLevel: "",
        generalCondition: "",
        exteriorCondition: "",
        interiorCondition: "",
        safetyConcerns: "",
      });
      return;
    }

    setFormState({
      mileage: activeInspection.mileage ?? "",
      notes: activeInspection.notes || "",
      checklist: mergeChecklistState(activeInspection.checklist),
      photos: activeInspection.photos || [],
      documents: activeInspection.documents || [],
      inspectionLocation: activeInspection.inspectionLocation || "",
      weatherConditions: activeInspection.weatherConditions || "",
      fuelLevel: activeInspection.fuelLevel || "",
      generalCondition: activeInspection.generalCondition || "",
      exteriorCondition: activeInspection.exteriorCondition || "",
      interiorCondition: activeInspection.interiorCondition || "",
      safetyConcerns: activeInspection.safetyConcerns || "",
    });
  }, [activeInspection]);

  const handleLicensePlateChange = useCallback(async (plateValue) => {
    const normalizedPlate = plateValue.trim().toUpperCase();
    setLicensePlate(normalizedPlate);

    if (normalizedPlate.length >= 3) { // Start searching after 3 characters
      try {
        // Try to find vehicle by license plate
        const data = await startManualVehicleInspection({
          licensePlate: normalizedPlate,
          inspectorId,
          checklist: createEmptyChecklist(),
          notes: "",
        });

        if (data.vehicle && data.inspection) {
          setActiveVehicle(data.vehicle);
          setActiveInspection(data.inspection);
          
          // Auto-fill form with vehicle data
          const vehicle = data.vehicle;
          const inspection = data.inspection;
          
          setFormState(prev => ({
            ...prev,
            mileage: vehicle.details?.mileage || inspection.mileage || "",
            generalCondition: vehicle.details?.condition || "",
            exteriorCondition: vehicle.details?.exteriorCondition || "",
            interiorCondition: vehicle.details?.interiorCondition || "",
            fuelLevel: vehicle.details?.fuelLevel || "",
            checklist: mergeChecklistState(inspection.checklist),
            notes: inspection.notes || "",
            photos: inspection.photos || [],
            documents: inspection.documents || [],
            inspectionLocation: inspection.inspectionLocation || "",
            weatherConditions: inspection.weatherConditions || "",
            safetyConcerns: inspection.safetyConcerns || "",
          }));

          if (vehicle._id) {
            loadHistory(vehicle._id);
          }
        }
      } catch (error) {
        // If vehicle not found or error occurs, don't show error for partial searches
        if (normalizedPlate.length > 5) { // Only show error for complete plate numbers
          console.log('Vehicle lookup failed:', error.message);
        }
      }
    }
  }, [inspectorId, loadHistory]);

  const handleSubmit = async (action) => {
    if (!inspectorId) {
      setFeedback({ type: "error", message: "Inspector profile is not loaded." });
      return;
    }

    const normalizedPlate = licensePlate.trim().toUpperCase();
    if (!normalizedPlate) {
      setFeedback({ type: "error", message: "Enter a vehicle license plate to continue." });
      return;
    }

    let inspectionRecord = activeInspection;
    let vehicleRecord = activeVehicle;

    const payload = {
      checklist: formState.checklist,
      notes: formState.notes,
      photos: sanitizeAttachments(formState.photos),
      documents: sanitizeAttachments(formState.documents),
      inspectionLocation: formState.inspectionLocation || undefined,
      weatherConditions: formState.weatherConditions || undefined,
      fuelLevel: formState.fuelLevel || undefined,
      generalCondition: formState.generalCondition || undefined,
      exteriorCondition: formState.exteriorCondition || undefined,
      interiorCondition: formState.interiorCondition || undefined,
      safetyConcerns: formState.safetyConcerns || undefined,
    };

    try {
      const sanitizedPhotos = payload.photos;
      const sanitizedDocuments = payload.documents;

      if (formState.mileage !== "") {
        const numericMileage = Number(formState.mileage);
        if (Number.isNaN(numericMileage) || numericMileage < 0) {
          throw new Error("Mileage must be a positive number");
        }
        payload.mileage = numericMileage;
      }

      const needsFreshInspection =
        !inspectionRecord ||
        !vehicleRecord ||
        (vehicleRecord.basicInfo?.licensePlate && vehicleRecord.basicInfo.licensePlate !== normalizedPlate);

      if (needsFreshInspection) {
        const seedPayload = {
          licensePlate: normalizedPlate,
          inspectorId,
          checklist: formState.checklist,
          notes: formState.notes,
          mileage: payload.mileage,
          inspectionLocation: formState.inspectionLocation || undefined,
          weatherConditions: formState.weatherConditions || undefined,
          fuelLevel: formState.fuelLevel || undefined,
          generalCondition: formState.generalCondition || undefined,
          exteriorCondition: formState.exteriorCondition || undefined,
          interiorCondition: formState.interiorCondition || undefined,
          safetyConcerns: formState.safetyConcerns || undefined,
          photos: sanitizedPhotos,
          documents: sanitizedDocuments,
        };

        const data = await startManualVehicleInspection(seedPayload);
        inspectionRecord = data.inspection;
        vehicleRecord = data.vehicle || null;
        setActiveInspection(data.inspection);
        setActiveVehicle(vehicleRecord);
        setLicensePlate(normalizedPlate);

        if (!inspectionRecord) {
          throw new Error("Unable to open inspection for this vehicle");
        }
      }

      setLicensePlate(normalizedPlate);

      if (!inspectionRecord) {
        throw new Error("No inspection available to update");
      }

      if (action === "save") {
        payload.status = "in_progress";
        payload.decision = inspectionRecord.decision || "pending";
      } else if (action === "approve") {
        payload.status = "completed";
        payload.decision = "available";
      } else if (action === "reject") {
        payload.status = "completed";
        payload.decision = "needs_maintenance";
      }

      const updatedInspection = await updateVehicleInspection(inspectionRecord._id, payload);
      setActiveInspection(updatedInspection);
      setFeedback({ type: "success", message: "Inspection updated successfully" });

      if (payload.status === "completed" && vehicleRecord) {
        setActiveVehicle((prev) => {
          if (!prev) return prev;
          const decision = payload.decision;
          return {
            ...prev,
            inspectionStatus: decision === "available" ? "available" : "needs_maintenance",
            lastInspection: {
              inspectionId: updatedInspection.inspectionId,
              inspectedAt: updatedInspection.completedAt || new Date().toISOString(),
              decision,
              inspector: inspectorId,
              notes: updatedInspection.notes,
            },
            availability: prev.availability
              ? { ...prev.availability, isAvailable: decision === "available" }
              : prev.availability,
          };
        });
      }

      if (vehicleRecord?._id) {
        await loadHistory(vehicleRecord._id);
      }

      loadAssignments();
      loadInspectionRecords();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  };

  const handleApproveVehicle = useCallback(async (vehicleId, notes = "") => {
    try {
      setActionBusyId(`approve:${vehicleId}`);
      await approveVehicle(vehicleId, notes);
      setFeedback({ type: "success", message: "Vehicle approved successfully" });
      loadPendingVehicles();
      setApprovalModal(null);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setActionBusyId(null);
    }
  }, [loadPendingVehicles]);

  const handleRejectVehicle = useCallback(async (vehicleId, reason = "") => {
    try {
      setActionBusyId(`reject:${vehicleId}`);
      await rejectVehicle(vehicleId, reason);
      setFeedback({ type: "success", message: "Vehicle rejected successfully" });
      loadPendingVehicles();
      setApprovalModal(null);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setActionBusyId(null);
    }
  }, [loadPendingVehicles]);

  const isCompletedInspection = activeInspection?.status === "completed";
  const formDisabled = false;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-gray-900">
      <InspectorNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <InspectorHero activeTab={activeTab} user={user} metrics={heroMetrics} />

        {feedback && (
          <div className={`rounded-xl p-4 mb-6 ${
            feedback.type === "error" 
              ? "bg-red-500/20 border border-red-500/30 text-red-300" 
              : "bg-green-500/20 border border-green-500/30 text-green-300"
          }`}>
            <div className="flex items-center justify-between">
              <span>{feedback.message}</span>
              <button 
                type="button" 
                className="text-gray-400 hover:text-white transition-colors duration-200"
                onClick={() => setFeedback(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">{/* Content wrapper for consistent spacing */}

        {activeTab === "overview" && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" aria-label="Key inspector metrics">
              {overviewCards.map((card) => (
                <article key={card.title} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm font-medium mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
                  <p className="text-gray-500 text-sm">{card.hint}</p>
                </article>
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <header className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Active inspection</h3>
                    <p className="text-gray-400">
                      {activeVehicle
                        ? `${activeVehicle.basicInfo?.make || ""} ${activeVehicle.basicInfo?.model || ""}`.trim() ||
                        "Vehicle details loaded"
                        : "Jump into the workspace to start a new report"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    onClick={() => setActiveTab("inspections")}
                  >
                    Open workspace
                  </button>
                </header>
                <VehicleSummary vehicle={activeVehicle} enteredPlate={licensePlate} />
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssignmentsPanel
                assignments={assignments}
                onSelect={handleSelectAssignment}
                onCreateNew={handleCreateNewInspection}
                isLoading={isLoadingAssignments}
                error={assignmentsError}
                activeInspectionId={activeInspection?._id}
              />
              <HistoryPanel entries={history} isLoading={isLoadingHistory} />
            </div>
          </>
        )}

        {activeTab === "inspections" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <header className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Inspection workspace</h3>
                  <p className="text-gray-400">
                    {activeVehicle
                      ? `${activeVehicle.basicInfo?.make || ""} ${activeVehicle.basicInfo?.model || ""}`.trim() ||
                      "Vehicle details loaded"
                      : "Enter vehicle details and capture findings"}
                  </p>
                </div>
                {isCompletedInspection && (
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                    Completed
                  </span>
                )}
              </header>

              <VehicleSummary vehicle={activeVehicle} enteredPlate={licensePlate} />

              <form className="space-y-6 mt-6" onSubmit={(event) => event.preventDefault()}>
                <label className="block space-y-2">
                  <span className="text-white font-medium">License Plate</span>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                    value={licensePlate}
                    onChange={(event) => handleLicensePlateChange(event.target.value)}
                    placeholder="e.g. ABC-1234 (auto-fills form when found)"
                    disabled={formDisabled}
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-2">
                    <span className="text-white font-medium">Status</span>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                      value={
                        statusLabels[activeInspection?.status] ||
                        (activeInspection ? activeInspection.status : "Not started")
                      }
                      disabled
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-white font-medium">Decision</span>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                      value={
                        decisionLabels[activeInspection?.decision] ||
                        (activeInspection ? activeInspection.decision : "Pending")
                      }
                      disabled
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-2">
                    <span className="text-white font-medium">Mileage</span>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                      value={formState.mileage}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, mileage: event.target.value }))
                      }
                      disabled={formDisabled}
                      placeholder="Current mileage"
                      min="0"
                    />
                  </label>
                </div>

                <section className="space-y-4">
                  <h4 className="text-white font-semibold">Inspection Context</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Inspection Location</span>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.inspectionLocation}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, inspectionLocation: event.target.value }))
                        }
                        disabled={formDisabled}
                        placeholder="Garage, yard, on-site etc."
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Weather Conditions</span>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.weatherConditions}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, weatherConditions: event.target.value }))
                        }
                        disabled={formDisabled}
                        placeholder="Sunny, rainy, indoor"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Fuel Level</span>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.fuelLevel}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, fuelLevel: event.target.value }))
                        }
                        disabled={formDisabled}
                      >
                        {fuelLevelOptions.map((option) => (
                          <option key={option.value || "fuel-empty-option"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Overall Condition</span>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.generalCondition}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, generalCondition: event.target.value }))
                        }
                        disabled={formDisabled}
                      >
                        {conditionOptions.map((option) => (
                          <option key={option.value || "general-empty-option"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Exterior Condition</span>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.exteriorCondition}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, exteriorCondition: event.target.value }))
                        }
                        disabled={formDisabled}
                      >
                        {conditionOptions.map((option) => (
                          <option key={`exterior-${option.value || "empty"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-white font-medium">Interior Condition</span>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent disabled:opacity-50"
                        value={formState.interiorCondition}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, interiorCondition: event.target.value }))
                        }
                        disabled={formDisabled}
                      >
                        {conditionOptions.map((option) => (
                          <option key={`interior-${option.value || "empty"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <ChecklistEditor
                  checklist={formState.checklist}
                  onChange={(nextChecklist) =>
                    setFormState((prev) => ({ ...prev, checklist: nextChecklist }))
                  }
                  disabled={formDisabled}
                />

                <label className="block space-y-2">
                  <span className="text-white font-medium">Safety Concerns</span>
                  <textarea
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent resize-none disabled:opacity-50"
                    rows={3}
                    value={formState.safetyConcerns}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, safetyConcerns: event.target.value }))
                    }
                    disabled={formDisabled}
                    placeholder="List any defects or follow-up actions required"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-white font-medium">Notes</span>
                  <textarea
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent resize-none disabled:opacity-50"
                    rows={4}
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    disabled={formDisabled}
                  />
                </label>

                <AttachmentEditor
                  label="Photos"
                  items={formState.photos}
                  onChange={(next) => setFormState((prev) => ({ ...prev, photos: next }))}
                  disabled={formDisabled}
                />

                <AttachmentEditor
                  label="Documents"
                  items={formState.documents}
                  onChange={(next) => setFormState((prev) => ({ ...prev, documents: next }))}
                  disabled={formDisabled}
                />

                <div className="flex flex-wrap gap-4 pt-6">
                  <button
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("save")}
                  >
                    Save Progress
                  </button>
                  <button
                    className="bg-[#FF5A00] hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("approve")}
                  >
                    Mark Available
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("reject")}
                  >
                    Needs Maintenance
                  </button>
                </div>
              </form>
            </section>

            <div className="space-y-6">
              <AssignmentsPanel
                assignments={assignments}
                onSelect={handleSelectAssignment}
                onCreateNew={handleCreateNewInspection}
                isLoading={isLoadingAssignments}
                error={assignmentsError}
                activeInspectionId={activeInspection?._id}
              />
              <HistoryPanel entries={history} isLoading={isLoadingHistory} />
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <HistoryPanel entries={history} isLoading={isLoadingHistory} />
        )}

        {activeTab === "records" && (
          <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <header className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Inspection reports</h3>
                <p className="text-gray-400">Search, export, and audit inspection activity</p>
              </div>
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleDownloadReports}
                disabled={recordsLoading || inspectionRecords.length === 0}
              >
                Download
              </button>
            </header>

            <form
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              onSubmit={(event) => {
                event.preventDefault();
                setRecordFilters(recordFiltersDraft);
              }}
            >
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">License Plate</span>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="plate"
                  value={recordFiltersDraft.plate}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, plate: event.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. ABC-1234"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">Status</span>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="status"
                  value={recordFiltersDraft.status}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || "all-status"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">Decision</span>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="decision"
                  value={recordFiltersDraft.decision}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, decision: event.target.value }))
                  }
                >
                  {DECISION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || "all-decision"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">Category</span>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="category"
                  value={recordFiltersDraft.category}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  {CATEGORY_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || "all-category"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">From date</span>
                <input
                  type="date"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="from"
                  value={recordFiltersDraft.from}
                  max={getTodayDate()}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, from: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">To date</span>
                <input
                  type="date"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                  name="to"
                  value={recordFiltersDraft.to}
                  max={getTodayDate()}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, to: event.target.value }))
                  }
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    setRecordFiltersDraft(INITIAL_RECORD_FILTERS);
                    setRecordFilters(INITIAL_RECORD_FILTERS);
                  }}
                >
                  Reset
                </button>
                <button className="bg-[#FF5A00] hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-200" type="submit">
                  Apply
                </button>
              </div>
            </form>
            {recordsError && <p className="text-red-400 mb-4">{recordsError}</p>}
            {recordsLoading ? (
              <p className="text-gray-400">Loading inspection records...</p>
            ) : inspectionRecords.length === 0 ? (
              <p className="text-gray-400">No inspection records match the current filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-3 text-left text-white font-semibold">Plate</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Vehicle</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Category</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Decision</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Inspected</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Inspector</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionRecords.map((record) => {
                      const vehicle = record.vehicle || {};
                      const plate = vehicle.basicInfo?.licensePlate || record.inspectionId;
                      const vehicleName = `${vehicle.basicInfo?.make || ""} ${vehicle.basicInfo?.model || ""}`.trim();
                      const inspectedAt = record.completedAt || record.updatedAt || record.createdAt;
                      const editBusy = actionBusyId === `edit:${record._id}`;
                      const deleteBusy = actionBusyId === `delete:${record._id}`;
                      return (
                        <tr key={record._id} className="border-b border-gray-700 hover:bg-gray-900/30">
                          <td className="px-4 py-3 text-gray-300">{plate || "-"}</td>
                          <td className="px-4 py-3 text-gray-300">{vehicleName || "-"}</td>
                          <td className="px-4 py-3 text-gray-300">{vehicle.details?.category || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "completed" ? "bg-green-500/20 text-green-300" :
                              record.status === "in_progress" ? "bg-yellow-500/20 text-yellow-300" :
                              "bg-gray-500/20 text-gray-300"
                            }`}>
                              {statusLabels[record.status] || record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.decision === "available" ? "bg-green-500/20 text-green-300" :
                              record.decision === "needs_maintenance" ? "bg-red-500/20 text-red-300" :
                              "bg-yellow-500/20 text-yellow-300"
                            }`}>
                              {decisionLabels[record.decision] || record.decision}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{formatDate(inspectedAt)}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {record.inspector?.profile
                              ? `${record.inspector.profile.firstName} ${record.inspector.profile.lastName}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-[#FF5A00] hover:text-orange-400 transition-colors duration-200 disabled:opacity-50"
                                onClick={() => handleEditInspectionRecord(record._id)}
                                disabled={editBusy || deleteBusy}
                              >
                                {editBusy ? "Opening..." : "Edit"}
                              </button>
                              <button
                                type="button"
                                className="text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
                                onClick={() => handleDeleteInspectionRecord(record)}
                                disabled={editBusy || deleteBusy}
                              >
                                {deleteBusy ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "vehicles" && (
          <section className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <header className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Vehicle Approval</h3>
                <p className="text-gray-400">Review and approve vehicles submitted by owners</p>
              </div>
              <div className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">
                {filteredPendingVehicles.length} Pending
              </div>
            </header>

            {/* Search Filter */}
            <div className="mb-6">
              <label className="block space-y-2">
                <span className="text-white font-medium text-sm">Search Vehicles</span>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                    placeholder="Search by vehicle, license plate, or category..."
                    value={vehicleSearchTerm}
                    onChange={(e) => setVehicleSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                {vehicleSearchTerm && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Showing {filteredPendingVehicles.length} of {pendingVehicles.length} vehicles
                    </span>
                    <button
                      type="button"
                      className="text-[#FF5A00] hover:text-orange-400 transition-colors duration-200"
                      onClick={() => setVehicleSearchTerm("")}
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </label>
            </div>

            {vehiclesError && <p className="text-red-400 mb-4">{vehiclesError}</p>}

            {isLoadingVehicles ? (
              <p className="text-gray-400">Loading pending vehicles...</p>
            ) : filteredPendingVehicles.length === 0 ? (
              <p className="text-gray-400">
                {vehicleSearchTerm ? "No vehicles match your search criteria." : "No vehicles pending approval."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-3 text-left text-white font-semibold">Vehicle</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Plate</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Category</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Condition</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Daily Rate</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Location</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingVehicles.map((vehicle) => {
                      const vehicleName = `${vehicle.basicInfo?.make || ""} ${vehicle.basicInfo?.model || ""} (${vehicle.basicInfo?.year || ""})`.trim();
                      const approveBusy = actionBusyId === `approve:${vehicle._id}`;
                      const rejectBusy = actionBusyId === `reject:${vehicle._id}`;
                      return (
                        <tr key={vehicle._id} className="border-b border-gray-700 hover:bg-gray-900/30">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-white font-medium">{vehicleName}</div>
                              <div className="text-gray-400 text-sm">
                                {vehicle.details?.fuelType} • {vehicle.details?.transmission}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{vehicle.basicInfo?.licensePlate || "N/A"}</td>
                          <td className="px-4 py-3 text-gray-300">{vehicle.details?.category || "N/A"}</td>
                          <td className="px-4 py-3 text-gray-300">{vehicle.details?.condition || "N/A"}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {vehicle.pricing?.currency} {vehicle.pricing?.dailyRate || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {vehicle.location?.city ? `${vehicle.location.city}` : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">
                              {vehicle.status === "pending" ? "Pending Approval" : vehicle.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Approval Modal */}
            {approvalModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-white">
                      {approvalModal.type === "approve" ? "Approve" : "Reject"} Vehicle
                    </h4>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                      onClick={() => setApprovalModal(null)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-gray-300">
                      {approvalModal.type === "approve"
                        ? "Are you sure you want to approve this vehicle?"
                        : "Please provide a reason for rejecting this vehicle:"}
                    </p>

                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                      <strong className="text-white">
                        {approvalModal.vehicle.basicInfo?.make} {approvalModal.vehicle.basicInfo?.model} ({approvalModal.vehicle.basicInfo?.year})
                      </strong>
                      <br />
                      <span className="text-gray-400">License: {approvalModal.vehicle.basicInfo?.licensePlate}</span>
                    </div>

                    {approvalModal.type === "approve" ? (
                      <div>
                        <label className="block space-y-2">
                          <span className="text-white font-medium text-sm">Approval Notes (Optional):</span>
                          <textarea
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Add any inspection notes..."
                            value={approvalModal.notes || ""}
                            onChange={(e) => setApprovalModal(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <label className="block space-y-2">
                          <span className="text-white font-medium text-sm">Rejection Reason *:</span>
                          <textarea
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent resize-none"
                            rows={4}
                            placeholder="Please explain why this vehicle is being rejected..."
                            value={approvalModal.reason || ""}
                            onChange={(e) => setApprovalModal(prev => ({ ...prev, reason: e.target.value }))}
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      onClick={() => setApprovalModal(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors duration-200 ${
                        approvalModal.type === "approve" 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-red-600 hover:bg-red-700 text-white"
                      } disabled:opacity-50`}
                      onClick={() => {
                        if (approvalModal.type === "approve") {
                          handleApproveVehicle(approvalModal.vehicle._id, approvalModal.notes || "");
                        } else {
                          if (!approvalModal.reason?.trim()) {
                            alert("Please provide a reason for rejection");
                            return;
                          }
                          handleRejectVehicle(approvalModal.vehicle._id, approvalModal.reason);
                        }
                      }}
                      disabled={
                        actionBusyId === `approve:${approvalModal.vehicle._id}` ||
                        actionBusyId === `reject:${approvalModal.vehicle._id}` ||
                        (approvalModal.type === "reject" && !approvalModal.reason?.trim())
                      }
                    >
                      {approvalModal.type === "approve" ? "Approve Vehicle" : "Reject Vehicle"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "profile" && (
          <ProfilePage 
            user={user} 
            onProfileUpdate={(updatedUser) => {
              console.log('Profile updated:', updatedUser);
            }} 
          />
        )}

        </div>{/* End content wrapper */}
      </main>
    </div>
  );
}

export default InspectorDashboard;