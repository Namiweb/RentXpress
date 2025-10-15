import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import DriverNavigation from "./driver/components/DriverNavigation.jsx";
import DriverHero from "./driver/components/DriverHero.jsx";

// Color palette from DriverHero theme
const COLORS = {
  white: "#FFFFFF",
  gray: "#828282",
  orange: "#FF5A00",
  black: "#000000",
  lightGray: "#F8FAFC",
  mediumGray: "#E2E8F0",
  darkGray: "#475569",
};

const statusLabelMap = {
  scheduled: "On the way",
  "in-progress": "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusProgression = {
  scheduled: "in-progress",
  "in-progress": "completed",
};

const statusActionLabel = {
  scheduled: "Mark On the way",
  "in-progress": "Mark Completed",
};

const DRIVER_FEE_RATE = 500;

const bookingStatusFlow = {
  accepted: { label: "Accepted", next: "on_the_way", action: "Mark On the way" },
  on_the_way: { label: "On the way", next: "started", action: "Mark Started" },
  started: { label: "Started", next: "completed", action: "Mark Completed" },
  completed: { label: "Completed", next: null, action: null },
  declined: { label: "Declined", next: null, action: null },
};

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  "scheduled",
  "in-progress",
  "in_progress",
  "accepted",
  "on_the_way",
  "started",
]);

// Utility functions (same as before)
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function getStartOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function getStartOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  if (typeof timeValue === "string" && timeValue.includes(":")) {
    const [hours, minutes] = timeValue.split(":").map((part) => Number(part));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
  }
  return date;
}

