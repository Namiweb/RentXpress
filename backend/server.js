import mongoose from "mongoose";
import express from "express";
import dbconnection from "./config/dbconnection.js";

 
import feedbackRoutes from "./routes/FeedbackRoutes.js";
import advertisementRoutes from "./routes/AdvertisementRoutes.js";
import announcementRoutes from "./routes/AnnouncementRoutes.js";

const app = express();

//middleware
app.use(express.json());

app.use((req, res, next) => {
   console.log(`req method is ${req.method} & Req URL is ${req.url}`);
   next();
});

// Routes

app.use("/api/feedbacks", feedbackRoutes); 
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/announcements", announcementRoutes);

const PORT = 8585;

app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:" + PORT);
});