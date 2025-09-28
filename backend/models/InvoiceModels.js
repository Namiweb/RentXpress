import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    inspectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inspector",
      required: true
    },
    status: {
      type: String,
      enum: ["paid", "unpaid", "pending"],
      default: "pending"
    },
    invoiceDetails: {
      issueDate: { type: Date },
      dueDate: { type: Date },
      paidDate: { type: Date, default: null },
      vehicleInfo: { type: String },
      rentalPeriod: { type: String }
    },
    amounts: {
      subtotal: { type: Number, default: 0 },
      extraCharges: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      securityDeposit: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: "LKR" }
    },
    customerInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String }
    }
  },
  {
    timestamps: true // createdAt & updatedAt auto-managed
  }
);

// Pre-save hook to compute totalAmount if missing or 0
InvoiceSchema.pre("save", function (next) {
  if (this.amounts) {
    const {
      subtotal = 0,
      extraCharges = 0,
      taxes = 0,
      securityDeposit = 0
    } = this.amounts;

    if (!this.amounts.totalAmount || this.amounts.totalAmount === 0) {
      this.amounts.totalAmount = subtotal + extraCharges + taxes + securityDeposit;
    }
  }
  next();
});

const Invoice = mongoose.model("Invoice", InvoiceSchema);
export default Invoice;
