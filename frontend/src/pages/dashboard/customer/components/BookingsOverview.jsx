import { useMemo, useState } from "react";
import { AlertCircleIcon, CalendarIcon, CheckCircleIcon, ClockIcon, MapPinIcon, StarIcon, XCircleIcon } from "lucide-react";

const STATUS_META = {
  confirmed: { 
    className: "bg-green-500 text-white", 
    icon: CheckCircleIcon,
    label: "Confirmed"
  },
  completed: { 
    className: "bg-green-700 text-white", 
    icon: CheckCircleIcon,
    label: "Completed"
  },
  cancelled: { 
    className: "bg-red-700 text-white", 
    icon: XCircleIcon,
    label: "Cancelled"
  },
  pending: { 
    className: "bg-yellow-500 text-black", 
    icon: AlertCircleIcon,
    label: "Pending"
  },
  started: { 
    className: "bg-orange-700 text-white", 
    icon: ClockIcon,
    label: "Started"
  },
  "in_progress": { 
    className: "bg-orange-500 text-white", 
    icon: ClockIcon,
    label: "In Progress"
  },
  "in-progress": { 
    className: "bg-orange-500 text-white", 
    icon: ClockIcon,
    label: "In Progress"
  },
  scheduled: { 
    className: "bg-purple-600 text-white", 
    icon: CalendarIcon,
    label: "Scheduled"
  },
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
    <section className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Bookings</h2>
          <p className="text-neutral-300">Keep track of upcoming trips and revisit completed adventures.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-600 mb-6">
        <button
          type="button"
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "upcoming" 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "text-neutral-400 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming
        </button>
        <button
          type="button"
          className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
            activeTab === "past" 
              ? "text-orange-500 border-b-2 border-orange-500" 
              : "text-neutral-400 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("past")}
        >
          Past
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 bg-neutral-700 rounded-lg">
          <CalendarIcon size={48} className="text-neutral-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No {activeTab === "upcoming" ? "upcoming" : "past"} bookings
          </h3>
          <p className="text-neutral-400 max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "Reserve a vehicle to see it appear here."
              : "Complete a trip and it will show up for quick reference."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {list.map((booking) => {
            const statusKey = booking.status?.toLowerCase() || "pending";
            const meta = STATUS_META[statusKey] || STATUS_META.pending;
            const StatusIcon = meta.icon;
            const feedbackGiven = feedbackSet.has(String(booking._id));

            return (
              <article key={booking._id} className="bg-neutral-700 rounded-lg p-5 shadow-md border border-neutral-600 hover:border-neutral-500 transition-colors">
                {/* Header */}
                <header className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-neutral-400 text-sm font-mono block mb-1">
                      {booking.bookingId || booking._id}
                    </span>
                    <h3 className="text-white font-semibold text-lg truncate">
                      {getBookingVehicleName(booking)}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
                    <StatusIcon size={14} aria-hidden="true" />
                    {meta.label}
                  </span>
                </header>

                {/* Body */}
                <div className="mb-4">
                  <div className="space-y-3">
                    {/* Dates */}
                    <div className="flex items-center gap-3">
                      <CalendarIcon size={16} className="text-neutral-400 flex-shrink-0" aria-hidden="true" />
                      <span className="text-neutral-300 text-sm">
                        {formatDate(booking.bookingDetails?.startDate)} – {formatDate(booking.bookingDetails?.endDate)}
                      </span>
                    </div>

                    {/* Times */}
                    {(booking.bookingDetails?.pickupTime || booking.bookingDetails?.returnTime) && (
                      <div className="flex items-center gap-3">
                        <ClockIcon size={16} className="text-neutral-400 flex-shrink-0" aria-hidden="true" />
                        <span className="text-neutral-300 text-sm">
                          Pickup {formatTime(booking.bookingDetails?.pickupTime)} · Return {formatTime(booking.bookingDetails?.returnTime)}
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    {(booking.pickupLocation?.address || booking.pickupLocation?.city) && (
                      <div className="flex items-center gap-3">
                        <MapPinIcon size={16} className="text-neutral-400 flex-shrink-0" aria-hidden="true" />
                        <span className="text-neutral-300 text-sm">
                          {[
                            booking.pickupLocation?.address,
                            booking.pickupLocation?.city,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="bg-neutral-600 rounded px-3 py-2 mt-2">
                        <p className="text-neutral-300 text-sm italic">"{booking.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <footer className="flex justify-between items-center pt-4 border-t border-neutral-600">
                  <button 
                    type="button" 
                    className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
                    onClick={() => onSelectBooking(booking)}
                  >
                    View details
                  </button>

                  <div className="flex items-center gap-3">
                    {activeTab === "upcoming" && ["confirmed", "scheduled", "pending"].includes(statusKey) && (
                      <button
                        type="button"
                        className="bg-neutral-800 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => onCancelBooking(booking._id)}
                      >
                        Cancel booking
                      </button>
                    )}

                    {activeTab === "past" && statusKey === "completed" && !feedbackGiven && (
                      <button
                        type="button"
                        className="bg-neutral-800 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => onOpenFeedback(booking)}
                      >
                        Leave feedback
                      </button>
                    )}

                    {activeTab === "past" && statusKey === "completed" && feedbackGiven && (
                      <span className="inline-flex items-center gap-1 bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
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