import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../../../../services/api.js";
import { extractDataFromDataUrl, fileToDataUrl } from "../../../../utils/uploadImage.js";

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

function VehicleFormModal({ ownerId, vehicle, onClose, onVehicleCreated, onVehicleUpdated }) {
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
        onVehicleUpdated?.(data);
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
        onVehicleCreated?.(data);
      }

      setFormData(createInitialForm());
      setActiveTab("basic");
      setRequestInspection(!isEditing);
      onClose();
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

  // return (
  //   <div style={{
  //     position: 'fixed',
  //     top: 0,
  //     left: 0,
  //     right: 0,
  //     bottom: 0,
  //     backgroundColor: 'rgba(0, 0, 0, 0.5)',
  //     display: 'flex',
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //     zIndex: 1000
  //   }}>
  //     <div style={{
  //       backgroundColor: 'white',
  //       borderRadius: '12px',
  //       width: '90%',
  //       maxWidth: '800px',
  //       maxHeight: '90vh',
  //       overflow: 'hidden',
  //       boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  //     }}>
  //       <form onSubmit={handleSubmit}>
  //         {/* Modal Header */}
  //         <div style={{
  //           display: 'flex',
  //           justifyContent: 'space-between',
  //           alignItems: 'center',
  //           padding: '1.5rem',
  //           borderBottom: '1px solid #e5e7eb'
  //         }}>
  //           <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
  //             {isEditing ? "Update Vehicle" : "List a Vehicle"}
  //           </h3>
  //           <button
  //             type="button"
  //             onClick={onClose}
  //             style={{
  //               padding: '8px',
  //               border: 'none',
  //               backgroundColor: 'transparent',
  //               cursor: 'pointer',
  //               borderRadius: '6px'
  //             }}
  //           >
  //             <X size={20} />
  //           </button>
  //         </div>

  //         {/* Tab Navigation */}
  //         <div style={{ 
  //           display: 'flex', 
  //           borderBottom: '1px solid #e5e7eb',
  //           overflowX: 'auto'
  //         }}>
  //           {tabs.map((tab) => (
  //             <button
  //               key={tab.id}
  //               type="button"
  //               style={{
  //                 padding: '12px 16px',
  //                 border: 'none',
  //                 backgroundColor: 'transparent',
  //                 cursor: 'pointer',
  //                 borderBottom: tab.id === activeTab ? '2px solid #3b82f6' : '2px solid transparent',
  //                 color: tab.id === activeTab ? '#3b82f6' : '#6b7280',
  //                 fontWeight: tab.id === activeTab ? '600' : '400',
  //                 fontSize: '14px',
  //                 whiteSpace: 'nowrap'
  //               }}
  //               onClick={() => setActiveTab(tab.id)}
  //             >
  //               {tab.label}
  //             </button>
  //           ))}
  //         </div>

  //         {/* Modal Content */}
  //         <div style={{ 
  //           padding: '1.5rem',
  //           maxHeight: '60vh',
  //           overflowY: 'auto'
  //         }}>
  //           {/* Tab Content */}
  //           {activeTab === "basic" && (
  //             <div style={{
  //               display: 'grid',
  //               gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  //               gap: '1rem'
  //             }}>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Make *</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.make}
  //                   onChange={handleChange("basicInfo", "make")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Model *</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.model}
  //                   onChange={handleChange("basicInfo", "model")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Year *</span>
  //                 <input
  //                   type="number"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.year}
  //                   onChange={handleChange("basicInfo", "year")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Color</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.color}
  //                   onChange={handleChange("basicInfo", "color")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>License Plate</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.licensePlate}
  //                   onChange={handleChange("basicInfo", "licensePlate")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Chassis Number</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.basicInfo.chassisNumber}
  //                   onChange={handleChange("basicInfo", "chassisNumber")}
  //                 />
  //               </label>
  //             </div>
  //           )}

  //           {activeTab === "details" && (
  //             <div style={{
  //               display: 'grid',
  //               gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  //               gap: '1rem'
  //             }}>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Category</span>
  //                 <select
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.category}
  //                   onChange={handleChange("details", "category")}
  //                 >
  //                   <option value="car">Car</option>
  //                   <option value="van">Van</option>
  //                   <option value="truck">Truck</option>
  //                   <option value="motorcycle">Motorcycle</option>
  //                   <option value="suv">SUV</option>
  //                 </select>
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Fuel Type</span>
  //                 <select
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.fuelType}
  //                   onChange={handleChange("details", "fuelType")}
  //                 >
  //                   <option value="petrol">Petrol</option>
  //                   <option value="diesel">Diesel</option>
  //                   <option value="hybrid">Hybrid</option>
  //                   <option value="electric">Electric</option>
  //                 </select>
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Transmission</span>
  //                 <select
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.transmission}
  //                   onChange={handleChange("details", "transmission")}
  //                 >
  //                   <option value="automatic">Automatic</option>
  //                   <option value="manual">Manual</option>
  //                 </select>
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Seating Capacity</span>
  //                 <input
  //                   type="number"
  //                   min="1"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.seatingCapacity}
  //                   onChange={handleChange("details", "seatingCapacity")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Mileage (km)</span>
  //                 <input
  //                   type="number"
  //                   min="0"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.mileage}
  //                   onChange={handleChange("details", "mileage")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Condition</span>
  //                 <select
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.details.condition}
  //                   onChange={handleChange("details", "condition")}
  //                 >
  //                   <option value="excellent">Excellent</option>
  //                   <option value="good">Good</option>
  //                   <option value="fair">Fair</option>
  //                   <option value="poor">Poor</option>
  //                 </select>
  //               </label>
  //             </div>
  //           )}

  //           {activeTab === "pricing" && (
  //             <div style={{
  //               display: 'grid',
  //               gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  //               gap: '1rem'
  //             }}>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Daily Rate *</span>
  //                 <input
  //                   type="number"
  //                   min="0"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.pricing.dailyRate}
  //                   onChange={handleChange("pricing", "dailyRate")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Weekly Rate</span>
  //                 <input
  //                   type="number"
  //                   min="0"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.pricing.weeklyRate}
  //                   onChange={handleChange("pricing", "weeklyRate")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Monthly Rate</span>
  //                 <input
  //                   type="number"
  //                   min="0"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.pricing.monthlyRate}
  //                   onChange={handleChange("pricing", "monthlyRate")}
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Security Deposit</span>
  //                 <input
  //                   type="number"
  //                   min="0"
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.pricing.securityDeposit}
  //                   onChange={handleChange("pricing", "securityDeposit")}
  //                 />
  //               </label>
  //             </div>
  //           )}

  //           {activeTab === "location" && (
  //             <div style={{
  //               display: 'grid',
  //               gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  //               gap: '1rem'
  //             }}>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Address *</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.location.address}
  //                   onChange={handleChange("location", "address")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>City *</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.location.city}
  //                   onChange={handleChange("location", "city")}
  //                   required
  //                 />
  //               </label>
  //               <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
  //                 <span style={{ fontWeight: '500', fontSize: '14px' }}>Province</span>
  //                 <input
  //                   style={{
  //                     padding: '10px 12px',
  //                     border: '1px solid #d1d5db',
  //                     borderRadius: '6px',
  //                     fontSize: '14px'
  //                   }}
  //                   value={formData.location.province}
  //                   onChange={handleChange("location", "province")}
  //                 />
  //               </label>
  //             </div>
  //           )}

  //           {activeTab === "media" && (
  //             <div>
  //               <label style={{ 
  //                 display: 'flex',
  //                 flexDirection: 'column',
  //                 alignItems: 'center',
  //                 gap: '1rem',
  //                 padding: '2rem',
  //                 border: '2px dashed #d1d5db',
  //                 borderRadius: '8px',
  //                 cursor: 'pointer',
  //                 marginBottom: '1rem'
  //               }}>
  //                 <span style={{ fontSize: '48px' }}>📷</span>
  //                 <span style={{ fontWeight: '500' }}>Vehicle Photos</span>
  //                 <span style={{ fontSize: '14px', color: '#6b7280' }}>
  //                   Click to upload or drag and drop
  //                 </span>
  //                 <input 
  //                   type="file" 
  //                   accept="image/*" 
  //                   multiple 
  //                   onChange={handleImageUpload}
  //                   style={{ display: 'none' }}
  //                 />
  //               </label>
  //               <div style={{
  //                 display: 'grid',
  //                 gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  //                 gap: '1rem'
  //               }}>
  //                 {(formData.media?.images || []).map((image) => {
  //                   const preview = image.preview || image.url || (image.data && image.contentType
  //                     ? `data:${image.contentType};base64,${image.data}`
  //                     : "");

  //                   return (
  //                     <div key={image.id} style={{
  //                       position: 'relative',
  //                       borderRadius: '8px',
  //                       overflow: 'hidden',
  //                       border: '1px solid #e5e7eb'
  //                     }}>
  //                       {preview ? (
  //                         <img 
  //                           src={preview} 
  //                           alt={image.name || "Vehicle photo"}
  //                           style={{
  //                             width: '100%',
  //                             height: '100px',
  //                             objectFit: 'cover'
  //                           }}
  //                         />
  //                       ) : (
  //                         <div style={{
  //                           width: '100%',
  //                           height: '100px',
  //                           display: 'flex',
  //                           alignItems: 'center',
  //                           justifyContent: 'center',
  //                           backgroundColor: '#f3f4f6',
  //                           color: '#6b7280'
  //                         }}>
  //                           No preview
  //                         </div>
  //                       )}
  //                       <button
  //                         type="button"
  //                         onClick={() => handleRemoveImage(image.id)}
  //                         style={{
  //                           position: 'absolute',
  //                           top: '4px',
  //                           right: '4px',
  //                           padding: '4px',
  //                           backgroundColor: 'rgba(239, 68, 68, 0.9)',
  //                           color: 'white',
  //                           border: 'none',
  //                           borderRadius: '4px',
  //                           cursor: 'pointer',
  //                           fontSize: '12px'
  //                         }}
  //                       >
  //                         ✕
  //                       </button>
  //                     </div>
  //                   );
  //                 })}
  //                 {(!formData.media?.images || formData.media.images.length === 0) && (
  //                   <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', margin: '2rem 0' }}>
  //                     No photos uploaded yet.
  //                   </p>
  //                 )}
  //               </div>
  //             </div>
  //           )}

  //           {error && (
  //             <div style={{
  //               padding: '12px',
  //               backgroundColor: '#fee2e2',
  //               border: '1px solid #fecaca',
  //               borderRadius: '6px',
  //               color: '#991b1b',
  //               marginTop: '1rem'
  //             }}>
  //               {error}
  //             </div>
  //           )}
  //         </div>

  //         {/* Modal Footer */}
  //         <div style={{
  //           display: 'flex',
  //           justifyContent: 'space-between',
  //           alignItems: 'center',
  //           padding: '1.5rem',
  //           borderTop: '1px solid #e5e7eb',
  //           backgroundColor: '#f9fafb'
  //         }}>
  //           {isEditing && (
  //             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px' }}>
  //               <input
  //                 type="checkbox"
  //                 checked={mustRequestInspection ? true : requestInspection}
  //                 onChange={(event) => setRequestInspection(event.target.checked)}
  //                 disabled={mustRequestInspection || isSubmitting}
  //               />
  //               <span>
  //                 {mustRequestInspection
  //                   ? "Vehicle will remain pending until inspection is completed."
  //                   : "Request a fresh inspection after saving changes."}
  //               </span>
  //             </label>
  //           )}
            
  //           <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
  //             <button
  //               type="button"
  //               onClick={onClose}
  //               disabled={isSubmitting}
  //               style={{
  //                 padding: '10px 20px',
  //                 border: '1px solid #d1d5db',
  //                 borderRadius: '6px',
  //                 backgroundColor: 'white',
  //                 color: '#374151',
  //                 fontSize: '14px',
  //                 cursor: isSubmitting ? 'not-allowed' : 'pointer',
  //                 fontWeight: '500'
  //               }}
  //             >
  //               Cancel
  //             </button>
  //             <button
  //               type="submit"
  //               disabled={isSubmitting || !ownerId}
  //               style={{
  //                 padding: '10px 20px',
  //                 border: '1px solid #3b82f6',
  //                 borderRadius: '6px',
  //                 backgroundColor: '#3b82f6',
  //                 color: 'white',
  //                 fontSize: '14px',
  //                 cursor: isSubmitting || !ownerId ? 'not-allowed' : 'pointer',
  //                 fontWeight: '500',
  //                 opacity: isSubmitting || !ownerId ? 0.6 : 1
  //               }}
  //             >
  //               {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Submit for Approval"}
  //             </button>
  //           </div>
  //         </div>
  //       </form>
  //     </div>
  //   </div>
  // );
