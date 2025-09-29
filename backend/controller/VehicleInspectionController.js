import mongoose from "mongoose";
import VehicleInspection from "../models/VehicleInspectionModel.js";
import Vehicles from "../models/VehiclesModel.js";
import Notification from "../models/notificationModels.js";

function ensureObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function buildAssets(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item.url === "string" && item.url.trim().length > 0)
    .map((item) => ({
      label: typeof item.label === "string" ? item.label.trim() : undefined,
      url: item.url.trim(),
      uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : undefined,
    }));
}

function buildFollowUps(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item.description === "string" && item.description.trim().length > 0)
    .map((item) => ({
      description: item.description.trim(),
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      completed: Boolean(item.completed),
    }));
}

function mergeChecklist(target, updates = {}) {
  const keys = [
    "brakes",
    "tires",
    "lights",
    "fluids",
    "insurance",
    "registration",
    "safetyEquipment",
    "documents",
  ];

  keys.forEach((key) => {
    if (updates[key]) {
      if (!target[key]) {
        target[key] = {};
      }
      if (typeof updates[key].status === "string") {
        target[key].status = updates[key].status;
      }
      if (typeof updates[key].notes === "string") {
        target[key].notes = updates[key].notes;
      }
    }
  });
}

function createInspectionId() {
  const random = Math.floor(Math.random() * 900) + 100;
  return `VINSP-${Date.now().toString(36).toUpperCase()}-${random}`;
}

