import Invoice from "../models/InvoiceModels.js";

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
    res.status(500).json({ message: "Internal server error" });
  }
}

// UPDATE an invoice
export async function updateInvoice(req, res) {
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

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceNumber,
        bookingId,
        customerId,
        inspectorId,
        status,
        invoiceDetails,
        amounts,
        customerInfo
      },
      { new: true }
    );

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
    const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.status(200).json({ message: "Invoice deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteInvoice controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

