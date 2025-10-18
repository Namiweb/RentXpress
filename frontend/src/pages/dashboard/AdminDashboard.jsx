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
  const variantStyles = {
    primary: "bg-neutral-800 border-neutral-700",
    accent: "bg-gradient-to-r from-[#FF5A00] to-orange-600 border-[#FF5A00]"
  };

  return (
    <div className={`rounded-xl border p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${variantStyles[variant]}`}>
      <span className="text-gray-400 text-sm font-medium block mb-2">{label}</span>
      <strong className="text-white text-2xl font-bold block mb-2">
        {loading ? (
          <div className="h-8 bg-neutral-700 rounded animate-pulse"></div>
        ) : (
          value
        )}
      </strong>
      {helper && <span className="text-gray-500 text-sm">{helper}</span>}
    </div>
  );
}

function OverviewSection({ metrics, currency, onRefresh, isLoading }) {
  return (
    <section className="bg-neutral-800 rounded-2xl border border-neutral-700 shadow-lg mb-6">
      <div className="flex items-center justify-between p-6 border-b border-neutral-700">
        <div>
          <h3 className="text-2xl font-bold text-white">Overview</h3>
          <p className="text-gray-400 mt-1">Key indicators across the platform</p>
        </div>
        <button 
          className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
          type="button" 
          onClick={onRefresh} 
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>Refresh</span>
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <OverviewCard
            label="Total Earnings"
            value={formatCurrency(metrics.earnings, currency)}
            // helper={`Driver payouts: ${formatCurrency(metrics.payouts, currency)}`}
            loading={isLoading}
            variant="accent"
          />
        </div>
      </div>
    </section>
  );
}

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
    <div className="min-h-screen bg-neutral-900 text-white flex">
      <AdminNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 p-8 overflow-auto">
        {/* Background Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-[#FF5A00] rounded-full blur-3xl opacity-5"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#FF5A00] rounded-full blur-2xl opacity-3"></div>
        </div>

        <div className="relative z-10">
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
  );
}

export default AdminDashboard;