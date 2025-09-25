import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverEarningsSchema = new Schema({
  earningsId: { type: String, required: true, unique: true },
  driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, required: true }
  },
  tripMetrics: {
    totalTrips: Number,
    completedTrips: Number,
    cancelledTrips: Number,
    totalDistance: Number,
    totalHours: Number,
    averageRating: Number
  },
  earnings: {
    grossEarnings: Number,
    platformCommission: Number,
    netEarnings: Number,
    bonuses: Number,
    penalties: Number,
    fuelAllowance: Number,
    totalPayable: Number,
    currency: String
  },
  paymentSummary: {
    totalPaid: Number,
    pendingAmount: Number,
    lastPaymentDate: Date,
    paymentStatus: String
  }
}, { timestamps: true });

export default mongoose.model("Driver_Earnings", driverEarningsSchema);

