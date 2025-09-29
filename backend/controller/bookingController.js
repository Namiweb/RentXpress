import mongoose from "mongoose";
import Booking from "../models/BookingsModel.js";
import Vehicles from "../models/VehiclesModel.js";

function generateBookingId() {
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  const timePart = Date.now().toString().slice(-6);
  return `BKG-${timePart}-${randomPart}`;
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} is invalid`);
  }
  return date;
}

async function hasOverlappingBooking({ vehicleId, startDate, endDate, excludeId }) {
  const query = {
    vehicleId,
    status: { $nin: ["cancelled", "completed"] },
    "bookingDetails.startDate": { $lt: endDate },
    "bookingDetails.endDate": { $gt: startDate },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return Booking.exists(query);
}

async function syncVehicleAvailability(vehicleId) {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) return;

  const now = new Date();
  const activeExists = await Booking.exists({
    vehicleId,
    status: { $nin: ["cancelled", "completed"] },
    "bookingDetails.endDate": { $gt: now },
  });

  await Vehicles.findByIdAndUpdate(vehicleId, {
    "availability.isAvailable": !activeExists,
  });
}

export async function createBooking(req, res) {
  try {
    const {
      customerId,
      vehicleId,
      driverRequested,
      schedule,
      bookingDetails,
      pickupLocation,
      dropoffLocation,
      pricing,
      notes,
      driverId,
      status,
    } = req.body;

    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "A valid customerId is required" });
    }

    if (!vehicleId || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: "A valid vehicleId is required" });
    }

    const schedulePayload = bookingDetails || schedule;
    if (!schedulePayload?.startDate || !schedulePayload?.endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required" });
    }

    let startDate;
    let endDate;
    try {
      startDate = parseDate(schedulePayload.startDate, "Start date");
      endDate = parseDate(schedulePayload.endDate, "End date");
    } catch (parseError) {
      return res.status(400).json({ message: parseError.message });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const overlapExists = await hasOverlappingBooking({ vehicleId, startDate, endDate });
    if (overlapExists) {
      return res
        .status(409)
        .json({ message: "Vehicle is already booked for the selected dates" });
    }

    const booking = new Booking({
      bookingId: generateBookingId(),
      customerId,
      vehicleId,
      driverRequested: Boolean(driverRequested),
      bookingDetails: {
        startDate,
        endDate,
        pickupTime: schedulePayload.pickupTime,
        returnTime: schedulePayload.returnTime,
        totalDays: schedulePayload.totalDays,
      },
      pickupLocation,
      dropoffLocation,
      pricing,
      notes,
    });

    if (status) {
      booking.status = status;
    }

    if (driverRequested && driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      booking.driverId = driverId;
    }

    const saved = await booking.save();
    await syncVehicleAvailability(vehicleId);

    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating booking", error);
    res.status(500).json({ message: "Failed to create booking", error: error.message });
  }
}

export async function getBookings(req, res) {
  try {
    const filter = {};
    const {
      customerId,
      vehicleId,
      driverId,
      status,
      driverStatus,
      driverRequested,
      availableForDriver,
    } = req.query;

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicleId = vehicleId;
    }

    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      filter.driverId = driverId;
    }

    if (status) {
      filter.status = status;
    }

    if (driverStatus) {
      filter.driverStatus = driverStatus;
    }

    const driverRequestedFilter = parseBoolean(driverRequested);
    if (driverRequestedFilter !== undefined) {
      filter.driverRequested = driverRequestedFilter;
    }

    if (availableForDriver === "true") {
      filter.driverRequested = true;
      filter.driverStatus = "pending";
      filter.status = { $nin: ["cancelled", "completed"] };
      filter.$or = [{ driverId: { $exists: false } }, { driverId: null }];
      delete filter.driverId;
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings", error);
    res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
  }
}

export async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.status(200).json(booking);
  } catch (error) {
    console.error("Error fetching booking", error);
    res.status(500).json({ message: "Failed to fetch booking", error: error.message });
  }
}

export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const {
      schedule,
      bookingDetails,
      pickupLocation,
      dropoffLocation,
      pricing,
      notes,
      status,
      driverRequested,
      driverId,
      driverStatus,
    } = req.body;

    const schedulePayload = bookingDetails || schedule;
    if (schedulePayload) {
      let startDate = booking.bookingDetails?.startDate
        ? new Date(booking.bookingDetails.startDate)
        : undefined;
      let endDate = booking.bookingDetails?.endDate
        ? new Date(booking.bookingDetails.endDate)
        : undefined;

      if (schedulePayload.startDate) {
        startDate = parseDate(schedulePayload.startDate, "Start date");
      }
      if (schedulePayload.endDate) {
        endDate = parseDate(schedulePayload.endDate, "End date");
      }

      if (startDate && endDate && endDate <= startDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      if (startDate && endDate) {
        const overlapExists = await hasOverlappingBooking({
          vehicleId: booking.vehicleId,
          startDate,
          endDate,
          excludeId: booking._id,
        });

        if (overlapExists) {
          return res
            .status(409)
            .json({ message: "Vehicle is already booked for the selected dates" });
        }
      }

      const currentDetails = booking.bookingDetails && typeof booking.bookingDetails.toObject === "function"
        ? booking.bookingDetails.toObject()
        : booking.bookingDetails || {};

      const mergedSchedule = { ...schedulePayload };
      if (startDate && Object.prototype.hasOwnProperty.call(schedulePayload, "startDate")) {
        mergedSchedule.startDate = startDate;
      }
      if (endDate && Object.prototype.hasOwnProperty.call(schedulePayload, "endDate")) {
        mergedSchedule.endDate = endDate;
      }

      booking.bookingDetails = {
        ...currentDetails,
        ...mergedSchedule,
      };
    }

    if (pickupLocation !== undefined) {
      booking.pickupLocation = pickupLocation;
    }

    if (dropoffLocation !== undefined) {
      booking.dropoffLocation = dropoffLocation;
    }

    if (pricing !== undefined) {
      booking.pricing = pricing;
    }

    if (notes !== undefined) {
      booking.notes = notes;
    }

    if (status) {
      booking.status = status;
    }

    if (driverStatus) {
      booking.driverStatus = driverStatus;
    }

    if (typeof driverRequested === "boolean") {
      booking.driverRequested = driverRequested;
    }

    if (driverId !== undefined) {
      if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
        booking.driverId = driverId;
      } else {
        booking.driverId = undefined;
      }
    }

    const updated = await booking.save();

    if (status || schedulePayload) {
      await syncVehicleAvailability(booking.vehicleId);
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating booking", error);
    res.status(500).json({ message: "Failed to update booking", error: error.message });
  }
}

export async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await syncVehicleAvailability(deleted.vehicleId);

    res.status(200).json({ message: "Booking deleted" });
  } catch (error) {
    console.error("Error deleting booking", error);
    res.status(500).json({ message: "Failed to delete booking", error: error.message });
  }
}

export async function acceptBooking(req, res) {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: "A valid driverId is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!booking.driverRequested) {
      return res.status(400).json({ message: "This booking does not require a driver" });
    }

    if (booking.driverStatus === "accepted" && booking.driverId) {
      return res
        .status(409)
        .json({ message: "Booking already has an accepted driver" });
    }

    booking.driverId = driverId;
    booking.driverStatus = "accepted";
    booking.driverAcceptedAt = new Date();
    if (booking.status === "pending") {
      booking.status = "confirmed";
    }

    const updated = await booking.save();
    res.status(200).json(updated);
  } catch (error) {
    if (error && error.errInfo?.details) {
      console.error("Error accepting booking details", JSON.stringify(error.errInfo.details, null, 2));
    }
    console.error("Error accepting booking", error);
    res.status(500).json({ message: "Failed to accept booking", error: error.message });
  }
}

export async function declineBooking(req, res) {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!booking.driverRequested) {
      return res.status(400).json({ message: "This booking does not require a driver" });
    }

    if (driverId && booking.driverId && String(booking.driverId) !== String(driverId)) {
      return res
        .status(403)
        .json({ message: "Only the assigned driver can decline this booking" });
    }

    booking.driverStatus = "declined";
    booking.driverId = undefined;
    booking.driverAcceptedAt = undefined;

    const updated = await booking.save();
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error declining booking", error);
    res.status(500).json({ message: "Failed to decline booking", error: error.message });
  }
}
