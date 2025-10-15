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
    <section className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/40 p-6 backdrop-blur-sm">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-700/30">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Booking Management
          </h3>
          <p className="text-gray-400 mt-1 text-sm">
            Monitor trips, adjust statuses, and handle cancellations.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </header>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <input
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
            type="search"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <svg className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          className="px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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

      {/* Error Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {actionError}
          </p>
        </div>
      )}

      {/* Content Section */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-[#FF5A00] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading bookings…</span>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-700/50 rounded-lg">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400">No bookings match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-neutral-700/50 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/80 border-b border-neutral-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Booking</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
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
                    <tr key={booking._id} className="hover:bg-neutral-800/30 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <strong className="text-white font-medium">{booking.bookingId}</strong>
                          <span className="text-gray-400 text-sm mt-1">
                            Created: {formatDate(booking.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white">{getUserName(customer)}</span>
                          <span className="text-gray-400 text-sm mt-1">{customer?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {vehicle?.basicInfo?.make} {vehicle?.basicInfo?.model}
                          </span>
                          <span className="text-gray-400 text-sm mt-1">
                            {vehicle?.basicInfo?.licensePlate || vehicle?.vehicleId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {start} → {end}
                          </span>
                          <span className="text-gray-400 text-sm mt-1">
                            {booking.bookingDetails?.totalDays || 0} day(s)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill value={booking.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            className="px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                            className="px-3 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate(booking)}
                          >
                            {isUpdating ? "Saving…" : "Update"}
                          </button>
                          <button
                            className="px-3 py-2 bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/50 hover:border-red-500 text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
        </div>
      )}
    </section>
  );
}

export default BookingManagementPanel;