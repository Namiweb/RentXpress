import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, required: true, unique: true, trim: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Booking" },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  ratings: {
    vehicleRating: { type: Number, min: 1, max: 5 },
    driverRating: { type: Number, min: 1, max: 5, default: null },
    serviceRating: { type: Number, min: 1, max: 5 },
    overallRating: { type: Number, min: 1, max: 5 }
  },
  comments: {
    vehicleComment: { type: String },
    serviceComment: { type: String }
  },
  suggestions: { type: String },
  wouldRecommend: { type: Boolean, default: false }
}, { timestamps: true });

const Feedback = mongoose.model("feedbacks", feedbackSchema);

export default Feedback;