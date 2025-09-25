import DriverApplication from "../models/DriverApplication.js";

// Create a driver application
export const createDriverApplication = async (req, res) => {
  try {
    const application = new DriverApplication(req.body);
    await application.save();
    res.status(201).json(application);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all driver applications
export const getAllDriverApplications = async (req, res) => {
  try {
    const applications = await DriverApplication.find();
    res.json(applications); // return only the array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver application by ID
export const getDriverApplicationById = async (req, res) => {
  try {
    const application = await DriverApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver application
export const updateDriverApplication = async (req, res) => {
  try {
    const application = await DriverApplication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update only status
export const updateDriverApplicationStatus = async (req, res) => {
  try {
    const application = await DriverApplication.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json(application);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete driver application
export const deleteDriverApplication = async (req, res) => {
  try {
    const application = await DriverApplication.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json({ message: "Application deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
