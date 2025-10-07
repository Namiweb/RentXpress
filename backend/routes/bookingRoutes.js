import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  acceptBooking,
  declineBooking,
} from "../controller/bookingController.js";

const router = express.Router();

router.get("/", getBookings);
router.post("/", createBooking);
router.get("/:id", getBookingById);
router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);
router.post("/:id/accept", acceptBooking);
router.post("/:id/decline", declineBooking);

export default router;
