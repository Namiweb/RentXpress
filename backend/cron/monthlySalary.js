import { CronJob } from "cron";
import Booking from "../models/BookingsModel.js";
import users from "../models/UserModels.js";
import SalaryConfig from "../models/SalaryConfig.js";
import Vehicles from "../models/VehiclesModel.js";
import VehicleInspection from "../models/VehicleInspectionModel.js";
import Payment from "../models/paymentModels.js";
import Financial from "../models/Financial.js";

const monthlyJob = new CronJob(
  "0 0 1 1 * *", 

  async () => {
    console.log("Monthly job running at 1:00 AM on the 1st day of the month");

    const now = new Date();

    let lastMonth = now.getMonth() + 1;
    let year = now.getFullYear();

    if (lastMonth === 1) {
      lastMonth = 12; 
      year -= 1;
    } else {
      lastMonth -= 1;
    }

    const bookings = await lastMonthBookings();
    const inspections = await lastMonthVehicleInspections();

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

    console.log("Salary Configurations:", formattedConfigs);

    payableUsers.forEach((user) => {
      let totalEarnings = 0;
      let tripCount = 0;

      user.role === "inspector" 
        ? inspections.forEach(async (inspection) => {
          if (inspection.inspector.toString() === user._id.toString()) {
            tripCount += 1;
          }
        })
        : bookings.forEach(async (booking) => {
          if (user.role === "driver" && booking.bookingDetails.driverId?.toString() === user._id.toString()) {
            tripCount += 1;
            totalEarnings += booking.bookingDetails.pricing?.amount || 0;
          } else if (user.role === "vehicle_owner" && await checkVehicleOwner(booking.bookingDetails.vehicleId, user._id)) {
            tripCount += 1;
            totalEarnings += booking.bookingDetails.pricing?.amount || 0;
          }
        });

      const config = formattedConfigs[user.role];

      if (!config) {
        console.log(`No salary configuration found for role: ${user.role}`);
        return;
      }

      let salary = 0;
      if (user.role === "driver") {
        salary =
          config.baseSalary +
          (config.commissionRates.perTrip * tripCount * totalEarnings) / 100; 
        tripCount > config.bonuses.minTripsForBonus && (salary += config.bonuses.bonusAmount);
        (config.deductions.otherDeductions <= salary) ? salary -= config.deductions.otherDeductions : salary = 0;
      } else if (user.role === "vehicle_owner") {
        salary = (config.commissionRates.revenueShare * totalEarnings) / 100; 
        tripCount > config.bonuses.minTripsForBonus && (salary += config.bonuses.bonusAmount);
      } else if (user.role === "inspector") {
        salary = config.baseSalary + (config.commissionRates.perInspection * tripCount); 
        tripCount > config.bonuses.minInspectionsForBonus && (salary += config.bonuses.inspectionBonus);
      }

      const taxDeduction = (config.deductions.taxRate / 100) * salary;
      salary -= taxDeduction;

      console.log(`User: ${user._id}, Role: ${user.role}, Trips/Inspections: ${tripCount}, Total Earnings: ${totalEarnings.toFixed(2)}, Calculated Salary: ${salary.toFixed(2)}`);

      if (salary == 0) {
        return
      }

      let salaryData = {
        baseSalary: config.baseSalary,
        revenueShare:
          (config.commissionRates.revenueShare * totalEarnings) / 100,
        tripCount: user.role == "inspector" ? 0 : tripCount,
        tripEarnings:
          user.role == "driver"
            ? (config.commissionRates.perTrip * tripCount * totalEarnings) / 100
            : 0,
        inspectionCount: user.role == "inspector" ? tripCount : 0,
        inspectionEarnings:
          user.role == "inspector"
            ? config.commissionRates.perInspection * tripCount
            : 0,
        bonus:
          user.role == "inspector"
            ? tripCount > config.bonuses.minInspectionsForBonus &&
              config.bonuses.inspectionBonus
            : tripCount > config.bonuses.minTripsForBonus &&
              config.bonuses.bonusAmount,
        deductions: config.deductions.otherDeductions + taxDeduction,
      };

      paySalary(user._id, user.role, year, lastMonth, salary, salaryData)
    });
  },
  null,
  false, 
  "Asia/Colombo" 
);

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
        financialId: `SAL${year}${month
          .toString()
          .padStart(2, "0")}${id.toString().slice(-6)}`,
        type: "salary",
        recipientType: role,
        recipientId: id,
        amount: total,
        period: { month, year },
        calculationDetails: {
          baseSalary: salaryData.baseSalary,
          revenueShare: salaryData.revenueShare,
          tripCount: salaryData.tripCount,
          tripEarnings: salaryData.tripEarnings,
          inspectionCount: salaryData.inspectionCount,
          inspectionEarnings: salaryData.inspectionEarnings,
          bonus: salaryData.bonus,
          deductions: salaryData.deductions,
        },
        status: "paid",
      },
      { upsert: true, new: true }
    );

    return salary;
  } catch (err) {
    console.error("Error paying salary:", err);
    return;
  }
};

