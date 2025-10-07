import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import FinancialManagementPanel from "../../Components/FinancialManagementPanel";
import PaymentsManagementPanel from "../../Components/AdminManagementComponents/PaymentsManagementPanel.jsx";
import BookingManagementPanel from "../../Components/AdminManagementComponents/BookingManagementPanel.jsx";
import VehicleManagementPanel from "../../Components/AdminManagementComponents/VehicleManagementPanel.jsx";
import UserManagementPanel from "../../Components/AdminManagementComponents/UserManagementPanel.jsx";
import AnnouncementManagementPanel from "../../Components/AdminManagementComponents/AnnouncementManagementPanel.jsx";
import AdminNavigation from "../../Components/AdminManagementComponents/AdminSidebar.jsx";

const DEFAULT_CURRENCY = "LKR";

function useCollection(endpoint) {
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCollection = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiRequest(endpoint);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || `Failed to load ${endpoint}`);
      }
      setCollection(Array.isArray(payload) ? payload : [payload]);
      return payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchCollection().catch(() => {});
  }, [fetchCollection]);

  return {
    data: collection,
    isLoading,
    error,
    refresh: fetchCollection,
    setData: setCollection,
    setError,
  };
}

function formatNumber(value) {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

function formatCurrency(value, currency = DEFAULT_CURRENCY) {
  if (value === undefined || value === null) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

function OverviewCard({ label, value, helper, loading, variant = "primary" }) {
  return (
    <div className={`metric-card metric-card--${variant}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{loading ? "…" : value}</strong>
      {helper && <span className="metric-helper">{helper}</span>}
    </div>
  );
}

function OverviewSection({ metrics, currency, onRefresh, isLoading }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Overview</h3>
          <p className="panel-subtitle">Key indicators across the platform.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </header>
      <div className="metrics-grid">
        <OverviewCard
          label="Total Users"
          value={formatNumber(metrics.users)}
          helper={`Pending approvals: ${formatNumber(metrics.pendingUsers)}`}
          loading={isLoading}
        />
        <OverviewCard
          label="Vehicles"
          value={formatNumber(metrics.vehicles)}
          helper={`Awaiting review: ${formatNumber(metrics.pendingVehicles)}`}
          loading={isLoading}
        />
        <OverviewCard
          label="Bookings"
          value={formatNumber(metrics.bookings)}
          helper={`Active trips: ${formatNumber(metrics.activeBookings)}`}
          loading={isLoading}
        />
        {/* <OverviewCard
          label="Total Earnings"
          value={formatCurrency(metrics.earnings, currency)}
          // helper={`Driver payouts: ${formatCurrency(metrics.payouts, currency)}`}
          loading={isLoading}
          variant="accent"
        /> */}
      </div>
    </section>
  );
}

// function AdvertisementForm({ adminId, onCreated }) {
//   const [formData, setFormData] = useState({
//     title: "",
//     description: "",
//     isActive: true,
//   });
//   const [error, setError] = useState("");

//   const handleChange = (event) => {
//     const { name, value, type, checked } = event.target;
//     setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     try {
//       const response = await apiRequest("/advertisements", {
//         method: "POST",
//         body: JSON.stringify({
//           adId: `ADV${Date.now().toString().slice(-6)}`,
//           createdBy: adminId,
//           title: formData.title,
//           description: formData.description,
//           isActive: formData.isActive,
//         }),
//       });
//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.message || "Failed to create advertisement");
//       }
//       setFormData({ title: "", description: "", isActive: true });
//       onCreated?.();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <form className="form-panel" onSubmit={handleSubmit}>
//       <h3>Create Advertisement</h3>
//       <label>
//         Title
//         <input name="title" value={formData.title} onChange={handleChange} required className="input-control" />
//       </label>
//       <label>
//         Description
//         <textarea
//           name="description"
//           value={formData.description}
//           onChange={handleChange}
//           rows={3}
//           className="input-control"
//         />
//       </label>
//       <label className="checkbox">
//         <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
//         Active
//       </label>
//       {error && <p className="error-text">{error}</p>}
//       <button className="btn" type="submit">
//         Create
//       </button>
//     </form>
//   );
// }

function AdminDashboard() {
  const { user, logout } = useAuth();

  const lastTab = localStorage.getItem("activeTab") || "dashboard";
  const [activeTab, setActiveTab] = useState(lastTab);

  const usersResource = useCollection("/users");
  const vehiclesResource = useCollection("/vehicles");
  const bookingsResource = useCollection("/Bookings");
  const paymentsResource = useCollection("/payments");
  const payoutsResource = useCollection("/driver-payments");

  const { refresh: refreshUsers } = usersResource;
  const { refresh: refreshVehicles } = vehiclesResource;
  const { refresh: refreshBookings } = bookingsResource;
  const { refresh: refreshPayments } = paymentsResource;
  const { refresh: refreshPayouts } = payoutsResource;

  const metrics = useMemo(() => {
    const pendingUsers = usersResource.data.filter((record) => record.status === "pending_verification").length;
    const pendingVehicles = vehiclesResource.data.filter((vehicle) => vehicle.status === "pending").length;
    const activeBookings = bookingsResource.data.filter(
      (booking) => booking.status !== "completed" && booking.status !== "cancelled"
    ).length;
    const totalEarnings = paymentsResource.data
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalPayouts = payoutsResource.data
      .filter((payout) => payout.status === "completed")
      .reduce((sum, payout) => sum + (payout.amount || 0), 0);

    return {
      users: usersResource.data.length,
      vehicles: vehiclesResource.data.length,
      bookings: bookingsResource.data.length,
      earnings: totalEarnings,
      payouts: totalPayouts,
      pendingUsers,
      pendingVehicles,
      activeBookings,
    };
  }, [usersResource.data, vehiclesResource.data, bookingsResource.data, paymentsResource.data, payoutsResource.data]);

  const overviewLoading =
    usersResource.isLoading ||
    vehiclesResource.isLoading ||
    bookingsResource.isLoading ||
    paymentsResource.isLoading ||
    payoutsResource.isLoading;

  const currency = paymentsResource.data.find((payment) => payment.currency)?.currency || DEFAULT_CURRENCY;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshUsers(),
      refreshVehicles(),
      refreshBookings(),
      refreshPayments(),
      refreshPayouts(),
    ]);
  }, [refreshUsers, refreshVehicles, refreshBookings, refreshPayments, refreshPayouts]);

  return (
    <>
      <div className="flex flex-row gap-2 max-h-screen">
        <AdminNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          onLogout={logout}
        />

        <main className="customer-main">
          <div className="panel-stack">
            {activeTab === "dashboard" && (
              <>
                <OverviewSection
                  metrics={metrics}
                  currency={currency}
                  onRefresh={refreshAll}
                  isLoading={overviewLoading}
                />
                <FinancialManagementPanel />
              </>
            )}

            {/* <div className="admin-panels">
              <AdvertisementForm adminId={user?._id} />
            </div> */}

            {activeTab === "announcements" && (
              <AnnouncementManagementPanel adminId={user?._id} />
            )}

            {activeTab === "vehicles" && (
              <VehicleManagementPanel
                vehicles={vehiclesResource.data}
                owners={usersResource.data}
                isLoading={vehiclesResource.isLoading}
                error={vehiclesResource.error}
                onRefresh={refreshVehicles}
              />
            )}

            {activeTab === "users" && (
              <UserManagementPanel
                users={usersResource.data}
                isLoading={usersResource.isLoading}
                error={usersResource.error}
                onRefresh={refreshUsers}
              />
            )}

            {activeTab === "bookings" && (
              <BookingManagementPanel
                bookings={bookingsResource.data}
                vehicles={vehiclesResource.data}
                users={usersResource.data}
                isLoading={bookingsResource.isLoading}
                error={bookingsResource.error}
                onRefresh={refreshBookings}
              />
            )}

            {activeTab === "payments" && (
              <PaymentsManagementPanel
                payments={paymentsResource.data}
                payouts={payoutsResource.data}
                paymentsLoading={paymentsResource.isLoading}
                payoutsLoading={payoutsResource.isLoading}
                paymentsError={paymentsResource.error}
                payoutsError={payoutsResource.error}
                onRefresh={async () => {
                  await Promise.all([refreshPayments()]);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default AdminDashboard;