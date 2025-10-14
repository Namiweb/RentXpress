import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import VehicleOwnerNavigation from "./vehicle-owner/components/VehicleOwnerNavigation.jsx";
import OverviewPage from "./vehicle-owner/components/OverviewPage.jsx";
import VehiclesPage from "./vehicle-owner/components/VehiclesPage.jsx";
import BookingsPage from "./vehicle-owner/components/BookingsPage.jsx";
import FinancePage from "./vehicle-owner/components/FinancePage.jsx";
import VehicleFormModal from "./vehicle-owner/components/VehicleFormModal.jsx";
import FeedbackModal from "./vehicle-owner/components/FeedbackModal.jsx";


const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "started", "in_progress", "in-progress"]);

const inspectionStatusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  available: "Approved",
  needs_maintenance: "Needs Maintenance",
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

function VehicleOwnerDashboard() {
  const { user, logout } = useAuth();
  const ownerId = normalizeId(user?._id);

  // Main state
  const [activeTab, setActiveTab] = useState("overview");
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingState, setLoadingState] = useState({
    vehicles: false,
    bookings: false,
    payments: false,
    feedbacks: false,
  });
  const [error, setError] = useState("");
  
  // Modal states
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    if (!ownerId) return;

    let isMounted = true;

    const loadData = async () => {
      setError("");
      setLoadingState({
        vehicles: true,
        bookings: true,
        payments: true,
        feedbacks: true,
      });

      try {
        const vehiclesResponse = await apiRequest(`/vehicles?ownerId=${ownerId}`);
        const vehiclesJson = await vehiclesResponse.json();
        if (!vehiclesResponse.ok) {
          throw new Error(vehiclesJson.message || "Failed to load vehicles");
        }

        const ownedVehicles = vehiclesJson.filter((vehicle) => normalizeId(vehicle.ownerId) === ownerId);
        const ownedVehicleIds = new Set(ownedVehicles.map((vehicle) => normalizeId(vehicle._id)));

        const [bookingsResponse, paymentsResponse, feedbackResponse] = await Promise.all([
          apiRequest("/Bookings"),
          apiRequest("/payments"),
          apiRequest("/feedbacks"),
        ]);

        const [bookingsJson, paymentsJson, feedbackJson] = await Promise.all([
          bookingsResponse.json(),
          paymentsResponse.json(),
          feedbackResponse.json(),
        ]);

        if (!bookingsResponse.ok) {
          throw new Error(bookingsJson.message || "Failed to load bookings");
        }
        if (!paymentsResponse.ok) {
          throw new Error(paymentsJson.message || "Failed to load payments");
        }
        if (!feedbackResponse.ok) {
          throw new Error(feedbackJson.message || "Failed to load feedback");
        }

        if (!isMounted) return;

        const ownedBookings = bookingsJson.filter((booking) => ownedVehicleIds.has(normalizeId(booking.vehicleId)));
        const ownedBookingIds = new Set(ownedBookings.map((booking) => normalizeId(booking._id)));

        const relevantPayments = paymentsJson.filter((payment) => ownedBookingIds.has(normalizeId(payment.bookingId)));
        const relevantFeedbacks = feedbackJson.filter((feedback) => ownedBookingIds.has(normalizeId(feedback.bookingId)));

        setVehicles(ownedVehicles);
        setBookings(ownedBookings);
        setPayments(relevantPayments);
        setFeedbacks(relevantFeedbacks);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Something went wrong while loading data");
        }
      } finally {
        if (isMounted) {
          setLoadingState({
            vehicles: false,
            bookings: false,
            payments: false,
            feedbacks: false,
          });
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [ownerId, refreshKey]);

  const vehiclesMap = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle) => {
      map[normalizeId(vehicle._id)] = vehicle;
    });
    return map;
  }, [vehicles]);

  const bookingsMap = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      map[normalizeId(booking._id)] = booking;
    });
    return map;
  }, [bookings]);

  const bookingsByVehicle = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      const vehicleId = normalizeId(booking.vehicleId);
      if (!vehicleId) return;
      if (!map[vehicleId]) {
        map[vehicleId] = { active: 0, total: 0 };
      }
      map[vehicleId].total += 1;
      if (ACTIVE_BOOKING_STATUSES.has(booking.status)) {
        map[vehicleId].active += 1;
      }
    });
    return map;
  }, [bookings]);

  const pendingWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments]
  );
  const completedWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "completed"),
    [payments]
  );

  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Remove ${vehicle.basicInfo?.make || "vehicle"} from your fleet?`)) {
      return;
    }
    try {
      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete vehicle");
      }
      triggerRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (vehicle) => {
    if (vehicle.status !== "approved") {
      setError("Vehicle must be approved by an inspector before adjusting availability.");
      return;
    }
    const current = vehicle.availability?.isAvailable !== false;
    try {
      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "PUT",
        body: JSON.stringify({
          availability: {
            ...vehicle.availability,
            isAvailable: !current,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update availability");
      }
      triggerRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWithdrawalStatus = async (payment, status) => {
    try {
      const response = await apiRequest(`/payments/${payment._id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update payout");
      }
      setPayments((prev) =>
        prev.map((item) => (normalizeId(item._id) === normalizeId(payment._id) ? data : item))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  // Modal handlers
  const handleShowVehicleForm = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setShowVehicleForm(true);
  };

  const handleCloseVehicleForm = () => {
    setShowVehicleForm(false);
    setEditingVehicle(null);
  };

  const handleVehicleCreated = (newVehicle) => {
    triggerRefresh();
    handleCloseVehicleForm();
  };

  const handleVehicleUpdated = (updatedVehicle) => {
    triggerRefresh();
    handleCloseVehicleForm();
  };

  const handleShowFeedbackModal = () => {
    setShowFeedbackModal(true);
  };

  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
  };

  // Render page content based on active tab
  const renderPageContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewPage
            vehicles={vehicles}
            bookings={bookings}
            payments={payments}
            feedbacks={feedbacks}
            isLoading={loadingState}
            bookingsByVehicle={bookingsByVehicle}
          />
        );
      case "vehicles":
        return (
          <VehiclesPage
            vehicles={vehicles}
            bookingsByVehicle={bookingsByVehicle}
            isLoading={loadingState.vehicles}
            onEdit={handleShowVehicleForm}
            onDelete={handleDeleteVehicle}
            onToggleAvailability={handleToggleAvailability}
            onShowVehicleForm={() => handleShowVehicleForm()}
            onShowFeedbackModal={handleShowFeedbackModal}
          />
        );
      case "bookings":
        return (
          <BookingsPage
            bookings={bookings}
            vehiclesMap={vehiclesMap}
            isLoading={loadingState.bookings}
          />
        );
      case "finance":
        return (
          <FinancePage
            payments={payments}
            isLoading={loadingState.payments}
            onUpdatePaymentStatus={handleWithdrawalStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar Navigation */}
      <VehicleOwnerNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        padding: '2rem',
        minHeight: '100vh'
      }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {renderPageContent()}
      </main>

      {/* Modals */}
      {showVehicleForm && (
        <VehicleFormModal
          ownerId={ownerId}
          vehicle={editingVehicle}
          onClose={handleCloseVehicleForm}
          onVehicleCreated={handleVehicleCreated}
          onVehicleUpdated={handleVehicleUpdated}
        />
      )}

      {showFeedbackModal && (
        <FeedbackModal
          feedbacks={feedbacks}
          bookingsMap={bookingsMap}
          vehiclesMap={vehiclesMap}
          isLoading={loadingState.feedbacks}
          onClose={handleCloseFeedbackModal}
        />
      )}
    </div>
  );
}

export default VehicleOwnerDashboard;