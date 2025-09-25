// controllers/bookingController.js
import Bookings from "../models/bookingModels.js";
import mongoose from "mongoose";

// Create booking
export async function createBooking(req, res) {
  try {
    // Generate a unique booking ID
    const bookingId = "BKG" + Date.now().toString().slice(-6);
    
    const booking = new Bookings({
      ...req.body,
      bookingId
    });
    
    const saved = await booking.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error in createBooking:", error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Booking ID already exists",
        error: error.message 
      });
    }
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
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID format" });
    }

    // Remove bookingId from update data if it exists
    const updateData = { ...req.body };
    delete updateData.bookingId; // Prevent bookingId modification

    const updated = await Bookings.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!updated) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ message: "Booking updated successfully", data: updated });
  } catch (error) {
    console.error("Error in updateBooking:", error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Cannot update booking - duplicate booking ID",
        error: error.message 
      });
    }
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
