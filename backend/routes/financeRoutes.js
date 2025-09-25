import express from "express";
import {
  createFinanceReport,
  getAllFinanceReports,
  getFinanceReportById,
  updateFinanceReport,
  deleteFinanceReport
} from "../controller/financeController.js";

const router = express.Router();

router.post("/", createFinanceReport);
router.get("/", getAllFinanceReports);
router.get("/:id", getFinanceReportById);
router.put("/:id", updateFinanceReport);
router.delete("/:id", deleteFinanceReport);

export default router;
