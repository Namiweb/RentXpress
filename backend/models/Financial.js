import mongoose from "mongoose";

const financialSchema = new mongoose.Schema({
  financialId: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ["salary", "payout", "commission", "expense"], 
    required: true 
  },
  recipientType: { 
    type: String, 
    enum: ["driver", "vehicle_owner", "inspector", "admin"], 
    required: true 
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'recipientType' 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: "LKR" },
  period: {
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true }
  },
  calculationDetails: {
    baseSalary: { type: Number, default: 0 },
    tripCount: { type: Number, default: 0 },
    tripEarnings: { type: Number, default: 0 },
    inspectionCount: { type: Number, default: 0 },
    inspectionEarnings: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 }
  },
  status: { 
    type: String, 
    enum: ["pending", "processing", "paid", "failed"], 
    default: "pending" 
  },
  paymentDate: { type: Date },
  processedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  notes: { type: String }
}, { timestamps: true });

const Financial = mongoose.model("Financial", financialSchema);
export default Financial;