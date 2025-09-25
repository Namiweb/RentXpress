import Announcement from "../models/AnnouncementModel.js";

// Create announcement
export async function createAnnouncement(req, res) {
  try {
    const announcement = new Announcement(req.body);
    const saved = await announcement.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error creating announcement", error });
  }
}

// Get all announcements
export async function getAllAnnouncements(req, res) {
  try {
    const announcements = await Announcement.find();
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Error fetching announcements", error });
  }
}

// Get announcement by ID
export async function getAnnouncementById(req, res) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: "Not found" });
    res.status(200).json(announcement);
  } catch (error) {
    res.status(500).json({ message: "Error fetching announcement", error });
  }
}

// Update announcement
export async function updateAnnouncement(req, res) {
  try {
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating announcement", error });
  }
}

// Delete announcement
export async function deleteAnnouncement(req, res) {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting announcement", error });
  }
}