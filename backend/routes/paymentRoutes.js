import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment
} from "../controller/paymentController.js";

const router = express.Router();

// All payment routes require authentication
router.use(verifyToken);

router.post("/", createPayment);
router.get("/", getAllPayments);
router.get("/:id", getPaymentById);
router.put("/:id", updatePayment);
router.delete("/:id", requireRole('admin'), deletePayment);

export default router;
