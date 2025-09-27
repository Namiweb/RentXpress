import mongoose from "mongoose";

const paymentInspectionSchema = new mongoose.Schema({
  inspectionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  inspectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending'
  },
  inspectionDetails: {
    verificationMethod: {
      type: String,
      enum: ['manual', 'automated', 'hybrid'],
      required: true
    },
    findings: [{
      category: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    documents: [{
      documentType: {
        type: String,
        enum: ['receipt', 'invoice', 'proof', 'other'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  remarks: String,
  inspectedAt: {
    type: Date,
    default: Date.now
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

// Middleware to update updatedAt timestamp before saving
paymentInspectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("PaymentInspection", paymentInspectionSchema);