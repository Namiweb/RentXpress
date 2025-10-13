import mongoose from "mongoose";

const salaryConfigSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ["driver", "vehicle_owner", "inspector"], 
    required: true, 
    unique: true 
  },
  baseSalary: { type: Number, default: 0 },
  commissionRates: {
    perTrip: { type: Number, default: 0 }, // Percentage
    perInspection: { type: Number, default: 0 }, // Fixed amount
    revenueShare: { type: Number, default: 0 } // Percentage of trip revenue
  },
  bonuses: {
    minTripsForBonus: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    minInspectionsForBonus: { type: Number, default: 0 },
    inspectionBonus: { type: Number, default: 0 }
  },
  deductions: {
    taxRate: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { timestamps: true });

const SalaryConfig = mongoose.model("SalaryConfig", salaryConfigSchema);
export default SalaryConfig;