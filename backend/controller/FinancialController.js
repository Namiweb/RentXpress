import Financial from "../models/Financial.js";
import SalaryConfig from "../models/SalaryConfig.js";
import User from "../models/UserModels.js";
import Booking from "../models/BookingsModel.js";
import Vehicle from "../models/VehiclesModel.js";

// Calculate and generate salaries
export async function calculateSalaries(req, res) {
  try {
    const { month, year } = req.body;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get salary configurations
    const salaryConfigs = await SalaryConfig.find({ isActive: true });
    const configMap = {};
    salaryConfigs.forEach(config => {
      configMap[config.role] = config;
    });

    const results = [];

    // Calculate driver salaries
    const drivers = await User.find({ role: "driver", status: "active" });
    for (const driver of drivers) {
      const driverSalary = await calculateDriverSalary(driver, currentMonth, currentYear, configMap.driver);
      if (driverSalary) {
        results.push(driverSalary);
      }
    }

    // Calculate vehicle owner payouts
    const owners = await User.find({ role: "vehicle_owner", status: "active" });
    for (const owner of owners) {
      const ownerPayout = await calculateOwnerPayout(owner, currentMonth, currentYear, configMap.vehicle_owner);
      if (ownerPayout) {
        results.push(ownerPayout);
      }
    }

    // Calculate inspector salaries
    const inspectors = await User.find({ role: "inspector", status: "active" });
    for (const inspector of inspectors) {
      const inspectorSalary = await calculateInspectorSalary(inspector, currentMonth, currentYear, configMap.inspector);
      if (inspectorSalary) {
        results.push(inspectorSalary);
      }
    }

    res.status(200).json({
      message: "Salaries calculated successfully",
      data: results,
      period: { month: currentMonth, year: currentYear }
    });
  } catch (error) {
    res.status(500).json({ message: "Error calculating salaries", error: error.message });
  }
}

// Calculate driver salary
async function calculateDriverSalary(driver, month, year, config) {
  if (!config) return null;

  // Get driver's completed trips for the period
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const trips = await Booking.find({
    driverId: driver._id,
    status: "completed",
    updatedAt: { $gte: startDate, $lte: endDate }
  });

  const tripCount = trips.length;
  const tripEarnings = trips.reduce((sum, trip) => sum + (trip.totalAmount || 0), 0);
  
  // Calculate salary components
  const baseSalary = config.baseSalary || 0;
  const commission = tripEarnings * (config.commissionRates?.perTrip || 0) / 100;
  const revenueShare = tripEarnings * (config.commissionRates?.revenueShare || 0) / 100;
  
  // Calculate bonus
  let bonus = 0;
  if (tripCount >= (config.bonuses?.minTripsForBonus || 0)) {
    bonus = config.bonuses?.bonusAmount || 0;
  }

  // Calculate deductions
  const taxDeduction = (baseSalary + commission + revenueShare + bonus) * (config.deductions?.taxRate || 0) / 100;
  const otherDeductions = config.deductions?.otherDeductions || 0;

  const totalAmount = baseSalary + commission + revenueShare + bonus - taxDeduction - otherDeductions;

  if (totalAmount <= 0) return null;

  // Create or update financial record
  const financialRecord = await Financial.findOneAndUpdate(
    {
      recipientId: driver._id,
      type: "salary",
      "period.month": month,
      "period.year": year
    },
    {
      financialId: `SAL${year}${month.toString().padStart(2, '0')}${driver._id.toString().slice(-6)}`,
      type: "salary",
      recipientType: "driver",
      recipientId: driver._id,
      amount: totalAmount,
      period: { month, year },
      calculationDetails: {
        baseSalary,
        tripCount,
        tripEarnings,
        commissionRate: config.commissionRates?.perTrip || 0,
        revenueShareRate: config.commissionRates?.revenueShare || 0,
        bonus,
        deductions: taxDeduction + otherDeductions
      },
      status: "pending"
    },
    { upsert: true, new: true }
  );

  return financialRecord;
}

