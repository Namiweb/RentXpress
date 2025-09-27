import mongoose from "mongoose";
const Schema = mongoose.Schema;

const tripSchema = new Schema(
  {
    tripId: { type: String, required: true, unique: true, trim: true },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    pickupLocation: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    },

    dropLocation: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    },

    tripDetails: {
      scheduledDateTime: { type: Date, required: true },
      actualStartTime: { type: Date, default: null },
      actualEndTime: { type: Date, default: null },
      estimatedDuration: { type: Number, required: true }, // in minutes
      actualDuration: { type: Number, default: 0 },
      distance: { type: Number, required: true }, // in km
      vehicleType: { type: String, required: true, trim: true },
      status: {
        type: String,
        enum: ["scheduled", "in-progress", "completed", "cancelled"],
        default: "scheduled",
      },
    },

    fareDetails: {
      baseFare: { type: Number, required: true },
      distanceFare: { type: Number, required: true },
      timeFare: { type: Number, required: true },
      totalFare: { type: Number, required: true },
      currency: { type: String, default: "LKR", uppercase: true },
      paymentMethod: {
        type: String,
        enum: ["cash", "card", "online"],
        required: true,
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed", "paid"],
        default: "pending",
      },
      customerRating: { type: Number, min: 1, max: 5, default: null },
      driverRating: { type: Number, min: 1, max: 5, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Trip", tripSchema);
