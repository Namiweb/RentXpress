import { useState } from "react";
import { getUserName } from "../../utils/getUserName";
import { extractDataFromDataUrl, fileToDataUrl } from "../../utils/uploadImage";

const DEFAULT_CURRENCY = "LKR";

const vehicleFormInitialState = {
  ownerId: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  licensePlate: "",
  category: "Car",
  fuelType: "Petrol",
  transmission: "Automatic",
  condition: "Excellent",
  seatingCapacity: "",
  mileage: "",
  dailyRate: "",
  weeklyRate: "",
  monthlyRate: "",
  securityDeposit: "",
  currency: DEFAULT_CURRENCY,
  address: "",
  city: "",
  province: "",
  postalCode: "",
  features: "",
  description: "",
  images: [],
};

function parseNumber(value) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const AddVehicleModal = ({ owners, onClose, onSubmit, isSubmitting }) => {
  const [formState, setFormState] = useState(vehicleFormInitialState);
  const [error, setError] = useState("");

  function buildVehiclePayload(formState) {
    const features = formState.features
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      vehicleId: `VEH${Date.now().toString().slice(-6)}`,
      ownerId: formState.ownerId,
      basicInfo: {
        make: formState.make,
        model: formState.model,
        year: Number(formState.year),
        color: formState.color || undefined,
        licensePlate: formState.licensePlate || undefined,
      },
      details: {
        category: formState.category,
        fuelType: formState.fuelType,
        transmission: formState.transmission,
        condition: formState.condition,
        seatingCapacity: parseNumber(formState.seatingCapacity),
        mileage: parseNumber(formState.mileage),
        features,
        description: formState.description || undefined,
      },
      pricing: {
        dailyRate: Number(formState.dailyRate),
        weeklyRate: parseNumber(formState.weeklyRate),
        monthlyRate: parseNumber(formState.monthlyRate),
        securityDeposit: parseNumber(formState.securityDeposit),
        currency: formState.currency || DEFAULT_CURRENCY,
      },
      location: {
        address: formState.address,
        city: formState.city,
        province: formState.province || undefined,
        postalCode: formState.postalCode || undefined,
      },
      availability: {
        isAvailable: false,
      },
    };
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = buildVehiclePayload(formState);

      const currentImages = formState?.images || [];
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

      if (formState.images.length > 0) {
        const mediaPayload = {};
        if (Array.isArray(currentImages) && imagePayload.length > 0) {
          mediaPayload.images = imagePayload;
        }

        if (Object.keys(mediaPayload).length > 0) {
          payload.media = mediaPayload;
        }
      }

      await onSubmit(payload);
      setFormState(vehicleFormInitialState);
    } catch (err) {
      setError(err.message);
    }
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
              contentType:
                contentType || file.type || "application/octet-stream",
            },
            contentType: contentType || file.type || "application/octet-stream",
          };
        })
      );

      setFormState((prev) => ({
        ...prev,
        images: [...(prev?.images || []), ...uploads],
      }));
    } catch (uploadError) {
      setError(uploadError.message || "Failed to read selected images");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveImage = (imageId) => {
    setFormState((prev) => ({
      ...prev,
      images: (prev?.images || []).filter(
        (image) => image.id !== imageId
      ),
    }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal max-h-[90vh] overflow-y-auto rounded-xl"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3 className="text-lg font-semibold">Add Vehicle</h3>
            <p className="text-sm text-gray-500">
              Register a vehicle on behalf of an owner.
            </p>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-body space-y-1">
          {/* Section 1 - Owner */}
          <section>
            <h4 className="text-base font-semibold mb-2">Owner Information</h4>
            <div className="form-grid">
              <label className="flex flex-col">
                <span>Vehicle owner</span>
                <select
                  className="input-control"
                  name="ownerId"
                  value={formState.ownerId}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    Select owner
                  </option>
                  {owners.map((owner) => (
                    <option key={owner._id} value={owner._id}>
                      {`${getUserName(owner)} (${owner.email})`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <hr />

          {/* Section 2 - Basic Info */}
          <section>
            <h4 className="text-base font-semibold mb-2">Basic Information</h4>
            <div className="form-grid">
              <label className="flex flex-col">
                <span>Make</span>
                <input
                  className="input-control"
                  name="make"
                  value={formState.make}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>Model</span>
                <input
                  className="input-control"
                  name="model"
                  value={formState.model}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>Year</span>
                <input
                  className="input-control"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  name="year"
                  value={formState.year}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>Color</span>
                <input
                  className="input-control"
                  name="color"
                  value={formState.color}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>License Plate</span>
                <input
                  className="input-control"
                  name="licensePlate"
                  value={formState.licensePlate}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <hr />

          {/* Section 3 - Vehicle Details */}
          <section>
            <h4 className="text-base font-semibold mb-2">Vehicle Details</h4>
            <div className="form-grid">
              <label className="flex flex-col">
                <span>Category</span>
                <select
                  className="input-control"
                  name="category"
                  value={formState.category}
                  onChange={handleChange}
                >
                  {["Sedan", "SUV", "Van", "Truck", "Motorcycle", "Other"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="flex flex-col">
                <span>Fuel Type</span>
                <select
                  className="input-control"
                  name="fuelType"
                  value={formState.fuelType}
                  onChange={handleChange}
                >
                  {["Petrol", "Diesel", "Electric", "Hybrid"].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span>Transmission</span>
                <select
                  className="input-control"
                  name="transmission"
                  value={formState.transmission}
                  onChange={handleChange}
                >
                  {["Automatic", "Manual"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span>Condition</span>
                <select
                  className="input-control"
                  name="condition"
                  value={formState.condition}
                  onChange={handleChange}
                >
                  {["Excellent", "Good", "Fair", "Poor"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span>Seating Capacity</span>
                <input
                  className="input-control"
                  type="number"
                  min="1"
                  name="seatingCapacity"
                  value={formState.seatingCapacity}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>Mileage (km)</span>
                <input
                  className="input-control"
                  type="number"
                  min="0"
                  name="mileage"
                  value={formState.mileage}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <hr />

          {/* Section 4 - Pricing */}
          <section>
            <h4 className="text-base font-semibold mb-2">Pricing & Rates</h4>
            <div className="form-grid">
              <label className="flex flex-col">
                <span>Daily Rate</span>
                <input
                  className="input-control"
                  type="number"
                  min="0"
                  step="0.01"
                  name="dailyRate"
                  value={formState.dailyRate}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>Weekly Rate</span>
                <input
                  className="input-control"
                  type="number"
                  min="0"
                  step="0.01"
                  name="weeklyRate"
                  value={formState.weeklyRate}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>Monthly Rate</span>
                <input
                  className="input-control"
                  type="number"
                  min="0"
                  step="0.01"
                  name="monthlyRate"
                  value={formState.monthlyRate}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>Security Deposit</span>
                <input
                  className="input-control"
                  type="number"
                  min="0"
                  step="0.01"
                  name="securityDeposit"
                  value={formState.securityDeposit}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>Currency</span>
                <input
                  className="input-control"
                  name="currency"
                  value={formState.currency}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <hr />

          {/* Section 5 - Location */}
          <section>
            <h4 className="text-base font-semibold mb-2">Location</h4>
            <div className="form-grid">
              <label className="flex flex-col">
                <span>Address</span>
                <input
                  className="input-control"
                  name="address"
                  value={formState.address}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>City</span>
                <input
                  className="input-control"
                  name="city"
                  value={formState.city}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span>Province</span>
                <input
                  className="input-control"
                  name="province"
                  value={formState.province}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span>Postal Code</span>
                <input
                  className="input-control"
                  name="postalCode"
                  value={formState.postalCode}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <hr />

          {/* Section 6 - Additional */}
          <section>
            <h4 className="text-base font-semibold mb-2">Additional Details</h4>
            <label className="flex flex-col">
              <span>Description</span>
              <textarea
                className="input-control"
                name="description"
                rows={3}
                value={formState.description}
                onChange={handleChange}
              />
            </label>
            <label className="flex flex-col">
              <span>Features (comma separated)</span>
              <textarea
                className="input-control"
                name="features"
                rows={2}
                value={formState.features}
                onChange={handleChange}
              />
            </label>
          </section>

          <hr />

          {/* Section 7 - Media */}
          <section>
            <h4 className="text-base font-semibold mb-2">Media</h4>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col">
                <input
                  type="file"
                  className="input-control"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>
              <div className="media-grid">
                {(formState?.images || []).map((image) => {
                  const preview =
                    image.preview ||
                    image.url ||
                    (image.data && image.contentType
                      ? `data:${image.contentType};base64,${image.data}`
                      : "");

                  return (
                    <div className="media-card" key={image.id}>
                      {preview ? (
                        <img
                          src={preview}
                          alt={image.name || "Vehicle photo"}
                        />
                      ) : (
                        <div className="media-placeholder">No preview</div>
                      )}
                      <div className="media-card-footer flex flex-col">
                        <span
                          className="whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ textOverflow: "ellipsis" }}
                          title={image.name}
                        >
                          {image.name || "Photo"}
                        </span>
                        <button
                          type="button"
                          className="btn btn-text"
                          onClick={() => handleRemoveImage(image.id)}
                        >
                          <span className="text-red-500">Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!formState?.images || formState.images.length === 0) && (
                  <p className="muted">No photos uploaded yet.</p>
                )}
              </div>
            </div>
          </section>

          {error && <p className="error-text text-red-500">{error}</p>}
        </div>

        <footer className="modal-footer pt-3 mt-4 flex justify-end gap-2">
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create Vehicle"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default AddVehicleModal;
