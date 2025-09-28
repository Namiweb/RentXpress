import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import User from '../models/UserModels.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    deleteAccount,
    forgotPassword,
    resetPassword,
    verifyEmail,
    changePassword
} from '../controller/authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, '../uploads/');

        if (file.fieldname === 'profilePicture') {
            uploadPath += 'profiles/';
        } else if (file.fieldname === 'drivingLicensePhoto') {
            uploadPath += 'licenses/';
        } else if (file.fieldname === 'certificationDocument') {
            uploadPath += 'certifications/';
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'profilePicture' || file.fieldname === 'drivingLicensePhoto') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    } else if (file.fieldname === 'certificationDocument') {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image or PDF files are allowed'), false);
        }
    } else {
        cb(new Error('Unexpected field'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to handle file upload errors
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${error.message}`
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
};

// Middleware to process uploaded files
const processUploads = (req, res, next) => {
    try {
        // Initialize req.body if it doesn't exist
        if (!req.body) {
            req.body = {};
        }

        console.log('Raw request body before processing:', req.body); // Debug log

        // Handle JSON data for address field
        if (req.body.address && typeof req.body.address === 'string') {
            try {
                req.body.address = JSON.parse(req.body.address);
            } catch (error) {
                console.error('Error parsing address:', error);
                // For vehicle_owner role, address should be an object
                if (req.body.role === 'vehicle_owner') {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid address format. Expected object with street and city.'
                    });
                }
            }
        }

        // Handle vehicleCategories array
        if (req.body.vehicleCategories && typeof req.body.vehicleCategories === 'string') {
            try {
                req.body.vehicleCategories = JSON.parse(req.body.vehicleCategories);
            } catch (error) {
                console.error('Error parsing vehicleCategories:', error);
                // If not valid JSON, treat as array with single item
                req.body.vehicleCategories = [req.body.vehicleCategories];
            }
        }

        // Process uploaded files
        if (req.files) {
            Object.keys(req.files).forEach(fieldname => {
                const file = req.files[fieldname][0];
                if (file) {
                    req.body[fieldname] = `/uploads/${path.relative(path.join(__dirname, '../uploads/'), file.path)}`;
                }
            });
        }

        // Ensure role is set if not provided
        if (!req.body.role) {
            req.body.role = 'customer';
        }

        console.log('Processed request body:', req.body); // Debug log
        next();
    } catch (error) {
        console.error('Error in processUploads middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing upload data'
        });
    }
};

// Temporary debug login route - remove after fixing the issue
router.post('/debug-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Debug login attempt:', { email, password });

        // Find user with case-insensitive email
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        console.log('User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('User details:', {
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                passwordInDb: user.password
            });

            // Check if password matches (plain text comparison for debugging)
            const isPasswordMatch = user.password === password;
            console.log('Password match:', isPasswordMatch);

            if (isPasswordMatch && user.isActive) {
                res.json({
                    success: true,
                    message: 'Debug login successful',
                    user: {
                        id: user._id,
                        email: user.email,
                        role: user.role
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: `Debug: Password match: ${isPasswordMatch}, User active: ${user.isActive}`
                });
            }
        } else {
            res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Debug login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during debug login'
        });
    }
});

// Temporary route to fix admin password - remove after fixing
router.post('/fix-admin-password', async (req, res) => {
    try {
        const adminEmail = 'hasith.admin@rentxpress.com';
        const plainPassword = 'admin123';

        // Find the admin user
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }

        // Hash the password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        // Update the admin password
        await User.findByIdAndUpdate(admin._id, { password: hashedPassword });

        res.json({
            success: true,
            message: 'Admin password has been hashed and updated successfully'
        });

    } catch (error) {
        console.error('Error fixing admin password:', error);
        res.status(500).json({
            success: false,
            message: 'Error fixing admin password'
        });
    }
});

// Public routes
router.post('/register', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 },
    { name: 'certificationDocument', maxCount: 1 }
]), handleUploadError, processUploads, register);

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 },
    { name: 'certificationDocument', maxCount: 1 }
]), handleUploadError, processUploads, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.delete('/account', verifyToken, deleteAccount);

// Admin routes
router.get('/customers', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const customers = await User.find({ role: 'customer', isActive: true })
            .select('-password -passwordResetToken -emailVerificationToken')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            customers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers'
        });
    }
});

router.get('/drivers', verifyToken, requireRole('vehicle_owner', 'admin'), async (req, res) => {
    try {
        const drivers = await User.find({
            role: 'driver',
            isActive: true,
            licenseExpiryDate: { $gt: new Date() }
        })
            .select('-password -passwordResetToken -emailVerificationToken')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            drivers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch drivers'
        });
    }
});

router.get('/stats', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                        }
                    },
                    verified: {
                        $sum: {
                            $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

        res.json({
            success: true,
            stats: {
                total: totalUsers,
                active: activeUsers,
                verified: verifiedUsers,
                byRole: stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

export default router;
