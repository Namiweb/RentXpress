import crypto from 'crypto';
import User from '../models/UserModels.js';
import { validateRegistrationData } from '../utils/validation.js';
import { sendEmail } from '../utils/emailService.js';
import { generateToken, generateRefreshToken, setTokenCookie, clearTokenCookies } from '../middleware/auth.js';

// Register user (handles all user types)
const register = async (req, res) => {
    try {
        console.log('Registration request body:', req.body); // Debug log

        const { role = 'customer', ...userData } = req.body;

        // Ensure we have the required data
        if (!userData || typeof userData !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid request data'
            });
        }

        // Handle address field - ensure it's properly formatted
        if (userData.address && typeof userData.address === 'string') {
            try {
                userData.address = JSON.parse(userData.address);
            } catch (e) {
                // If it's not JSON, keep it as string for non-vehicle_owner roles
                if (role === 'vehicle_owner') {
                    return res.status(400).json({
                        success: false,
                        message: 'Address must be an object with street and city for vehicle owners'
                    });
                }
            }
        }

        // Validate registration data based on role
        const validation = validateRegistrationData(userData, role);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check for duplicate NIC
        const existingNIC = await User.findOne({ nicNumber: userData.nicNumber });
        if (existingNIC) {
            return res.status(400).json({
                success: false,
                message: 'User with this NIC number already exists'
            });
        }

        // For drivers, check duplicate license number
        if (role === 'driver' && userData.drivingLicenseNumber) {
            const existingLicense = await User.findOne({
                drivingLicenseNumber: userData.drivingLicenseNumber
            });
            if (existingLicense) {
                return res.status(400).json({
                    success: false,
                    message: 'Driver with this license number already exists'
                });
            }
        }

        // Create new user
        const newUser = new User({
            ...userData,
            role
        });

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        newUser.emailVerificationToken = crypto
            .createHash('sha256')
            .update(emailVerificationToken)
            .digest('hex');
        newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

        await newUser.save();

        // Send verification email (non-blocking)
        try {
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${emailVerificationToken}`;
            await sendEmail({
                to: newUser.email,
                template: 'emailVerification',
                data: {
                    name: `${newUser.firstName} ${newUser.lastName}`,
                    verificationUrl
                }
            });
            console.log('Verification email sent successfully');
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Don't fail registration if email fails
        }

        // Generate tokens
        const token = generateToken(newUser._id);
        const refreshToken = generateRefreshToken(newUser._id);

        // Set cookies
        setTokenCookie(res, token, refreshToken);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            user: newUser.getPublicProfile(),
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password, rememberMe = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        setTokenCookie(res, token, refreshToken);

        res.json({
            success: true,
            message: 'Login successful',
            user: user.getPublicProfile(),
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        clearTokenCookies(res);

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.getPublicProfile()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.user._id;

        delete updates.password;
        delete updates.email;
        delete updates.role;
        delete updates.emailVerificationToken;
        delete updates.passwordResetToken;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.getPublicProfile()
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }

        const user = await User.findById(userId);
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        await User.findByIdAndUpdate(userId, { isActive: false });

        clearTokenCookies(res);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
};

// Forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            await sendEmail({
                to: user.email,
                template: 'passwordReset',
                data: {
                    name: `${user.firstName} ${user.lastName}`,
                    resetUrl,
                    validFor: '10 minutes'
                }
            });

            res.json({
                success: true,
                message: 'Password reset link has been sent to your email'
            });

        } catch (emailError) {
            console.error('Password reset email failed:', emailError);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();

            res.status(500).json({
                success: false,
                message: 'Failed to send password reset email'
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process forgot password request'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token'
            });
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        clearTokenCookies(res);

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

// Verify email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired email verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed'
        });
    }
};

// Change password (when user is logged in)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const user = await User.findById(userId);
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

export {
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
};
