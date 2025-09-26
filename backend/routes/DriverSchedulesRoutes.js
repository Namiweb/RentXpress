import express from "express";
import {
  createDriverSchedule,
  getAllDriverSchedules,
  getDriverScheduleById,
  updateDriverSchedule,
  deleteDriverSchedule
} from "../controller/DriverSchedulesController.js";

const router = express.Router();

router.post("/", createDriverSchedule);
router.get("/", getAllDriverSchedules);
router.get("/:id", getDriverScheduleById);
router.put("/:id", updateDriverSchedule);
router.delete("/:id", deleteDriverSchedule);

export default router;

