import mongoose from "mongoose";
const Schema = mongoose.Schema;

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  ownerId: { type: String, required: true },
  basicInfo: { type: Object },
  details: { type: Object },
  pricing: { type: Object },
  location: { type: Object },
  status: { type: String },
  availability: { type: Object },
  images: [{ type: String }],
  documents: { type: Object }, // <-- uncommented to match request
  rating: { type: Object },
  searchMetadata: { type: Object },
}, { timestamps: true });

export default mongoose.model("vehicles", vehicleSchema);
