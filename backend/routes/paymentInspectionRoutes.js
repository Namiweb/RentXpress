import express from "express";
import {
  createInspection,
  getAllInspections,
  getInspectionById,
  updateInspection,
  deleteInspection
} from "../controller/paymentInspectionController.js";

const router = express.Router();

router.post("/", createInspection);
router.get("/", getAllInspections);
router.get("/:id", getInspectionById);
router.put("/:id", updateInspection);
router.delete("/:id", deleteInspection);

export default router;
