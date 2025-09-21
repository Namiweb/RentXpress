import mongoose from "mongoose";
import express from "express"
import dbconnection from "./config/dbconnection.js";
import invoiceRoutes from "./routes/InvoiceRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/Invoice", invoiceRoutes);

const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:"+PORT)
})