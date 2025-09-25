import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverScheduleSchema = new Schema({
  scheduleId: { type: String, required: true, unique: true },
  driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
  date: { type: Date, required: true },
  shifts: [{ type: String }], // Array of shift names or IDs
  weeklyPattern: { type: Object }, // Store weekly pattern as an object
}, { timestamps: true });

export default mongoose.model("Driver_Schedules", driverScheduleSchema);
