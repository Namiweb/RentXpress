import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MessageSquareIcon, StarIcon } from "lucide-react";

function FeedbackHub({
  feedbacks,
  feedbackEligibleBookings,
  getBookingVehicleName,
  formatDate,
  onOpenFeedback,
  bookingsMap = new Map(),
  onEditFeedback,
  onDeleteFeedback,
}) {
  const [activeTab, setActiveTab] = useState("submitted");
  const submittedCount = feedbacks.length;

  const renderStars = (rating) => {
    if (rating == null) return <span className="muted">N/A</span>;
    return (
      <div className="star-row">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            size={16}
            className={index < rating ? "star-row__icon star-row__icon--filled" : "star-row__icon"}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  };

  const resolveBooking = (feedback) => {
    if (!feedback) return undefined;
    const bookingId =
      typeof feedback.bookingId === "object"
        ? feedback.bookingId._id || feedback.bookingId.id
        : feedback.bookingId;
    if (!bookingId) return undefined;
    if (typeof bookingsMap?.get === "function") {
      return bookingsMap.get(String(bookingId));
    }
    if (bookingsMap && typeof bookingsMap === "object") {
      return bookingsMap[String(bookingId)];
    }
    return undefined;
  };

  const buildTripLabel = (start, end) => {
    const startLabel = start ? formatDate(start) : null;
    const endLabel = end ? formatDate(end) : null;
    if (!startLabel && !endLabel) return null;
    if (!endLabel || startLabel === endLabel) {
      return startLabel || endLabel;
    }
    return `${startLabel || "TBC"} – ${endLabel || "TBC"}`;
  };

  const computeSummary = useMemo(() => {
    if (!submittedCount) {
      return { overall: 0, vehicle: 0, service: 0, driver: 0 };
    }

    const totals = feedbacks.reduce(
      (acc, feedback) => {
        const { overallRating, vehicleRating, serviceRating, driverRating } = feedback.ratings || {};
        if (overallRating) {
          acc.overall.sum += Number(overallRating) || 0;
          acc.overall.count += 1;
        }
        if (vehicleRating) {
          acc.vehicle.sum += Number(vehicleRating) || 0;
          acc.vehicle.count += 1;
        }
        if (serviceRating) {
          acc.service.sum += Number(serviceRating) || 0;
          acc.service.count += 1;
        }
        if (driverRating) {
          acc.driver.sum += Number(driverRating) || 0;
          acc.driver.count += 1;
        }
        return acc;
      },
      {
        overall: { sum: 0, count: 0 },
        vehicle: { sum: 0, count: 0 },
        service: { sum: 0, count: 0 },
        driver: { sum: 0, count: 0 },
      }
    );

    const toAverage = (entry) => (entry.count ? Number(entry.sum / entry.count).toFixed(2) : "0.00");

    return {
      overall: toAverage(totals.overall),
      vehicle: toAverage(totals.vehicle),
      service: toAverage(totals.service),
      driver: toAverage(totals.driver),
    };
  }, [feedbacks, submittedCount]);

  const handleDownloadReport = () => {
    if (!submittedCount) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 48;
    const headerY = 60;
    const now = new Date();

    doc.setFontSize(18);
    doc.text("Feedback Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Entries: ${submittedCount}`, marginLeft, headerY + 35);
    doc.text(
      `Averages — Overall ${computeSummary.overall} · Vehicle ${computeSummary.vehicle} · Service ${computeSummary.service} · Driver ${computeSummary.driver}`,
      marginLeft,
      headerY + 50
    );

    const rows = feedbacks.map((feedback, index) => {
      const booking = resolveBooking(feedback);
      const vehicleName = getBookingVehicleName(
        booking || {
          _id: feedback.bookingId,
          bookingId: feedback.bookingId,
          vehicle: feedback.vehicle,
          vehicleId: feedback.vehicleId,
        }
      );
      const tripLabel = buildTripLabel(
        booking?.bookingDetails?.startDate || feedback.bookingDetails?.startDate,
        booking?.bookingDetails?.endDate || feedback.bookingDetails?.endDate
      );

      const cleanNotes = [
        feedback.comments?.vehicleComment,
        feedback.comments?.serviceComment,
        feedback.suggestions,
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" | ")
        .trim();

      return [
        index + 1,
        feedback.feedbackId || feedback._id,
        vehicleName || "Vehicle",
        tripLabel || "-",
        feedback.ratings?.overallRating ?? "-",
        feedback.ratings?.vehicleRating ?? "-",
        feedback.ratings?.serviceRating ?? "-",
        feedback.ratings?.driverRating ?? "-",
        cleanNotes || "-",
      ];
    });

    autoTable(doc, {
      startY: headerY + 80,
      head: [["#", "Feedback", "Vehicle", "Trip", "Overall", "Vehicle", "Service", "Driver", "Notes"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        4: { halign: "center", cellWidth: 70 },
        5: { halign: "center", cellWidth: 70 },
        6: { halign: "center", cellWidth: 70 },
        7: { halign: "center", cellWidth: 70 },
        8: { cellWidth: 220 },
      },
    });

    doc.save("feedback-report.pdf");
  };

  return (
    <section className="customer-panel">
      <div className="panel-header">
        <div>
          <h2>Feedback center</h2>
          <p>Review what you have shared and leave ratings for finished bookings.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadReport}
            disabled={submittedCount === 0}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={activeTab === "submitted" ? "tab is-active" : "tab"}
          onClick={() => setActiveTab("submitted")}
        >
          Submitted feedback
        </button>
        <button
          type="button"
          className={activeTab === "eligible" ? "tab is-active" : "tab"}
          onClick={() => setActiveTab("eligible")}
        >
          Awaiting feedback
        </button>
      </div>

      {activeTab === "submitted" && (
        <div className="feedback-grid">
          {feedbacks.length === 0 ? (
            <div className="empty-state">
              <MessageSquareIcon size={48} aria-hidden="true" />
              <h3>No feedback yet</h3>
              <p className="muted">Once you complete a trip you can share how it went.</p>
            </div>
          ) : (
            feedbacks.map((feedback) => {
              const booking = resolveBooking(feedback);
              const vehicleName = getBookingVehicleName(
                booking || {
                  _id: feedback.bookingId,
                  bookingId: feedback.bookingId,
                  vehicle: feedback.vehicle,
                  vehicleId: feedback.vehicleId,
                },
              );
              const tripLabel = buildTripLabel(
                booking?.bookingDetails?.startDate || feedback.bookingDetails?.startDate,
                booking?.bookingDetails?.endDate || feedback.bookingDetails?.endDate,
              );
              const overallRating = feedback.ratings?.overallRating ?? "-";
              const showDriverRating = Boolean(
                booking?.driverRequested ||
                  booking?.driverId ||
                  feedback.ratings?.driverRating != null,
              );

              return (
                <article key={feedback._id} className="feedback-card">
                  <header>
                    <div>
                      <h3>{vehicleName || "Vehicle"}</h3>
                      {tripLabel && <p className="muted">{tripLabel}</p>}
                      {feedback.feedbackId && <p className="muted">Ref: {feedback.feedbackId}</p>}
                    </div>
                    <span className="feedback-card__overall">{overallRating}/5</span>
                  </header>

                  <div className="feedback-card__ratings">
                    <div>
                      <p>Vehicle</p>
                      {renderStars(feedback.ratings?.vehicleRating)}
                    </div>
                    <div>
                      <p>Service</p>
                      {renderStars(feedback.ratings?.serviceRating)}
                    </div>
                    {showDriverRating && (
                      <div>
                        <p>Driver</p>
                        {renderStars(feedback.ratings?.driverRating)}
                      </div>
                    )}
                  </div>

                  {(feedback.comments?.vehicleComment || feedback.comments?.serviceComment) && (
                    <div className="feedback-card__comments">
                      {feedback.comments?.vehicleComment && (
                        <p>
                          <span className="muted">Vehicle:</span> {feedback.comments.vehicleComment}
                        </p>
                      )}
                      {feedback.comments?.serviceComment && (
                        <p>
                          <span className="muted">Service:</span> {feedback.comments.serviceComment}
                        </p>
                      )}
                    </div>
                  )}

                  {feedback.suggestions && (
                    <p className="feedback-card__suggestion">{feedback.suggestions}</p>
                  )}

                  {(onEditFeedback || onDeleteFeedback) && (
                    <footer
                      className="feedback-card__actions"
                      style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}
                    >
                      {onEditFeedback && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onEditFeedback(feedback)}
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteFeedback && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ background: "#dc2626", color: "#fff" }}
                          onClick={() => onDeleteFeedback(feedback)}
                        >
                          Delete
                        </button>
                      )}
                    </footer>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {activeTab === "eligible" && (
        <div className="feedback-grid">
          {feedbackEligibleBookings.length === 0 ? (
            <div className="empty-state">
              <StarIcon size={48} aria-hidden="true" />
              <h3>You are all caught up</h3>
              <p className="muted">Feedback has been shared for every completed trip.</p>
            </div>
          ) : (
            feedbackEligibleBookings.map((booking) => (
              <article key={booking._id} className="feedback-card">
                <header>
                  <div>
                    <h3>{booking.bookingId || booking._id}</h3>
                    <p className="muted">
                      {getBookingVehicleName(booking)}{" · "}
                      {buildTripLabel(booking.bookingDetails?.startDate, booking.bookingDetails?.endDate) ||
                        "Dates pending"}
                    </p>
                  </div>
                </header>
                <button type="button" className="btn" onClick={() => onOpenFeedback(booking)}>
                  Leave feedback
                </button>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default FeedbackHub;
