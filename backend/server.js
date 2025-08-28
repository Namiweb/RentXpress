import mongoose from "mongoose";
import express from "express"
import dbconnection from "./config/dbconnection.js";

const app = express();

//middleware
app.use("/", (req, res, next) => {
    res.send("IT is working now");
})


const PORT = 8585


app.listen(PORT, async () => {
    await dbconnection();
    console.log("MY SERVER IS RUNNING ON http://localhost:"+PORT)
})