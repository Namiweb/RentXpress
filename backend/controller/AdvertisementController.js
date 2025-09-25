import Advertisement from "../models/AdvertisementModel.js";

// Create advertisement
export async function createAdvertisement(req, res) {
  try {
    const ad = new Advertisement(req.body);
    const saved = await ad.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error creating advertisement", error });
  }
}

// Get all advertisements
export async function getAllAdvertisements(req, res) {
  try {
    const ads = await Advertisement.find();
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ message: "Error fetching advertisements", error });
  }
}

// Get advertisement by ID
export async function getAdvertisementById(req, res) {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Not found" });
    res.status(200).json(ad);
  } catch (error) {
    res.status(500).json({ message: "Error fetching advertisement", error });
  }
}

// Update advertisement
export async function updateAdvertisement(req, res) {
  try {
    const updated = await Advertisement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating advertisement", error });
  }
}

// Delete advertisement
export async function deleteAdvertisement(req, res) {
  try {
    const deleted = await Advertisement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting advertisement", error });
  }
}