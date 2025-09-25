import express from "express"
import dbconnection from "./config/dbconnection.js";
import vehicleRoutes from "./routes/VehiclesRoutes.js";
import tripRoutes from "./routes/TripRoutes.js"; 


const app = express();

app.use(express.json());

// API routes
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/Trip", tripRoutes); 

const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:" + PORT)
})