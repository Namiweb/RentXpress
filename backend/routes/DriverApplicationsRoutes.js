import express from "express";
import {
  createDriverApplication,
  getDriverApplications,
  getDriverApplicationById,
  updateDriverApplication,
  deleteDriverApplication
} from "../controller/DriverApplicationsController.js";

const router = express.Router();

router.post("/", createDriverApplication);
router.get("/", getDriverApplications);
router.get("/:id", getDriverApplicationById);
router.put("/:id", updateDriverApplication);
router.delete("/:id", deleteDriverApplication);

export default router;

