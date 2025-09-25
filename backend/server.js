import mongoose from "mongoose";
import express from "express";
import dbconnection from "./config/dbconnection.js";
import UserRoutes from "./routes/UserRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";


const app = express();

//middleware
app.use(express.json());

app.use((req,res,next) => {
   console.log(`req method is ${req.method} & Req URL is ${req.url}`);
   next();
});

//bookings
app.use("/api/Bookings", bookingRoutes);
//Users
app.use("/api/users",UserRoutes);
//Finance Reports
app.use("/api/FinanceReport", financeRoutes);
//Notifications
app.use("/api/Notifications", notificationRoutes);

const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:"+PORT)
})