function getBookingScheduledDateTime(booking) {
  const startDate = booking?.bookingDetails?.startDate;
  const pickupTime = booking?.bookingDetails?.pickupTime;
  const scheduled = combineDateAndTime(startDate, pickupTime);
  if (!scheduled) return null;
  return scheduled;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount, currency = "LKR") {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return "-";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(2)} ${currency}`;
  }
}

function normalizeTripAssignment(trip) {
  const scheduledAt = trip.tripDetails?.scheduledDateTime
    ? new Date(trip.tripDetails.scheduledDateTime)
    : null;
  const status = trip.tripDetails?.status || "scheduled";
  const statusLabel = statusLabelMap[status] || status;
  const nextStatus = statusProgression[status] || null;

  return {
    id: trip._id,
    type: "trip",
    reference: trip.tripId,
    pickupAddress: trip.pickupLocation?.address,
    dropoffAddress: trip.dropLocation?.address,
    scheduledAt,
    statusKey: status,
    statusLabel,
    secondaryStatus: statusLabel !== status ? status : null,
    nextStatus,
    actionLabel: nextStatus ? statusActionLabel[status] : null,
    raw: trip,
    customerId: trip.customerId,
    meta: {
      distance: trip.tripDetails?.distance,
    },
  };
}

function normalizeBookingAssignment(booking) {
  const scheduledAt = getBookingScheduledDateTime(booking);
  const driverStatus = booking.driverStatus || (booking.status === "completed" ? "completed" : "accepted");
  const flow = bookingStatusFlow[driverStatus] || { label: driverStatus, next: null, action: null };
  const pickupAddress = booking.pickupLocation?.address || booking.pickupLocation?.city || "Pickup TBD";
  const dropoffAddress = booking.dropoffLocation?.address || booking.dropoffLocation?.city || "Drop-off TBD";
  const driverFee = Number(booking.pricing?.driverFee || 0);
  const estimatedKm = driverFee > 0 ? driverFee / DRIVER_FEE_RATE : null;

  return {
    id: booking._id,
    type: "booking",
    reference: booking.bookingId || booking._id,
    pickupAddress,
    dropoffAddress,
    scheduledAt,
    statusKey: driverStatus,
    statusLabel: flow.label || driverStatus,
    secondaryStatus:
      booking.status && booking.status !== driverStatus ? booking.status : null,
    nextStatus: flow.next,
    actionLabel: flow.action,
    raw: booking,
    customerId: booking.customerId,
    meta: {
      driverFee,
      totalAmount: Number(booking.pricing?.totalAmount || 0),
      rentalSubtotal: Number(booking.pricing?.subtotal || 0),
      estimatedKm,
    },
  };
}

function CustomerSummary({ customer }) {
  if (!customer) {
    return <span className="bg-gray-700 text-white px-2 py-1 rounded-full text-xs font-medium">Customer pending</span>;
  }
  const name = [customer.profile?.firstName, customer.profile?.lastName]
    .filter(Boolean)
    .join(" ");
  return <span className="bg-neutral-700 text-white px-3 py-1 rounded-full text-xs font-medium">{name || customer.email || "Customer"}</span>;
}

// Driver Trips Component with Tailwind
function DriverTrips({
  assignments,
  isLoading,
  error,
  onRefresh,
  onUpdateTripStatus,
  onAdvanceBookingStatus,
  updatingTripId,
  updatingBookingId,
  customerMap,
}) {
  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-900 p-6 border-l-4 border-neutral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Assigned Trips</h3>
        <button 
          className="bg-neutral-950 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-800"
          onClick={onRefresh} 
          disabled={isLoading}
        >
          Refresh
        </button>
      </header>
      {error && <p className="bg-red-900 text-red-100 p-3 rounded-lg mb-4 border border-red-700">{error}</p>}
      {isLoading && <p className="text-gray-300">Loading assignments...</p>}
      {!isLoading && assignments.length === 0 && <p className="text-gray-400">No assignments yet.</p>}
      {!isLoading && assignments.length > 0 && (
        <ul className="space-y-4">
          {assignments.map((assignment) => {
            const { type, raw, nextStatus, actionLabel, meta } = assignment;
            const isTrip = type === "trip";
            const isBooking = type === "booking";
            const isUpdating = isTrip
              ? updatingTripId === assignment.id
              : updatingBookingId === assignment.id;
            const customer = customerMap[assignment.customerId];

            return (
              <li 
                key={`${type}-${assignment.id}`} 
                className="bg-neutral-800 rounded-xl p-4 border border-neutral-950 hover:border-white transition-all duration-200 "
              >
                <div className="flex-1">
                  <strong className="text-lg text-white">{assignment.reference}</strong>
                  <div className="flex gap-2 flex-wrap my-2">
                    <CustomerSummary customer={customer} />
                    <span className="bg-neutral-800 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-500">Pickup: {assignment.pickupAddress || "-"}</span>
                    <span className="bg-neutral-800 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-500">Drop-off: {assignment.dropoffAddress || "-"}</span>
                    {isBooking && meta?.driverFee > 0 && (
                      <span className="bg-neutral-560 text-orange-100 px-2 py-1 rounded-full text-xs">Driver fee {formatCurrency(meta.driverFee)}</span>
                    )}
                    {isBooking && meta?.totalAmount > 0 && (
                      <span className="bg-neutral-800 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-500">Trip total {formatCurrency(meta.totalAmount)}</span>
                    )}
                    {isTrip && meta?.distance && (
                      <span className="bg-gray-600 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-500">Distance {meta.distance} km</span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-1">Scheduled: {formatDateTime(assignment.scheduledAt)}</p>
                  <p className="text-gray-300">
                    Status: <strong className="text-orange-100">{assignment.statusLabel}</strong>
                    {assignment.secondaryStatus ? <span className="text-gray-400"> ({assignment.secondaryStatus})</span> : null}
                  </p>
                </div>
                {nextStatus && actionLabel && (
                  <button
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-3 shadow-lg hover:shadow-orange-500/25"
                    onClick={() => {
                      if (isTrip) {
                        onUpdateTripStatus(raw._id, nextStatus);
                      } else if (isBooking) {
                        onAdvanceBookingStatus(raw._id, nextStatus);
                      }
                    }}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating..." : actionLabel}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Driver Schedule Component with Tailwind
function DriverSchedule({ assignments, isLoading }) {
  const [viewMode, setViewMode] = useState("week");

  const sortedAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.scheduledAt)
      .map((assignment) => ({ ...assignment, scheduledAt: new Date(assignment.scheduledAt) }))
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [assignments]);

  const todayAssignments = useMemo(() => {
    const today = new Date();
    return sortedAssignments.filter((assignment) => isSameDay(assignment.scheduledAt, today));
  }, [sortedAssignments]);

  const weeklyBuckets = useMemo(() => {
    const startWeek = getStartOfWeek(new Date());
    return Array.from({ length: 7 }).map((_, index) => {
      const dayDate = new Date(startWeek);
      dayDate.setDate(startWeek.getDate() + index);
      const items = sortedAssignments.filter((assignment) => isSameDay(assignment.scheduledAt, dayDate));
      return {
        label: formatDate(dayDate),
        shortLabel: dayDate.toLocaleDateString(undefined, { weekday: "short" }),
        date: dayDate,
        items,
      };
    });
  }, [sortedAssignments]);

  const hasUpcoming = sortedAssignments.length > 0;

  const handleDownloadSchedule = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
    const marginLeft = 48;
    const headerY = 60;
    const now = new Date();

    doc.setFontSize(18);
    doc.text("Driver Schedule", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`View: ${viewMode === "day" ? "Today" : "This Week"}`, marginLeft, headerY + 35);

    if (!hasUpcoming) {
      doc.setFontSize(12);
      doc.text("No scheduled trips available.", marginLeft, headerY + 60);
      doc.save("driver-schedule.pdf");
      return;
    }

    if (viewMode === "day") {
      const rows = todayAssignments.map((assignment, index) => [
        index + 1,
        assignment.reference,
        assignment.pickupAddress || "-",
        assignment.dropoffAddress || "-",
        formatTime(assignment.scheduledAt) || "-",
        assignment.statusLabel || "-",
      ]);

      if (rows.length === 0) {
        doc.text("No trips scheduled for today.", marginLeft, headerY + 60);
      } else {
        autoTable(doc, {
          startY: headerY + 60,
          head: [["#", "Reference", "Pickup", "Drop-off", "Pickup time", "Status"]],
          body: rows,
          styles: { fontSize: 10, cellPadding: 6 },
          headStyles: { fillColor: [255, 90, 0], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 30, halign: "center" },
            4: { halign: "center" },
            5: { halign: "center" },
          },
        });
      }
    } else {
      const rows = [];
      weeklyBuckets.forEach((bucket) => {
        if (bucket.items.length === 0) return;
        bucket.items.forEach((assignment) => {
          rows.push([
            bucket.label,
            assignment.reference,
            assignment.pickupAddress || "-",
            assignment.dropoffAddress || "-",
            formatTime(assignment.scheduledAt) || "-",
            assignment.statusLabel || "-",
          ]);
        });
      });

      if (rows.length === 0) {
        doc.text("No trips scheduled for the selected week.", marginLeft, headerY + 60);
      } else {
        autoTable(doc, {
          startY: headerY + 60,
          head: [["Day", "Reference", "Pickup", "Drop-off", "Pickup time", "Status"]],
          body: rows,
          styles: { fontSize: 10, cellPadding: 6 },
          headStyles: { fillColor: [255, 90, 0], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 120 },
            4: { halign: "center" },
            5: { halign: "center" },
          },
        });
      }
    }

    doc.save(`driver-schedule-${viewMode}.pdf`);
  }, [hasUpcoming, todayAssignments, viewMode, weeklyBuckets]);

  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-900 p-6 border-l-3 border-neutral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Schedule</h3>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <button
            className="bg-orange-500 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-950"
            type="button"
            onClick={handleDownloadSchedule}
            disabled={!hasUpcoming}
          >
            Download
          </button>
          <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-900">
            <button
              className={`px-3 py-1 rounded-md transition-colors duration-200 ${
                viewMode === "day" 
                  ? "bg-neutral-900 shadow-sm text-white font-medium" 
                  : "text-white hover:neutral-950 hover:bg-neutral-900"
              }`}
              onClick={() => setViewMode("day")}
            >
              Today
            </button>
            <button
              className={`px-3 py-1 rounded-md transition-colors duration-200 ${
                viewMode === "week" 
                  ? "bg-neutral-900 shadow-sm text-white font-medium" 
                  : "text-gray-300 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => setViewMode("week")}
            >
              This Week
            </button>
          </div>
        </div>
      </header>
      {isLoading && <p className="text-gray-300">Loading schedule...</p>}
      {!isLoading && !hasUpcoming && <p className="text-gray-400">No scheduled trips yet.</p>}
      {!isLoading && hasUpcoming && viewMode === "day" && (
        todayAssignments.length > 0 ? (
          <ul className="space-y-3">
            {todayAssignments.map((assignment) => (
              <li key={`day-${assignment.id}`} className="bg-gray-700 rounded-xl p-3 border border-gray-600 hover:border-orange-500 transition-colors duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <strong className="text-white">{assignment.reference}</strong>
                    <p className="text-gray-300 text-sm mt-1">Pickup {formatTime(assignment.scheduledAt)}</p>
                    <p className="text-gray-300 text-sm">
                      {assignment.pickupAddress} → {assignment.dropoffAddress}
                    </p>
                  </div>
                  <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {assignment.statusLabel}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No trips scheduled for today.</p>
        )
      )}
      {!isLoading && hasUpcoming && viewMode === "week" && (
        <div className="space-y-4">
          {weeklyBuckets.map((bucket) => (
            <div
              key={bucket.shortLabel}
              className="bg-neutral-800 rounded-xl p-4 border border-gray-600"
            >
              <strong className="text-white">{bucket.label}</strong>
              {bucket.items.length === 0 ? (
                <p className="text-gray-400 text-sm mt-2">No trips scheduled.</p>
              ) : (
                <ul className="space-y-3 mt-3">
                  {bucket.items.map((assignment) => (
                    <li key={`week-${assignment.id}`} className="bg-neutral-800-xl p-3 border border-neutral-950 hover:border-black transition-colors duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-white">{assignment.reference}</strong>
                          <p className="text-gray-300 text-sm mt-1">Pickup {formatTime(assignment.scheduledAt)}</p>
                          <p className="text-gray-300 text-sm">
                            {assignment.pickupAddress} → {assignment.dropoffAddress}
                          </p>
                        </div>
                        <span className="bg-white text-black px-2 py-1 rounded-full text-xs font-medium">
                          {assignment.statusLabel}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Earnings Summary Component with Tailwind
function EarningsSummary({ driverId, bookings = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [lifetimeTotal, setLifetimeTotal] = useState(0);
  const [todayPaid, setTodayPaid] = useState(0);
  const [currency, setCurrency] = useState("LKR");
  const [metrics, setMetrics] = useState({
    totalTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    totalDistance: 0,
    averageRating: null,
    totalHours: 0,
    netEarnings: 0,
  });

  const driverFeeInfo = useMemo(() => {
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return {
        summary: {
          total: 0,
          recognized: 0,
          recognizedToday: 0,
          recognizedWeek: 0,
          recognizedMonth: 0,
          upcoming: 0,
          completed: 0,
          count: 0,
          recognizedCount: 0,
          upcomingCount: 0,
          completedCount: 0,
        },
        items: [],
      };
    }

    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const weekStart = getStartOfWeek(now).getTime();
    const monthStart = getStartOfMonth(now).getTime();
    const recognizedDriverStatuses = new Set(["on_the_way", "started", "completed"]);
    const recognizedBookingStatuses = new Set([
      "started",
      "in_progress",
      "in-progress",
      "completed",
    ]);

    const summary = {
      total: 0,
      recognized: 0,
      recognizedToday: 0,
      recognizedWeek: 0,
      recognizedMonth: 0,
      upcoming: 0,
      completed: 0,
      count: 0,
      recognizedCount: 0,
      upcomingCount: 0,
      completedCount: 0,
    };

    const items = bookings
      .map((booking) => {
        const rawFee = Number(booking.pricing?.driverFee || 0);
        if (!rawFee || Number.isNaN(rawFee)) return null;

        const scheduledAt = getBookingScheduledDateTime(booking);
        const scheduledTime = scheduledAt ? scheduledAt.getTime() : null;
        const driverStatusKey = booking.driverStatus || "";
        const bookingStatusKey = booking.status || "";
        const recognizedStatus =
          recognizedDriverStatuses.has(driverStatusKey) ||
          recognizedBookingStatuses.has(bookingStatusKey);
        const hasPassedPickup = scheduledTime != null && scheduledTime <= now.getTime();
        const recognized = recognizedStatus && hasPassedPickup;
        const isCompleted =
          recognized &&
          (driverStatusKey === "completed" || bookingStatusKey === "completed");
        const kilometers = Number((rawFee / DRIVER_FEE_RATE).toFixed(2));

        summary.total += rawFee;
        summary.count += 1;

        if (recognized) {
          summary.recognized += rawFee;
          summary.recognizedCount += 1;
          if (scheduledTime != null) {
            if (scheduledTime >= todayStart) {
              summary.recognizedToday += rawFee;
            }
            if (scheduledTime >= weekStart) {
              summary.recognizedWeek += rawFee;
            }
            if (scheduledTime >= monthStart) {
              summary.recognizedMonth += rawFee;
            }
          }
        } else {
          summary.upcoming += rawFee;
          summary.upcomingCount += 1;
        }

        if (isCompleted) {
          summary.completed += rawFee;
          summary.completedCount += 1;
        }

        return {
          id: booking._id,
          bookingId: booking.bookingId || booking._id,
          status: booking.driverStatus || booking.status || "pending",
          fee: rawFee,
          kilometers,
          scheduledAt,
          recognized,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.scheduledAt?.getTime() || 0) - (a.scheduledAt?.getTime() || 0));

    return { summary, items };
  }, [bookings]);

  const loadEarnings = async () => {
    setIsLoading(true);
    setError("");
    try {
      const paymentsResponse = await apiRequest("/driver-payments");
      const paymentData = await paymentsResponse.json();
      if (!paymentsResponse.ok) {
        throw new Error(paymentData.message || "Unable to load payments");
      }

      const driverPayments = (Array.isArray(paymentData) ? paymentData : [])
        .filter((entry) => entry.driverId === driverId)
        .sort(
          (a, b) =>
            new Date(b.processedAt || b.createdAt || 0) -
            new Date(a.processedAt || a.createdAt || 0)
        );

      const nowMs = Date.now();
      const weekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
      const todayStartMs = startOfDay(new Date()).getTime();

      const weekly = driverPayments
        .filter((payment) =>
          new Date(payment.processedAt || payment.createdAt || 0).getTime() >= weekAgo
        )
        .reduce((acc, payment) => acc + (payment.amount || 0), 0);

      const monthly = driverPayments
        .filter((payment) =>
          new Date(payment.processedAt || payment.createdAt || 0).getTime() >= monthAgo
        )
        .reduce((acc, payment) => acc + (payment.amount || 0), 0);

      const lifetime = driverPayments.reduce(
        (acc, payment) => acc + (payment.amount || 0),
        0
      );

      const todayPaymentTotal = driverPayments
        .filter((payment) =>
          new Date(payment.processedAt || payment.createdAt || 0).getTime() >= todayStartMs
        )
        .reduce((acc, payment) => acc + (payment.amount || 0), 0);

      setPayments(driverPayments.slice(0, 5));
      setWeeklyTotal(weekly);
      setMonthlyTotal(monthly);
      setLifetimeTotal(lifetime);
      setTodayPaid(todayPaymentTotal);
      if (driverPayments[0]?.currency) {
        setCurrency(driverPayments[0].currency);
      }

      const earningsResponse = await apiRequest("/driver-earnings");
      const earningsData = await earningsResponse.json();
      if (!earningsResponse.ok) {
        throw new Error(earningsData.message || "Unable to load earnings records");
      }

      const driverEarnings = (Array.isArray(earningsData) ? earningsData : []).filter(
        (entry) => entry.driverId === driverId
      );

      if (driverEarnings.length > 0) {
        const aggregate = driverEarnings.reduce(
          (acc, entry) => {
            const tripMetrics = entry.tripMetrics || {};
            const earnings = entry.earnings || {};
            const rating = tripMetrics.averageRating || null;
            const ratingCount = rating ? 1 : 0;

            return {
              totalTrips: acc.totalTrips + (tripMetrics.totalTrips || 0),
              completedTrips: acc.completedTrips + (tripMetrics.completedTrips || 0),
              cancelledTrips: acc.cancelledTrips + (tripMetrics.cancelledTrips || 0),
              totalDistance: acc.totalDistance + (tripMetrics.totalDistance || 0),
              totalHours: acc.totalHours + (tripMetrics.totalHours || 0),
              netEarnings: acc.netEarnings + (earnings.netEarnings || 0),
              ratingSum: acc.ratingSum + (rating || 0),
              ratingCount: acc.ratingCount + ratingCount,
            };
          },
          {
            totalTrips: 0,
            completedTrips: 0,
            cancelledTrips: 0,
            totalDistance: 0,
            totalHours: 0,
            netEarnings: 0,
            ratingSum: 0,
            ratingCount: 0,
          }
        );

        setMetrics({
          totalTrips: aggregate.totalTrips,
          completedTrips: aggregate.completedTrips,
          cancelledTrips: aggregate.cancelledTrips,
          totalDistance: aggregate.totalDistance,
          totalHours: aggregate.totalHours,
          netEarnings: aggregate.netEarnings,
          averageRating:
            aggregate.ratingCount > 0
              ? Number((aggregate.ratingSum / aggregate.ratingCount).toFixed(2))
              : null,
        });
      } else {
        setMetrics({
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          totalDistance: 0,
          totalHours: 0,
          netEarnings: 0,
          averageRating: null,
        });
      }
    } catch (err) {
      setError(err.message);
      setPayments([]);
      setWeeklyTotal(0);
      setMonthlyTotal(0);
      setLifetimeTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      loadEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const driverFeeSummary = driverFeeInfo.summary;
  const combinedToday = todayPaid + driverFeeSummary.recognizedToday;
  const combinedWeekly = weeklyTotal + driverFeeSummary.recognizedWeek;
  const combinedMonthly = monthlyTotal + driverFeeSummary.recognizedMonth;
  const combinedNet = metrics.netEarnings + driverFeeSummary.recognized;

  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-950 p-6 border-l-1 border-neutral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Earnings Summary</h3>
        <button 
          className="bg-neutral-950 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-800"
          onClick={loadEarnings} 
          disabled={isLoading}
        >
          Refresh
        </button>
      </header>
      {error && <p className="bg-red-900 text-red-100 p-3 rounded-lg mb-4 border border-red-700">{error}</p>}
      {isLoading && <p className="text-gray-300">Loading earnings...</p>}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <div className="bg-neutral-900 to-gray-800 rounded-xl p-4 border border-gray-600 shadow-lg">
              <strong className="text-gray-200">Today</strong>
              <p className="text-2xl font-bold mt-2 text-orange-100">{formatCurrency(combinedToday, currency)}</p>
              {driverFeeSummary.recognizedToday > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  Includes {formatCurrency(driverFeeSummary.recognizedToday, currency)} driver requests
                </p>
              )}
            </div>
            <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-950 shadow-lg">
              <strong className="text-gray-200">Weekly</strong>
              <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(combinedWeekly, currency)}</p>
              {driverFeeSummary.recognizedWeek > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  + {formatCurrency(driverFeeSummary.recognizedWeek, currency)} driver requests
                </p>
              )}
            </div>
            <div className="bg-neutral-800 to-gray-800 rounded-xl p-4 border border-neutral-950 shadow-lg">
              <strong className="text-gray-200">Monthly</strong>
              <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(combinedMonthly, currency)}</p>
              {driverFeeSummary.recognizedMonth > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  + {formatCurrency(driverFeeSummary.recognizedMonth, currency)} driver requests
                </p>
              )}
            </div>
            <div className="bg-neutral-800 to-gray-800 rounded-xl p-4 border border-neutral-950 shadow-lg">
              <strong className="text-gray-200">Total Paid Out</strong>
              <p className="text-2xl font-bold mt-2 text-orange-100">{formatCurrency(lifetimeTotal, currency)}</p>
              <p className="text-gray-400 text-xs mt-1">
                Completed payouts only
              </p>
            </div>
            <div className="bg-neutral-800 to-gray-800 rounded-xl p-4 border border-neutral-950 shadow-lg">
              <strong className="text-gray-200">Net Earnings</strong>
              <p className="text-2xl font-bold mt-2 text-orange-100">{formatCurrency(combinedNet, currency)}</p>
              {driverFeeSummary.recognized > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  Includes {formatCurrency(driverFeeSummary.recognized, currency)} driver requests
                </p>
              )}
            </div>
          </div>

          {driverFeeSummary.total > 0 && (
            <div className="bg-neutral-890 rounded-xl p-4 border border-gray-600 mb-6">
              <strong className="text-gray-200">Driver Requests</strong>
              <p className="text-lg font-semibold mt-2 text-orange-100">
                Recognized {formatCurrency(driverFeeSummary.recognized, currency)} · {driverFeeSummary.recognizedCount} jobs
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Pending {formatCurrency(driverFeeSummary.upcoming, currency)} · {driverFeeSummary.upcomingCount} upcoming of {driverFeeSummary.count}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-950 text-center">
              <strong className="text-gray-200">Trips</strong>
              <p className="text-xl font-bold mt-1 text-orange-100">
                {metrics.completedTrips}/{metrics.totalTrips}
              </p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-950 text-center">
              <strong className="text-gray-200">Cancelled</strong>
              <p className="text-xl font-bold mt-1 text-white">{metrics.cancelledTrips}</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-950 text-center">
              <strong className="text-gray-200">Distance (km)</strong>
              <p className="text-xl font-bold mt-1 text-orange-100">{metrics.totalDistance.toFixed(1)}</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-950 text-center">
              <strong className="text-gray-200">Avg Rating</strong>
              <p className="text-xl font-bold mt-1 text-white">
                {metrics.averageRating ? `${metrics.averageRating}/5` : "No ratings yet"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-bold mb-4 text-white">Recent Payouts</h4>
            {payments.length === 0 ? (
              <p className="text-gray-400">No payouts recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {payments.map((payment) => (
                  <li key={payment.paymentId || payment._id} className="bg-gray-700 rounded-xl p-4 border border-gray-600 hover:border-orange-500 transition-colors duration-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong className="text-white">{payment.paymentType}</strong>
                        <p className="text-lg font-semibold mt-1 text-orange-400">
                          {formatCurrency(payment.amount, payment.currency || currency)}
                        </p>
                        <p className="text-gray-300 text-sm">
                          Processed {formatDateTime(payment.processedAt || payment.createdAt)}
                        </p>
                      </div>
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {payment.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {driverFeeInfo.items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-bold mb-4 text-white">Driver Request Earnings</h4>
              <ul className="space-y-3">
                {driverFeeInfo.items.map((item) => (
                  <li key={item.id} className="bg-neutral-800 rounded-xl p-4 border border-neutral-800 hover:border-black transition-colors duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-white">{item.bookingId}</strong>
                        <p className="text-lg font-semibold mt-1 text-orange-100">
                          Fee {formatCurrency(item.fee, currency)} · {item.kilometers} km @ LKR {DRIVER_FEE_RATE}/km
                        </p>
                        <p className="text-gray-300 text-sm">
                          Status: {item.status}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <span className=" text-gray-200 px-2 py-1 rounded-full text-xs">
                          {formatDateTime(item.scheduledAt) || "Schedule pending"}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.recognized 
                            ? "bg-white text-black" 
                            : "bg-gray-600 text-gray-200"
                        }`}>
                          {item.recognized ? "Recognized" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Feedback Panel Component with Tailwind
function FeedbackPanel({ driverId, onDeleteFeedback, deletingId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    setError("");
    try {
      const bookingsResponse = await apiRequest(`/Bookings?driverId=${driverId}`);
      const bookingsData = await bookingsResponse.json();
      if (!bookingsResponse.ok) {
        throw new Error(bookingsData.message || "Unable to load bookings");
      }

      const bookingLookup = new Map();
      (Array.isArray(bookingsData) ? bookingsData : []).forEach((booking) => {
        if (booking._id) bookingLookup.set(String(booking._id), booking);
        if (booking.bookingId) bookingLookup.set(String(booking.bookingId), booking);
      });

      const feedbackResponse = await apiRequest("/feedbacks");
      const feedbackData = await feedbackResponse.json();
      if (!feedbackResponse.ok) {
        throw new Error(feedbackData.message || "Unable to load feedback");
      }

      const relevantFeedback = (Array.isArray(feedbackData) ? feedbackData : [])
        .filter((feedback) => bookingLookup.has(String(feedback.bookingId)))
        .map((feedback) => {
          const booking = bookingLookup.get(String(feedback.bookingId));
          const rating = feedback.ratings?.driverRating || feedback.ratings?.overallRating;
          return {
            ...feedback,
            booking,
            rating,
          };
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setFeedbacks(relevantFeedback.slice(0, 6));
    } catch (err) {
      setError(err.message);
      setFeedbacks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!feedbackId || !window.confirm("Are you sure you want to delete this feedback?")) {
      return;
    }

    try {
      await onDeleteFeedback(feedbackId);
      setFeedbacks(prev => prev.filter(feedback => 
        (feedback.feedbackId || feedback._id) !== feedbackId
      ));
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    if (driverId) {
      loadFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-900 p-6 border-l-4 border-l-neurtral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Customer Feedback</h3>
        <button 
          className="bg-neutral-950 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-950"
          onClick={loadFeedbacks} 
          disabled={isLoading}
        >
          Refresh
        </button>
      </header>
      {error && <p className="bg-red-900 text-red-100 p-3 rounded-lg mb-4 border border-red-700">{error}</p>}
      {isLoading && <p className="text-gray-300">Loading feedback...</p>}
      {!isLoading && feedbacks.length === 0 && <p className="text-gray-400">No feedback shared yet.</p>}
      {!isLoading && feedbacks.length > 0 && (
        <ul className="space-y-4">
          {feedbacks.map((feedback) => {
            const feedbackId = feedback.feedbackId || feedback._id;
            const isDeleting = deletingId === feedbackId;
            
            return (
              <li key={feedbackId} className="bg-neutral rounded-xl p-4 border border-gray-600 hover:border-white transition-all duration-200 hover:shadow-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <strong className="text-white">{feedback.booking?.bookingId || feedbackId}</strong>
                    <p className="text-lg font-semibold mt-1 text-orange-100">
                      Rating: {feedback.rating ? `${feedback.rating}/5` : "No rating"}
                    </p>
                    {feedback.comments?.serviceComment && (
                      <p className="text-gray-- mt-2 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                        {feedback.comments.serviceComment}
                      </p>
                    )}
                    <p className="text-gray-400 text-sm mt-2">
                      {formatDateTime(feedback.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      feedback.wouldRecommend 
                        ? "bg-white text-neutral-900" 
                        : "bg-gray-600 text-gray-200"
                    }`}>
                      {feedback.wouldRecommend ? "Would recommend" : "Feedback"}
                    </span>
                    <button
                      className="bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/20"
                      onClick={() => handleDeleteFeedback(feedbackId)}
                      disabled={isDeleting}
                      title="Delete this feedback"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Driver Requests Component with Tailwind
function DriverRequests({
  requests,
  isLoading,
  error,
  onRefresh,
  onAccept,
  acceptingId,
}) {
  const upcomingRequests = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return requests.filter((request) => {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (!scheduledAt) {
        return true;
      }
      return scheduledAt >= todayStart;
    });
  }, [requests]);

  const isRequestExpired = (request) => {
    const scheduledAt = getBookingScheduledDateTime(request);
    if (!scheduledAt) return false;

    const now = new Date();
    const expiryTime = new Date(scheduledAt.getTime() + (2 * 60 * 60 * 1000));
    return now > expiryTime;
  };

  const canAcceptRequest = (request) => {
    const scheduledAt = getBookingScheduledDateTime(request);

    if (!scheduledAt) {
      return true;
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return scheduledAt >= today && scheduledAt < tomorrow;
  };

  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-900 p-6 border-l-4 border-l-neutral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Driver Requests</h3>
        <button 
          className="bg-neutral-950 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-950"
          onClick={onRefresh} 
          disabled={isLoading}
        >
          Refresh
        </button>
      </header>
      {error && <p className="bg-red-900 text-red-100 p-3 rounded-lg mb-4 border border-red-700">{error}</p>}
      {isLoading && <p className="text-gray-300">Loading requests...</p>}
      {!isLoading && upcomingRequests.length === 0 && requests.length > 0 && (
        <p className="text-gray-400">No upcoming requests available. All requests are for past dates.</p>
      )}
      {!isLoading && upcomingRequests.length === 0 && requests.length === 0 && (
        <p className="text-gray-400">No driver requests available right now.</p>
      )}
      {!isLoading && upcomingRequests.length > 0 && (
        <ul className="space-y-4">
          {upcomingRequests.map((request) => {
            const scheduledAt = getBookingScheduledDateTime(request);
            const driverFee = Number(request.pricing?.driverFee || 0);
            const estimatedKm = driverFee > 0 ? driverFee / 500 : null;
            const isExpired = isRequestExpired(request);
            const canAccept = canAcceptRequest(request);
            const now = new Date();
            const isToday = scheduledAt && isSameDay(scheduledAt, now);
            const isUpcoming = scheduledAt && scheduledAt > now;

            return (
              <li key={`request-${request._id}`} className="bg-neutral-800 rounded-xl p-4 border border-gray-600 hover:border-white transition-all duration-200 hover:shadow-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <strong className="text-lg text-white">{request.bookingId || request._id}</strong>
                    <p className="text-gray-300 mt-1">
                      Pickup {request.pickupLocation?.address || request.pickupLocation?.city || "TBC"}
                    </p>
                    <p className="text-gray-300">
                      Scheduled {formatDateTime(scheduledAt) || "Pending"}
                      {isToday && <span className="text-orange- ml-2 font-medium">(Today)</span>}
                      {isUpcoming && !isToday && <span className="text-orange-300 ml-2 font-medium">(Upcoming)</span>}
                      {isExpired && <span className="text-red-400 ml-2 font-medium">(Expired)</span>}
                      {!canAccept && !isExpired && !isToday && <span className="text-gray-400 ml-2">(Not available today)</span>}
                    </p>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {request.dropoffLocation?.address && (
                        <span className=" text-gray-200 px-2 py-1 rounded-full text-xs border border-neutral-700">Drop-off: {request.dropoffLocation.address}</span>
                      )}
                      {driverFee > 0 && (
                        <span className="bg-neutral-700 text-white px-2 py-1 rounded-full text-xs">Driver fee {formatCurrency(driverFee)}</span>
                      )}
                      {estimatedKm && (
                        <span className="bg-neutral-800 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-500">Approx {estimatedKm.toFixed(1)} km</span>
                      )}
                      {scheduledAt && (
                        <span className="bg-neutral-600 text-white px-2 py-1 rounded-full text-xs">
                          {isToday ? "Today" : scheduledAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] ${
                      isExpired || !canAccept
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500"
                        : "bg-neutral-950 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/25"
                    }`}
                    onClick={() => onAccept(request._id)}
                    disabled={acceptingId === request._id || isExpired || !canAccept}
                    title={
                      isExpired
                        ? "This request has expired"
                        : !canAccept
                          ? "Can only accept requests scheduled for today"
                          : undefined
                    }
                  >
                    {acceptingId === request._id
                      ? "Accepting..."
                      : isExpired
                        ? "Expired"
                        : !canAccept
                          ? "Not Today"
                          : "Accept"
                    }
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Profile Management Component with Tailwind
function ProfileManagement({ userId, initialUser, onUserUpdated }) {
  const [profile, setProfile] = useState(initialUser || null);
  const [availability, setAvailability] = useState(initialUser?.status || "active");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState(null);
  const [docMessage, setDocMessage] = useState("");
  const [isDocUploading, setIsDocUploading] = useState(false);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const response = await apiRequest(`/users/${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load profile");
      }
      setProfile(data);
      if (data.status) {
        setAvailability(data.status);
      }
      onUserUpdated?.(data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadApplication = async () => {
    try {
      const response = await apiRequest("/driver-applications");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load driver application");
      }
      const record = (Array.isArray(data) ? data : []).find((entry) => {
        const entryId = entry.driverId?._id || entry.driverId;
        return entryId && String(entryId) === String(userId);
      });
      if (record) {
        setApplication(record);
      }
    } catch (error) {
      setDocMessage(error.message);
    }
  };

  useEffect(() => {
    loadProfile();
    loadApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const saveAvailability = async () => {
    if (!userId) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await apiRequest(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ status: availability }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update availability");
      }
      setMessage("Availability updated");
      if (data.data) {
        setProfile(data.data);
        onUserUpdated?.(data.data);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-neutral-900 rounded-2xl shadow-2xl border border-gray-700 p-6 border-l-4 border-l-neutral-900">
      <header className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Profile & Availability</h3>
        <button 
          className="bg-neutral-950 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-950"
          onClick={loadProfile} 
          disabled={isSaving}
        >
          Refresh
        </button>
      </header>
      {profile ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-800 rounded-lg p-4 border border-gray-600">
              <strong className="text-gray-200">Name</strong>
              <p className="text-lg font-semibold mt-1 text-white">
                {[profile.profile?.firstName, profile.profile?.lastName]
                  .filter(Boolean)
                  .join(" ") || "-"}
              </p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4 border border-gray-600">
              <strong className="text-gray-200">Contact</strong>
              <p className="text-lg font-semibold mt-1 text-white">
                {profile.profile?.phoneNumber || "-"}
              </p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4 border border-gray-600">
              <strong className="text-gray-200">Email</strong>
              <p className="text-lg font-semibold mt-1 text-white">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-900">
            <strong className="text-gray-200">Availability</strong>
            <div className="flex gap-3 items-center mt-3">
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-600 bg-neutral-800 text-white focus:border-neutral-950 focus:neutral-950 focus:neutral-950 transition-colors duration-200"
              >
                <option value="active" className="bg-neutral-900">Active (Accepting trips)</option>
                <option value="inactive" className="bg-neutral-900">Inactive</option>
                <option value="suspended" className="bg-neutral-900">Suspended</option>
                <option value="pending_verification" className="bg-neutral-900">Pending Verification</option>
              </select>
              <button 
                className="bg-neutral-950 hover:bg-neutral-950 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-neutral-950"
                onClick={saveAvailability} 
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Update"}
              </button>
            </div>
            {message && (
              <p
                className={`mt-2 text-sm font-medium ${
                  message.includes("updated") ? "text-orange-400" : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Loading profile...</p>
      )}
    </section>
  );
}

// Main DriverDashboard Component with Tailwind
function DriverDashboard() {
  const { user, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [trips, setTrips] = useState([]);
  const [driverBookings, setDriverBookings] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [tripError, setTripError] = useState("");
  const [tripsLoading, setTripsLoading] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState(null);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [acceptingBookingId, setAcceptingBookingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const deleteFeedback = async (feedbackId) => {
    if (!feedbackId) return;
    
    setDeletingId(feedbackId);
    
    try {
      const response = await apiRequest(`/feedbacks/${feedbackId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete feedback");
      }

      console.log("Feedback deleted successfully");
      
    } catch (error) {
      console.error("Error deleting feedback:", error);
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const loadAssignments = async () => {
    if (!user?._id) return;
    setTripsLoading(true);
    setTripError("");
    try {
      const [tripResponse, bookingResponse] = await Promise.all([
        apiRequest("/Trip"),
        apiRequest(`/Bookings?driverId=${user._id}`),
      ]);

      const tripData = await tripResponse.json();
      const bookingData = await bookingResponse.json();

      if (!tripResponse.ok) {
        throw new Error(tripData.message || "Unable to load trips");
      }
      if (!bookingResponse.ok) {
        throw new Error(bookingData.message || "Unable to load bookings");
      }

      const driverTrips = (Array.isArray(tripData) ? tripData : []).filter(
        (trip) => String(trip.driverId) === String(user._id)
      );

      const acceptedBookings = (Array.isArray(bookingData) ? bookingData : []).filter(
        (booking) =>
          booking.driverRequested &&
          booking.driverId &&
          String(booking.driverId) === String(user._id) &&
          booking.driverStatus !== "declined"
      );

      driverTrips.sort((a, b) => {
        const timeA = new Date(a.tripDetails?.scheduledDateTime || 0).getTime();
        const timeB = new Date(b.tripDetails?.scheduledDateTime || 0).getTime();
        return timeA - timeB;
      });

      acceptedBookings.sort((a, b) => {
        const timeA = getBookingScheduledDateTime(a)?.getTime() || 0;
        const timeB = getBookingScheduledDateTime(b)?.getTime() || 0;
        return timeA - timeB;
      });

      setTrips(driverTrips);
      setDriverBookings(acceptedBookings);

      const customerIds = new Set();
      driverTrips.forEach((trip) => {
        if (trip.customerId) customerIds.add(String(trip.customerId));
      });
      acceptedBookings.forEach((booking) => {
        if (booking.customerId) customerIds.add(String(booking.customerId));
      });

      if (customerIds.size > 0) {
        const entries = await Promise.all(
          Array.from(customerIds).map(async (customerId) => {
            try {
              const response = await apiRequest(`/users/${customerId}`);
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.message || "Failed to load customer");
              }
              return [customerId, data];
            } catch {
              return [customerId, null];
            }
          })
        );
        setCustomerMap(Object.fromEntries(entries));
      } else {
        setCustomerMap({});
      }
    } catch (error) {
      setTripError(error.message);
      setTrips([]);
      setDriverBookings([]);
      setCustomerMap({});
    } finally {
      setTripsLoading(false);
    }
  };

  const loadAvailableRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const response = await apiRequest("/Bookings?availableForDriver=true");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load driver requests");
      }

      const now = new Date();
      const filteredRequests = (Array.isArray(data) ? data : []).filter((request) => {
        const scheduledAt = getBookingScheduledDateTime(request);
        if (!scheduledAt) {
          return true;
        }

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        return scheduledAt >= todayStart;
      });

      setAvailableRequests(filteredRequests);
    } catch (error) {
      setRequestsError(error.message);
      setAvailableRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const acceptBookingRequest = async (bookingId) => {
    if (!bookingId || !user?._id) return;

    const request = availableRequests.find(req => req._id === bookingId);
    if (request) {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (scheduledAt) {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (scheduledAt < today) {
          alert("Cannot accept requests for past dates. Please refresh the list.");
          await loadAvailableRequests();
          return;
        }

        if (scheduledAt >= tomorrow) {
          alert("Can only accept requests scheduled for today. Please wait until the trip date.");
          return;
        }

        const expiryTime = new Date(scheduledAt.getTime() + (2 * 60 * 60 * 1000));
        if (now > expiryTime) {
          alert("This request has expired and can no longer be accepted.");
          await loadAvailableRequests();
          return;
        }
      }
    }

    setAcceptingBookingId(bookingId);
    try {
      const response = await apiRequest(`/Bookings/${bookingId}/accept`, {
        method: "POST",
        body: JSON.stringify({ driverId: user._id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to accept booking");
      }
      await loadAssignments();
      await loadAvailableRequests();
    } catch (error) {
      alert(error.message);
    } finally {
      setAcceptingBookingId(null);
    }
  };

  const advanceBookingStatus = async (bookingId, nextStatus) => {
    if (!bookingId || !nextStatus) return;
    setUpdatingBookingId(bookingId);
    setTripError("");
    try {
      const payload = { driverStatus: nextStatus };
      if (nextStatus === "on_the_way") {
        payload.status = "confirmed";
      }
      if (nextStatus === "started") {
        payload.status = "started";
      }
      if (nextStatus === "completed") {
        payload.status = "completed";
      }

      const response = await apiRequest(`/Bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to update booking status");
      }
      await loadAssignments();
    } catch (error) {
      setTripError(error.message);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const updateTripStatus = async (tripId, nextStatus) => {
    if (!tripId || !nextStatus) return;
    setTripError("");
    setUpdatingTripId(tripId);
    try {
      const response = await apiRequest(`/Trip/${tripId}`, {
        method: "PUT",
        body: JSON.stringify({ "tripDetails.status": nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Failed to update trip status");
      }
      await loadAssignments();
    } catch (error) {
      setTripError(error.message);
    } finally {
      setUpdatingTripId(null);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadAvailableRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const normalizedTrips = useMemo(
    () => trips.map((trip) => normalizeTripAssignment(trip)),
    [trips]
  );

  const normalizedBookings = useMemo(
    () => driverBookings.map((booking) => normalizeBookingAssignment(booking)),
    [driverBookings]
  );

  const assignments = useMemo(() => {
    return [...normalizedBookings, ...normalizedTrips].sort((a, b) => {
      const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [normalizedBookings, normalizedTrips]);

  const heroMetrics = useMemo(() => {
    const nowMs = Date.now();
    let upcoming = 0;
    let completed = 0;

    assignments.forEach((assignment) => {
      const scheduledAt = assignment.scheduledAt
        ? new Date(assignment.scheduledAt).getTime()
        : null;
      if (scheduledAt && scheduledAt > nowMs) {
        upcoming += 1;
      }
      if (assignment.statusKey === "completed") {
        completed += 1;
      }
    });

    const upcomingRequests = availableRequests.filter((request) => {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (!scheduledAt) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return scheduledAt >= todayStart;
    });

    return [
      { label: "Requests", value: upcomingRequests.length.toLocaleString() },
      { label: "Upcoming", value: upcoming.toLocaleString() },
      { label: "Completed", value: completed.toLocaleString() },
    ];
  }, [assignments, availableRequests]);

  const overviewCards = useMemo(() => {
    const today = new Date();
    let active = 0;
    let completed = 0;
    let todayCount = 0;

    assignments.forEach((assignment) => {
      const statusKey = assignment.statusKey || "";
      if (ACTIVE_ASSIGNMENT_STATUSES.has(statusKey)) {
        active += 1;
      }
      if (statusKey === "completed") {
        completed += 1;
      }
      if (assignment.scheduledAt && isSameDay(assignment.scheduledAt, today)) {
        todayCount += 1;
      }
    });

    const upcomingRequests = availableRequests.filter((request) => {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (!scheduledAt) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return scheduledAt >= todayStart;
    });

    return [
      {
        title: "Available requests",
        value: upcomingRequests.length.toLocaleString(),
        hint: "Ready to accept (upcoming only)",
      },
      {
        title: "Active jobs",
        value: active.toLocaleString(),
        hint: "Scheduled or in progress",
      },
      {
        title: "Completed trips",
        value: completed.toLocaleString(),
        hint: "Marked as completed",
      },
      {
        title: "Today",
        value: todayCount.toLocaleString(),
        hint: "Scheduled for today",
      },
    ];
  }, [assignments, availableRequests]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-black to-gray-900 text-white">
      <div className="flex">
        <DriverNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          onLogout={logout}
        />

        <main className="flex-1 px-4 md:px-8 py-6 bg-neutral-800 min-h-screen">
          <DriverHero activeTab={activeTab} user={user} metrics={heroMetrics} />

          {activeTab === "overview" && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6" aria-label="Key driver metrics">
                {overviewCards.map((card, idx) => (
                  <article
                    key={card.title}
                    className="bg-neutral-900 rounded-2xl p-6 flex flex-col items-center border-2 border-neutral-900  hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">{card.title}</p>
                    <p className="text-3xl font-bold my-2 text-orange-400">{card.value}</p>
                    <p className="text-xs text-center text-gray-400">{card.hint}</p>
                  </article>
                ))}
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DriverRequests
                  requests={availableRequests}
                  isLoading={requestsLoading}
                  error={requestsError}
                  onRefresh={loadAvailableRequests}
                  onAccept={acceptBookingRequest}
                  acceptingId={acceptingBookingId}
                />
                <DriverTrips
                  assignments={assignments}
                  isLoading={tripsLoading}
                  error={tripError}
                  onRefresh={loadAssignments}
                  onUpdateTripStatus={updateTripStatus}
                  onAdvanceBookingStatus={advanceBookingStatus}
                  updatingTripId={updatingTripId}
                  updatingBookingId={updatingBookingId}
                  customerMap={customerMap}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 mt-6">
                <DriverSchedule assignments={assignments} isLoading={tripsLoading} />
              </div>
            </>
          )}

          {activeTab === "requests" && (
            <DriverRequests
              requests={availableRequests}
              isLoading={requestsLoading}
              error={requestsError}
              onRefresh={loadAvailableRequests}
              onAccept={acceptBookingRequest}
              acceptingId={acceptingBookingId}
            />
          )}

          {activeTab === "assignments" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <DriverTrips
                assignments={assignments}
                isLoading={tripsLoading}
                error={tripError}
                onRefresh={loadAssignments}
                onUpdateTripStatus={updateTripStatus}
                onAdvanceBookingStatus={advanceBookingStatus}
                updatingTripId={updatingTripId}
                updatingBookingId={updatingBookingId}
                customerMap={customerMap}
              />
              <DriverSchedule assignments={assignments} isLoading={tripsLoading} />
            </div>
          )}

          {activeTab === "earnings" && <EarningsSummary driverId={user?._id} bookings={driverBookings} />}

          {activeTab === "feedback" && (
            <FeedbackPanel 
              driverId={user?._id} 
              onDeleteFeedback={deleteFeedback}
              deletingId={deletingId}
            />
          )}

          {activeTab === "profile" && (
            <ProfileManagement userId={user?._id} initialUser={user} onUserUpdated={setUser} />
          )}
        </main>
      </div>
    </div>
  );
}

export default DriverDashboard;