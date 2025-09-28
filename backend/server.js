import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import dbconnection from "./config/dbconnection.js";
// Import routes
import UserRoutes from "./routes/UserRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import feedbackRoutes from "./routes/FeedbackRoutes.js";
import advertisementRoutes from "./routes/AdvertisementRoutes.js";
import announcementRoutes from "./routes/AnnouncementRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import multer from "multer";
 

 
import invoiceRoutes from "./routes/InvoiceRoutes.js";
// ✅ Driver routes
// import vehicleRoutes from "./routes/VehicleRoutes.js"; // if needed later
import driverApplicationRoutes from "./routes/DriverApplicationsRoutes.js";
import driverEarningsRoutes from "./routes/DriverEarningsRoutes.js";
import driverPaymentRoutes from "./routes/DriverPaymentsRoutes.js";
import driverScheduleRoutes from "./routes/DriverSchedulesRoutes.js";

import VehiclesRoutes from "./routes/VehiclesRoutes.js";
import TripRoutes from "./routes/TripRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentInspectionRoutes from "./routes/paymentInspectionRoutes.js";
 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again later.",
    },
});

app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            "http://localhost:5173",
            "http://localhost:3001",
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

 
// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
    });
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/Bookings", bookingRoutes); //bookings
app.use("/api/users", UserRoutes); //Users
app.use("/api/FinanceReport", financeRoutes); //Finance Reports
app.use("/api/Notifications", notificationRoutes); //Notifications
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/vehicles", VehiclesRoutes);
app.use("/api/Trip", TripRoutes); //Driver Applications
app.use("/api/payments", paymentRoutes); //Payments
app.use("/api/PaymentInspection", paymentInspectionRoutes); //Payment Inspections
app.use("/api/Trip", TripRoutes);
app.use("/api/invoice", invoiceRoutes);

//Payments
app.use("/api/payments", paymentRoutes);
//Payment Inspections
app.use("/api/PaymentInspection", paymentInspectionRoutes);

// Driver Applications
app.use("/api/driver-applications", driverApplicationRoutes);

// Driver Earnings
app.use("/api/driver-earnings", driverEarningsRoutes);

// Driver Payments
app.use("/api/driver-payments", driverPaymentRoutes);

// Driver Schedules
app.use("/api/driver-schedules", driverScheduleRoutes);

// Global error handler
app.use((error, req, res, next) => {
    console.error("Global error handler:", error);

    if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors,
        });
    }
// Invoice Managment
app.use("/api/invoices", invoiceRoutes);

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field} already exists`,
        });
    }

    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error",
    });
});

app.listen(PORT, () => {
    dbconnection();
    console.log(`Server running on port ${PORT}`);
});