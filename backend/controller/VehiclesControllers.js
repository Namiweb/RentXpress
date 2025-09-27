import Vehicles from "../models/VehiclesModel.js";
import mongoose from "mongoose";

// Create Vehicle
export async function createVehicle(req, res) {
  try {
   
   const vehicle = new Vehicles(req.body);
    const saved = await vehicle.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error in createVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get all Vehicles
export async function getAllVehicles(req, res) {
  try {
    const vehicles = await Vehicles.find();
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error in getAllVehicles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get Vehicle by ID
export async function getVehicleById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }
    const vehicle = await Vehicles.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (error) {
    console.error("Error in getVehicleById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update Vehicle
export async function updateVehicle(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }
    const updated = await Vehicles.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ message: "Vehicle updated successfully", data: updated });
  } catch (error) {
    console.error("Error in updateVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Delete Vehicle
export async function deleteVehicle(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle ID format" });
    }
    const deleted = await Vehicles.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Vehicle not found" });

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error in deleteVehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
