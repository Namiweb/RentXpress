import Invoice from "../models/InvoiceModels.js";
import mongoose from "mongoose";

// GET all invoices
export async function getAllInvoices(req, res) {
  try {
    const invoices = await Invoice.find();
    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error in getAllInvoices controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET one invoice by ID
export async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.status(200).json(invoice);
  } catch (error) {
    console.error("Error in getInvoiceById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// CREATE a new invoice
export async function createInvoice(req, res) {
  try {
    const {
      invoiceNumber,
      bookingId,
      customerId,
      inspectorId,
      status,
      invoiceDetails,
      amounts,
      customerInfo
    } = req.body;

    // basic validation
    if (!invoiceNumber || !bookingId || !customerId || !inspectorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const invoice = new Invoice({
      invoiceNumber,
      bookingId,
      customerId,
      inspectorId,
      status,
      invoiceDetails,
      amounts,
      customerInfo
    });

    const savedInvoice = await invoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("Error in createInvoice controller", error);
    // if duplicate key (invoiceNumber unique)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Invoice number already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

// UPDATE an invoice
export async function updateInvoice(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const updateData = req.body;

    // If amounts are provided and totalAmount is missing, compute it server-side
    if (updateData.amounts) {
      const {
        subtotal = 0,
        extraCharges = 0,
        taxes = 0,
        securityDeposit = 0,
        totalAmount
      } = updateData.amounts;

      if (!totalAmount || totalAmount === 0) {
        updateData.amounts.totalAmount = subtotal + extraCharges + taxes + securityDeposit;
      }
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error("Error in updateInvoice controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// DELETE an invoice
export async function deleteInvoice(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.status(200).json({ message: "Invoice deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteInvoice controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