// Calculate vehicle owner payout
async function calculateOwnerPayout(owner, month, year, config) {
  if (!config) return null;

  // Get owner's vehicles and their completed bookings
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const vehicles = await Vehicle.find({ ownerId: owner._id });
  const vehicleIds = vehicles.map(v => v._id);

  const bookings = await Booking.find({
    vehicleId: { $in: vehicleIds },
    status: "completed",
    updatedAt: { $gte: startDate, $lte: endDate }
  });

  const tripCount = bookings.length;
  const totalEarnings = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  
  // Owner typically gets a percentage of the earnings
  const ownerShare = totalEarnings * (config.commissionRates?.revenueShare || 70) / 100; // Default 70%

  if (ownerShare <= 0) return null;

  const financialRecord = await Financial.findOneAndUpdate(
    {
      recipientId: owner._id,
      type: "payout",
      "period.month": month,
      "period.year": year
    },
    {
      financialId: `PAY${year}${month.toString().padStart(2, '0')}${owner._id.toString().slice(-6)}`,
      type: "payout",
      recipientType: "vehicle_owner",
      recipientId: owner._id,
      amount: ownerShare,
      period: { month, year },
      calculationDetails: {
        tripCount,
        tripEarnings: totalEarnings,
        commissionRate: config.commissionRates?.revenueShare || 70,
        vehicleCount: vehicles.length
      },
      status: "pending"
    },
    { upsert: true, new: true }
  );

  return financialRecord;
}

// Calculate inspector salary
async function calculateInspectorSalary(inspector, month, year, config) {
  if (!config) return null;

  // Get inspector's completed inspections for the period
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const inspections = await Vehicle.find({
    "inspections.inspectedBy": inspector._id,
    "inspections.inspectionDate": { $gte: startDate, $lte: endDate },
    "inspections.status": "completed"
  });

  const inspectionCount = inspections.length;
  
  // Calculate salary components
  const baseSalary = config.baseSalary || 0;
  const inspectionEarnings = inspectionCount * (config.commissionRates?.perInspection || 0);
  
  // Calculate bonus
  let bonus = 0;
  if (inspectionCount >= (config.bonuses?.minInspectionsForBonus || 0)) {
    bonus = config.bonuses?.inspectionBonus || 0;
  }

  // Calculate deductions
  const taxDeduction = (baseSalary + inspectionEarnings + bonus) * (config.deductions?.taxRate || 0) / 100;
  const otherDeductions = config.deductions?.otherDeductions || 0;

  const totalAmount = baseSalary + inspectionEarnings + bonus - taxDeduction - otherDeductions;

  if (totalAmount <= 0) return null;

  const financialRecord = await Financial.findOneAndUpdate(
    {
      recipientId: inspector._id,
      type: "salary",
      "period.month": month,
      "period.year": year
    },
    {
      financialId: `SAL${year}${month.toString().padStart(2, '0')}${inspector._id.toString().slice(-6)}`,
      type: "salary",
      recipientType: "inspector",
      recipientId: inspector._id,
      amount: totalAmount,
      period: { month, year },
      calculationDetails: {
        baseSalary,
        inspectionCount,
        inspectionEarnings,
        perInspectionRate: config.commissionRates?.perInspection || 0,
        bonus,
        deductions: taxDeduction + otherDeductions
      },
      status: "pending"
    },
    { upsert: true, new: true }
  );

  return financialRecord;
}

