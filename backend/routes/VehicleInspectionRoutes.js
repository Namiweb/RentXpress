import express from "express";
import {
  assignVehicleInspection,
  startManualVehicleInspection,
  getVehicleInspections,
  getInspectorAssignments,
  getVehicleInspectionById,
  updateVehicleInspection,
  getVehicleInspectionHistory,
  deleteVehicleInspection,
} from "../controller/VehicleInspectionController.js";

const router = express.Router();

router.post("/", assignVehicleInspection);
router.post("/manual", startManualVehicleInspection);
router.get("/", getVehicleInspections);
router.get("/inspector/:inspectorId", getInspectorAssignments);
router.get("/vehicle/:vehicleId/history", getVehicleInspectionHistory);
router.get("/:id", getVehicleInspectionById);
router.put("/:id", updateVehicleInspection);
router.delete("/:id", deleteVehicleInspection);

export default router;
