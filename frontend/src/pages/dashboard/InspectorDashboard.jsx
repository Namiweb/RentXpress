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
import InspectorNavigation from "./inspector/components/InspectorNavigation.jsx";
import InspectorHero from "./inspector/components/InspectorHero.jsx";

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

function VehicleSummary({ vehicle, enteredPlate }) {
  if (!vehicle && !enteredPlate) {
    return (
      <div className="vehicle-summary">
        <p className="muted">Enter a license plate to begin an inspection.</p>
      </div>
    );
  }

  const info = vehicle?.basicInfo || {};
  const details = vehicle?.details || {};
  const inspectionStatus = vehicle?.inspectionStatus || "pending";
  const statusClass = inspectionStatus === "not_required" ? "status-pending" : `status-${inspectionStatus}`;

  return (
    <div className="vehicle-summary">
      <div className="vehicle-summary-row">
        <strong>License Plate:</strong> {info.licensePlate || enteredPlate || "-"}
      </div>
      {vehicle ? (
        <>
          <div className="vehicle-summary-row">
            <strong>Vehicle:</strong> {info.make || "Unknown"} {info.model || ""}
            {info.year ? ` (${info.year})` : ""}
          </div>
          <div className="vehicle-summary-row">
            <strong>Category:</strong> {details.category || "-"}
          </div>
          <div className="vehicle-summary-row">
            <strong>Inspection Status:</strong> {" "}
            <span className={`status ${statusClass}`}>
              {statusLabels[inspectionStatus] || inspectionStatus}
            </span>
          </div>
          {vehicle.lastInspection?.inspectedAt && (
            <div className="vehicle-summary-row">
              <strong>Last Inspected:</strong> {formatDate(vehicle.lastInspection.inspectedAt)}
            </div>
          )}
          {vehicle.lastInspection?.decision && (
            <div className="vehicle-summary-row">
              <strong>Last Decision:</strong> {" "}
              <span className={`status status-${vehicle.lastInspection.decision}`}>
                {decisionLabels[vehicle.lastInspection.decision] || vehicle.lastInspection.decision}
              </span>
            </div>
          )}
          {vehicle.lastInspection?.issues && (
            <div className="vehicle-summary-row">
              <strong>Recorded Issues:</strong> {vehicle.lastInspection.issues}
            </div>
          )}
        </>
      ) : (
        <p className="muted">No matching vehicle found yet.</p>
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
    <section className="form-section">
      <header className="form-section-header">
        <h4>{label}</h4>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            if (disabled) return;
            onChange([...items, { label: "", url: "" }]);
          }}
          disabled={disabled}
        >
          Add
        </button>
      </header>
      {items.length === 0 && <p className="muted">No {label.toLowerCase()} added.</p>}
      {items.map((item, index) => (
        <div className="form-row" key={`${label}-${index}`}>
          <input
            placeholder="Label"
            value={item.label || ""}
            onChange={(event) => handleChange(index, "label", event.target.value)}
            disabled={disabled}
          />
          <input
            placeholder="URL"
            value={item.url || ""}
            onChange={(event) => handleChange(index, "url", event.target.value)}
            disabled={disabled}
          />
          <button
            className="btn btn-text"
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
    <section className="form-section">
      <h4>Inspection Checklist</h4>
      <div className="checklist-grid">
        {CHECKLIST_ITEMS.map((item) => (
          <div className="checklist-item" key={item.key}>
            <label>
              <span>{item.label}</span>
              <select
                value={checklist[item.key]?.status || "pending"}
                onChange={(event) => handleStatusChange(item.key, event.target.value)}
                disabled={disabled}
              >
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </label>
            <textarea
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
    <section className="panel inspector-panel">
      <header className="panel-header">
        <h3>Inspection History</h3>
      </header>
      {isLoading && <p>Loading history...</p>}
      {!isLoading && entries.length === 0 && <p>No inspection history available.</p>}
      {!isLoading && entries.length > 0 && (
        <ul className="timeline">
          {entries.map((entry) => (
            <li key={entry._id}>
              <div className="timeline-header">
                <strong>{formatDate(entry.completedAt || entry.createdAt)}</strong>
                <span className={`status status-${entry.decision}`}>
                  {decisionLabels[entry.decision] || entry.decision}
                </span>
              </div>
              <div className="timeline-body">
                <p>Inspector: {entry.inspector?.profile?.firstName || ""} {entry.inspector?.profile?.lastName || ""}</p>
                {entry.notes && <p>Notes: {entry.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
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
    <section className="panel inspector-panel">
      <header className="panel-header">
        <div>
          <h3>My inspections</h3>
          <p className="panel-subtitle">Switch between vehicles you are handling</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onCreateNew}>
          New manual inspection
        </button>
      </header>
      {error && <p className="error-text">{error}</p>}
      {isLoading ? (
        <p>Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="muted">No active assignments. Start a manual inspection to begin.</p>
      ) : (
        <ul className="list compact">
          {assignments.map((item) => {
            const vehicle = item.vehicle || {};
            const title = `${vehicle.basicInfo?.make || ""} ${vehicle.basicInfo?.model || ""}`.trim() ||
              "Vehicle";
            const plate = vehicle.basicInfo?.licensePlate || item.inspectionId;
            const isActive = activeInspectionId && item._id === activeInspectionId;
            const statusLabel = statusLabels[item.status] || item.status || "-";
            const decisionLabel = decisionLabels[item.decision] || item.decision || "";
            return (
              <li key={item._id} className="list-item assignment-item">
                <div>
                  <strong>{title}</strong>
                  <p>Plate: {plate || "-"}</p>
                  <p className="muted">
                    {statusLabel}
                    {decisionLabel && decisionLabel !== "Pending" ? ` · ${decisionLabel}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onSelect?.(item)}
                  disabled={isActive}
                >
                  {isActive ? "Active" : "Open"}
                </button>
              </li>
            );
          })}
        </ul>
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

  const isCompletedInspection = activeInspection?.status === "completed";
  const formDisabled = false;

  return (
    <div className="inspector-dashboard">
      <InspectorNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="inspector-main">
        <InspectorHero activeTab={activeTab} user={user} metrics={heroMetrics} />

        {feedback && (
          <div
            className={`inspector-alert ${
              feedback.type === "error" ? "inspector-alert--error" : "inspector-alert--success"
            }`}
          >
            <span>{feedback.message}</span>
            <button type="button" className="btn btn-text" onClick={() => setFeedback(null)}>
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "overview" && (
          <>
            <section className="inspector-highlight-grid" aria-label="Key inspector metrics">
              {overviewCards.map((card) => (
                <article key={card.title} className="inspector-highlight-card">
                  <p className="inspector-highlight-label">{card.title}</p>
                  <p className="inspector-highlight-value">{card.value}</p>
                  <p className="inspector-highlight-hint">{card.hint}</p>
                </article>
              ))}
            </section>

            <div className="inspector-grid inspector-grid--balanced">
              <section className="panel inspector-panel">
                <header className="panel-header">
                  <div>
                    <h3>Active inspection</h3>
                    <p className="panel-subtitle">
                      {activeVehicle
                        ? `${activeVehicle.basicInfo?.make || ""} ${activeVehicle.basicInfo?.model || ""}`.trim() ||
                          "Vehicle details loaded"
                        : "Jump into the workspace to start a new report"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab("inspections")}
                  >
                    Open workspace
                  </button>
                </header>
                <VehicleSummary vehicle={activeVehicle} enteredPlate={licensePlate} />
              </section>
            </div>

            <AssignmentsPanel
              assignments={assignments}
              onSelect={handleSelectAssignment}
              onCreateNew={handleCreateNewInspection}
              isLoading={isLoadingAssignments}
              error={assignmentsError}
              activeInspectionId={activeInspection?._id}
            />

            <HistoryPanel entries={history} isLoading={isLoadingHistory} />
          </>
        )}

        {activeTab === "inspections" && (
          <div className="inspector-grid inspector-grid--split">
            <section className="panel inspector-panel inspector-panel--stretch">
              <header className="panel-header">
                <div>
                  <h3>Inspection workspace</h3>
                  <p className="panel-subtitle">
                    {activeVehicle
                      ? `${activeVehicle.basicInfo?.make || ""} ${activeVehicle.basicInfo?.model || ""}`.trim() ||
                        "Vehicle details loaded"
                      : "Enter vehicle details and capture findings"}
                  </p>
                </div>
                {isCompletedInspection && <span className="inspector-status-tag">Completed</span>}
              </header>

              <VehicleSummary vehicle={activeVehicle} enteredPlate={licensePlate} />

              <form className="form-panel inspector-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  License Plate
                  <input
                    value={licensePlate}
                    onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                    placeholder="e.g. ABC-1234"
                    disabled={formDisabled}
                  />
                </label>

                <div className="form-row">
                  <label>
                    Status
                    <input
                      value={
                        statusLabels[activeInspection?.status] ||
                        (activeInspection ? activeInspection.status : "Not started")
                      }
                      disabled
                    />
                  </label>
                  <label>
                    Decision
                    <input
                      value={
                        decisionLabels[activeInspection?.decision] ||
                        (activeInspection ? activeInspection.decision : "Pending")
                      }
                      disabled
                    />
                  </label>
                </div>

                <label>
                  Current Mileage (km)
                  <input
                    type="number"
                    value={formState.mileage}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, mileage: event.target.value }))
                    }
                    disabled={formDisabled}
                    min={0}
                  />
                </label>

                <section className="form-section">
                  <h4>Inspection Context</h4>
                  <div className="form-row">
                    <label>
                      Inspection Location
                      <input
                        value={formState.inspectionLocation}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, inspectionLocation: event.target.value }))
                        }
                        disabled={formDisabled}
                        placeholder="Garage, yard, on-site etc."
                      />
                    </label>
                    <label>
                      Weather Conditions
                      <input
                        value={formState.weatherConditions}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, weatherConditions: event.target.value }))
                        }
                        disabled={formDisabled}
                        placeholder="Sunny, rainy, indoor"
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Fuel Level
                      <select
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
                    <label>
                      Overall Condition
                      <select
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

                  <div className="form-row">
                    <label>
                      Exterior Condition
                      <select
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
                    <label>
                      Interior Condition
                      <select
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

                <label>
                  Safety Concerns
                  <textarea
                    rows={3}
                    value={formState.safetyConcerns}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, safetyConcerns: event.target.value }))
                    }
                    disabled={formDisabled}
                    placeholder="List any defects or follow-up actions required"
                  />
                </label>

                <label>
                  Notes
                  <textarea
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

                <div className="form-actions inspector-form__actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("save")}
                  >
                    Save Progress
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("approve")}
                  >
                    Mark Available
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={formDisabled}
                    onClick={() => handleSubmit("reject")}
                  >
                    Needs Maintenance
                  </button>
                </div>
              </form>
            </section>

            <div className="panel-stack inspector-stack">
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
          <section className="panel inspector-panel">
            <header className="panel-header">
              <div>
                <h3>Inspection reports</h3>
                <p className="panel-subtitle">Search, export, and audit inspection activity</p>
              </div>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDownloadReports}
                disabled={recordsLoading || inspectionRecords.length === 0}
              >
                Download
              </button>
            </header>

            <form
              className="filter-grid compact"
              onSubmit={(event) => {
                event.preventDefault();
                setRecordFilters(recordFiltersDraft);
              }}
            >
              <label>
                License Plate
                <input
                  name="plate"
                  value={recordFiltersDraft.plate}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, plate: event.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. ABC-1234"
                />
              </label>
              <label>
                Status
                <select
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
              <label>
                Decision
                <select
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
              <label>
                Category
                <select
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
              <label>
                From date
                <input
                  type="date"
                  name="from"
                  value={recordFiltersDraft.from}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, from: event.target.value }))
                  }
                />
              </label>
              <label>
                To date
                <input
                  type="date"
                  name="to"
                  value={recordFiltersDraft.to}
                  onChange={(event) =>
                    setRecordFiltersDraft((prev) => ({ ...prev, to: event.target.value }))
                  }
                />
              </label>
              <div className="filter-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setRecordFiltersDraft(INITIAL_RECORD_FILTERS);
                    setRecordFilters(INITIAL_RECORD_FILTERS);
                  }}
                >
                  Reset
                </button>
                <button className="btn" type="submit">
                  Apply
                </button>
              </div>
            </form>
            {recordsError && <p className="error-text">{recordsError}</p>}
            {recordsLoading ? (
              <p>Loading inspection records...</p>
            ) : inspectionRecords.length === 0 ? (
              <p className="muted">No inspection records match the current filters.</p>
            ) : (
              <div className="table-wrapper">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>Plate</th>
                      <th>Vehicle</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Decision</th>
                      <th>Inspected</th>
                      <th>Inspector</th>
                      <th>Actions</th>
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
                        <tr key={record._id}>
                          <td>{plate || "-"}</td>
                          <td>{vehicleName || "-"}</td>
                          <td>{vehicle.details?.category || "-"}</td>
                          <td>{statusLabels[record.status] || record.status}</td>
                          <td>{decisionLabels[record.decision] || record.decision}</td>
                          <td>{formatDate(inspectedAt)}</td>
                          <td>
                            {record.inspector?.profile
                              ? `${record.inspector.profile.firstName} ${record.inspector.profile.lastName}`
                              : "-"}
                          </td>
                          <td className="inspection-actions">
                            <button
                              type="button"
                              className="btn btn-text"
                              onClick={() => handleEditInspectionRecord(record._id)}
                              disabled={editBusy || deleteBusy}
                            >
                              {editBusy ? "Opening..." : "Edit"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-text"
                              style={{ color: "#dc2626" }}
                              onClick={() => handleDeleteInspectionRecord(record)}
                              disabled={editBusy || deleteBusy}
                            >
                              {deleteBusy ? "Deleting..." : "Delete"}
                            </button>
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

      </main>
    </div>
  );
}

export default InspectorDashboard;
