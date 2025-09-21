// models/bookingModel.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "users",
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "vehicles", // Assuming you have a Vehicle model
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null,
  },
  status: {
    type: String,
    enum: ["confirmed", "cancelled", "completed", "in_progress"],
    default: "confirmed",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  bookingDetails: {
    startDate: Date,
    endDate: Date,
    pickupTime: String,
    returnTime: String,
    totalDays: Number,
  },
  pickupLocation: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  returnLocation: {
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  pricing: {
    dailyRate: Number,
    totalDays: Number,
    subtotal: Number,
    extraDriverCharge: Number,
    securityDeposit: Number,
    taxes: Number,
    totalAmount: Number,
    currency: {
      type: String,
      default: "LKR",
    },
  },
  driverInfo: {
    withDriver: Boolean,
    driverName: String,
    driverContact: String,
    specialRequests: String,
  },
}, {
  timestamps: true
});

const Bookings = mongoose.model("Bookings", bookingSchema);
export default Bookings;
