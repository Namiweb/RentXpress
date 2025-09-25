import express from "express";
import dbconnection from "./config/dbconnection.js";

//import vehicleRoutes from "./routes/VehicleRoutes.js";
import driverApplicationRoutes from "./routes/DriverApplicationRoutes.js";

import driverEarningsRoutes from "./routes/DriverEarningsRoutes.js";
import driverPaymentRoutes from "./routes/DriverPaymentRoutes.js";
import driverScheduleRoutes from "./routes/DriverSchedulesRoutes.js";

const app = express();
app.use(express.json());



//app.use("/api/vehicles", vehicleRoutes);

app.use("/api/driver-applications", driverApplicationRoutes);

app.use("/api/driver-earnings", driverEarningsRoutes);
app.use("/api/driver-payments", driverPaymentRoutes);
app.use("/api/driver-schedules", driverScheduleRoutes);

const PORT = 8585;

app.listen(PORT, async () => {
  await dbconnection();
  console.log("MY SERVER IS RUNNING ON http://localhost:" + PORT);
});

