import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverApplicationSchema = new Schema({
  applicationId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  personalInfo: { type: Object },
  emergencyContact: { type: Object }, // added
  licenseInfo: { type: Object },
  vehiclePreferences: { type: Object },
  vehicleDetails: { type: Object }, // added
  experience: { type: Object },
  documents: { type: Object },
  status: { type: String, default: "under_review" }
}, { timestamps: true });

export default mongoose.model("Driver_Application", driverApplicationSchema);
