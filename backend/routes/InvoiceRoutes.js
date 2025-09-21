// routes/invoiceRoutes.js
import express from "express";
import {
  createInvoice,
  deleteInvoice,
  getAllInvoices,
 // getInvoiceById,
  updateInvoice
} from "../controller/InvoiceControllers.js";  

const router = express.Router();

// GET /api/invoices
router.get("/", getAllInvoices);

//router.get("/", getInvoiceById);

// POST /api/invoices
router.post("/", createInvoice);

// PUT /api/invoices/:id
router.put("/:id", updateInvoice);

// DELETE /api/invoices/:id
router.delete("/:id", deleteInvoice);

export default router;

