import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import DriverNavigation from "./driver/components/DriverNavigation.jsx";
import DriverHero from "./driver/components/DriverHero.jsx";

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
  const diff = (day + 6) % 7; // Monday as start
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
    return <span className="tag">Customer pending</span>;
  }
  const name = [customer.profile?.firstName, customer.profile?.lastName]
    .filter(Boolean)
    .join(" ");
  return <span className="tag">{name || customer.email || "Customer"}</span>;
}

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
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Assigned Trips</h3>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </header>
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Loading assignments...</p>}
      {!isLoading && assignments.length === 0 && <p>No assignments yet.</p>}
      {!isLoading && assignments.length > 0 && (
        <ul className="list">
          {assignments.map((assignment) => {
            const { type, raw, nextStatus, actionLabel, meta } = assignment;
            const isTrip = type === "trip";
            const isBooking = type === "booking";
            const isUpdating = isTrip
              ? updatingTripId === assignment.id
              : updatingBookingId === assignment.id;
            const customer = customerMap[assignment.customerId];

            return (
              <li key={`${type}-${assignment.id}`} className="list-item">
                <div>
                  <strong>{assignment.reference}</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      margin: "0.35rem 0",
                    }}
                  >
                    <CustomerSummary customer={customer} />
                    <span className="tag">Pickup: {assignment.pickupAddress || "-"}</span>
                    <span className="tag">Drop-off: {assignment.dropoffAddress || "-"}</span>
                    {isBooking && meta?.driverFee > 0 && (
                      <span className="tag">Driver fee {formatCurrency(meta.driverFee)}</span>
                    )}
                    {isBooking && meta?.totalAmount > 0 && (
                      <span className="tag">Trip total {formatCurrency(meta.totalAmount)}</span>
                    )}
                    {isTrip && meta?.distance && (
                      <span className="tag">Distance {meta.distance} km</span>
                    )}
                  </div>
                  <p style={{ margin: 0 }}>Scheduled: {formatDateTime(assignment.scheduledAt)}</p>
                  <p style={{ margin: "0.2rem 0 0" }}>
                    Status: <strong>{assignment.statusLabel}</strong>
                    {assignment.secondaryStatus ? <span> ({assignment.secondaryStatus})</span> : null}
                  </p>
                </div>
                {nextStatus && actionLabel && (
                  <button
                    className="btn"
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
          headStyles: { fillColor: [17, 24, 39], textColor: 255 },
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
          headStyles: { fillColor: [17, 24, 39], textColor: 255 },
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
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Schedule</h3>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleDownloadSchedule}
            disabled={!hasUpcoming}
          >
            Download
          </button>
          <div className="toggle-group">
            <button
              className={`toggle ${viewMode === "day" ? "active" : ""}`}
              onClick={() => setViewMode("day")}
            >
              Today
            </button>
            <button
              className={`toggle ${viewMode === "week" ? "active" : ""}`}
              onClick={() => setViewMode("week")}
            >
              This Week
            </button>
          </div>
        </div>
      </header>
      {isLoading && <p>Loading schedule...</p>}
      {!isLoading && !hasUpcoming && <p>No scheduled trips yet.</p>}
      {!isLoading && hasUpcoming && viewMode === "day" && (
        todayAssignments.length > 0 ? (
          <ul className="list">
            {todayAssignments.map((assignment) => (
              <li key={`day-${assignment.id}`} className="list-item">
                <div>
                  <strong>{assignment.reference}</strong>
                  <p style={{ margin: "0.15rem 0" }}>Pickup {formatTime(assignment.scheduledAt)}</p>
                  <p style={{ margin: 0 }}>
                    {assignment.pickupAddress} → {assignment.dropoffAddress}
                  </p>
                </div>
                <span className="tag">{assignment.statusLabel}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No trips scheduled for today.</p>
        )
      )}
      {!isLoading && hasUpcoming && viewMode === "week" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {weeklyBuckets.map((bucket) => (
            <div
              key={bucket.shortLabel}
              style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.85rem" }}
            >
              <strong>{bucket.label}</strong>
              {bucket.items.length === 0 ? (
                <p style={{ margin: "0.4rem 0 0", color: "#64748b" }}>No trips scheduled.</p>
              ) : (
                <ul className="list" style={{ marginTop: "0.75rem" }}>
                  {bucket.items.map((assignment) => (
                    <li key={`week-${assignment.id}`} className="list-item">
                      <div>
                        <strong>{assignment.reference}</strong>
                        <p style={{ margin: "0.15rem 0" }}>Pickup {formatTime(assignment.scheduledAt)}</p>
                        <p style={{ margin: 0 }}>
                          {assignment.pickupAddress} → {assignment.dropoffAddress}
                        </p>
                      </div>
                      <span className="tag">{assignment.statusLabel}</span>
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
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Earnings Summary</h3>
        <button className="btn btn-secondary" onClick={loadEarnings} disabled={isLoading}>
          Refresh
        </button>
      </header>
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Loading earnings...</p>}
      {!isLoading && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Today</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{formatCurrency(combinedToday, currency)}</p>
              {driverFeeSummary.recognizedToday > 0 && (
                <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  Includes {formatCurrency(driverFeeSummary.recognizedToday, currency)} driver requests
                </p>
              )}
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Weekly</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{formatCurrency(combinedWeekly, currency)}</p>
              {driverFeeSummary.recognizedWeek > 0 && (
                <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  + {formatCurrency(driverFeeSummary.recognizedWeek, currency)} driver requests
                </p>
              )}
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Monthly</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{formatCurrency(combinedMonthly, currency)}</p>
              {driverFeeSummary.recognizedMonth > 0 && (
                <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  + {formatCurrency(driverFeeSummary.recognizedMonth, currency)} driver requests
                </p>
              )}
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Total Paid Out</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{formatCurrency(lifetimeTotal, currency)}</p>
              <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                Completed payouts only
              </p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Net Earnings (Reports)</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{formatCurrency(combinedNet, currency)}</p>
              {driverFeeSummary.recognized > 0 && (
                <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  Includes {formatCurrency(driverFeeSummary.recognized, currency)} driver requests
                </p>
              )}
            </div>
            {driverFeeSummary.total > 0 && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
                <strong>Driver Requests</strong>
                <p style={{ margin: "0.35rem 0 0" }}>
                  Recognized {formatCurrency(driverFeeSummary.recognized, currency)} · {driverFeeSummary.recognizedCount} jobs
                </p>
                <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  Pending {formatCurrency(driverFeeSummary.upcoming, currency)} · {driverFeeSummary.upcomingCount} upcoming of {driverFeeSummary.count}
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Trips</strong>
              <p style={{ margin: "0.35rem 0 0" }}>
                {metrics.completedTrips}/{metrics.totalTrips}
              </p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Cancelled</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{metrics.cancelledTrips}</p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Distance (km)</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{metrics.totalDistance.toFixed(1)}</p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem" }}>
              <strong>Avg Rating</strong>
              <p style={{ margin: "0.35rem 0 0" }}>
                {metrics.averageRating ? `${metrics.averageRating}/5` : "No ratings yet"}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem" }}>Recent Payouts</h4>
            {payments.length === 0 ? (
              <p>No payouts recorded yet.</p>
            ) : (
              <ul className="list">
                {payments.map((payment) => (
                  <li key={payment.paymentId || payment._id} className="list-item">
                    <div>
                      <strong>{payment.paymentType}</strong>
                      <p style={{ margin: "0.15rem 0" }}>
                        {formatCurrency(payment.amount, payment.currency || currency)}
                      </p>
                      <p style={{ margin: 0 }}>
                        Processed {formatDateTime(payment.processedAt || payment.createdAt)}
                      </p>
                    </div>
                    <span className="tag">{payment.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {driverFeeInfo.items.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem" }}>Driver Request Earnings</h4>
              <ul className="list">
                {driverFeeInfo.items.map((item) => (
                  <li key={item.id} className="list-item">
                    <div>
                      <strong>{item.bookingId}</strong>
                      <p style={{ margin: "0.2rem 0" }}>
                        Fee {formatCurrency(item.fee, currency)} · {item.kilometers} km @ LKR {DRIVER_FEE_RATE}/km
                      </p>
                      <p style={{ margin: 0, color: "#64748b" }}>
                        Status: {item.status}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="tag">{formatDateTime(item.scheduledAt) || "Schedule pending"}</span>
                      <span className="tag">{item.recognized ? "Recognized" : "Upcoming"}</span>
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

function FeedbackPanel({ driverId }) {
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

  useEffect(() => {
    if (driverId) {
      loadFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  return (
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Customer Feedback</h3>
        <button className="btn btn-secondary" onClick={loadFeedbacks} disabled={isLoading}>
          Refresh
        </button>
      </header>
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Loading feedback...</p>}
      {!isLoading && feedbacks.length === 0 && <p>No feedback shared yet.</p>}
      {!isLoading && feedbacks.length > 0 && (
        <ul className="list">
          {feedbacks.map((feedback) => (
            <li key={feedback.feedbackId || feedback._id} className="list-item">
              <div>
                <strong>{feedback.booking?.bookingId || feedback.feedbackId}</strong>
                <p style={{ margin: "0.2rem 0" }}>
                  Rating: {feedback.rating ? `${feedback.rating}/5` : "No rating"}
                </p>
                {feedback.comments?.serviceComment && (
                  <p style={{ margin: 0 }}>{feedback.comments.serviceComment}</p>
                )}
                <p style={{ margin: "0.2rem 0 0", color: "#64748b" }}>
                  {formatDateTime(feedback.createdAt)}
                </p>
              </div>
              <span className="tag">{feedback.wouldRecommend ? "Would recommend" : "Feedback"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (event) => {
      reject(event.target?.error || new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

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

  const handleDocumentUpload = async (field, file) => {
    if (!file) return;
    if (!application?._id) {
      setDocMessage("No driver application found for this driver.");
      return;
    }
    setIsDocUploading(true);
    setDocMessage("");
    try {
      const encoded = await fileToBase64(file);
      const payload = {
        ...application,
        documents: {
          ...(application.documents || {}),
          [field]: encoded,
        },
      };
      const response = await apiRequest(`/driver-applications/${application._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload document");
      }
      setApplication(data);
      setDocMessage("Document uploaded");
    } catch (error) {
      setDocMessage(error.message);
    } finally {
      setIsDocUploading(false);
    }
  };

  return (
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Profile & Availability</h3>
        <button className="btn btn-secondary" onClick={loadProfile} disabled={isSaving}>
          Refresh
        </button>
      </header>
      {profile ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.5rem",
            }}
          >
            <div>
              <strong>Name</strong>
              <p style={{ margin: "0.25rem 0 0" }}>
                {[profile.profile?.firstName, profile.profile?.lastName]
                  .filter(Boolean)
                  .join(" ") || "-"}
              </p>
            </div>
            <div>
              <strong>Contact</strong>
              <p style={{ margin: "0.25rem 0 0" }}>{profile.profile?.phoneNumber || "-"}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p style={{ margin: "0.25rem 0 0" }}>{profile.email}</p>
            </div>
          </div>

          <div>
            <strong>Availability</strong>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
                alignItems: "center",
              }}
            >
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                style={{ padding: "0.5rem", borderRadius: "10px", border: "1px solid #cbd5f5" }}
              >
                <option value="active">Active (Accepting trips)</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
              <button className="btn" onClick={saveAvailability} disabled={isSaving}>
                {isSaving ? "Saving..." : "Update"}
              </button>
            </div>
            {message && (
              <p
                style={{
                  margin: "0.5rem 0 0",
                  color: message.includes("updated") ? "#16a34a" : "#dc2626",
                }}
              >
                {message}
              </p>
            )}
          </div>

          <div>
            <strong>Documents</strong>
            {application ? (
              <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  License / Badge
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) =>
                      handleDocumentUpload("licensePhoto", event.target.files?.[0])
                    }
                    disabled={isDocUploading}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  National ID
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) =>
                      handleDocumentUpload("nationalId", event.target.files?.[0])
                    }
                    disabled={isDocUploading}
                  />
                </label>
                {docMessage && (
                  <p
                    style={{
                      margin: 0,
                      color: docMessage.includes("uploaded") ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {docMessage}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ marginTop: "0.5rem" }}>
                No driver application record found. Submit documents via onboarding.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </section>
  );
}

function DriverRequests({
  requests,
  isLoading,
  error,
  onRefresh,
  onAccept,
  acceptingId,
}) {
  // Filter requests to only show upcoming trips (not past dates)
  const upcomingRequests = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0); // Start of today (00:00:00)

    return requests.filter((request) => {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (!scheduledAt) {
        // If no scheduled date, consider it as future (pending scheduling)
        return true;
      }
      // Only show requests scheduled for today or future dates
      return scheduledAt >= todayStart;
    });
  }, [requests]);

  // Check if a request has expired (more than 2 hours past scheduled time)
  const isRequestExpired = (request) => {
    const scheduledAt = getBookingScheduledDateTime(request);
    if (!scheduledAt) return false;

    const now = new Date();
    // Consider a request expired if it's more than 2 hours past the scheduled time
    const expiryTime = new Date(scheduledAt.getTime() + (2 * 60 * 60 * 1000));
    return now > expiryTime;
  };


  // This prevents drivers from accepting future trips in advance
  const canAcceptRequest = (request) => {
    const scheduledAt = getBookingScheduledDateTime(request);

    // Allow acceptance if no scheduled date (pending scheduling)
    if (!scheduledAt) {
      return true;
    }

    const now = new Date();

    // Define TODAY boundaries (00:00:00 to 23:59:59)
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Start of today (00:00:00)

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow (00:00:00)

    // RULE: Only allow acceptance if scheduled for TODAY
    // scheduledAt >= today (not before today)
    // scheduledAt < tomorrow (not tomorrow or later)
    return scheduledAt >= today && scheduledAt < tomorrow;
  };

  return (
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Driver Requests</h3>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </header>
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Loading requests...</p>}
      {!isLoading && upcomingRequests.length === 0 && requests.length > 0 && (
        <p>No upcoming requests available. All requests are for past dates.</p>
      )}
      {!isLoading && upcomingRequests.length === 0 && requests.length === 0 && (
        <p>No driver requests available right now.</p>
      )}
      {!isLoading && upcomingRequests.length > 0 && (
        <ul className="list">
          {upcomingRequests.map((request) => {
            const scheduledAt = getBookingScheduledDateTime(request);
            const driverFee = Number(request.pricing?.driverFee || 0);
            const estimatedKm = driverFee > 0 ? driverFee / 500 : null;

            // Check various states for this request
            const isExpired = isRequestExpired(request);
            const canAccept = canAcceptRequest(request); // TODAY-ONLY RULE
            const now = new Date();
            const isToday = scheduledAt && isSameDay(scheduledAt, now);
            const isUpcoming = scheduledAt && scheduledAt > now;

            return (
              <li key={`request-${request._id}`} className="list-item">
                <div>
                  <strong>{request.bookingId || request._id}</strong>
                  <p style={{ margin: "0.2rem 0" }}>
                    Pickup {request.pickupLocation?.address || request.pickupLocation?.city || "TBC"}
                  </p>
                  <p style={{ margin: "0 0 0.25rem" }}>
                    Scheduled {formatDateTime(scheduledAt) || "Pending"}
                    {/* Visual indicators for request timing */}
                    {isToday && <span style={{ color: "#f59e0b", marginLeft: "0.5rem" }}>(Today)</span>}
                    {isUpcoming && !isToday && <span style={{ color: "#10b981", marginLeft: "0.5rem" }}>(Upcoming)</span>}
                    {isExpired && <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>(Expired)</span>}
                    {/* Show when request is not available for acceptance today */}
                    {!canAccept && !isExpired && !isToday && <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>(Not available today)</span>}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {request.dropoffLocation?.address && (
                      <span className="tag">Drop-off: {request.dropoffLocation.address}</span>
                    )}
                    {driverFee > 0 && (
                      <span className="tag">Driver fee {formatCurrency(driverFee)}</span>
                    )}
                    {estimatedKm && (
                      <span className="tag">Approx {estimatedKm.toFixed(1)} km</span>
                    )}
                    {scheduledAt && (
                      <span className="tag">
                        {isToday ? "Today" : scheduledAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                {/* 
                  Accept button logic:
                  - Disabled if request is expired (past + 2 hours)
                  - Disabled if request is not scheduled for today (!canAccept)
                  - Shows appropriate button text and tooltip
                */}
                <button
                  className="btn"
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
                        ? "Not Today" // Clear indication this is not available today
                        : "Accept"
                  }
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

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

      // FILTER 1: Remove requests that are scheduled for past dates
      // This happens at the data loading level to reduce unnecessary data
      const now = new Date();
      const filteredRequests = (Array.isArray(data) ? data : []).filter((request) => {
        const scheduledAt = getBookingScheduledDateTime(request);
        if (!scheduledAt) {
          // Include requests without scheduled time (pending scheduling)
          return true;
        }

        // Only include requests scheduled for today or future
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

    // VALIDATION: Server-side check before accepting the request
    // Find the request to validate its scheduled date
    const request = availableRequests.find(req => req._id === bookingId);
    if (request) {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (scheduledAt) {
        const now = new Date();

        // Define TODAY boundaries for validation
        const today = new Date(now);
        today.setHours(0, 0, 0, 0); // Start of today

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        // VALIDATION 1: Check if request is for a past date
        if (scheduledAt < today) {
          alert("Cannot accept requests for past dates. Please refresh the list.");
          await loadAvailableRequests(); // Refresh to remove expired requests
          return;
        }

        // VALIDATION 2: MAIN BUSINESS RULE - Only allow TODAY's requests
        if (scheduledAt >= tomorrow) {
          alert("Can only accept requests scheduled for today. Please wait until the trip date.");
          return;
        }

        // VALIDATION 3: Check if request has expired (2+ hours past scheduled time)
        const expiryTime = new Date(scheduledAt.getTime() + (2 * 60 * 60 * 1000));
        if (now > expiryTime) {
          alert("This request has expired and can no longer be accepted.");
          await loadAvailableRequests(); // Refresh to remove expired requests
          return;
        }
      }
    }

    // If all validations pass, proceed with acceptance
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

    // METRICS: Only count upcoming requests (not past ones)
    // Apply the same TODAY-ONLY filter to metrics
    const upcomingRequests = availableRequests.filter((request) => {
      const scheduledAt = getBookingScheduledDateTime(request);
      if (!scheduledAt) return true; // Include unscheduled

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

    // OVERVIEW CARDS: Only count upcoming requests with same TODAY filter
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
        hint: "Ready to accept (upcoming only)", // Updated hint to clarify filtering
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
    <div className="driver-dashboard">
      <DriverNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="driver-main">
        <DriverHero activeTab={activeTab} user={user} metrics={heroMetrics} />

        {activeTab === "overview" && (
          <>
            <section className="driver-highlight-grid" aria-label="Key driver metrics">
              {overviewCards.map((card) => (
                <article key={card.title} className="driver-highlight-card">
                  <p className="driver-highlight-label">{card.title}</p>
                  <p className="driver-highlight-value">{card.value}</p>
                  <p className="driver-highlight-hint">{card.hint}</p>
                </article>
              ))}
            </section>

            <div className="driver-grid driver-grid--balanced">
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

            <div className="driver-grid driver-grid--balanced">
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
          <div className="driver-grid driver-grid--balanced">
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

        {activeTab === "feedback" && <FeedbackPanel driverId={user?._id} />}

        {activeTab === "profile" && (
          <ProfileManagement userId={user?._id} initialUser={user} onUserUpdated={setUser} />
        )}

      </main>
    </div>
  );
}

export default DriverDashboard;
