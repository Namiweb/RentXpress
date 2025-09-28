
import DriverSchedule from "../models/DriverSchedulesModels.js";

// Create a driver schedule
export const createDriverSchedule = async (req, res) => {
  try {
    const schedule = new DriverSchedule(req.body);
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all driver schedules
export const getAllDriverSchedules = async (req, res) => {
  try {
    const schedules = await DriverSchedule.find();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver schedule by ID
export const getDriverScheduleById = async (req, res) => {
  try {
    const schedule = await DriverSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver schedule
export const updateDriverSchedule = async (req, res) => {
  try {
    const schedule = await DriverSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Delete driver schedule
export const deleteDriverSchedule = async (req, res) => {
  try {
    const schedule = await DriverSchedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json({ message: "Schedule deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
