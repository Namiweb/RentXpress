// models/InvoiceModel.js
import mongoose from "mongoose";

const invoiceDetailsSchema = new mongoose.Schema({
  issueDate: Date,
  dueDate: Date,
  paidDate: Date,
  vehicleInfo: String,
  rentalPeriod: String,
}, { _id: false });

const customerInfoSchema = new mongoose.Schema({
  createdAt: Date,
  updatedAt: Date,
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  bookingId: { type: String, required: true },
  customerId: { type: String, required: true },
  inspectorId: { type: String, required: true },
  status: { type: String, enum: ['paid', 'unpaid', 'pending'], required: true },
  invoiceDetails: invoiceDetailsSchema,
  amounts: { type: mongoose.Schema.Types.Mixed },
  customerInfo: customerInfoSchema
}, { timestamps: true });

export default mongoose.model("Invoice", invoiceSchema);

