// import express from "express";
// import {
//   calculateSalaries,
//   getFinancialRecords,
//   updateSalaryConfig,
//   getSalaryConfig,
//   processPayments,
//   getFinancialSummary,
//   getPaidFinancials
// } from "../controller/FinancialController.js";

// const router = express.Router();

// router.post("/calculate-salaries", calculateSalaries);
// router.get("/payouts", getPaidFinancials)
// router.get("/records", getFinancialRecords);
// router.get("/summary", getFinancialSummary);
// router.put("/config/:role", updateSalaryConfig);
// router.get("/config", getSalaryConfig);
// router.post("/process-payments", processPayments);

// export default router;

import express from "express";
import {
  calculateSalaries,
  getFinancialRecords,
  updateSalaryConfig,
  getSalaryConfig,
  processPayments,
  getFinancialSummary,
  getPaidFinancials,
  getAllPaidFinancials,
  getFinancialStats
} from "../controller/FinancialController.js";

const router = express.Router();

router.post("/calculate-salaries", calculateSalaries);
router.get("/payouts", getPaidFinancials); // Legacy endpoint
router.get("/paid-records", getAllPaidFinancials); // New endpoint for all paid records
router.get("/records", getFinancialRecords);
router.get("/summary", getFinancialSummary);
router.get("/stats", getFinancialStats); // New stats endpoint
router.put("/config/:role", updateSalaryConfig);
router.get("/config", getSalaryConfig);
router.post("/process-payments", processPayments);

export default router;