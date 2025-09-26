import express from "express";
import {
  createDriverPayment,
  getAllDriverPayments,
  getDriverPaymentById,
  updateDriverPayment,
  deleteDriverPayment
} from "../controller/DriverPaymentsController.js";

const router = express.Router();

router.post("/", createDriverPayment);
router.get("/", getAllDriverPayments);
router.get("/:id", getDriverPaymentById);
router.put("/:id", updateDriverPayment);
router.delete("/:id", deleteDriverPayment);

export default router;

