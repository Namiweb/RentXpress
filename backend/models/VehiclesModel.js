import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "users"
  },
  basicInfo: {
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: new Date().getFullYear() },
    color: { type: String, trim: true },
    licensePlate: { type: String, trim: true, uppercase: true },
    chassisNumber: { type: String, trim: true },
    engineNumber: { type: String, trim: true },
  },
  details: {
    category: { type: String, enum: ['SUV', 'Sedan', 'Van', 'Truck', 'Other', 'motorcycle'], default: 'Other' },
    fuelType: { type: String, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'petrol'], required: true },
    transmission: { type: String, enum: ['Manual', 'Automatic', 'manual'], required: true },
    seatingCapacity: { type: Number, min: 1, max: 50 },
    mileage: { type: Number, min: 0 },
    features: [String],
    condition: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor', 'excellent'], required: true },
    description: String,
  },
  pricing: {
    dailyRate: { type: Number, required: true, min: 0 },
    weeklyRate: { type: Number, min: 0 },
    monthlyRate: { type: Number, min: 0 },
    securityDeposit: { type: Number, min: 0 },
    extraDriverCharge: { type: Number, default: 0 },
    mileageLimit: { type: Number },
    currency: { type: String, default: 'LKR', uppercase: true }
  },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    province: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  availability: {
    isAvailable: { type: Boolean, default: true },
    unavailableDates: [Date],
    minimumBookingDays: { type: Number, default: 1, min: 1 },
    maximumBookingDays: { type: Number }
  },
  images: [String],
  documents: {
    registration: String,
    insurance: String,
    inspection: String
  },
  rating: {
    average: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    breakdown: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  searchMetadata: {
    searchTags: [String],
    popularityScore: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

const Vehicles = mongoose.model("vehicles", vehicleSchema);
export default Vehicles;
