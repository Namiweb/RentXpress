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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={onClose}>
      <form
        className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 bg-neutral-800/95 backdrop-blur-sm px-6 py-5 border-b border-neutral-700/50 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Add Vehicle</h3>
              <p className="text-gray-400 mt-1 text-sm">
                Register a vehicle on behalf of an owner.
              </p>
            </div>
            <button 
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-all duration-200"
              type="button" 
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Section 1 - Owner */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Owner Information
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Vehicle owner <span className="text-red-400">*</span></span>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="ownerId"
                  value={formState.ownerId}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled className="text-gray-500">
                    Select owner
                  </option>
                  {owners.map((owner) => (
                    <option key={owner._id} value={owner._id} className="text-white bg-neutral-800">
                      {`${getUserName(owner)} (${owner.email})`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Section 2 - Basic Info */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Make <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="make"
                  value={formState.make}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Model <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="model"
                  value={formState.model}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Year <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
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
                <span className="text-sm font-medium text-gray-300 mb-2">Color</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="color"
                  value={formState.color}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">License Plate</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="licensePlate"
                  value={formState.licensePlate}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          {/* Section 3 - Vehicle Details */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Vehicle Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Category</span>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="category"
                  value={formState.category}
                  onChange={handleChange}
                >
                  {["Sedan", "SUV", "Van", "Truck", "Motorcycle", "Other"].map(
                    (c) => (
                      <option key={c} value={c} className="text-white bg-neutral-800">
                        {c}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Fuel Type</span>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="fuelType"
                  value={formState.fuelType}
                  onChange={handleChange}
                >
                  {["Petrol", "Diesel", "Electric", "Hybrid"].map((f) => (
                    <option key={f} value={f} className="text-white bg-neutral-800">
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Transmission</span>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="transmission"
                  value={formState.transmission}
                  onChange={handleChange}
                >
                  {["Automatic", "Manual"].map((t) => (
                    <option key={t} value={t} className="text-white bg-neutral-800">
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Condition</span>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="condition"
                  value={formState.condition}
                  onChange={handleChange}
                >
                  {["Excellent", "Good", "Fair", "Poor"].map((c) => (
                    <option key={c} value={c} className="text-white bg-neutral-800">
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Seating Capacity</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  type="number"
                  min="1"
                  name="seatingCapacity"
                  value={formState.seatingCapacity}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Mileage (km)</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  type="number"
                  min="0"
                  name="mileage"
                  value={formState.mileage}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          {/* Section 4 - Pricing */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Pricing & Rates
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Daily Rate <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
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
                <span className="text-sm font-medium text-gray-300 mb-2">Weekly Rate</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  type="number"
                  min="0"
                  step="0.01"
                  name="weeklyRate"
                  value={formState.weeklyRate}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Monthly Rate</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  type="number"
                  min="0"
                  step="0.01"
                  name="monthlyRate"
                  value={formState.monthlyRate}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Security Deposit</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  type="number"
                  min="0"
                  step="0.01"
                  name="securityDeposit"
                  value={formState.securityDeposit}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Currency</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="currency"
                  value={formState.currency}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          {/* Section 5 - Location */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Address <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="address"
                  value={formState.address}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">City <span className="text-red-400">*</span></span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="city"
                  value={formState.city}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Province</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="province"
                  value={formState.province}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Postal Code</span>
                <input
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500"
                  name="postalCode"
                  value={formState.postalCode}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          {/* Section 6 - Additional */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Additional Details
            </h4>
            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Description</span>
                <textarea
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500 resize-none"
                  name="description"
                  rows={3}
                  value={formState.description}
                  onChange={handleChange}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Features (comma separated)</span>
                <textarea
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white placeholder-gray-500 resize-none"
                  name="features"
                  rows={2}
                  value={formState.features}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          {/* Section 7 - Media */}
          <section className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#FF5A00] rounded-full"></div>
              Media
            </h4>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 mb-2">Upload Images</span>
                <input
                  type="file"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#FF5A00] file:text-white hover:file:bg-[#FF5A00]/90"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(formState?.images || []).map((image) => {
                  const preview =
                    image.preview ||
                    image.url ||
                    (image.data && image.contentType
                      ? `data:${image.contentType};base64,${image.data}`
                      : "");

                  return (
                    <div className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden" key={image.id}>
                      {preview ? (
                        <img
                          src={preview}
                          alt={image.name || "Vehicle photo"}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 bg-neutral-700 flex items-center justify-center text-gray-400">No preview</div>
                      )}
                      <div className="p-3 flex flex-col">
                        <span className="text-white text-sm font-medium truncate" title={image.name}>
                          {image.name || "Photo"}
                        </span>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300 text-sm font-medium mt-1 transition-colors duration-200"
                          onClick={() => handleRemoveImage(image.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!formState?.images || formState.images.length === 0) && (
                  <p className="text-gray-400 col-span-full text-center py-4">No photos uploaded yet.</p>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 bg-neutral-800/95 backdrop-blur-sm px-6 py-4 border-t border-neutral-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <button 
              className="px-6 py-3 bg-transparent hover:bg-neutral-700 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-200 border border-neutral-600/50"
              type="button" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="px-6 py-3 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Vehicle
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default AddVehicleModal;
