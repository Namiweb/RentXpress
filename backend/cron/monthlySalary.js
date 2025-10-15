import { CronJob } from "cron";
import Booking from "../models/BookingsModel.js";
import users from "../models/UserModels.js";
import SalaryConfig from "../models/SalaryConfig.js";
import Vehicles from "../models/VehiclesModel.js";
import VehicleInspection from "../models/VehicleInspectionModel.js";
import Payment from "../models/paymentModels.js";
import Financial from "../models/Financial.js";

const monthlyJob = new CronJob(
  "0 0 1 1 * *", // Run at 00:00 on 1st day of every month
  async () => {
    console.log("Monthly job running at 1:00 AM on the 1st day of the month");

    const now = new Date();
    let lastMonth = now.getMonth(); // Current month is 0-11
    let year = now.getFullYear();

    if (lastMonth === 0) {
      lastMonth = 12;
      year -= 1;
    }

    try {
      const payableUsers = await usersToPay();
      if (!payableUsers || payableUsers.length === 0) {
        console.log("No users to process for salary payments.");
        return;
      }

      const salaryConfigs = await getSalaryConfigs();
      if (!salaryConfigs || salaryConfigs.length === 0) {
        console.log("No salary configurations found.");
        return;
      }

      const formattedConfigs = salaryConfigs.reduce(
        (acc, config) => ({ ...acc, [config.role]: config }),
        {}
      );

      // Process each user
      for (const user of payableUsers) {
        await processUserSalary(user, lastMonth, year, formattedConfigs);
      }

      console.log("Monthly salary processing completed successfully");
    } catch (error) {
      console.error("Error in monthly salary job:", error);
    }
  },
  null,
  false,
  "Asia/Colombo"
);

const processUserSalary = async (user, month, year, configs) => {
  try {
    const config = configs[user.role];
    if (!config) {
      console.log(`No salary configuration found for role: ${user.role}`);
      return;
    }

    let salary = 0;
    let tripCount = 0;
    let totalEarnings = 0;
    let inspectionCount = 0;

    // Calculate based on role
    switch (user.role) {
      case "driver":
        ({ tripCount, totalEarnings } = await calculateDriverEarnings(user._id, month, year));
        salary = calculateDriverSalary(tripCount, totalEarnings, config);
        break;

      case "vehicle_owner":
        ({ tripCount, totalEarnings } = await calculateOwnerEarnings(user._id, month, year));
        salary = calculateOwnerSalary(tripCount, totalEarnings, config);
        break;

      case "inspector":
        inspectionCount = await calculateInspectorEarnings(user._id, month, year);
        salary = calculateInspectorSalary(inspectionCount, config);
        break;
    }

    if (salary <= 0) {
      console.log(`No salary for user ${user._id} (${user.role})`);
      return;
    }

    // Prepare salary data
    const salaryData = prepareSalaryData(user.role, config, tripCount, totalEarnings, inspectionCount, salary);

    console.log(`User: ${user._id}, Role: ${user.role}, Trips/Inspections: ${tripCount || inspectionCount}, Total Earnings: ${totalEarnings.toFixed(2)}, Calculated Salary: ${salary.toFixed(2)}`);

    // Save to financial records
    await paySalary(user._id, user.role, year, month, salary, salaryData);

  } catch (error) {
    console.error(`Error processing salary for user ${user._id}:`, error);
  }
};

// Driver calculations
const calculateDriverEarnings = async (driverId, month, year) => {
  const { firstDay, lastDay } = getMonthDateRange(month, year);
  
  const bookings = await Booking.find({
    "bookingDetails.driverId": driverId,
    status: "completed",
    updatedAt: { $gte: firstDay, $lte: lastDay }
  });

  const tripCount = bookings.length;
  const totalEarnings = bookings.reduce((sum, booking) => 
    sum + (booking.bookingDetails.pricing?.amount || 0), 0
  );

  return { tripCount, totalEarnings };
};

const calculateDriverSalary = (tripCount, totalEarnings, config) => {
  let salary = config.baseSalary || 0;
  
  // Commission from trips
  const commission = (config.commissionRates.perTrip * tripCount * totalEarnings) / 100;
  salary += commission;
  
  // Performance bonus
  if (tripCount > config.bonuses.minTripsForBonus) {
    salary += config.bonuses.bonusAmount;
  }
  
  // Deductions
  const taxDeduction = (config.deductions.taxRate / 100) * salary;
  const otherDeductions = config.deductions.otherDeductions || 0;
  
  salary -= (taxDeduction + otherDeductions);
  
  return Math.max(0, salary);
};

