import mongoose from "mongoose";

const FinanceReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reportType: { type: String, required: true },
  status: { type: String, required: true },
  title: { type: String, required: true },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  data: {
    totalRevenue: { type: Number, required: true },
    totalBookings: { type: Number, required: true },
    averageBookingValue: { type: Number, required: true }
  },
  topPerformingVehicles: [{ type: String }],
  revenueByCategory: {
    car: { type: Number },
    suv: { type: Number },
    truck: { type: Number },
    van: { type: Number }
  },
  expenseBreakdown: {
    maintenance: { type: Number },
    insurance: { type: Number },
    marketing: { type: Number },
    operations: { type: Number },
    netProfit: { type: Number }
  },
  generatedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("FinanceReport", FinanceReportSchema);
