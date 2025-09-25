import DriverApplication from "../models/DriverApplication.js";

// Create application
export const createDriverApplication = async (req, res) => {
  try {
    const newApplication = new DriverApplication(req.body);
    await newApplication.save();
    res.status(201).json(newApplication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all applications (populate driver + vehicle)
export const getDriverApplications = async (req, res) => {
  try {
    const apps = await DriverApplication.find()
      .populate("driverId", "profile email role")
      .populate("vehicleId", "basicInfo pricing status");
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single application by id
export const getDriverApplicationById = async (req, res) => {
  try {
    const app = await DriverApplication.findById(req.params.id)
      .populate("driverId", "profile email role")
      .populate("vehicleId", "basicInfo pricing status");
    if (!app) return res.status(404).json({ error: "Application not found" });
    res.status(200).json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update application
export const updateDriverApplication = async (req, res) => {
  try {
    const updatedApp = await DriverApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedApp)
      return res.status(404).json({ error: "Application not found" });
    res.status(200).json(updatedApp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete application
export const deleteDriverApplication = async (req, res) => {
  try {
    const deletedApp = await DriverApplication.findByIdAndDelete(
      req.params.id
    );
    if (!deletedApp)
      return res.status(404).json({ error: "Application not found" });
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
