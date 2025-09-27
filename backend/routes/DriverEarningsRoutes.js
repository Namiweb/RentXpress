import express from "express";
import {
  createDriverEarnings,
  getAllDriverEarnings,
  getDriverEarningsById,
  updateDriverEarnings,
  deleteDriverEarnings
} from "../controller/DriverEarningsController.js";

const router = express.Router();

router.post("/", createDriverEarnings);
router.get("/", getAllDriverEarnings);
router.get("/:id", getDriverEarningsById);
router.put("/:id", updateDriverEarnings);
router.delete("/:id", deleteDriverEarnings);

export default router;

