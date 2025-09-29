import { useMemo, useState } from "react";
import { AlertCircleIcon, CalendarIcon, CheckCircleIcon, ClockIcon, MapPinIcon, StarIcon, XCircleIcon } from "lucide-react";

const STATUS_META = {
  confirmed: { className: "status-chip status-chip--success", icon: CheckCircleIcon },
  completed: { className: "status-chip status-chip--info", icon: CheckCircleIcon },
  cancelled: { className: "status-chip status-chip--danger", icon: XCircleIcon },
  pending: { className: "status-chip status-chip--warning", icon: AlertCircleIcon },
};

function BookingsOverview({
  upcomingBookings,
  historicalBookings,
  feedbacks,
  onCancelBooking,
  onOpenFeedback,
  onSelectBooking,
  getBookingVehicleName,
  formatDate,
  formatTime,
}) {
  const [activeTab, setActiveTab] = useState("upcoming");

  const list = activeTab === "upcoming" ? upcomingBookings : historicalBookings;

  const feedbackSet = useMemo(
    () => new Set(feedbacks.map((item) => String(item.bookingId))),
    [feedbacks],
  );

  return (
    <section className="customer-panel">
      <div className="panel-header">
        <div>
          <h2>Your bookings</h2>
          <p>Keep track of upcoming trips and revisit completed adventures.</p>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={activeTab === "upcoming" ? "tab is-active" : "tab"}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming
        </button>
        <button
          type="button"
          className={activeTab === "past" ? "tab is-active" : "tab"}
          onClick={() => setActiveTab("past")}
        >
          Past
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <CalendarIcon size={48} aria-hidden="true" />
          <h3>No {activeTab === "upcoming" ? "upcoming" : "past"} bookings</h3>
          <p className="muted">
            {activeTab === "upcoming"
              ? "Reserve a vehicle to see it appear here."
              : "Complete a trip and it will show up for quick reference."}
          </p>
        </div>
      ) : (
        <div className="booking-grid">
          {list.map((booking) => {
            const statusKey = booking.status?.toLowerCase() || "pending";
            const meta = STATUS_META[statusKey] || STATUS_META.pending;
            const StatusIcon = meta.icon;
            const feedbackGiven = feedbackSet.has(String(booking._id));

            return (
              <article key={booking._id} className="booking-card">
                <header className="booking-card__header">
                  <div>
                    <span className="booking-card__id">{booking.bookingId || booking._id}</span>
                    <h3>{getBookingVehicleName(booking)}</h3>
                  </div>
                  <span className={meta.className}>
                    <StatusIcon size={16} aria-hidden="true" />
                    {booking.status || "Pending"}
                  </span>
                </header>

                <div className="booking-card__body">
                  <div className="booking-info">
                    <div className="booking-info__line">
                      <CalendarIcon size={16} aria-hidden="true" />
                      <span>
                        {formatDate(booking.bookingDetails?.startDate)} – {formatDate(booking.bookingDetails?.endDate)}
                      </span>
                    </div>
                    {(booking.bookingDetails?.pickupTime || booking.bookingDetails?.returnTime) && (
                      <div className="booking-info__line">
                        <ClockIcon size={16} aria-hidden="true" />
                        <span>
                          Pickup {formatTime(booking.bookingDetails?.pickupTime)} · Return {formatTime(booking.bookingDetails?.returnTime)}
                        </span>
                      </div>
                    )}
                    {(booking.pickupLocation?.address || booking.pickupLocation?.city) && (
                      <div className="booking-info__line">
                        <MapPinIcon size={16} aria-hidden="true" />
                        <span>
                          {[
                            booking.pickupLocation?.address,
                            booking.pickupLocation?.city,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {booking.notes && <p className="booking-card__notes">“{booking.notes}”</p>}
                  </div>
                </div>

                <footer className="booking-card__footer">
                  <button type="button" className="btn-text" onClick={() => onSelectBooking(booking)}>
                    View details
                  </button>

                  <div className="booking-card__actions">
                    {activeTab === "upcoming" && statusKey === "confirmed" && (
                      <button
                        type="button"
                        className="btn-soft btn-soft--danger"
                        onClick={() => onCancelBooking(booking._id)}
                      >
                        Cancel booking
                      </button>
                    )}

                    {activeTab === "past" && statusKey === "completed" && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onOpenFeedback(booking)}
                        disabled={feedbackGiven}
                      >
                        {feedbackGiven ? "Feedback submitted" : "Leave feedback"}
                      </button>
                    )}

                    {activeTab === "past" && statusKey === "completed" && feedbackGiven && (
                      <span className="feedback-pill">
                        <StarIcon size={14} aria-hidden="true" />
                        Feedback submitted
                      </span>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BookingsOverview;
