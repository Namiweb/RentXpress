import express from "express";
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getPublishedAnnouncements
} from "../controller/AnnouncementController.js";

const router = express.Router();

router.post("/", createAnnouncement);
router.get("/published",getPublishedAnnouncements)
router.get("/", getAllAnnouncements);
router.get("/:id", getAnnouncementById);
router.put("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

export default router;