// Vehicle Owner calculations
const calculateOwnerEarnings = async (ownerId, month, year) => {
  const { firstDay, lastDay } = getMonthDateRange(month, year);
  
  // Get owner's vehicles
  const ownerVehicles = await Vehicles.find({ ownerId });
  const vehicleIds = ownerVehicles.map(v => v._id);
  
  // Get bookings for these vehicles
  const bookings = await Booking.find({
    "bookingDetails.vehicleId": { $in: vehicleIds },
    status: "completed",
    updatedAt: { $gte: firstDay, $lte: lastDay }
  });

  const tripCount = bookings.length;
  const totalEarnings = bookings.reduce((sum, booking) => 
    sum + (booking.bookingDetails.pricing?.amount || 0), 0
  );

  return { tripCount, totalEarnings };
};

const calculateOwnerSalary = (tripCount, totalEarnings, config) => {
  // Vehicle owners get revenue share (default 30%)
  const revenueShareRate = config.commissionRates.revenueShare || 30;
  let salary = (revenueShareRate * totalEarnings) / 100;
  
  // Performance bonus
  if (tripCount > config.bonuses.minTripsForBonus) {
    salary += config.bonuses.bonusAmount;
  }
  
  // Deductions (only tax for owners)
  const taxDeduction = (config.deductions.taxRate / 100) * salary;
  salary -= taxDeduction;
  
  return Math.max(0, salary);
};

// Inspector calculations
const calculateInspectorEarnings = async (inspectorId, month, year) => {
  const { firstDay, lastDay } = getMonthDateRange(month, year);
  
  const inspections = await VehicleInspection.find({
    inspector: inspectorId,
    status: "completed",
    updatedAt: { $gte: firstDay, $lte: lastDay }
  });

  return inspections.length;
};

const calculateInspectorSalary = (inspectionCount, config) => {
  let salary = config.baseSalary || 0;
  
  // Per inspection earnings
  const inspectionEarnings = config.commissionRates.perInspection * inspectionCount;
  salary += inspectionEarnings;
  
  // Performance bonus
  if (inspectionCount > config.bonuses.minInspectionsForBonus) {
    salary += config.bonuses.inspectionBonus;
  }
  
  // Deductions
  const taxDeduction = (config.deductions.taxRate / 100) * salary;
  const otherDeductions = config.deductions.otherDeductions || 0;
  
  salary -= (taxDeduction + otherDeductions);
  
  return Math.max(0, salary);
};

// Helper function to prepare salary data
const prepareSalaryData = (role, config, tripCount, totalEarnings, inspectionCount, totalSalary) => {
  const baseSalary = config.baseSalary || 0;
  const taxDeduction = (config.deductions.taxRate / 100) * totalSalary;
  const otherDeductions = config.deductions.otherDeductions || 0;
  
  let bonus = 0;
  if (role === "inspector") {
    bonus = inspectionCount > config.bonuses.minInspectionsForBonus ? config.bonuses.inspectionBonus : 0;
  } else {
    bonus = tripCount > config.bonuses.minTripsForBonus ? config.bonuses.bonusAmount : 0;
  }

  return {
    baseSalary,
    revenueShare: role === "vehicle_owner" ? (config.commissionRates.revenueShare * totalEarnings) / 100 : 0,
    tripCount: role !== "inspector" ? tripCount : 0,
    tripEarnings: role === "driver" ? (config.commissionRates.perTrip * tripCount * totalEarnings) / 100 : 0,
    inspectionCount: role === "inspector" ? inspectionCount : 0,
    inspectionEarnings: role === "inspector" ? config.commissionRates.perInspection * inspectionCount : 0,
    bonus,
    deductions: taxDeduction + otherDeductions
  };
};

// Helper function to get month date range
const getMonthDateRange = (month, year) => {
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0);
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  return { firstDay, lastDay };
};

// Existing functions (keep them but they're now used by the new functions above)
const paySalary = async (id, role, year, month, total, salaryData) => {
  try {
    const salary = await Financial.findOneAndUpdate(
      {
        recipientId: id,
        type: "salary",
        "period.month": month,
        "period.year": year,
      },
      {
        financialId: `SAL${year}${month.toString().padStart(2, "0")}${id.toString().slice(-6)}`,
        type: "salary",
        recipientType: role,
        recipientId: id,
        amount: total,
        period: { month, year },
        calculationDetails: salaryData,
        status: "paid",
        paymentDate: new Date(),
      },
      { upsert: true, new: true }
    );

    return salary;
  } catch (err) {
    console.error("Error paying salary:", err);
    return null;
  }
};

const getSalaryConfigs = async () => {
  try {
    return await SalaryConfig.find({});
  } catch (error) {
    console.error("Error fetching salary configurations:", error);
    return [];
  }
};

const usersToPay = async () => {
  try {
    return await users.find({
      status: "active",
      role: { $in: ["driver", "vehicle_owner", "inspector"] },
    });
  } catch (error) {
    console.error("Error fetching payable users:", error);
    return [];
  }
};

export const startMonthlyJob = () => {
  monthlyJob.start();
  console.log("Monthly cron job scheduled ✅");
};