return (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div 
      className="bg-gradient-to-br from-neutral-900 to-black border-2 border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* White border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/30 to-white/10"></div>
      
      <form onSubmit={handleSubmit}>
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 to-black">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF5A00] to-orange-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-white">
              {isEditing ? "Update Vehicle" : "List a Vehicle"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-900 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 whitespace-nowrap ${
                tab.id === activeTab 
                  ? 'border-[#FF5A00] text-white bg-gradient-to-r from-orange-500/10 to-transparent' 
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gradient-to-b from-neutral-900 to-black">
          {/* Tab Content */}
          {activeTab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Make *", key: "make", type: "text", required: true },
                { label: "Model *", key: "model", type: "text", required: true },
                { label: "Year *", key: "year", type: "number", required: true },
                { label: "Color", key: "color", type: "text" },
                { label: "License Plate", key: "licensePlate", type: "text" },
                { label: "Chassis Number", key: "chassisNumber", type: "text" }
              ].map((field) => (
                <label key={field.key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-300">{field.label}</span>
                  <input
                    type={field.type}
                    className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors duration-200"
                    value={formData.basicInfo[field.key]}
                    onChange={handleChange("basicInfo", field.key)}
                    required={field.required}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === "details" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { 
                  label: "Category", 
                  key: "category", 
                  type: "select",
                  options: ["car", "van", "truck", "motorcycle", "suv"]
                },
                { 
                  label: "Fuel Type", 
                  key: "fuelType", 
                  type: "select",
                  options: ["petrol", "diesel", "hybrid", "electric"]
                },
                { 
                  label: "Transmission", 
                  key: "transmission", 
                  type: "select",
                  options: ["automatic", "manual"]
                },
                { label: "Seating Capacity", key: "seatingCapacity", type: "number" },
                { label: "Mileage (km)", key: "mileage", type: "number" },
                { 
                  label: "Condition", 
                  key: "condition", 
                  type: "select",
                  options: ["excellent", "good", "fair", "poor"]
                }
              ].map((field) => (
                <label key={field.key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-300">{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors duration-200"
                      value={formData.details[field.key]}
                      onChange={handleChange("details", field.key)}
                    >
                      <option value="" className="bg-neutral-800">Select {field.label}</option>
                      {field.options.map(option => (
                        <option key={option} value={option} className="bg-neutral-800">
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      min="0"
                      className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors duration-200"
                      value={formData.details[field.key]}
                      onChange={handleChange("details", field.key)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Daily Rate *", key: "dailyRate", required: true },
                { label: "Weekly Rate", key: "weeklyRate" },
                { label: "Monthly Rate", key: "monthlyRate" },
                { label: "Security Deposit", key: "securityDeposit" }
              ].map((field) => (
                <label key={field.key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-300">{field.label}</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">LKR</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors duration-200"
                      value={formData.pricing[field.key]}
                      onChange={handleChange("pricing", field.key)}
                      required={field.required}
                      placeholder="0.00"
                    />
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeTab === "location" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Address *", key: "address", required: true },
                { label: "City *", key: "city", required: true },
                { label: "Province", key: "province" }
              ].map((field) => (
                <label key={field.key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-300">{field.label}</span>
                  <input
                    type="text"
                    className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors duration-200"
                    value={formData.location[field.key]}
                    onChange={handleChange("location", field.key)}
                    required={field.required}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === "media" && (
            <div className="space-y-4">
              <label className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-neutral-700 rounded-xl cursor-pointer hover:border-[#FF5A00] transition-colors duration-200 bg-neutral-800/50">
                <div className="text-4xl">📷</div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white">Vehicle Photos</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    PNG, JPG, JPEG up to 10MB each
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(formData.media?.images || []).map((image) => {
                  const preview = image.preview || image.url || (image.data && image.contentType
                    ? `data:${image.contentType};base64,${image.data}`
                    : "");

                  return (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800">
                        {preview ? (
                          <img 
                            src={preview} 
                            alt={image.name || "Vehicle photo"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            No preview
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-lg"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {(!formData.media?.images || formData.media.images.length === 0) && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">No photos uploaded yet</div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 mt-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-t border-neutral-800 bg-neutral-900">
          {isEditing && (
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={mustRequestInspection ? true : requestInspection}
                  onChange={(event) => setRequestInspection(event.target.checked)}
                  disabled={mustRequestInspection || isSubmitting}
                  className="sr-only"
                />
                <div className={`w-5 h-5 border-2 rounded transition-colors duration-200 ${
                  mustRequestInspection || requestInspection
                    ? 'bg-[#FF5A00] border-[#FF5A00]'
                    : 'bg-neutral-800 border-neutral-600'
                } ${mustRequestInspection || isSubmitting ? 'opacity-50' : ''}`}>
                  {(mustRequestInspection || requestInspection) && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={`${mustRequestInspection ? 'text-amber-300' : 'text-gray-300'}`}>
                {mustRequestInspection
                  ? "Vehicle will remain pending until inspection is completed."
                  : "Request a fresh inspection after saving changes."}
              </span>
            </label>
          )}
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-neutral-700 text-gray-300 rounded-lg font-medium hover:bg-neutral-800 hover:border-neutral-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !ownerId}
              className="px-6 py-3 bg-gradient-to-r from-[#FF5A00] to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-[#FF5A00] transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-orange-500/25 flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : isEditing ? "Save Changes" : "Submit for Approval"}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);
}

export default VehicleFormModal;