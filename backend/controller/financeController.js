import FinanceReport from "../models/financeModels.js";

// Create a new finance report
export const createFinanceReport = async (req, res) => {
  try {
    const report = new FinanceReport(req.body);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all finance reports
export const getAllFinanceReports = async (req, res) => {
  try {
    const reports = await FinanceReport.find();
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single finance report by ID
export const getFinanceReportById = async (req, res) => {
  try {
    const report = await FinanceReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a finance report
export const updateFinanceReport = async (req, res) => {
  try {
    const report = await FinanceReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.status(200).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a finance report
export const deleteFinanceReport = async (req, res) => {
  try {
    const report = await FinanceReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.status(200).json({ message: "Report deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
