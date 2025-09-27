import Payment from "../models/paymentModels.js";

// Create payment
export async function createPayment(req, res) {
  try {
    const paymentId = "PAY" + Date.now().toString().slice(-6);
    const payment = new Payment({
      ...req.body,
      paymentId,
      processedAt: new Date(),
      updatedAt: new Date()
    });
    const savedPayment = await payment.save();
    res.status(201).json(savedPayment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get all payments
export async function getAllPayments(req, res) {
  try {
    const payments = await Payment.find()
      .populate('bookingId')
      .populate('customerId')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get payment by ID
export async function getPaymentById(req, res) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId')
      .populate('customerId');
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update payment
export async function updatePayment(req, res) {
  try {
    const { paymentId, ...updateData } = req.body;
    updateData.updatedAt = new Date();
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Delete payment
export async function deletePayment(req, res) {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
