import mongoose from "mongoose";
const Schema = mongoose.Schema;

const tripSchema = new Schema({
  tripId: { type: String, required: true },
  customerId: { type: String, required: true },
  driverId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  pickupLocation: {
    address: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dropLocation: {
    address: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  tripDetails: {
    scheduledDateTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,
    estimatedDuration: Number,
    actualDuration: Number,
    distance: Number,
    vehicleType: String,
    status: String
  },
  fareDetails: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    totalFare: Number,
    currency: String,
    paymentMethod: String,
    paymentStatus: String,
    customerRating: Number,
    driverRating: Number
  }
}, { timestamps: true });

export default mongoose.model("Trip", tripSchema);
