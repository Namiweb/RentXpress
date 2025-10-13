import Payment from "../models/paymentModels.js";
import { getTimeRanges } from "../utils/getTimeRanges.js";

// Create payment
export async function createPayment(req, res) {
  try {
    const paymentId = "PAY" + Date.now().toString().slice(-6);
    const payment = new Payment({
      ...req.body,
      paymentId,
      processedAt: new Date(),
      updatedAt: new Date()
    });
    const savedPayment = await payment.save();
    res.status(201).json(savedPayment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get all payments
export async function getAllPayments(req, res) {
  try {
    const payments = await Payment.find()
      .populate('bookingId')
      .populate('customerId')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get payment by ID
export async function getPaymentById(req, res) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId')
      .populate('customerId');
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update payment
export async function updatePayment(req, res) {
  try {
    const { paymentId, ...updateData } = req.body;
    updateData.updatedAt = new Date();
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Delete payment
export async function deletePayment(req, res) {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const paymentDetailsForGivenPeriod = async (start, end) => {
  return await Payment.aggregate([
    {
      $match: {
        status: "completed",
        processedAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$bookingId",
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: null,
        totalDistinctBookings: { $sum: 1 },
        totalEarnings: { $sum: "$totalAmount" },
      },
    },
  ]);
}

export async function getAdvancedComparison(req, res) {
  try {
    const { type } = req.query;

    const ranges = getTimeRanges();

    if (type === "day") {
      const { start: startOfToday, end: endOfToday } = ranges.today;
      const { start: startOfYesterday, end: endOfYesterday } = ranges.yesterday;

      // console.log(startOfToday, endOfToday);
      // console.log(startOfYesterday, endOfYesterday);

      const paymentsToday = await paymentDetailsForGivenPeriod(
        startOfToday,
        endOfToday
      );
      const paymentsYesterday = await paymentDetailsForGivenPeriod(
        startOfYesterday,
        endOfYesterday
      );

      res.status(200).json([ { count: paymentsToday[0]?.totalDistinctBookings ?? 0, amount: paymentsToday[0]?.totalEarnings ?? 0 }, { count: paymentsYesterday[0]?.totalDistinctBookings ?? 0, amount: paymentsYesterday[0]?.totalEarnings ?? 0 } ]);
    } else if (type === "week") {
      const { start: startOfThisWeek, end: endOfThisWeek } = ranges.thisWeek;
      const { start: startOfLastWeek, end: endOfLastWeek } = ranges.lastWeek;

      // console.log(startOfThisWeek, endOfThisWeek);
      // console.log(startOfLastWeek, endOfLastWeek);

      const paymentsThisWeek = await paymentDetailsForGivenPeriod(
        startOfThisWeek,
        endOfThisWeek
      );
      const paymentsLastWeek = await paymentDetailsForGivenPeriod(
        startOfLastWeek,
        endOfLastWeek
      );

      res.status(200).json([ { count: paymentsThisWeek[0]?.totalDistinctBookings ?? 0, amount: paymentsThisWeek[0]?.totalEarnings ?? 0 }, { count: paymentsLastWeek[0]?.totalDistinctBookings ?? 0, amount: paymentsLastWeek[0]?.totalEarnings ?? 0 } ]);
    } else if (type === "month") {
      const { start: startOfThisMonth, end: endOfThisMonth } = ranges.thisMonth;
      const { start: startOfLastMonth, end: endOfLastMonth } = ranges.lastMonth;

      // console.log(startOfThisMonth, endOfThisMonth);
      // console.log(startOfLastMonth, endOfLastMonth);

      const paymentsThisMonth = await paymentDetailsForGivenPeriod(
        startOfThisMonth,
        endOfThisMonth
      );
      const paymentsLastMonth = await paymentDetailsForGivenPeriod(
        startOfLastMonth,
        endOfLastMonth
      );

      res.status(200).json([ { count: paymentsThisMonth[0]?.totalDistinctBookings ?? 0, amount: paymentsThisMonth[0]?.totalEarnings ?? 0 }, { count: paymentsLastMonth[0]?.totalDistinctBookings ?? 0, amount: paymentsLastMonth[0]?.totalEarnings ?? 0 } ]);
    } else if (type === "year") {
      const { start: startOfThisYear, end: endOfThisYear } = ranges.thisYear;
      const { start: startOfLastYear, end: endOfLastYear } = ranges.lastYear;

      // console.log(startOfThisYear, endOfThisYear);
      // console.log(startOfLastYear, endOfLastYear);

      const paymentsThisYear = await paymentDetailsForGivenPeriod(
        startOfThisYear,
        endOfThisYear
      );
      const paymentsLastYear = await paymentDetailsForGivenPeriod(
        startOfLastYear,
        endOfLastYear
      );

      res.status(200).json([ { count: paymentsThisYear[0]?.totalDistinctBookings ?? 0 , amount: paymentsThisYear[0]?.totalEarnings ?? 0 }, { count: paymentsLastYear[0]?.totalDistinctBookings ?? 0, amount: paymentsLastYear[0]?.totalEarnings ?? 0 } ]);
    } else {
      res.status(400).json({ message: "Invalid type" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