const checkVehicleOwner = async (vehicleId, userId) => {
  try {
    const vehicle = await Vehicles.findById(vehicleId);

    if (!vehicle) {
      console.log(`Vehicle with ID ${vehicleId} not found.`);
      return false;
    }

    return vehicle.ownerId.toString() === userId.toString();
  } catch (error) {
    console.error("Error verifying vehicle owner:", error);
    return false;
  }
}

const getSalaryConfigs = async () => {
  try {
    const salaryConfigs = await SalaryConfig.find({});

    if (salaryConfigs.length === 0) {
      console.log("No salary configurations found.");
      return [];
    }

    // console.log("Salary Configurations:", salaryConfigs);
    return salaryConfigs;
  } catch (error) {
    console.error("Error fetching salary configurations:", error);
  }
}

const usersToPay = async () => {
  try {
    const payableUsers = await users.find({
      status: "active",
      role: { $in: ["driver", "vehicle_owner", "inspector"] },
    });

    if (payableUsers.length === 0) {
      console.log("No users found for salary calculation.");
      return [];
    }

    // payableUsers.forEach(user => {
    //   console.log(`User ID: ${user._id}, Role: ${user.role}`);
    // });
    return payableUsers;
  } catch (error) {
    console.error("Error calculating salaries:", error);
  }
}

const lastMonthVehicleInspections = async () => {
  try {
    const now = new Date();
    const firstDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0
    );
    const lastDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    // console.log("First Day of Last Month:", firstDayOfLastMonth);
    // console.log("Last Day of Last Month:", lastDayOfLastMonth);

    const completedInspectionsLastMonth = await VehicleInspection.find({
      status: "completed",
      updatedAt: {
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth,
      },
    });

    if (completedInspectionsLastMonth.length === 0) {
      console.log("No completed inspections found from last month.");
      return [];
    }

    // console.log("Completed Inspections from Last Month:", completedInspectionsLastMonth);
    return completedInspectionsLastMonth;
  } catch (error) {
    console.error("Error fetching last month's vehicle inspections:", error);
    return [];
  }
}

const lastMonthBookings = async () => {
  try {
    const now = new Date();
    const firstDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0
    );
    const lastDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    // console.log("First Day of Last Month:", firstDayOfLastMonth);
    // console.log("Last Day of Last Month:", lastDayOfLastMonth);

    const lastMonthPayments = await Payment.find({
      status: "completed",
      updatedAt: {
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth,
      },
    });

    if (lastMonthPayments.length === 0) {
      console.log("No completed payments found from last month.");
      return [];
    }

    for (const payment of lastMonthPayments) {
      const booking = await Booking.findById(payment.bookingId);
      if (!booking) {
        console.log(`Booking with ID ${payment.bookingId} not found for payment ID ${payment._id}.`);
        continue;
      }

      payment.bookingDetails = booking;
    }

    // console.log("Completed Payments from Last Month:", lastMonthPayments);
    return lastMonthPayments; 
  } catch (error) {
    console.error("Error fetching last month's bookings:", error);
    return [];
  }
}

export const startMonthlyJob = () => {
  monthlyJob.start();
  console.log("Monthly cron job scheduled ✅");
};