async function recomputeVehicleInspectionSummary(vehicleId) {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) return;

  const latestCompleted = await VehicleInspection.findOne({
    vehicle: vehicleId,
    status: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .lean();

  if (latestCompleted) {
    const decision = latestCompleted.decision || "pending";
    const updateSet = {
      inspectionStatus: decision === "available" ? "available" : "needs_maintenance",
      status: decision === "available" ? "approved" : "rejected",
      "availability.isAvailable": decision === "available",
      lastInspection: {
        inspectionId: latestCompleted.inspectionId,
        inspectedAt:
          latestCompleted.completedAt || latestCompleted.updatedAt || latestCompleted.createdAt || new Date(),
        decision,
        inspector: latestCompleted.inspector,
        notes: latestCompleted.notes,
        issues: latestCompleted.safetyConcerns,
      },
    };

    await Vehicles.findByIdAndUpdate(vehicleId, { $set: updateSet });
    return;
  }

  const activeInspection = await VehicleInspection.findOne({
    vehicle: vehicleId,
    status: { $in: ["in_progress", "assigned"] },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (activeInspection) {
    const updateSet = {
      inspectionStatus: activeInspection.status,
      status: "pending",
      "availability.isAvailable": false,
      lastInspection: {
        inspectionId: activeInspection.inspectionId,
        inspectedAt:
          activeInspection.startedAt || activeInspection.updatedAt || activeInspection.createdAt || new Date(),
        decision: activeInspection.decision,
        inspector: activeInspection.inspector,
        notes: activeInspection.notes,
        issues: activeInspection.safetyConcerns,
      },
    };

    await Vehicles.findByIdAndUpdate(vehicleId, { $set: updateSet });
    return;
  }

  await Vehicles.findByIdAndUpdate(vehicleId, {
    $set: {
      inspectionStatus: "pending",
      status: "pending",
      "availability.isAvailable": false,
    },
    $unset: { lastInspection: "" },
  });
}

async function createInspectionNotification({ inspectorId, vehicle, inspection }) {
  if (!inspectorId) return;

  try {
    const notification = new Notification({
      notificationId: `NOT${Date.now().toString().slice(-6)}`,
      userId: inspectorId,
      type: "inspection",
      priority: "high",
      status: "pending",
      title: "New vehicle assigned for inspection",
      message: `Vehicle ${vehicle?.basicInfo?.make || ""} ${
        vehicle?.basicInfo?.model || ""
      } has been assigned for inspection.`,
      channels: {
        email: { sent: false },
        sms: { sent: false },
        inApp: {
          read: false,
          actionUrl: `/dashboard/inspector?inspection=${inspection.inspectionId}`,
        },
      },
    });

    await notification.save();
  } catch (error) {
    console.error("Failed to create inspection notification", error);
  }
}

export async function assignVehicleInspection(req, res) {
  try {
    const { vehicleId, inspectorId, assignedBy, dueDate, notes, photos, documents, checklist } = req.body;

    const vehicleObjectId = ensureObjectId(vehicleId);
    const inspectorObjectId = ensureObjectId(inspectorId);
    const assignedByObjectId = assignedBy ? ensureObjectId(assignedBy) : null;

    if (!vehicleObjectId || !inspectorObjectId) {
      return res.status(400).json({ message: "Valid vehicleId and inspectorId are required" });
    }

    const vehicle = await Vehicles.findById(vehicleObjectId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const inspection = new VehicleInspection({
      inspectionId: createInspectionId(),
      vehicle: vehicleObjectId,
      inspector: inspectorObjectId,
      assignedBy: assignedByObjectId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      photos: buildAssets(photos),
      documents: buildAssets(documents),
      followUpActions: buildFollowUps(req.body.followUpActions),
    });

    if (checklist) {
      mergeChecklist(inspection.checklist, checklist);
    }

    const savedInspection = await inspection.save();

    await Vehicles.findByIdAndUpdate(vehicleObjectId, {
      inspectionStatus: "assigned",
    });

    await createInspectionNotification({
      inspectorId: inspectorObjectId,
      vehicle,
      inspection: savedInspection,
    });

    res.status(201).json(savedInspection);
  } catch (error) {
    console.error("Error assigning vehicle inspection", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function startManualVehicleInspection(req, res) {
  try {
    const {
      licensePlate,
      inspectorId,
      checklist,
      notes,
      mileage,
      photos,
      documents,
      inspectionLocation,
      weatherConditions,
      fuelLevel,
      generalCondition,
      exteriorCondition,
      interiorCondition,
      safetyConcerns,
    } = req.body;

    if (!licensePlate || !inspectorId) {
      return res.status(400).json({ message: "licensePlate and inspectorId are required" });
    }

    const inspectorObjectId = ensureObjectId(inspectorId);
    if (!inspectorObjectId) {
      return res.status(400).json({ message: "Invalid inspectorId" });
    }

    const normalizedPlate = licensePlate.trim().toUpperCase();
    if (!normalizedPlate) {
      return res.status(400).json({ message: "licensePlate cannot be empty" });
    }

    const vehicle = await Vehicles.findOne({ "basicInfo.licensePlate": normalizedPlate });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const numericMileage = Number(mileage);
    const mileageValue = Number.isFinite(numericMileage) && numericMileage >= 0 ? numericMileage : undefined;

    let inspection = await VehicleInspection.findOne({
      vehicle: vehicle._id,
      inspector: inspectorObjectId,
      status: { $in: ["assigned", "in_progress"] },
    });

    const createdNewInspection = !inspection;

    if (!inspection) {
      inspection = new VehicleInspection({
        inspectionId: createInspectionId(),
        vehicle: vehicle._id,
        inspector: inspectorObjectId,
        assignedBy: inspectorObjectId,
        status: "in_progress",
        decision: "pending",
      });
      inspection.startedAt = new Date();
    }

    if (typeof notes === "string") {
      inspection.notes = notes;
    }

    if (mileageValue !== undefined) {
      inspection.mileage = mileageValue;
    }

    if (checklist) {
      mergeChecklist(inspection.checklist, checklist);
    }

    if (typeof inspectionLocation === "string") {
      inspection.inspectionLocation = inspectionLocation;
    }

    if (typeof weatherConditions === "string") {
      inspection.weatherConditions = weatherConditions;
    }

    if (typeof fuelLevel === "string") {
      inspection.fuelLevel = fuelLevel;
    }

    if (typeof generalCondition === "string") {
      inspection.generalCondition = generalCondition;
    }

    if (typeof exteriorCondition === "string") {
      inspection.exteriorCondition = exteriorCondition;
    }

    if (typeof interiorCondition === "string") {
      inspection.interiorCondition = interiorCondition;
    }

    if (typeof safetyConcerns === "string") {
      inspection.safetyConcerns = safetyConcerns;
    }

    if (Array.isArray(photos)) {
      inspection.photos = buildAssets(photos);
    }

    if (Array.isArray(documents)) {
      inspection.documents = buildAssets(documents);
    }

    if (!inspection.startedAt) {
      inspection.startedAt = new Date();
    }

    const savedInspection = await inspection.save();

    if (createdNewInspection) {
      await Vehicles.findByIdAndUpdate(vehicle._id, {
        inspectionStatus: "in_progress",
      });
    }

    const [populatedInspection, refreshedVehicle] = await Promise.all([
      VehicleInspection.findById(savedInspection._id)
        .populate({ path: "vehicle", select: "basicInfo details documents availability inspectionStatus images" })
        .populate({ path: "inspector", select: "profile email role" }),
      Vehicles.findById(vehicle._id).select(
        "vehicleId basicInfo details availability inspectionStatus lastInspection images documents"
      ),
    ]);

    await recomputeVehicleInspectionSummary(vehicle._id);

    res.status(createdNewInspection ? 201 : 200).json({
      inspection: populatedInspection,
      vehicle: refreshedVehicle,
    });
  } catch (error) {
    console.error("Error starting manual vehicle inspection", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getVehicleInspections(req, res) {
  try {
    const { vehicleId, inspectorId, status } = req.query;
    const filter = {};

    if (vehicleId) {
      const id = ensureObjectId(vehicleId);
      if (!id) {
        return res.status(400).json({ message: "Invalid vehicleId" });
      }
      filter.vehicle = id;
    }

    if (inspectorId) {
      const id = ensureObjectId(inspectorId);
      if (!id) {
        return res.status(400).json({ message: "Invalid inspectorId" });
      }
      filter.inspector = id;
    }

    if (status) {
      if (status === "active") {
        filter.status = { $in: ["assigned", "in_progress"] };
      } else if (status === "completed") {
        filter.status = "completed";
      } else {
        filter.status = status;
      }
    }

    let inspections = await VehicleInspection.find(filter)
      .populate({ path: "vehicle", select: "basicInfo details availability inspectionStatus images" })
      .populate({ path: "inspector", select: "profile email role" })
      .sort({ createdAt: -1 });

    const { licensePlate, category, decision: decisionFilter, search, from, to } = req.query;

    if (licensePlate) {
      const term = licensePlate.toLowerCase();
      inspections = inspections.filter((item) =>
        item.vehicle?.basicInfo?.licensePlate?.toLowerCase().includes(term)
      );
    }

    if (category) {
      const lowered = category.toLowerCase();
      inspections = inspections.filter((item) =>
        item.vehicle?.details?.category?.toLowerCase() === lowered
      );
    }

    if (decisionFilter) {
      const lowered = decisionFilter.toLowerCase();
      inspections = inspections.filter((item) => (item.decision || "").toLowerCase() === lowered);
    }

    if (search) {
      const term = search.toLowerCase();
      inspections = inspections.filter((item) => {
        const vehicle = item.vehicle || {};
        return [
          vehicle.basicInfo?.make,
          vehicle.basicInfo?.model,
          vehicle.basicInfo?.licensePlate,
          vehicle.details?.category,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      });
    }

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        inspections = inspections.filter((item) => {
          const inspectedAt = item.completedAt || item.updatedAt || item.createdAt;
          return inspectedAt ? inspectedAt >= fromDate : false;
        });
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        inspections = inspections.filter((item) => {
          const inspectedAt = item.completedAt || item.updatedAt || item.createdAt;
          return inspectedAt ? inspectedAt <= toDate : true;
        });
      }
    }

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Error fetching inspections", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getInspectorAssignments(req, res) {
  try {
    const inspectorId = ensureObjectId(req.params.inspectorId);
    if (!inspectorId) {
      return res.status(400).json({ message: "Invalid inspectorId" });
    }

    const { status = "active" } = req.query;
    const filter = { inspector: inspectorId };

    if (status === "active") {
      filter.status = { $in: ["assigned", "in_progress"] };
    } else if (status !== "all") {
      filter.status = status;
    }

    const inspections = await VehicleInspection.find(filter)
      .populate({ path: "vehicle", select: "basicInfo details documents availability inspectionStatus images" })
      .sort({ assignedAt: -1 });

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Error fetching inspector assignments", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getVehicleInspectionById(req, res) {
  try {
    const inspection = await VehicleInspection.findById(req.params.id)
      .populate({ path: "vehicle", select: "basicInfo details documents availability images inspectionStatus" })
      .populate({ path: "inspector", select: "profile email role" });

    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }

    res.status(200).json(inspection);
  } catch (error) {
    console.error("Error fetching inspection by id", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateVehicleInspection(req, res) {
  try {
    const inspection = await VehicleInspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }

    const {
      status,
      decision,
      checklist,
      notes,
      mileage,
      photos,
      documents,
      followUpActions,
      inspectionLocation,
      weatherConditions,
      fuelLevel,
      generalCondition,
      exteriorCondition,
      interiorCondition,
      safetyConcerns,
    } = req.body;

    let vehicleStatusUpdate;

    if (typeof status === "string") {
      inspection.status = status;
      if (status === "in_progress" && !inspection.startedAt) {
        inspection.startedAt = new Date();
      }
      if (status === "completed" && !inspection.completedAt) {
        inspection.completedAt = new Date();
      }
    }

    if (typeof decision === "string") {
      inspection.decision = decision;
    }

    if (checklist) {
      mergeChecklist(inspection.checklist, checklist);
    }

    if (typeof notes === "string") {
      inspection.notes = notes;
    }

    if (typeof inspectionLocation === "string") {
      inspection.inspectionLocation = inspectionLocation;
    }

    if (typeof weatherConditions === "string") {
      inspection.weatherConditions = weatherConditions;
    }

    if (typeof fuelLevel === "string") {
      inspection.fuelLevel = fuelLevel;
    }

    if (typeof generalCondition === "string") {
      inspection.generalCondition = generalCondition;
    }

    if (typeof exteriorCondition === "string") {
      inspection.exteriorCondition = exteriorCondition;
    }

    if (typeof interiorCondition === "string") {
      inspection.interiorCondition = interiorCondition;
    }

    if (typeof safetyConcerns === "string") {
      inspection.safetyConcerns = safetyConcerns;
    }

    if (typeof mileage === "number") {
      inspection.mileage = mileage;
    }

    if (photos) {
      inspection.photos = buildAssets(photos);
    }

    if (documents) {
      inspection.documents = buildAssets(documents);
    }

    if (followUpActions) {
      inspection.followUpActions = buildFollowUps(followUpActions);
    }

    const savedInspection = await inspection.save();

    if (status === "in_progress") {
      vehicleStatusUpdate = {
        inspectionStatus: "in_progress",
        status: "pending",
      };
      vehicleStatusUpdate["availability.isAvailable"] = false;
    }

    let vehicleForNotification = null;

    if (status === "completed") {
      const finalDecision = decision || inspection.decision;
      if (finalDecision === "available" || finalDecision === "needs_maintenance") {
        vehicleForNotification = await Vehicles.findById(inspection.vehicle).select("ownerId basicInfo");
        vehicleStatusUpdate = {
          inspectionStatus: finalDecision === "available" ? "available" : "needs_maintenance",
          status: finalDecision === "available" ? "approved" : "rejected",
          lastInspection: {
            inspectionId: inspection.inspectionId,
            inspectedAt: savedInspection.completedAt || new Date(),
            decision: finalDecision,
            inspector: inspection.inspector,
            notes: savedInspection.notes,
            issues: savedInspection.safetyConcerns,
          },
        };

        vehicleStatusUpdate["availability.isAvailable"] = finalDecision === "available";
      }
    }

    if (vehicleStatusUpdate) {
      await Vehicles.findByIdAndUpdate(inspection.vehicle, vehicleStatusUpdate);
    }

    if (vehicleForNotification?.ownerId) {
      try {
        const finalDecision = decision || inspection.decision;
        const isApproved = finalDecision === "available";
        const vehicleName = `${vehicleForNotification.basicInfo?.make || "Vehicle"} ${
          vehicleForNotification.basicInfo?.model || ""
        }`.trim();
        const plate = vehicleForNotification.basicInfo?.licensePlate || inspection.inspectionId;
        const baseMessage = isApproved
          ? `${vehicleName || "Your vehicle"} (${plate || "N/A"}) has been approved and is now available for bookings.`
          : `${vehicleName || "Your vehicle"} (${plate || "N/A"}) needs maintenance before it can be listed.`;
        const details = savedInspection.safetyConcerns || savedInspection.notes;
        const message = details ? `${baseMessage}\nNotes: ${details}` : baseMessage;

        const ownerNotification = new Notification({
          notificationId: `NOT${(Date.now() + Math.floor(Math.random() * 1000)).toString().slice(-6)}`,
          userId: vehicleForNotification.ownerId,
          type: "inspection",
          priority: isApproved ? "medium" : "high",
          status: "pending",
          title: isApproved ? "Vehicle approved" : "Vehicle requires maintenance",
          message,
          channels: {
            email: { sent: false },
            sms: { sent: false },
            inApp: {
              read: false,
              actionUrl: "/dashboard/vehicle-owner",
            },
          },
        });

        await ownerNotification.save();
      } catch (notificationError) {
        console.error("Failed to notify vehicle owner", notificationError);
      }
    }

    await recomputeVehicleInspectionSummary(inspection.vehicle);

    res.status(200).json(savedInspection);
  } catch (error) {
    console.error("Error updating vehicle inspection", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getVehicleInspectionHistory(req, res) {
  try {
    const vehicleId = ensureObjectId(req.params.vehicleId);
    if (!vehicleId) {
      return res.status(400).json({ message: "Invalid vehicleId" });
    }

    const inspections = await VehicleInspection.find({ vehicle: vehicleId })
      .populate({ path: "inspector", select: "profile email role" })
      .sort({ completedAt: -1, createdAt: -1 });

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Error fetching vehicle inspection history", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteVehicleInspection(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inspection id" });
    }

    const inspection = await VehicleInspection.findByIdAndDelete(id);
    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }

    await recomputeVehicleInspectionSummary(inspection.vehicle);

    res.status(200).json({ message: "Inspection deleted" });
  } catch (error) {
    console.error("Error deleting vehicle inspection", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
