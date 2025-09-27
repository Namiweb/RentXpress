import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema({
  adId: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String },
  targetUrl: { type: String },
  isActive: { type: Boolean, default: true },
  placement: [{ type: String }],
  budget: { type: Object },
  schedule: { type: Object },
  metrics: { type: Object }
}, { timestamps: true });

const Advertisement = mongoose.model("advertisements", advertisementSchema);

export default Advertisement;