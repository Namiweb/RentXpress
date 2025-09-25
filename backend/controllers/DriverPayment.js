import DriverPayment from "../models/DriverPayment.js";

// Create a driver payment
export const createDriverPayment = async (req, res) => {
  try {
    const payment = new DriverPayment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all driver payments
export const getAllDriverPayments = async (req, res) => {
  try {
    const payments = await DriverPayment.find();
    res.json(payments); // returns all payment details as an array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver payment by ID
export const getDriverPaymentById = async (req, res) => {
  try {
    const payment = await DriverPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver payment
export const updateDriverPayment = async (req, res) => {
  try {
    const payment = await DriverPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete driver payment
export const deleteDriverPayment = async (req, res) => {
  try {
    const payment = await DriverPayment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
