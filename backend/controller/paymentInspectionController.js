import PaymentInspection from "../models/paymentInspectionModels.js";

// Create inspection
export async function createInspection(req, res) {
  try {
    const inspectionId = "INS" + Date.now().toString().slice(-6);
    
    // Validate documents array if it exists
    if (req.body.inspectionDetails?.documents) {
      req.body.inspectionDetails.documents = req.body.inspectionDetails.documents.map(doc => ({
        ...doc,
        documentType: doc.documentType || 'other', // Set default if not provided
        uploadedAt: doc.uploadedAt || new Date()
      }));
    }

    const inspection = new PaymentInspection({
      ...req.body,
      inspectionId,
      inspectedAt: new Date()
    });
    
    const saved = await inspection.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating inspection:", error);
    res.status(400).json({ 
      error: error.message,
      details: error.errors ? Object.values(error.errors).map(err => err.message) : []
    });
  }
}

// Get all inspections
export async function getAllInspections(req, res) {
  try {
    const inspections = await PaymentInspection.find()
      .populate('paymentId')
      .populate('inspectorId')
      .sort({ createdAt: -1 });
    res.status(200).json(inspections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get inspection by ID
export async function getInspectionById(req, res) {
  try {
    const inspection = await PaymentInspection.findById(req.params.id)
      .populate('paymentId')
      .populate('inspectorId');
    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }
    res.status(200).json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update inspection
export async function updateInspection(req, res) {
  try {
    const { inspectionId, ...updateData } = req.body;
    updateData.updatedAt = new Date();
    
    const inspection = await PaymentInspection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }
    res.status(200).json(inspection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Delete inspection
export async function deleteInspection(req, res) {
  try {
    const inspection = await PaymentInspection.findByIdAndDelete(req.params.id);
    if (!inspection) {
      return res.status(404).json({ message: "Inspection not found" });
    }
    res.status(200).json({ message: "Inspection deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
