import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverPaymentSchema = new Schema({
  paymentId: { type: String, required: true, unique: true },
  driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
  tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentType: { type: String, required: true }, // e.g. "trip_earning"
  paymentMethod: { type: String, required: true }, // e.g. "bank_transfer"
  status: { type: String, required: true }, // e.g. "completed"
  bankDetails: {
    accountNumber: String,
    bankName: String,
    branch: String,
    accountHolderName: String,
    transactionReference: String
  },
  processedAt: { type: Date },
  remarks: { type: String }
}, { timestamps: true });

// ✅ Fix OverwriteModelError
const DriverPayments = mongoose.models.Driver_Payments || mongoose.model("Driver_Payments", driverPaymentSchema);

export default DriverPayments;

