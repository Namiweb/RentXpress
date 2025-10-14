import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import { extractDataFromDataUrl, fileToDataUrl } from "../../utils/uploadImage.js";
import { generateBookingReport } from '../../utils/pdfGenerator';


const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "started", "in_progress", "in-progress"]);

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

function buildMediaPreview(asset, fallbackLabel) {
  if (!asset) return null;

  if (typeof asset === "string") {
    return {
      id: `existing-${Math.random().toString(36).slice(2)}`,
      name: fallbackLabel,
      url: asset,
      preview: asset,
      existing: true,
    };
  }

  const contentType = asset.contentType || undefined;
  let preview = asset.url;
  if (!preview && asset.data && contentType) {
    preview = `data:${contentType};base64,${asset.data}`;
  }

  return {
    id: asset._id || `existing-${Math.random().toString(36).slice(2)}`,
    name: asset.name || fallbackLabel,
    url: asset.url,
    data: asset.data,
    contentType,
    preview,
    existing: true,
    uploadedAt: asset.uploadedAt,
  };
}

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

const createInitialForm = (vehicle) => {
  if (!vehicle) {
    return {
      basicInfo: {
        make: "",
        model: "",
        year: "",
        color: "",
        licensePlate: "",
        chassisNumber: "",
        engineNumber: "",
      },
      details: {
        category: "car",
        fuelType: "petrol",
        transmission: "automatic",
        seatingCapacity: "",
        mileage: "",
        features: "",
        condition: "excellent",
      },
      pricing: {
        dailyRate: "",
        weeklyRate: "",
        monthlyRate: "",
        securityDeposit: "",
        currency: "LKR",
      },
      location: {
        address: "",
        city: "",
        province: "",
        latitude: "",
        longitude: "",
      },
      media: {
        images: [],
      },
    };
  }

  const images = Array.isArray(vehicle.images)
    ? vehicle.images
        .map((image, index) => buildMediaPreview(image, `Image ${index + 1}`))
        .filter(Boolean)
    : [];

  return {
    basicInfo: {
      make: vehicle.basicInfo?.make || "",
      model: vehicle.basicInfo?.model || "",
      year: vehicle.basicInfo?.year ? String(vehicle.basicInfo.year) : "",
      color: vehicle.basicInfo?.color || "",
      licensePlate: vehicle.basicInfo?.licensePlate || "",
      chassisNumber: vehicle.basicInfo?.chassisNumber || "",
      engineNumber: vehicle.basicInfo?.engineNumber || "",
    },
    details: {
      category: vehicle.details?.category?.toLowerCase?.() || "car",
      fuelType: vehicle.details?.fuelType?.toLowerCase?.() || "petrol",
      transmission: vehicle.details?.transmission?.toLowerCase?.() || "automatic",
      seatingCapacity: vehicle.details?.seatingCapacity ? String(vehicle.details.seatingCapacity) : "",
      mileage: vehicle.details?.mileage ? String(vehicle.details.mileage) : "",
      features: Array.isArray(vehicle.details?.features) ? vehicle.details.features.join(", ") : "",
      condition: vehicle.details?.condition?.toLowerCase?.() || "excellent",
    },
    pricing: {
      dailyRate: vehicle.pricing?.dailyRate ? String(vehicle.pricing.dailyRate) : "",
      weeklyRate: vehicle.pricing?.weeklyRate ? String(vehicle.pricing.weeklyRate) : "",
      monthlyRate: vehicle.pricing?.monthlyRate ? String(vehicle.pricing.monthlyRate) : "",
      securityDeposit: vehicle.pricing?.securityDeposit ? String(vehicle.pricing.securityDeposit) : "",
      currency: vehicle.pricing?.currency || "LKR",
    },
    location: {
      address: vehicle.location?.address || "",
      city: vehicle.location?.city || "",
      province: vehicle.location?.province || "",
      latitude: vehicle.location?.coordinates?.latitude ? String(vehicle.location.coordinates.latitude) : "",
      longitude: vehicle.location?.coordinates?.longitude ? String(vehicle.location.coordinates.longitude) : "",
    },
    media: {
      images,
    },
  };
};

const formatCurrency = (value = 0, currency = "LKR") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

