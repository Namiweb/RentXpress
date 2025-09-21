//-------------------------------------------------------------------------------------------------------------------------
// const userSchema = new mongoose.Schema(
//   {
//     firstName: {
//       type: String,
//       required: true,
//     },
//     lastName: {
//       type: String,
//       required: true,
//     },
//     contact: {
//       type: Number,
//       required: true,
//     },
//     email: {
//       type: String,
//       required: true,
//     },
//     password: {
//       type: String,
//       required: true,
//     },
// },
// { timestamps: true } // createdAt ,updateAt
// );

//----------------------------------------------------------------------------------------------------------------------------
import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['customer', 'driver', 'vehicle_owner', 'admin', 'inspector'],
    default: 'customer'
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    profileImage: {
      type: String,
      default: null
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'active'
  },
  preferences: {
    preferredVehicleType: {
      type: String,
      enum: ['car', 'van', 'truck', 'motorcycle', 'suv'],
      default: 'car'
    }
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  bookingHistory: {
    totalBookings: {
      type: Number,
      default: 0,
      min: 0
    },
    completedBookings: {
      type: Number,
      default: 0,
      min: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});


const users = mongoose.model("users", userSchema);

export default users;