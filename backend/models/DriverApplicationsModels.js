import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverApplicationSchema = new Schema(
  {
    applicationId: { type: String, required: true, unique: true },
    email: { type: String, required: true },

    driverId: { type: Schema.Types.ObjectId, ref: "users" },
    vehicleId: { type: Schema.Types.ObjectId, ref: "vehicles" },

    licenseInfo: {
      licenseNumber: { type: String, required: true },
      licenseType: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      issuingAuthority: { type: String }
    },

    experience: {
      yearsOfExperience: { type: Number },
      previousEmployers: { type: Array }
    },

    documents: {
      profilePhoto: { type: String },
      licensePhoto: { type: String },
      nationalId: { type: String },
      addressProof: { type: String }
    },

    status: { type: String, default: "under_review" },
    reviewComments: { type: String },
    reviewedBy: { type: String },  // store reviewer’s ID/email as string
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Driver_Applications", driverApplicationSchema);

