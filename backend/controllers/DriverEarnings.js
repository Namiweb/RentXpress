import DriverEarnings from "../models/DriverEarnings.js";

// Create a driver earnings record
export const createDriverEarnings = async (req, res) => {
  try {
    const earnings = new DriverEarnings(req.body);
    await earnings.save();
    res.status(201).json(earnings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
 

// Get all driver earnings
export const getAllDriverEarnings = async (req, res) => {
  try {
    const earnings = await DriverEarnings.find();
    res.json(earnings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver earnings by ID
export const getDriverEarningsById = async (req, res) => {
  try {
    const earnings = await DriverEarnings.findById(req.params.id);
    if (!earnings) return res.status(404).json({ error: "Earnings not found" });
    res.json(earnings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver earnings
export const updateDriverEarnings = async (req, res) => {
  try {
    const earnings = await DriverEarnings.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!earnings) return res.status(404).json({ error: "Earnings not found" });
    res.json(earnings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete driver earnings
export const deleteDriverEarnings = async (req, res) => {
  try {
    const earnings = await DriverEarnings.findByIdAndDelete(req.params.id);
    if (!earnings) return res.status(404).json({ error: "Earnings not found" });
    res.json({ message: "Earnings deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
