// controllers/bookingController.js
import Bookings from "../models/bookingModels.js";

// Create booking
export async function createBooking(req, res) {
  try {
    const booking = new Bookings(req.body);
    const saved = await booking.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error in createBooking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get all bookings
export async function getAllBookings(req, res) {
  try {
    const bookings = await Bookings.find();
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error in getAllBookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get booking by ID
export async function getBookingById(req, res) {
  try {
    const booking = await Bookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    console.error("Error in getBookingById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update booking
export async function updateBooking(req, res) {
  try {
    const updated = await Bookings.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Booking not found" });

    res.status(200).json({ message: "Booking updated successfully", data: updated });
  } catch (error) {
    console.error("Error in updateBooking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Delete booking
export async function deleteBooking(req, res) {
  try {
    const deleted = await Bookings.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Booking not found" });

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error in deleteBooking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
