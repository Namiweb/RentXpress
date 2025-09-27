import express from "express";
import {
  createAdvertisement,
  getAllAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement
} from "../controller/AdvertisementController.js";

const router = express.Router();

router.post("/", createAdvertisement);
router.get("/", getAllAdvertisements);
router.get("/:id", getAdvertisementById);
router.put("/:id", updateAdvertisement);
router.delete("/:id", deleteAdvertisement);

export default router;