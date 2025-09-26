import mongoose from "mongoose";
import express from "express";
import dbconnection from "./config/dbconnection.js";
import UserRoutes from "./routes/UserRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import feedbackRoutes from "./routes/FeedbackRoutes.js";
import advertisementRoutes from "./routes/AdvertisementRoutes.js";
import announcementRoutes from "./routes/AnnouncementRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";


const app = express();

//middleware
app.use(express.json());


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
//Payments
app.use("/api/Payment", paymentRoutes);


const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:"+PORT)
})