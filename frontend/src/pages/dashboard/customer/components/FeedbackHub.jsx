import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MessageSquareIcon, StarIcon, DownloadIcon, EditIcon, TrashIcon } from "lucide-react";

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
    if (rating == null) return <span className="text-neutral-400">N/A</span>;
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            size={16}
            className={`${
              index < rating 
                ? "text-yellow-400 fill-yellow-400" 
                : "text-neutral-600"
            }`}
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
    <section className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Feedback Center</h2>
          <p className="text-neutral-300">Review what you have shared and leave ratings for finished bookings.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            className="flex items-center gap-2 bg-neutral-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg border border-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDownloadReport}
            disabled={submittedCount === 0}
          >
            <DownloadIcon size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {submittedCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Total Feedback</div>
            <div className="text-white font-semibold text-xl">{submittedCount}</div>
          </div>
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Overall Rating</div>
            <div className="text-white font-semibold text-xl">{computeSummary.overall}/5</div>
          </div>
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Vehicle Rating</div>
            <div className="text-white font-semibold text-xl">{computeSummary.vehicle}/5</div>
          </div>
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Service Rating</div>
            <div className="text-white font-semibold text-xl">{computeSummary.service}/5</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-600 mb-6">
        <button
          type="button"
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "submitted" 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "text-neutral-400 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("submitted")}
        >
          Submitted Feedback ({submittedCount})
        </button>
        <button
          type="button"
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "eligible" 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "text-neutral-400 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("eligible")}
        >
          Awaiting Feedback ({feedbackEligibleBookings.length})
        </button>
      </div>

      {/* Submitted Feedback Tab */}
      {activeTab === "submitted" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {feedbacks.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-neutral-700 rounded-lg">
              <MessageSquareIcon size={48} className="text-neutral-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-white mb-2">No feedback yet</h3>
              <p className="text-neutral-400">Once you complete a trip you can share how it went.</p>
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
                <article key={feedback._id} className="bg-neutral-700 rounded-lg p-5 border border-neutral-600 hover:border-neutral-500 transition-colors">
                  {/* Header */}
                  <header className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg mb-1">{vehicleName || "Vehicle"}</h3>
                      {tripLabel && <p className="text-neutral-400 text-sm">{tripLabel}</p>}
                      {feedback.feedbackId && (
                        <p className="text-neutral-500 text-xs font-mono mt-1">Ref: {feedback.feedbackId}</p>
                      )}
                    </div>
                    <span className="bg-purple-800 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {overallRating}/5
                    </span>
                  </header>

                  {/* Ratings */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-neutral-400 text-sm mb-1">Vehicle</p>
                      {renderStars(feedback.ratings?.vehicleRating)}
                    </div>
                    <div>
                      <p className="text-neutral-400 text-sm mb-1">Service</p>
                      {renderStars(feedback.ratings?.serviceRating)}
                    </div>
                    {showDriverRating && (
                      <div>
                        <p className="text-neutral-400 text-sm mb-1">Driver</p>
                        {renderStars(feedback.ratings?.driverRating)}
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {(feedback.comments?.vehicleComment || feedback.comments?.serviceComment) && (
                    <div className="mb-4 space-y-2">
                      {feedback.comments?.vehicleComment && (
                        <div className="bg-neutral-500 rounded px-3 py-2">
                          <p className="text-neutral-300 text-sm">
                            <span className="text-neutral-400 font-medium">Vehicle:</span> {feedback.comments.vehicleComment}
                          </p>
                        </div>
                      )}
                      {feedback.comments?.serviceComment && (
                        <div className="bg-neutral-500 rounded px-3 py-2">
                          <p className="text-neutral-300 text-sm">
                            <span className="text-neutral-400 font-medium">Service:</span> {feedback.comments.serviceComment}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {feedback.suggestions && (
                    <div className="mb-4 bg-neutral-500 rounded px-3 py-2">
                      <p className="text-neutral-300 text-sm">
                        <span className="text-neutral-400 font-medium">Suggestion:</span> {feedback.suggestions}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(onEditFeedback || onDeleteFeedback) && (
                    <footer className="flex justify-end gap-2 pt-4 border-t border-neutral-600">
                      {onEditFeedback && (
                        <button
                          type="button"
                          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                          onClick={() => onEditFeedback(feedback)}
                        >
                          <EditIcon size={16} />
                          Edit
                        </button>
                      )}
                      {onDeleteFeedback && (
                        <button
                          type="button"
                          className="flex items-center gap-2 bg-neutral-800 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                          onClick={() => onDeleteFeedback(feedback)}
                        >
                          <TrashIcon size={16} />
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

      {/* Eligible Bookings Tab */}
      {activeTab === "eligible" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {feedbackEligibleBookings.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-neutral-700 rounded-lg">
              <StarIcon size={48} className="text-neutral-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-white mb-2">You are all caught up</h3>
              <p className="text-neutral-400">Feedback has been shared for every completed trip.</p>
            </div>
          ) : (
            feedbackEligibleBookings.map((booking) => (
              <article key={booking._id} className="bg-neutral-700 rounded-lg p-5 border border-neutral-600 hover:border-neutral-500 transition-colors">
                <header className="mb-4">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {booking.bookingId || booking._id}
                  </h3>
                  <p className="text-neutral-400 text-sm">
                    {getBookingVehicleName(booking)}
                    {" · "}
                    {buildTripLabel(booking.bookingDetails?.startDate, booking.bookingDetails?.endDate) ||
                      "Dates pending"}
                  </p>
                </header>
                <button 
                  type="button" 
                  className="w-full bg-neutral-800 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors"
                  onClick={() => onOpenFeedback(booking)}
                >
                  Leave Feedback
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