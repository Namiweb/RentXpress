import jwt from 'jsonwebtoken';
import User from '../models/UserModels.js';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
};

// Set JWT cookie
const setTokenCookie = (res, token, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    };

    const refreshCookieOptions = {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000
    };

    res.cookie('token', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

// Clear JWT cookies
const clearTokenCookies = (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
};

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        let token = req.cookies.token;

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                clearTokenCookies(res);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. User not found.'
                });
            }

            if (!user.isActive) {
                clearTokenCookies(res);
                return res.status(401).json({
                    success: false,
                    message: 'Account has been deactivated.'
                });
            }

            req.user = user;
            next();
        } catch (tokenError) {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                clearTokenCookies(res);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token and no refresh token available.'
                });
            }

            try {
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
                const user = await User.findById(decoded.userId).select('-password');

                if (!user || !user.isActive) {
                    clearTokenCookies(res);
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid refresh token or user not found.'
                    });
                }

                const newToken = generateToken(user._id);
                const newRefreshToken = generateRefreshToken(user._id);

                setTokenCookie(res, newToken, newRefreshToken);

                req.user = user;
                next();
            } catch (refreshError) {
                clearTokenCookies(res);
                return res.status(401).json({
                    success: false,
                    message: 'Both access and refresh tokens are invalid.'
                });
            }
        }
    } catch (error) {
        console.error('Token verification error:', error);
        clearTokenCookies(res);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication.'
        });
    }
};

// Middleware to check specific roles
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

export {
    generateToken,
    generateRefreshToken,
    setTokenCookie,
    clearTokenCookies,
    verifyToken,
    requireRole
};
