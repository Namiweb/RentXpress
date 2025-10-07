import { useMemo, useState } from "react";
import { apiRequest } from "../../services/api";
import { formatDate } from "../../utils/formatDate";
import { getUserName } from "../../utils/getUserName";
import StatusPill from "../StatusPill";

const BOOKING_STATUSES = ["pending", "completed", "cancelled"];

const BookingManagementPanel = ({
  bookings = [],
  vehicles = [],
  users = [],
  isLoading,
  error,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  const vehicleMap = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => {
      map.set(vehicle._id, vehicle);
    });
    return map;
  }, [vehicles]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      map.set(user._id, user);
    });
    return map;
  }, [users]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bookings
      .filter((booking) =>
        statusFilter === "all" ? true : booking.status === statusFilter
      )
      .filter((booking) => {
        if (!term) return true;
        const vehicle = vehicleMap.get(booking.vehicleId);
        const customer = userMap.get(booking.customerId);
        const haystack = [
          booking.bookingId,
          booking.status,
          vehicle?.basicInfo?.make,
          vehicle?.basicInfo?.model,
          vehicle?.basicInfo?.licensePlate,
          customer?.email,
          customer?.profile?.firstName,
          customer?.profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [bookings, statusFilter, searchTerm, vehicleMap, userMap]);

  const handleStatusDraftChange = (bookingId, newStatus) => {
    setStatusDrafts((prev) => ({ ...prev, [bookingId]: newStatus }));
  };

  const handleStatusUpdate = async (booking) => {
    const desiredStatus = statusDrafts[booking._id] || booking.status;
    if (!desiredStatus || desiredStatus === booking.status) return;

    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/Bookings/${booking._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: desiredStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update booking");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    if (booking.status === "cancelled") return;
    const confirmCancel = window.confirm(
      `Cancel booking ${booking.bookingId}?`
    );
    if (!confirmCancel) return;

    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/Bookings/${booking._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel booking");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Booking Management</h3>
          <p className="panel-subtitle">
            Monitor trips, adjust statuses, and handle cancellations.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          Refresh
        </button>
      </header>
      <div className="filter-grid">
        <input
          className="input-control"
          type="search"
          placeholder="Search bookings"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="input-control"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {BOOKING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      {isLoading ? (
        <p>Loading bookings…</p>
      ) : filteredBookings.length === 0 ? (
        <p>No bookings match your filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="management-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const customer = userMap.get(booking.customerId);
                const vehicle = vehicleMap.get(booking.vehicleId);
                const start = booking.bookingDetails?.startDate
                  ? new Date(
                      booking.bookingDetails.startDate
                    ).toLocaleDateString()
                  : "-";
                const end = booking.bookingDetails?.endDate
                  ? new Date(
                      booking.bookingDetails.endDate
                    ).toLocaleDateString()
                  : "-";
                return (
                  <tr key={booking._id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{booking.bookingId}</strong>
                        <span className="muted">
                          Created: {formatDate(booking.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>{getUserName(customer)}</span>
                        <span className="muted">{customer?.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>
                          {vehicle?.basicInfo?.make} {vehicle?.basicInfo?.model}
                        </span>
                        <span className="muted">
                          {vehicle?.basicInfo?.licensePlate ||
                            vehicle?.vehicleId}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>
                          {start} → {end}
                        </span>
                        <span className="muted">
                          {booking.bookingDetails?.totalDays || 0} day(s)
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusPill value={booking.status} />
                    </td>
                    <td>
                      <div className="row-inline">
                        <select
                          className="input-control"
                          value={statusDrafts[booking._id] || booking.status}
                          onChange={(event) =>
                            handleStatusDraftChange(
                              booking._id,
                              event.target.value
                            )
                          }
                        >
                          {BOOKING_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusUpdate(booking)}
                        >
                          {isUpdating ? "Saving…" : "Update"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => handleCancelBooking(booking)}
                          disabled={
                            isUpdating || booking.status === "cancelled"
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default BookingManagementPanel;