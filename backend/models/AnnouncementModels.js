import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  announcementId: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
  targetAudience: [{ type: String, enum: ["customer", "vehicle_owner", "admin"] }],
  priority: { type: String, enum: ["low", "medium", "high"], default: "low" },
  publishedAt: { type: Date },
  expiryDate: { type: Date }
}, { timestamps: true });

const Announcement = mongoose.model("announcements", announcementSchema);

export default Announcement;