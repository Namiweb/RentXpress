import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import dbconnection from "./config/dbconnection.js";
import authRoutes from "./routes/authRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import feedbackRoutes from "./routes/FeedbackRoutes.js";
import advertisementRoutes from "./routes/AdvertisementRoutes.js";
import announcementRoutes from "./routes/AnnouncementRoutes.js";

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
import vehicleInspectionRoutes from "./routes/VehicleInspectionRoutes.js";
import { ensureDefaultAdmin } from "./utils/ensureDefaultAdmin.js";

const app = express();

//middleware
app.use(express.json());

// basic CORS handling for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// authentication
app.use("/api/auth", authRoutes);


//bookings
app.use("/api/Bookings", bookingRoutes);
//Users
app.use("/api/users",UserRoutes);
//Finance Reports
app.use("/api/FinanceReport", financeRoutes);
//Notifications
app.use("/api/Notifications", notificationRoutes);
app.use("/api/feedbacks", feedbackRoutes); 
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/vehicles", VehiclesRoutes);
app.use("/api/Trip", TripRoutes);

//Payments
app.use("/api/payments", paymentRoutes);
//Payment Inspections
app.use("/api/PaymentInspection", paymentInspectionRoutes);
//Vehicle Inspections
app.use("/api/vehicle-inspections", vehicleInspectionRoutes);

// Driver Applications
app.use("/api/driver-applications", driverApplicationRoutes);

// Driver Earnings
app.use("/api/driver-earnings", driverEarningsRoutes);

// Driver Payments
app.use("/api/driver-payments", driverPaymentRoutes);

// Driver Schedules
app.use("/api/driver-schedules", driverScheduleRoutes);


const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    await ensureDefaultAdmin();
    console.log("MY SERVER IS RUNNING ON http://localhost:"+PORT)
})
