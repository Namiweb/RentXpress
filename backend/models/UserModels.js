import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    // Common fields for all user types
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profilePicture: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['customer', 'vehicle_owner', 'driver', 'vehicle_inspector', 'admin'],
        default: 'customer'
    },

    // Address fields
    address: {
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        }
    },

    nicNumber: {
        type: String,
        required: true,
        unique: true
    },

    // Customer specific fields
    dateOfBirth: {
        type: Date,
        required: function () {
            return this.role === 'customer' || this.role === 'driver';
        }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: function () {
            return this.role === 'customer' || this.role === 'driver';
        }
    },

    // Vehicle Owner specific fields
    vehicleModel: {
        type: String,
        required: function () {
            return this.role === 'vehicle_owner';
        }
    },

    // Driver specific fields
    maritalStatus: {
        type: String,
        enum: ['married', 'unmarried'],
        required: function () {
            return this.role === 'driver';
        }
    },
    drivingLicenseNumber: {
        type: String,
        required: function () {
            return this.role === 'driver';
        },
        unique: true,
        sparse: true
    },
    licenseExpiryDate: {
        type: Date,
        required: function () {
            return this.role === 'driver';
        }
    },
    drivingExperience: {
        type: Number,
        required: function () {
            return this.role === 'driver';
        }
    },
    vehicleCategories: [{
        type: String,
        enum: ['car', 'van', 'truck', 'motorcycle', 'bus']
    }],
    drivingLicensePhoto: {
        type: String,
        required: function () {
            return this.role === 'driver';
        }
    },

    // Vehicle Inspector specific fields
    workExperience: {
        type: Number,
        required: function () {
            return this.role === 'vehicle_inspector';
        }
    },
    qualifications: {
        type: String,
        required: function () {
            return this.role === 'vehicle_inspector';
        }
    },
    certificationDocument: {
        type: String,
        required: function () {
            return this.role === 'vehicle_inspector';
        }
    },

    // Authentication related fields
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
}, {
    timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    delete userObject.emailVerificationToken;
    delete userObject.emailVerificationExpires;
    return userObject;
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);
export default User;
