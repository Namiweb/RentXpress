import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'pass', 'fail'],
      default: 'pending'
    },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    dueDate: Date,
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const vehicleInspectionSchema = new mongoose.Schema(
  {
    inspectionId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'vehicles',
      required: true
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed'],
      default: 'assigned'
    },
    decision: {
      type: String,
      enum: ['pending', 'available', 'needs_maintenance'],
      default: 'pending'
    },
    dueDate: Date,
    assignedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: Date,
    completedAt: Date,
    mileage: {
      type: Number,
      min: 0
    },
    checklist: {
      brakes: {
        type: checklistItemSchema,
        default: () => ({})
      },
      tires: {
        type: checklistItemSchema,
        default: () => ({})
      },
      lights: {
        type: checklistItemSchema,
        default: () => ({})
      },
      fluids: {
        type: checklistItemSchema,
        default: () => ({})
      },
      insurance: {
        type: checklistItemSchema,
        default: () => ({})
      },
      registration: {
        type: checklistItemSchema,
        default: () => ({})
      },
      safetyEquipment: {
        type: checklistItemSchema,
        default: () => ({})
      },
      documents: {
        type: checklistItemSchema,
        default: () => ({})
      }
    },
    notes: { type: String, trim: true },
    inspectionLocation: { type: String, trim: true },
    weatherConditions: { type: String, trim: true },
    fuelLevel: {
      type: String,
      enum: ['full', 'three_quarters', 'half', 'quarter', 'low', 'empty'],
    },
    generalCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
    },
    exteriorCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
    },
    interiorCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
    },
    safetyConcerns: { type: String, trim: true },
    photos: {
      type: [assetSchema],
      default: []
    },
    documents: {
      type: [assetSchema],
      default: []
    },
    followUpActions: {
      type: [followUpSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model("VehicleInspection", vehicleInspectionSchema);