function VehicleForm({ ownerId, vehicle, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(vehicle?._id);
  const [formData, setFormData] = useState(createInitialForm(vehicle));
  const [activeTab, setActiveTab] = useState("basic");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestInspection, setRequestInspection] = useState(() =>
    isEditing ? vehicle?.status !== "approved" : true
  );
  const mustRequestInspection = isEditing && vehicle?.status !== "approved";

  useEffect(() => {
    setFormData(createInitialForm(vehicle));
    setActiveTab("basic");
    setError("");
    setRequestInspection(isEditing ? vehicle?.status !== "approved" : true);
  }, [vehicle, isEditing]);

  const handleChange = (section, field) => (event) => {
    const { value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const uploads = await Promise.all(
        files.map(async (file, index) => {
          const dataUrl = await fileToDataUrl(file);
          const { data, contentType } = extractDataFromDataUrl(dataUrl);
          return {
            id: `new-image-${Date.now()}-${index}`,
            name: file.name,
            preview: dataUrl,
            existing: false,
            fileData: {
              name: file.name,
              data,
              contentType: contentType || file.type || "application/octet-stream",
            },
            contentType: contentType || file.type || "application/octet-stream",
          };
        })
      );

      setFormData((prev) => ({
        ...prev,
        media: {
          ...(prev.media || {}),
          images: [...(prev.media?.images || []), ...uploads],
        },
      }));
    } catch (uploadError) {
      setError(uploadError.message || "Failed to read selected images");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveImage = (imageId) => {
    setFormData((prev) => ({
      ...prev,
      media: {
        ...(prev.media || {}),
        images: (prev.media?.images || []).filter((image) => image.id !== imageId),
      },
    }));
  };

  const getMissingRequiredFields = () => {
    const requiredFields = [];

    if (!formData.basicInfo.make?.trim()) {
      requiredFields.push({ tab: "basic", label: "Make" });
    }
    if (!formData.basicInfo.model?.trim()) {
      requiredFields.push({ tab: "basic", label: "Model" });
    }
    if (!formData.basicInfo.year?.toString().trim()) {
      requiredFields.push({ tab: "basic", label: "Year" });
    }
    if (!formData.pricing.dailyRate?.toString().trim()) {
      requiredFields.push({ tab: "pricing", label: "Daily Rate" });
    }
    if (!formData.location.address?.trim()) {
      requiredFields.push({ tab: "location", label: "Address" });
    }
    if (!formData.location.city?.trim()) {
      requiredFields.push({ tab: "location", label: "City" });
    }

    return requiredFields;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!ownerId) return;

    setError("");
    const missingFields = getMissingRequiredFields();
    if (missingFields.length > 0) {
      const firstMissing = missingFields[0];
      if (firstMissing.tab && firstMissing.tab !== activeTab) {
        setActiveTab(firstMissing.tab);
      }
      const labels = missingFields.map((field) => field.label);
      const formattedList =
        labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0];
      setError(`Please complete the form before submitting. Missing: ${formattedList}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const features = formData.details.features
        ? formData.details.features
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

      const payload = {
        ownerId,
        basicInfo: {
          make: formData.basicInfo.make,
          model: formData.basicInfo.model,
          year: formData.basicInfo.year ? Number(formData.basicInfo.year) : undefined,
          color: formData.basicInfo.color,
          licensePlate: formData.basicInfo.licensePlate,
          chassisNumber: formData.basicInfo.chassisNumber,
          engineNumber: formData.basicInfo.engineNumber,
        },
        details: {
          category: formData.details.category,
          fuelType: formData.details.fuelType,
          transmission: formData.details.transmission,
          seatingCapacity: formData.details.seatingCapacity
            ? Number(formData.details.seatingCapacity)
            : undefined,
          mileage: formData.details.mileage ? Number(formData.details.mileage) : undefined,
          features,
          condition: formData.details.condition,
        },
        pricing: {
          dailyRate: formData.pricing.dailyRate ? Number(formData.pricing.dailyRate) : undefined,
          weeklyRate: formData.pricing.weeklyRate ? Number(formData.pricing.weeklyRate) : undefined,
          monthlyRate: formData.pricing.monthlyRate ? Number(formData.pricing.monthlyRate) : undefined,
          securityDeposit: formData.pricing.securityDeposit
            ? Number(formData.pricing.securityDeposit)
            : undefined,
          currency: formData.pricing.currency || "LKR",
        },
        location: {
          address: formData.location.address,
          city: formData.location.city,
          province: formData.location.province,
          coordinates:
            formData.location.latitude || formData.location.longitude
              ? {
                  latitude: formData.location.latitude
                    ? Number(formData.location.latitude)
                    : undefined,
                  longitude: formData.location.longitude
                    ? Number(formData.location.longitude)
                    : undefined,
                }
              : undefined,
        },
      };

      const currentImages = formData.media?.images || [];
      const imagePayload = currentImages
        .map((image) => {
          if (image.fileData) {
            return {
              name: image.fileData.name || image.name,
              data: image.fileData.data,
              contentType: image.fileData.contentType,
              uploadedAt: image.uploadedAt,
            };
          }

          if (image.url || image.data) {
            return {
              name: image.name,
              url: image.url,
              data: image.data,
              contentType: image.contentType,
              uploadedAt: image.uploadedAt,
            };
          }

          if (image.preview) {
            const { data, contentType } = extractDataFromDataUrl(image.preview);
            if (data) {
              return {
                name: image.name,
                data,
                contentType,
                uploadedAt: image.uploadedAt,
              };
            }
          }

          return null;
        })
        .filter((image) => image !== null);

      if (formData.media) {
        const mediaPayload = {};
        if (Array.isArray(currentImages) && imagePayload.length > 0) {
          mediaPayload.images = imagePayload;
        }

        if (Object.keys(mediaPayload).length > 0) {
          payload.media = mediaPayload;
        }
      }

      let response;
      let data;

      if (isEditing) {
        payload.vehicleId = vehicle.vehicleId;
        payload.requestInspection = requestInspection || mustRequestInspection;
        response = await apiRequest(`/vehicles/${vehicle._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to update vehicle");
        }
        onUpdated?.(data);
      } else {
        response = await apiRequest("/vehicles", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            vehicleId: `VEH${Date.now().toString().slice(-6)}`,
          }),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to create vehicle");
        }
        onCreated?.(data);
      }

      setFormData(createInitialForm());
      setActiveTab("basic");
      setRequestInspection(!isEditing);
      if (isEditing) {
        onCancel?.();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: "basic", label: "Basic Information" },
    { id: "details", label: "Details" },
    { id: "pricing", label: "Pricing" },
    { id: "location", label: "Location" },
    { id: "media", label: "Media & Documents" },
  ];

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3>{isEditing ? "Update Vehicle" : "List a Vehicle"}</h3>
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "basic" && (
        <div className="form-grid">
          <label>
            Make
            <input
              value={formData.basicInfo.make}
              onChange={handleChange("basicInfo", "make")}
              required
            />
          </label>
          <label>
            Model
            <input
              value={formData.basicInfo.model}
              onChange={handleChange("basicInfo", "model")}
              required
            />
          </label>
          <label>
            Year
            <input
              type="number"
              value={formData.basicInfo.year}
              onChange={handleChange("basicInfo", "year")}
              required
            />
          </label>
          <label>
            Color
            <input value={formData.basicInfo.color} onChange={handleChange("basicInfo", "color")} />
          </label>
          <label>
            License Plate
            <input
              value={formData.basicInfo.licensePlate}
              onChange={handleChange("basicInfo", "licensePlate")}
            />
          </label>
          <label>
            Chassis Number
            <input
              value={formData.basicInfo.chassisNumber}
              onChange={handleChange("basicInfo", "chassisNumber")}
            />
          </label>
          <label>
            Engine Number
            <input
              value={formData.basicInfo.engineNumber}
              onChange={handleChange("basicInfo", "engineNumber")}
            />
          </label>
        </div>
      )}
      {activeTab === "details" && (
        <div className="form-grid">
          <label>
            Category
            <select value={formData.details.category} onChange={handleChange("details", "category")}>
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="suv">SUV</option>
            </select>
          </label>
          <label>
            Fuel Type
            <select value={formData.details.fuelType} onChange={handleChange("details", "fuelType")}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </label>
          <label>
            Transmission
            <select
              value={formData.details.transmission}
              onChange={handleChange("details", "transmission")}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>
            Seating Capacity
            <input
              type="number"
              min="1"
              value={formData.details.seatingCapacity}
              onChange={handleChange("details", "seatingCapacity")}
            />
          </label>
          <label>
            Mileage (km)
            <input
              type="number"
              min="0"
              value={formData.details.mileage}
              onChange={handleChange("details", "mileage")}
            />
          </label>
          <label>
            Features (comma separated)
            <input value={formData.details.features} onChange={handleChange("details", "features")} />
          </label>
          <label>
            Condition
            <select value={formData.details.condition} onChange={handleChange("details", "condition")}>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </label>
        </div>
      )}
      {activeTab === "pricing" && (
        <div className="form-grid">
          <label>
            Daily Rate
            <input
              type="number"
              min="0"
              value={formData.pricing.dailyRate}
              onChange={handleChange("pricing", "dailyRate")}
              required
            />
          </label>
          <label>
            Weekly Rate
            <input
              type="number"
              min="0"
              value={formData.pricing.weeklyRate}
              onChange={handleChange("pricing", "weeklyRate")}
            />
          </label>
          <label>
            Monthly Rate
            <input
              type="number"
              min="0"
              value={formData.pricing.monthlyRate}
              onChange={handleChange("pricing", "monthlyRate")}
            />
          </label>
          <label>
            Security Deposit
            <input
              type="number"
              min="0"
              value={formData.pricing.securityDeposit}
              onChange={handleChange("pricing", "securityDeposit")}
            />
          </label>
          <label>
            Currency
            <input value={formData.pricing.currency} onChange={handleChange("pricing", "currency")} />
          </label>
        </div>
      )}
      {activeTab === "location" && (
        <div className="form-grid">
          <label>
            Address
            <input
              value={formData.location.address}
              onChange={handleChange("location", "address")}
              required
            />
          </label>
          <label>
            City
            <input value={formData.location.city} onChange={handleChange("location", "city")} required />
          </label>
          <label>
            Province
            <input value={formData.location.province} onChange={handleChange("location", "province")} />
          </label>
          <label>
            Latitude
            <input
              type="number"
              value={formData.location.latitude}
              onChange={handleChange("location", "latitude")}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              value={formData.location.longitude}
              onChange={handleChange("location", "longitude")}
            />
          </label>
        </div>
      )}
      {activeTab === "media" && (
        <div className="media-section">
          <div className="media-uploader">
            <label className="file-input">
              <span>Vehicle Photos</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
            </label>
            <div className="media-grid">
              {(formData.media?.images || []).map((image) => {
                const preview = image.preview || image.url || (image.data && image.contentType
                  ? `data:${image.contentType};base64,${image.data}`
                  : "");

                return (
                  <div className="media-card" key={image.id}>
                    {preview ? (
                      <img src={preview} alt={image.name || "Vehicle photo"} />
                    ) : (
                      <div className="media-placeholder">No preview</div>
                    )}
                    <div className="media-card-footer">
                      <span title={image.name}>{image.name || "Photo"}</span>
                      <button
                        type="button"
                        className="btn btn-text"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!formData.media?.images || formData.media.images.length === 0) && (
                <p className="muted">No photos uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        {isEditing && (
          <label className="checkbox" style={{ marginRight: "auto" }}>
            <input
              type="checkbox"
              checked={mustRequestInspection ? true : requestInspection}
              onChange={(event) => setRequestInspection(event.target.checked)}
              disabled={mustRequestInspection || isSubmitting}
            />
            <span>
              {mustRequestInspection
                ? "Vehicle will remain pending until inspection is completed."
                : "Request a fresh inspection after saving changes."}
            </span>
          </label>
        )}
        {isEditing && (
          <button type="button" className="btn btn-secondary" onClick={() => onCancel?.()} disabled={isSubmitting}>
            Cancel
          </button>
        )}
        <button className="btn" type="submit" disabled={isSubmitting || !ownerId}>
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Submit for Approval"}
        </button>
      </div>
    </form>
  );
}

function VehicleList({ vehicles, bookingsByVehicle, onEdit, onDelete, onToggleAvailability, isLoading }) {
  if (isLoading) {
    return <p>Loading vehicles...</p>;
  }

  if (!vehicles.length) {
    return <p>No vehicles listed yet. Use the form to add one.</p>;
  }

  return (
    <ul className="list">
      {vehicles.map((vehicle) => {
        const vehicleId = normalizeId(vehicle._id);
        const stats = bookingsByVehicle[vehicleId] || { active: 0, total: 0 };
        const isAvailable = vehicle.availability?.isAvailable !== false;
        const hasActiveBooking = stats.active > 0;
        const availabilityLabel = hasActiveBooking ? "Booked" : isAvailable ? "Available" : "Unavailable";
        const statusClass = hasActiveBooking
          ? "status-pill status-pending"
          : isAvailable
          ? "status-pill status-approved"
          : "status-pill status-rejected";
        const inspectionLabel =
          inspectionStatusLabels[vehicle.inspectionStatus] || vehicle.inspectionStatus || "Pending";
        const approvalLabel = vehicle.status
          ? vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)
          : "Pending";
        const thumbnail = Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : null;
        const thumbnailPreview = getMediaPreview(thumbnail);

        return (
          <li key={vehicleId} className="list-item">
            <div className="vehicle-entry">
              {thumbnailPreview && (
                <div className="vehicle-thumb-wrapper">
                  <img className="vehicle-thumb" src={thumbnailPreview} alt={`${vehicle.basicInfo?.make || "Vehicle"} preview`} />
                </div>
              )}
              <h4>
                {vehicle.basicInfo?.make} {vehicle.basicInfo?.model} ({vehicle.basicInfo?.year || "n/a"})
              </h4>
              <p>
                Plate: {vehicle.basicInfo?.licensePlate || "-"} · Category: {vehicle.details?.category || "-"} ·
                Seats: {vehicle.details?.seatingCapacity || "-"}
              </p>
              <p>
                Status: <span className={statusClass}>{availabilityLabel}</span>
                {" · "}Approval: {approvalLabel}
              </p>
              <p>
                Inspection: {" "}
                <span className={`status status-${vehicle.inspectionStatus || "pending"}`}>
                  {inspectionLabel}
                </span>
                {vehicle.lastInspection?.inspectedAt && (
                  <>
                    {" · "}Last inspected {formatDate(vehicle.lastInspection.inspectedAt, true)}
                  </>
                )}
              </p>
              {vehicle.lastInspection?.issues && (
                <p className="muted">Inspector feedback: {vehicle.lastInspection.issues}</p>
              )}
              {!vehicle.lastInspection?.issues && vehicle.lastInspection?.notes && (
                <p className="muted">Inspector notes: {vehicle.lastInspection.notes}</p>
              )}
              <p>Active bookings: {stats.active} / Total bookings: {stats.total}</p>
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}
            >
              <button type="button" className="btn btn-secondary" onClick={() => onEdit(vehicle)}>
                Edit
              </button>
              <button
                type="button"
                className="btn"
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
                className="btn btn-secondary"
                style={{ background: "#dc2626" }}
                onClick={() => onDelete(vehicle)}
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


function BookingManager({ bookings, vehiclesMap, isLoading }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    vehicle: true,
    date: true,
    status: true,
    bookingId: true
  });

  const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "started", "in_progress", "in-progress"]);

  // Base filtered bookings by tab
  const baseFiltered = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return bookings.filter((booking) => booking.status === "pending");
      case "ongoing":
        return bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status) && booking.status !== "pending");
      case "past":
        return bookings.filter((booking) => !ACTIVE_BOOKING_STATUSES.has(booking.status));
      default:
        return bookings;
    }
  }, [activeTab, bookings]);

  // Search functionality
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) {
      return baseFiltered;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return baseFiltered.filter((booking) => {
      const vehicleId = normalizeId(booking.vehicleId);
      const vehicle = vehiclesMap[vehicleId];
      
      // Search in vehicle information (make, model, name)
      if (searchFilters.vehicle && vehicle) {
        const vehicleMake = vehicle.basicInfo?.make?.toLowerCase() || '';
        const vehicleModel = vehicle.basicInfo?.model?.toLowerCase() || '';
        const vehicleName = `${vehicleMake} ${vehicleModel}`.trim();
        const vehicleYear = vehicle.basicInfo?.year?.toString() || '';
        
        if (vehicleName.includes(searchLower) || 
            vehicleMake.includes(searchLower) || 
            vehicleModel.includes(searchLower) ||
            vehicleYear.includes(searchLower)) {
          return true;
        }
      }
      
      // Search in dates (pickup and return dates)
      if (searchFilters.date) {
        const pickupDate = formatDate(booking.bookingDetails?.startDate)?.toLowerCase() || '';
        const returnDate = formatDate(booking.bookingDetails?.endDate)?.toLowerCase() || '';
        const pickupTime = booking.bookingDetails?.pickupTime?.toLowerCase() || '';
        const returnTime = booking.bookingDetails?.returnTime?.toLowerCase() || '';
        
        // Search in various date formats
        if (pickupDate.includes(searchLower) || 
            returnDate.includes(searchLower) ||
            pickupTime.includes(searchLower) ||
            returnTime.includes(searchLower)) {
          return true;
        }
        
        // Also search in raw date strings for partial matches
        const startDate = booking.bookingDetails?.startDate;
        const endDate = booking.bookingDetails?.endDate;
        
        if (startDate && startDate.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        if (endDate && endDate.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search for month names, year, etc.
        const pickupDateObj = startDate ? new Date(startDate) : null;
        const returnDateObj = endDate ? new Date(endDate) : null;
        
        if (pickupDateObj) {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthName = monthNames[pickupDateObj.getMonth()];
          const year = pickupDateObj.getFullYear().toString();
          const day = pickupDateObj.getDate().toString();
          
          if (monthName.includes(searchLower) || 
              year.includes(searchLower) ||
              day.includes(searchLower)) {
            return true;
          }
        }
        
        if (returnDateObj) {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthName = monthNames[returnDateObj.getMonth()];
          const year = returnDateObj.getFullYear().toString();
          const day = returnDateObj.getDate().toString();
          
          if (monthName.includes(searchLower) || 
              year.includes(searchLower) ||
              day.includes(searchLower)) {
            return true;
          }
        }
      }
      
      // Search in status
      if (searchFilters.status) {
        const status = booking.status?.toLowerCase() || '';
        if (status.includes(searchLower)) {
          return true;
        }
      }
      
      // Search in booking ID
      if (searchFilters.bookingId) {
        const bookingId = booking._id?.toLowerCase() || '';
        if (bookingId.includes(searchLower)) {
          return true;
        }
      }
      
      return false;
    });
  }, [baseFiltered, searchTerm, searchFilters, vehiclesMap]);

  const handleGenerateReport = async () => {
    if (filtered.length === 0) {
      alert('No bookings available to generate report');
      return;
    }

    setIsGeneratingReport(true);
    try {
      await generateBookingReport(filtered, vehiclesMap, activeTab);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterToggle = (filterName) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const tabs = [
    { id: "pending", label: "Pending" },
    { id: "ongoing", label: "Ongoing" },
    { id: "past", label: "Completed" },
    { id: "all", label: "All" },
  ];

  return (
    <section className="panel">
      <header className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Manage Bookings</h3>
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || filtered.length === 0}
          className="btn"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            backgroundColor: isGeneratingReport ? '#6b7280' : '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: isGeneratingReport || filtered.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isGeneratingReport || filtered.length === 0 ? 0.6 : 1
          }}
        >
          {isGeneratingReport ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Generating PDF...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
              Download PDF Report
            </>
          )}
        </button>
      </header>

      {/* Search Section */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '16px', 
        margin: '16px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by vehicle, date..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            )}
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }}>
              
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {Object.entries(searchFilters).map(([key, value]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      
            </label>
          ))}
        </div>

        {/* Search Tips */}
        <div style={{ 
          marginTop: '12px', 
          padding: '8px 12px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#0369a1',
          border: '1px solid #bae6fd'
        }}>
          <strong>💡 Search tips:</strong> Try searching by vehicle name (Toyota), date (2024, October, 15), 
          status (pending), or booking ID
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>Search results:</strong> Found {filtered.length} booking{filtered.length !== 1 ? 's' : ''} 
            {baseFiltered.length !== filtered.length && (
              <span> (from {baseFiltered.length} total in this view)</span>
            )}
            {filtered.length === 0 && (
              <span> - No bookings match your search criteria</span>
            )}
          </div>
        )}
      </div>


      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking Count Info */}
      {!isLoading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 0',
          fontSize: '14px',
          color: '#6b7280',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <span>
            {searchTerm ? 'Search results: ' : 'Showing '}
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
            {searchTerm && baseFiltered.length !== filtered.length && (
              <span> (from {baseFiltered.length} total in "{activeTab}" view)</span>
            )}
          </span>
          <span style={{ 
            padding: '4px 8px', 
            backgroundColor: filtered.length > 0 ? '#dcfce7' : '#f3f4f6',
            color: filtered.length > 0 ? '#166534' : '#6b7280',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {filtered.length > 0 ? 'Ready for PDF export' : 'No bookings to export'}
          </span>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          Loading bookings...
        </div>
      )}
      
      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          {searchTerm ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h4 style={{ margin: '0 0 8px', color: '#374151' }}>No matching bookings found</h4>
              <p style={{ margin: 0 }}>
                No bookings match "<strong>{searchTerm}</strong>" in the {activeTab} view.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
                Try adjusting your search terms or check different search filters.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h4 style={{ margin: '0 0 8px', color: '#374151' }}>No bookings in this view</h4>
              <p style={{ margin: 0 }}>
                Switch to a different tab or add bookings to see them here.
              </p>
            </>
          )}
        </div>
      )}
      
      {!isLoading && filtered.length > 0 && (
        <ul className="booking-list booking-list--compact">
          {filtered.map((booking) => {
            const vehicleId = normalizeId(booking.vehicleId);
            const vehicle = vehiclesMap[vehicleId];
            const vehicleLabel =
              [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model]
                .filter((value) => typeof value === "string" && value.trim())
                .join(" ") ||
              vehicle?.basicInfo?.displayName ||
              "Vehicle";
            const licensePlate =
              (typeof vehicle?.basicInfo?.licensePlate === "string" && vehicle.basicInfo.licensePlate.trim()) ||
              "N/A";
            const pickupDate = formatDate(booking.bookingDetails?.startDate);
            const dropoffDate = formatDate(booking.bookingDetails?.endDate);
            const pickupTime = booking.bookingDetails?.pickupTime;
            const returnTime = booking.bookingDetails?.returnTime;
            const pickupLabel = pickupTime ? `${pickupDate} at ${pickupTime}` : pickupDate;
            const dropoffLabel = returnTime ? `${dropoffDate} at ${returnTime}` : dropoffDate;

            return (
              <li key={booking._id} style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '12px',
                backgroundColor: 'white'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: '#1f2937' }}>{vehicleLabel}</strong>
                      {vehicle?.basicInfo?.year && (
                        <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px' }}>
                          ({vehicle.basicInfo.year})
                        </span>
                      )}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: 
                        booking.status === 'pending' ? '#fef3c7' :
                        ACTIVE_BOOKING_STATUSES.has(booking.status) ? '#d1fae5' : '#f3f4f6',
                      color:
                        booking.status === 'pending' ? '#92400e' :
                        ACTIVE_BOOKING_STATUSES.has(booking.status) ? '#065f46' : '#374151'
                    }}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <p style={{ margin: '4px 0', color: '#6b7280' }}>
                    <strong>Pickup:</strong> {pickupLabel}
                  </p>
                  {dropoffDate !== "-" && (
                    <p style={{ margin: '4px 0', color: '#6b7280' }}>
                      <strong>Return:</strong> {dropoffLabel}
                    </p>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                      Booking ID: {booking._id}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                      Plate: {licensePlate}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </section>
  );
}
function EarningsOverview({ payments, isLoading }) {
  const summary = useMemo(() => {
    if (!payments.length) {
      return {
        currency: "LKR",
        total: 0,
        month: 0,
        today: 0,
      };
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let total = 0;
    let today = 0;
    let month = 0;
    const currency = payments[0]?.currency || payments[0]?.pricing?.currency || "LKR";

    payments.forEach((payment) => {
      const amount = Number(payment.amount) || 0;
      const processedAt = payment.processedAt || payment.updatedAt || payment.createdAt;
      const processed = processedAt ? new Date(processedAt) : null;

      total += amount;

      if (processed) {
        const processedTodayKey = processed.toISOString().slice(0, 10);
        if (processedTodayKey === todayKey) {
          today += amount;
        }
        const processedMonthKey = `${processed.getFullYear()}-${processed.getMonth()}`;
        if (processedMonthKey === monthKey) {
          month += amount;
        }
      }
    });

    return { currency, total, today, month };
  }, [payments]);

  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Earnings Overview</h3>
      </header>
      {isLoading && <p>Loading earnings...</p>}
      {!isLoading && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{formatCurrency(summary.total, summary.currency)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">This Month</span>
            <span className="stat-value">{formatCurrency(summary.month, summary.currency)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today</span>
            <span className="stat-value">{formatCurrency(summary.today, summary.currency)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function WithdrawalSection({ pending, completed, onUpdateStatus, isLoading }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Payment Withdrawals</h3>
      </header>
      {isLoading && <p>Loading payouts...</p>}
      {!isLoading && (
        <>
          <p>
            Pending requests: {pending.length} · Processed: {completed.length}
          </p>
          <ul className="list">
            {pending.map((payment) => (
              <li key={payment._id} className="list-item">
                <div>
                  <strong>Payout {payment.paymentId || payment._id}</strong>
                  <p>Amount: {formatCurrency(payment.amount, payment.currency)}</p>
                  <p>Status: {payment.status}</p>
                </div>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onUpdateStatus(payment, "completed")}
                  >
                    Mark as Received
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pending.length === 0 && <p>No pending withdrawals.</p>}
          {completed.length > 0 && (
            <details className="withdrawal-history">
              <summary>View completed withdrawals</summary>
              <ul className="list">
                {completed.map((payment) => (
                  <li key={payment._id} className="list-item">
                    <div>
                      <strong>{payment.paymentId || payment._id}</strong>
                      <p>Amount: {formatCurrency(payment.amount, payment.currency)}</p>
                      <p>Completed: {formatDate(payment.updatedAt || payment.processedAt, true)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function FeedbackList({ feedbacks, bookingsMap, vehiclesMap, isLoading }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Vehicle Feedback</h3>
      </header>
      {isLoading && <p>Loading feedback...</p>}
      {!isLoading && feedbacks.length === 0 && <p>No feedback received yet.</p>}
      {!isLoading && feedbacks.length > 0 && (
        <ul className="booking-list booking-list--feedback">
          {feedbacks.map((feedback) => {
            const booking = bookingsMap[normalizeId(feedback.bookingId)];
            const vehicle = booking ? vehiclesMap[normalizeId(booking.vehicleId)] : undefined;
            const vehicleNameParts = [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model].filter(
              (part) => typeof part === "string" && part.trim()
            );
            const vehicleLabel =
              (vehicleNameParts.length ? vehicleNameParts.join(" ") : undefined) ||
              vehicle?.basicInfo?.displayName ||
              "Vehicle";
            const licensePlate =
              (typeof vehicle?.basicInfo?.licensePlate === "string" && vehicle.basicInfo.licensePlate.trim()) ||
              "License plate unavailable";
            const ratingValue = [
              feedback.ratings?.vehicleRating,
              feedback.ratings?.overallRating,
              feedback.ratings?.serviceRating,
            ].find((value) => typeof value === "number" && !Number.isNaN(value));
            const vehicleComment =
              (typeof feedback.comments?.vehicleComment === "string" &&
                feedback.comments.vehicleComment.trim()) || "";
            const serviceComment =
              (typeof feedback.comments?.serviceComment === "string" &&
                feedback.comments.serviceComment.trim()) || "";
            const suggestionComment =
              (typeof feedback.suggestions === "string" && feedback.suggestions.trim()) || "";
            const comment = vehicleComment || serviceComment || suggestionComment || "No comment provided.";
            return (
              <li key={feedback._id}>
                <div>
                  <strong>{vehicleLabel}</strong>
                  <p>License Plate: {licensePlate}</p>
                  <p>Rating: {typeof ratingValue === "number" ? `${ratingValue}/5` : "Not rated yet"}</p>
                  <p>{comment}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function VehicleOwnerDashboard() {
  const { user, logout } = useAuth();
  const ownerId = normalizeId(user?._id);

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingState, setLoadingState] = useState({
    vehicles: false,
    bookings: false,
    payments: false,
    feedbacks: false,
  });
  const [error, setError] = useState("");
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    if (!ownerId) return;

    let isMounted = true;

    const loadData = async () => {
      setError("");
      setLoadingState({
        vehicles: true,
        bookings: true,
        payments: true,
        feedbacks: true,
      });

      try {
        const vehiclesResponse = await apiRequest(`/vehicles?ownerId=${ownerId}`);
        const vehiclesJson = await vehiclesResponse.json();
        if (!vehiclesResponse.ok) {
          throw new Error(vehiclesJson.message || "Failed to load vehicles");
        }

        const ownedVehicles = vehiclesJson.filter((vehicle) => normalizeId(vehicle.ownerId) === ownerId);
        const ownedVehicleIds = new Set(ownedVehicles.map((vehicle) => normalizeId(vehicle._id)));

        const [bookingsResponse, paymentsResponse, feedbackResponse] = await Promise.all([
          apiRequest("/Bookings"),
          apiRequest("/payments"),
          apiRequest("/feedbacks"),
        ]);

        const [bookingsJson, paymentsJson, feedbackJson] = await Promise.all([
          bookingsResponse.json(),
          paymentsResponse.json(),
          feedbackResponse.json(),
        ]);

        if (!bookingsResponse.ok) {
          throw new Error(bookingsJson.message || "Failed to load bookings");
        }
        if (!paymentsResponse.ok) {
          throw new Error(paymentsJson.message || "Failed to load payments");
        }
        if (!feedbackResponse.ok) {
          throw new Error(feedbackJson.message || "Failed to load feedback");
        }

        if (!isMounted) return;

        const ownedBookings = bookingsJson.filter((booking) => ownedVehicleIds.has(normalizeId(booking.vehicleId)));
        const ownedBookingIds = new Set(ownedBookings.map((booking) => normalizeId(booking._id)));

        const relevantPayments = paymentsJson.filter((payment) => ownedBookingIds.has(normalizeId(payment.bookingId)));
        const relevantFeedbacks = feedbackJson.filter((feedback) => ownedBookingIds.has(normalizeId(feedback.bookingId)));

        setVehicles(ownedVehicles);
        setBookings(ownedBookings);
        setPayments(relevantPayments);
        setFeedbacks(relevantFeedbacks);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Something went wrong while loading data");
        }
      } finally {
        if (isMounted) {
          setLoadingState({
            vehicles: false,
            bookings: false,
            payments: false,
            feedbacks: false,
          });
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [ownerId, refreshKey]);

  const vehiclesMap = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle) => {
      map[normalizeId(vehicle._id)] = vehicle;
    });
    return map;
  }, [vehicles]);

  const bookingsMap = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      map[normalizeId(booking._id)] = booking;
    });
    return map;
  }, [bookings]);

  const bookingsByVehicle = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      const vehicleId = normalizeId(booking.vehicleId);
      if (!vehicleId) return;
      if (!map[vehicleId]) {
        map[vehicleId] = { active: 0, total: 0 };
      }
      map[vehicleId].total += 1;
      if (ACTIVE_BOOKING_STATUSES.has(booking.status)) {
        map[vehicleId].active += 1;
      }
    });
    return map;
  }, [bookings]);

  const pendingWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments]
  );
  const completedWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "completed"),
    [payments]
  );

  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Remove ${vehicle.basicInfo?.make || "vehicle"} from your fleet?`)) {
      return;
    }
    try {
      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete vehicle");
      }
      triggerRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (vehicle) => {
    if (vehicle.status !== "approved") {
      setError("Vehicle must be approved by an inspector before adjusting availability.");
      return;
    }
    const current = vehicle.availability?.isAvailable !== false;
    try {
      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "PUT",
        body: JSON.stringify({
          availability: {
            ...vehicle.availability,
            isAvailable: !current,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update availability");
      }
      triggerRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWithdrawalStatus = async (payment, status) => {
    try {
      const response = await apiRequest(`/payments/${payment._id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update payout");
      }
      setPayments((prev) =>
        prev.map((item) => (normalizeId(item._id) === normalizeId(payment._id) ? data : item))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Vehicle Owner Console</h1>
          <p>Manage your vehicles, bookings, and earnings</p>
        </div>
        <nav className="dashboard-nav">
          <Link to="/">Home</Link>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="dashboard-grid">
        <VehicleForm
          ownerId={ownerId}
          vehicle={editingVehicle}
          onCreated={triggerRefresh}
          onUpdated={triggerRefresh}
          onCancel={() => setEditingVehicle(null)}
        />
        <section className="panel">
          <header className="panel-header">
            <h3>My Vehicles</h3>
          </header>
          <VehicleList
            vehicles={vehicles}
            bookingsByVehicle={bookingsByVehicle}
            onEdit={setEditingVehicle}
            onDelete={handleDeleteVehicle}
            onToggleAvailability={handleToggleAvailability}
            isLoading={loadingState.vehicles}
          />
        </section>
      </div>

      <div className="dashboard-grid">
        <BookingManager
          bookings={bookings}
          vehiclesMap={vehiclesMap}
          isLoading={loadingState.bookings}
        />
        <EarningsOverview payments={payments.filter((payment) => payment.status === "completed")} isLoading={loadingState.payments} />
      </div>

      <div className="dashboard-grid">
        <WithdrawalSection
          pending={pendingWithdrawals}
          completed={completedWithdrawals}
          onUpdateStatus={handleWithdrawalStatus}
          isLoading={loadingState.payments}
        />
        <FeedbackList
          feedbacks={feedbacks}
          bookingsMap={bookingsMap}
          vehiclesMap={vehiclesMap}
          isLoading={loadingState.feedbacks}
        />
      </div>
    </div>
  );
}

export default VehicleOwnerDashboard;