import mongoose from "mongoose";
import Vehicles from "../models/VehiclesModel.js";
import Notification from "../models/notificationModels.js";
import Users from "../models/UserModels.js";

function extractBase64Data(value, fallbackType) {
  if (!value) return { data: undefined, contentType: fallbackType };

  if (typeof value !== "string") {
    return { data: value, contentType: fallbackType };
  }

  const dataUrlMatch = value.match(/^data:(.+);base64,(.*)$/);
  if (dataUrlMatch) {
    return {
      contentType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  return { data: value, contentType: fallbackType };
}

function sanitizeMediaAsset(rawAsset) {
  if (!rawAsset) return null;

  if (typeof rawAsset === "string") {
    const trimmed = rawAsset.trim();
    if (!trimmed) return null;
    return {
      url: trimmed,
      uploadedAt: new Date(),
    };
  }

  const asset = {};
  if (rawAsset.name) asset.name = rawAsset.name;
  if (rawAsset.url) asset.url = rawAsset.url;
  if (rawAsset.uploadedAt) asset.uploadedAt = rawAsset.uploadedAt;

  const { data, contentType } = extractBase64Data(rawAsset.data, rawAsset.contentType);
  if (data) {
    asset.data = data;
  }

  if (rawAsset.contentType || contentType) {
    asset.contentType = rawAsset.contentType || contentType;
  }

  if (!asset.url && !asset.data) {
    return null;
  }

  if (!asset.uploadedAt) {
    asset.uploadedAt = new Date();
  }

  return asset;
}

function normalizeImagesFromBody(mediaImages, fallbackImages) {
  const imagesSource = Array.isArray(mediaImages) ? mediaImages : Array.isArray(fallbackImages) ? fallbackImages : [];
  const normalized = imagesSource
    .map((item) => sanitizeMediaAsset(item))
    .filter(Boolean);
  return normalized;
}

function extractMediaFromBody(body = {}) {
  const media = body.media || {};
  const images = normalizeImagesFromBody(media.images, body.images);

  const result = {};
  const imagesExplicitlyProvided = Array.isArray(media.images) || Array.isArray(body.images);
  if (imagesExplicitlyProvided) {
    result.images = images;
  }

  return result;
}

async function notifyInspectorsOfVehicle(vehicle, { isResubmission = false } = {}) {
  try {
    const inspectors = await Users.find({ role: "inspector", status: { $ne: "inactive" } }).select("_id");
    if (!inspectors.length) return;

    const baseTime = Date.now();
    const displayName = `${vehicle.basicInfo?.make || "Vehicle"} ${vehicle.basicInfo?.model || ""}`.trim();
    const plate = vehicle.basicInfo?.licensePlate || vehicle.vehicleId;
    const title = isResubmission
      ? "Vehicle resubmitted for inspection"
      : "New vehicle pending inspection";
    const message = isResubmission
      ? `${displayName || "A vehicle"} (${plate || "N/A"}) has been updated and requires a follow-up inspection.`
      : `${displayName || "A vehicle"} (${plate || "N/A"}) was just listed and is awaiting inspection.`;

    const notifications = inspectors.map((inspector, index) => ({
      notificationId: `NOT${(baseTime + index).toString().slice(-6)}`,
      userId: inspector._id,
      type: "inspection",
      priority: isResubmission ? "medium" : "high",
      status: "pending",
      title,
      message,
      channels: {
        email: { sent: false },
        sms: { sent: false },
        inApp: {
          read: false,
          actionUrl: `/dashboard/inspector?plate=${encodeURIComponent(plate || "")}`,
        },
      },
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Failed to notify inspectors about vehicle", error);
  }
}

function buildVehicleCreationPayload(body = {}) {
  const availability = {
    ...(body.availability || {}),
    isAvailable: false,
  };

  const sanitized = {
    ...body,
    availability,
    status: "pending",
    inspectionStatus: "pending",
    lastInspection: body.lastInspection || undefined,
  };

  delete sanitized.media;
  delete sanitized.images;

  const mediaPayload = extractMediaFromBody(body);
  if (mediaPayload.images) {
    sanitized.images = mediaPayload.images;
  }

  return sanitized;
}

// Create Vehicle
export async function createVehicle(req, res) {
  try {
    if (!req.body.ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const payload = buildVehicleCreationPayload(req.body);
    const vehicle = new Vehicles(payload);
    const saved = await vehicle.save();

    await notifyInspectorsOfVehicle(saved);

    res.status(201).json(saved);
  } catch (error) {
    console.error("Error in createVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get all Vehicles
export async function getAllVehicles(req, res) {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.inspectionStatus) {
      filter.inspectionStatus = req.query.inspectionStatus;
    }

    if (req.query.ownerId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.ownerId)) {
        return res.status(400).json({ message: "Invalid ownerId" });
      }
      filter.ownerId = req.query.ownerId;
    }

    if (req.query.isAvailable) {
      const isAvailable = req.query.isAvailable === "true";
      filter["availability.isAvailable"] = isAvailable;
    }

    const vehicles = await Vehicles.find(filter);
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error in getAllVehicles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get Vehicle by ID
export async function getVehicleById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }
    const vehicle = await Vehicles.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (error) {
    console.error("Error in getVehicleById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update Vehicle
export async function updateVehicle(req, res) {
  try {
    const vehicleId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }

    const existingVehicle = await Vehicles.findById(vehicleId);
    if (!existingVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const { requestInspection, media, images, ...updateData } = req.body || {};
    const previousStatus = existingVehicle.status;

    const updateKeys = Object.keys(updateData || {});
    const hasUpdates = updateKeys.length > 0;
    const statusOnlyUpdate =
      hasUpdates &&
      updateKeys.every((key) =>
        ["status", "inspectionStatus", "availability", "lastInspection"].includes(key)
      );

    existingVehicle.set(updateData);

    if (Object.prototype.hasOwnProperty.call(updateData, "availability")) {
      existingVehicle.markModified("availability");
    }

    const mediaPayload = extractMediaFromBody({ media, images });
    if (mediaPayload.images) {
      existingVehicle.images = mediaPayload.images;
      existingVehicle.markModified("images");
    }

    let shouldRequestInspection = Boolean(requestInspection);

    // Only force a new inspection when the update changes core vehicle details
    if (!statusOnlyUpdate && hasUpdates && previousStatus !== "approved") {
      shouldRequestInspection = true;
    }

    if (shouldRequestInspection) {
      existingVehicle.status = "pending";
      existingVehicle.inspectionStatus = "pending";
      existingVehicle.availability = {
        ...(existingVehicle.availability || {}),
        isAvailable: false,
      };

      if (existingVehicle.lastInspection) {
        existingVehicle.lastInspection.decision = "pending";
      }
    }

    const saved = await existingVehicle.save();

    if (shouldRequestInspection) {
      await notifyInspectorsOfVehicle(saved, { isResubmission: true });
    }

    res.status(200).json({ message: "Vehicle updated successfully", data: saved });
  } catch (error) {
    console.error("Error in updateVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Delete Vehicle
export async function deleteVehicle(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }
    const deleted = await Vehicles.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error in deleteVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
