import express from "express";
import {
  calculateSalaries,
  getFinancialRecords,
  updateSalaryConfig,
  getSalaryConfig,
  processPayments,
  getFinancialSummary,
  getPaidFinancials
} from "../controller/FinancialController.js";

const router = express.Router();

router.post("/calculate-salaries", calculateSalaries);
router.get("/payouts", getPaidFinancials)
router.get("/records", getFinancialRecords);
router.get("/summary", getFinancialSummary);
router.put("/config/:role", updateSalaryConfig);
router.get("/config", getSalaryConfig);
router.post("/process-payments", processPayments);

export default router;