// Get all financial records
export async function getFinancialRecords(req, res) {
  try {
    const { page = 1, limit = 10, type, recipientType, status, month, year } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (recipientType) filter.recipientType = recipientType;
    if (status) filter.status = status;
    if (month && year) {
      filter["period.month"] = parseInt(month);
      filter["period.year"] = parseInt(year);
    }

    const financials = await Financial.find(filter)
      .populate("recipientId", "profile firstName lastName email")
      .populate("processedBy", "profile firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Financial.countDocuments(filter);

    res.status(200).json({
      financials,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching financial records", error: error.message });
  }
}

// Update salary configuration
export async function updateSalaryConfig(req, res) {
  try {
    const { role } = req.params;
    const updateData = req.body;

    const config = await SalaryConfig.findOneAndUpdate(
      { role },
      { ...updateData, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "Salary configuration updated successfully",
      data: config
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating salary configuration", error: error.message });
  }
}

// Get salary configuration
export async function getSalaryConfig(req, res) {
  try {
    const configs = await SalaryConfig.find();
    res.status(200).json(configs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching salary configurations", error: error.message });
  }
}

// Process payments (mark as paid)
export async function processPayments(req, res) {
  try {
    const { financialIds } = req.body;
    
    const updated = await Financial.updateMany(
      { _id: { $in: financialIds } },
      { 
        status: "paid", 
        paymentDate: new Date(),
        processedBy: req.user?._id 
      }
    );

    res.status(200).json({
      message: "Payments processed successfully",
      updatedCount: updated.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing payments", error: error.message });
  }
}

// Get all paid financial records including all roles
export async function getAllPaidFinancials(req, res) {
  try {
    const { page = 1, limit = 10, role, month, year } = req.query;
    
    const filter = { status: "paid" };
    if (role) filter.recipientType = role;
    if (month && year) {
      filter["period.month"] = parseInt(month);
      filter["period.year"] = parseInt(year);
    }

    const paidFinancials = await Financial.find(filter)
      .populate("recipientId", "profile firstName lastName email")
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Financial.countDocuments(filter);

    // Calculate totals by role
    const totalsByRole = await Financial.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$recipientType",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      financials: paidFinancials,
      totalsByRole,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error("Error fetching paid financials:", error);
    res.status(500).json({ message: "Failed to fetch paid financials", error: error.message });
  }
}

// Get financial statistics
export async function getFinancialStats(req, res) {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const stats = await Financial.aggregate([
      {
        $match: {
          "period.month": currentMonth,
          "period.year": currentYear
        }
      },
      {
        $group: {
          _id: {
            type: "$type",
            recipientType: "$recipientType",
            status: "$status"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.recipientType",
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "paid"] }, "$totalAmount", 0]
            }
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "pending"] }, "$totalAmount", 0]
            }
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "paid"] }, "$count", 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "pending"] }, "$count", 0]
            }
          }
        }
      }
    ]);

    const overallStats = await Financial.aggregate([
      {
        $match: {
          "period.month": currentMonth,
          "period.year": currentYear
        }
      },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      period: { month: currentMonth, year: currentYear },
      statsByRole: stats,
      overallStats,
      totals: {
        paid: overallStats.find(s => s._id === "paid")?.totalAmount || 0,
        pending: overallStats.find(s => s._id === "pending")?.totalAmount || 0,
        total: overallStats.reduce((sum, s) => sum + s.totalAmount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching financial stats", error: error.message });
  }
}

// Get financial summary
export async function getFinancialSummary(req, res) {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const summary = await Financial.aggregate([
      {
        $match: {
          "period.month": currentMonth,
          "period.year": currentYear
        }
      },
      {
        $group: {
          _id: {
            type: "$type",
            recipientType: "$recipientType",
            status: "$status"
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalPending = summary
      .filter(s => s._id.status === "pending")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const totalPaid = summary
      .filter(s => s._id.status === "paid")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    res.status(200).json({
      period: { month: currentMonth, year: currentYear },
      summary,
      totals: {
        pending: totalPending,
        paid: totalPaid,
        overall: totalPending + totalPaid
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching financial summary", error: error.message });
  }
}

export const getPaidFinancials = async (req, res) => {
  try {
    const paidFinancials = await Financial.find({ status: "paid" }).populate({
      path: "recipientId",
      select: "profile email",
    });

    res.status(200).json(paidFinancials);
  } catch (error) {
    console.error("Error fetching paid financials:", error);
    res.status(500).json({ message: "Failed to fetch paid financials" });
  }
};