import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    dailyRate: { type: Number, min: 0 },
    totalDays: { type: Number, min: 1 },
    subtotal: { type: Number, min: 0 },
    taxes: { type: Number, min: 0 },
    driverFee: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, default: "LKR" },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pickupTime: { type: String, trim: true },
    returnTime: { type: String, trim: true },
    totalDays: { type: Number, min: 1 },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicles",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    driverRequested: {
      type: Boolean,
      default: false,
    },
    driverStatus: {
      type: String,
      enum: ["not-required", "pending", "accepted", "declined", "on_the_way", "started", "completed"],
      default: "not-required",
    },
    driverAcceptedAt: Date,
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "started",
        "in_progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    bookingDetails: scheduleSchema,
    pickupLocation: locationSchema,
    dropoffLocation: locationSchema,
    pricing: pricingSchema,
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

bookingSchema.pre("validate", function (next) {
  if (this.driverRequested && this.driverStatus === "not-required") {
    this.driverStatus = "pending";
  }
  if (!this.driverRequested) {
    this.driverStatus = "not-required";
    this.driverId = undefined;
    this.driverAcceptedAt = undefined;
  }

  if (
    this.bookingDetails?.startDate &&
    this.bookingDetails?.endDate &&
    !this.bookingDetails.totalDays
  ) {
    const start = new Date(this.bookingDetails.startDate);
    const end = new Date(this.bookingDetails.endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    this.bookingDetails.totalDays = Math.max(diff || 1, 1);
  }

  next();
});

const Booking = mongoose.model("Bookings", bookingSchema);
export default Booking;
