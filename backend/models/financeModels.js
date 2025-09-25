import mongoose from "mongoose";

const FinanceReportSchema = new mongoose.Schema({
  reportId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "users", 
    required: true 
  },
  reportType: { 
    type: String, 
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'completed', 'failed']
  },
  title: { 
    type: String, 
    required: true 
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  data: {
    totalRevenue: { type: Number, required: true },
    totalBookings: { type: Number, required: true },
    averageBookingValue: { type: Number, required: true }
  },
  topPerformingVehicles: [{ 
    type: String 
  }],
  dailyBreakdown: {
    type: Map,
    of: Number
  },
  newCustomers: { 
    type: Number, 
    default: 0 
  },
  returningCustomers: { 
    type: Number, 
    default: 0 
  },
  generatedAt: { 
    type: Date, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("FinanceReport", FinanceReportSchema);
