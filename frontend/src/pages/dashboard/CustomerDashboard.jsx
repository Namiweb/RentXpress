import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import CustomerNavigation from "./customer/components/CustomerNavigation.jsx";
import DashboardHero from "./customer/components/DashboardHero.jsx";
import AnnouncementsCarousel from "./customer/components/AnnouncementsCarousel.jsx";
import VehicleExplorer from "./customer/components/VehicleExplorer.jsx";
import BookingsOverview from "./customer/components/BookingsOverview.jsx";
import PaymentsOverview from "./customer/components/PaymentsOverview.jsx";
import FeedbackHub from "./customer/components/FeedbackHub.jsx";
import ProfilePreferences from "./customer/components/ProfilePreferences.jsx";

const VEHICLE_CATEGORIES = [
  { label: "All types", value: "" },
  { label: "Car", value: "car" },
  { label: "SUV", value: "suv" },
  { label: "Van", value: "van" },
  { label: "Truck", value: "truck" },
  { label: "Motorcycle", value: "motorcycle" },
];

const PAYMENT_METHODS = [
  { label: "Credit Card", value: "credit_card" },
  { label: "Debit Card", value: "debit_card" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Cash", value: "cash" },
];

const UPCOMING_BOOKING_STATUSES = new Set([
  "pending",
  "confirmed",
  "started",
  "in_progress",
  "in-progress",
  "scheduled",
]);

const initialBookingForm = {
  startDate: "",
  endDate: "",
  pickupTime: "",
  returnTime: "",
  reason: "",
  destination: "",
  expectedKm: "",
  withDriver: false,
};

const initialPaymentForm = {
  bookingId: "",
  amount: "",
  paymentMethod: "credit_card",
};

const initialFeedbackForm = {
  bookingId: "",
  vehicleRating: "",
  driverRating: "",
  serviceRating: "",
  overallRating: "",
  vehicleComment: "",
  serviceComment: "",
  suggestions: "",
  wouldRecommend: true,
};

function differenceInDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }
  const diff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  return diff;
}

function formatCurrency(value, currency = "LKR") {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":");
  if (hours === undefined || minutes === undefined) return "—";
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBC";
  return new Intl.DateTimeFormat("en-GB").format(date);
}

function getPickupDateTime(booking) {
  const startValue = booking?.bookingDetails?.startDate;
  if (!startValue) return null;

  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) return null;

  const pickupDateTime = new Date(startDate);
  const pickupTime = booking?.bookingDetails?.pickupTime;

  if (pickupTime && typeof pickupTime === "string") {
    const [hours, minutes] = pickupTime.split(":").map((part) => Number(part));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      pickupDateTime.setHours(hours, minutes, 0, 0);
      return pickupDateTime;
    }
  }

  pickupDateTime.setHours(23, 59, 59, 999);
  return pickupDateTime;
}

function deriveStatus(booking, now = Date.now()) {
  const status = booking.status?.toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  const pickupDateTime = getPickupDateTime(booking);
  if (pickupDateTime && pickupDateTime.getTime() <= now) {
    return "completed";
  }
  return status || "pending";
}

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

function CustomerDashboard() {
  const { user, logout, setUser } = useAuth();

  const [activeTab, setActiveTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleFilters, setVehicleFilters] = useState({
    search: "",
    category: "",
    minRate: "",
    maxRate: "",
    city: "",
  });

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingModal, setBookingModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [modalStage, setModalStage] = useState("booking");
  const [paymentContext, setPaymentContext] = useState(null);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [feedbackModalBooking, setFeedbackModalBooking] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    preferredVehicleType: user?.preferences?.preferredVehicleType || "car",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setProfileForm({
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        phoneNumber: user.profile.phoneNumber,
        dateOfBirth: user.profile.dateOfBirth?.slice(0, 10) || "",
        preferredVehicleType: user.preferences?.preferredVehicleType || "car",
      });
    }
  }, [user]);

  const reloadVehicles = useCallback(async () => {
    if (!user?._id) return;
    setVehiclesLoading(true);
    setVehicleError("");
    try {
      const response = await apiRequest("/vehicles");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load vehicles");
      }
      setVehicles(data);
    } catch (error) {
      setVehicleError(error.message);
    } finally {
      setVehiclesLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const fetchBookings = async () => {
      try {
        const response = await apiRequest("/Bookings");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load bookings");
        }
        setBookings(
          data.filter((booking) => String(booking.customerId) === String(user._id)),
        );
      } catch (error) {
        console.error("Failed to fetch bookings", error);
      }
    };

    const fetchPayments = async () => {
      try {
        const response = await apiRequest("/payments");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load payments");
        }
        setPayments(
          data.filter((payment) => String(payment.customerId) === String(user._id)),
        );
      } catch (error) {
        console.error("Failed to fetch payments", error);
      }
    };

    const fetchFeedbacks = async () => {
      try {
        const response = await apiRequest("/feedbacks");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load feedback");
        }
        setFeedbacks(
          data.filter((item) => String(item.customerId) === String(user._id)),
        );
      } catch (error) {
        console.error("Failed to fetch feedback", error);
      }
    };

    reloadVehicles();
    fetchBookings();
    fetchPayments();
    fetchFeedbacks();
  }, [user?._id, reloadVehicles]);

  const vehicleNameById = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => {
      const make = vehicle.basicInfo?.make;
      const model = vehicle.basicInfo?.model;
      const label = [make, model].filter(Boolean).join(" ").trim();
      const fallback = make || model || "Vehicle";
      map.set(String(vehicle._id), label || fallback);
    });
    return map;
  }, [vehicles]);

  const bookingsById = useMemo(() => {
    const map = new Map();
    bookings.forEach((booking) => {
      map.set(normalizeId(booking._id), booking);
    });
    return map;
  }, [bookings]);

  const getBookingVehicleName = useCallback(
    (booking) => {
      if (!booking) {
        return "Vehicle";
      }

      const populatedMake = booking.vehicle?.basicInfo?.make;
      const populatedModel = booking.vehicle?.basicInfo?.model;
      if (populatedMake || populatedModel) {
        const populatedLabel = [populatedMake, populatedModel]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (populatedLabel) {
          return populatedLabel;
        }
      }

      const bookingVehicleId =
        booking.vehicleId && typeof booking.vehicleId === "object"
          ? booking.vehicleId._id
          : booking.vehicleId;

      if (bookingVehicleId) {
        const nameFromMap = vehicleNameById.get(String(bookingVehicleId));
        if (nameFromMap) {
          return nameFromMap;
        }
      }

      return booking.bookingId || "Vehicle";
    },
    [vehicleNameById],
  );

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((vehicle) => vehicle.status === "approved" && vehicle.availability?.isAvailable !== false)
      .filter((vehicle) => {
        if (!vehicleFilters.category) return true;
        return (
          vehicle.details?.category?.toLowerCase() === vehicleFilters.category ||
          vehicle.details?.category?.toUpperCase() === vehicleFilters.category.toUpperCase()
        );
      })
      .filter((vehicle) => {
        if (!vehicleFilters.search) return true;
        const term = vehicleFilters.search.toLowerCase();
        return [
          vehicle.basicInfo?.make,
          vehicle.basicInfo?.model,
          vehicle.basicInfo?.licensePlate,
          vehicle.location?.city,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      })
      .filter((vehicle) => {
        if (!vehicleFilters.city) return true;
        return vehicle.location?.city?.toLowerCase?.().includes(vehicleFilters.city.toLowerCase());
      })
      .filter((vehicle) => {
        const dailyRate = vehicle.pricing?.dailyRate ?? 0;
        if (vehicleFilters.minRate && Number(dailyRate) < Number(vehicleFilters.minRate)) {
          return false;
        }
        if (vehicleFilters.maxRate && Number(dailyRate) > Number(vehicleFilters.maxRate)) {
          return false;
        }
        return true;
      });
  }, [vehicles, vehicleFilters]);

  const upcomingBookings = useMemo(() => {
    const now = Date.now();

    return bookings
      .filter((booking) => {
        const status = booking.status?.toLowerCase();
        if (!status || !UPCOMING_BOOKING_STATUSES.has(status)) {
          return false;
        }

        const pickupDateTime = getPickupDateTime(booking);
        if (!pickupDateTime) {
          return false;
        }

        return pickupDateTime.getTime() > now;
      })
      .sort((a, b) => {
        const aPickup = getPickupDateTime(a)?.getTime() ?? 0;
        const bPickup = getPickupDateTime(b)?.getTime() ?? 0;
        return aPickup - bPickup;
      });
  }, [bookings]);

  const historicalBookings = useMemo(() => {
    const now = Date.now();

    return bookings
      .map((booking) => ({
        ...booking,
        status: deriveStatus(booking, now),
      }))
      .filter((booking) => {
        const status = booking.status;
        if (!status) return false;
        if (status === "completed" || status === "cancelled") {
          return true;
        }
        const pickupDateTime = getPickupDateTime(booking);
        if (!pickupDateTime) {
          return false;
        }
        return pickupDateTime.getTime() <= now;
      })
      .sort(
        (a, b) =>
          new Date(b.bookingDetails?.startDate) - new Date(a.bookingDetails?.startDate),
      );
  }, [bookings]);

  const feedbackEligibleBookings = useMemo(() => {
    const now = Date.now();
    const feedbackBookingIds = new Set(feedbacks.map((item) => normalizeId(item.bookingId)));
    return bookings.filter((booking) => {
      const status = deriveStatus(booking, now);
      const bookingId = normalizeId(booking._id);
      return status === "completed" && !feedbackBookingIds.has(bookingId);
    });
  }, [bookings, feedbacks]);

  const isEditingFeedback = Boolean(editingFeedback);

  const canRateDriver = Boolean(
    feedbackModalBooking?.driverRequested ||
      feedbackModalBooking?.driverId ||
      (editingFeedback?.ratings?.driverRating != null),
  );

  const feedbackModalBookingIdLabel = feedbackModalBooking
    ? feedbackModalBooking.bookingId || feedbackModalBooking._id
    : "";
  const feedbackModalVehicleLabel = feedbackModalBooking
    ? getBookingVehicleName(feedbackModalBooking)
    : "";
  const feedbackTripStartLabel = feedbackModalBooking?.bookingDetails?.startDate
    ? formatDate(feedbackModalBooking.bookingDetails.startDate)
    : null;
  const feedbackTripEndLabel = feedbackModalBooking?.bookingDetails?.endDate
    ? formatDate(feedbackModalBooking.bookingDetails.endDate)
    : feedbackTripStartLabel;
  let feedbackTripWindow = null;
  if (feedbackTripStartLabel || feedbackTripEndLabel) {
    const startLabel = feedbackTripStartLabel || "TBC";
    const endLabel = feedbackTripEndLabel || startLabel;
    feedbackTripWindow = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  }
  const feedbackModalHeaderLabel = feedbackModalBooking
    ? [feedbackModalBookingIdLabel, feedbackModalVehicleLabel].filter(Boolean).join(" · ") ||
      "Select a booking to review"
    : "Select a booking to review";

  const handleOpenBooking = (vehicle) => {
    setBookingModal(vehicle);
    setModalStage("booking");
    setPaymentContext(null);
    setBookingForm(initialBookingForm);
    setPaymentForm(initialPaymentForm);
    setBookingError("");
    setPaymentError("");
  };

  const savedPaymentLabels = useMemo(() => {
    const methods = new Set(payments.map((payment) => payment.paymentMethod));
    return Array.from(methods).map(
      (method) => PAYMENT_METHODS.find((option) => option.value === method)?.label || method,
    );
  }, [payments]);

  const handleBookingFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "withDriver") {
      setBookingForm((prev) => ({
        ...prev,
        withDriver: checked,
      }));
      return;
    }
    setBookingForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
    if (name === "bookingId") {
      const booking = bookings.find((item) => String(item._id) === value);
      if (booking?.pricing?.totalAmount != null) {
        setPaymentForm((prev) => ({ ...prev, amount: String(booking.pricing.totalAmount) }));
      }
    }
  };

  const handleFeedbackChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFeedbackForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "bookingId") {
      const booking = bookings.find((item) => String(item._id) === value);
      setFeedbackModalBooking(booking || null);
    }
  };

  useEffect(() => {
    if (!feedbackModalBooking) return;
    const requiresDriver = Boolean(
      feedbackModalBooking.driverRequested || feedbackModalBooking.driverId,
    );
    if (!requiresDriver && feedbackForm.driverRating) {
      setFeedbackForm((prev) => ({ ...prev, driverRating: "" }));
    }
  }, [feedbackModalBooking, feedbackForm.driverRating]);

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!bookingModal || !user?._id) return;
    setBookingError("");
    setBookingSubmitting(true);
    try {
      const totalDays = differenceInDays(bookingForm.startDate, bookingForm.endDate);
      const vehicleRate = bookingModal.pricing?.dailyRate || 0;
      const driverKilometers = bookingForm.withDriver ? Math.max(0, Number(bookingForm.expectedKm) || 0) : 0;
      const driverFee = bookingForm.withDriver ? driverKilometers * 500 : 0;
      const rentalSubtotal = vehicleRate * totalDays;
      const totalAmount = rentalSubtotal + driverFee;

      const noteParts = [
        bookingForm.reason,
        bookingForm.expectedKm ? `Expected ${bookingForm.expectedKm} km` : "",
      ];
      if (bookingForm.withDriver) {
        noteParts.push(`Driver required (estimated fee LKR ${driverFee.toFixed(0)})`);
      }

      const payload = {
        customerId: user._id,
        vehicleId: bookingModal._id,
        driverRequested: bookingForm.withDriver,
        schedule: {
          startDate: bookingForm.startDate,
          endDate: bookingForm.endDate,
          pickupTime: bookingForm.pickupTime,
          returnTime: bookingForm.returnTime,
          totalDays,
        },
        pickupLocation: bookingForm.withDriver ? bookingModal.location : undefined,
        dropoffLocation: bookingForm.destination
          ? {
              address: bookingForm.destination,
              city: bookingModal.location?.city,
              province: bookingModal.location?.province,
            }
          : undefined,
        pricing: {
          dailyRate: vehicleRate,
          totalDays,
          subtotal: rentalSubtotal,
          taxes: 0,
          driverFee,
          totalAmount,
          currency: bookingModal.pricing?.currency || "LKR",
        },
        notes: noteParts.filter(Boolean).join(" | "),
      };

      if (bookingForm.withDriver) {
        payload.driverId = null;
      }

      const response = await apiRequest("/Bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create booking");
      }

      setBookings((prev) => [...prev, data]);
      setBookingForm(initialBookingForm);

      await reloadVehicles();

      setPaymentContext(data);
      setModalStage("payment");
      setPaymentError("");
      setPaymentForm({
        bookingId: data._id,
        amount: data.pricing?.totalAmount || totalAmount,
        paymentMethod: paymentForm.paymentMethod || initialPaymentForm.paymentMethod,
      });
      setActiveTab("bookings");
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const response = await apiRequest(`/Bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel booking");
      }
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, status: "cancelled" } : booking,
        ),
      );
      await reloadVehicles();
    } catch (error) {
      alert(error.message);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.bookingId || !user?._id) {
      setPaymentError("Select a booking to pay for");
      return;
    }
    setPaymentSubmitting(true);
    setPaymentError("");
    try {
      const payload = {
        paymentId: `PAY${Date.now().toString().slice(-6)}`,
        bookingId: paymentForm.bookingId,
        customerId: user._id,
        status: "completed",
        amount: Number(paymentForm.amount || 0),
        currency: "LKR",
        paymentMethod: paymentForm.paymentMethod,
      };

      const response = await apiRequest("/payments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Payment failed");
      }
      setPayments((prev) => [data, ...prev]);
      setPaymentForm(initialPaymentForm);
      if (paymentContext) {
        setPaymentContext(null);
        setModalStage("booking");
        setBookingModal(null);
        setBookingForm(initialBookingForm);
        setBookingError("");
      }
      setActiveTab("payments");
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedbackForm.bookingId || !user?._id) {
      setFeedbackError("Select a completed booking to review");
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError("");
    try {
      const requiresDriver = Boolean(
        feedbackModalBooking?.driverRequested || feedbackModalBooking?.driverId,
      );
      const feedbackId = editingFeedback?.feedbackId || `FDB${Date.now().toString().slice(-6)}`;
      const payload = {
        feedbackId,
        bookingId: feedbackForm.bookingId,
        customerId: user._id,
        ratings: {
          vehicleRating: Number(feedbackForm.vehicleRating || 0) || undefined,
          driverRating: requiresDriver
            ? Number(feedbackForm.driverRating || 0) || undefined
            : undefined,
          serviceRating: Number(feedbackForm.serviceRating || 0) || undefined,
          overallRating: Number(feedbackForm.overallRating || 0) || undefined,
        },
        comments: {
          vehicleComment: feedbackForm.vehicleComment,
          serviceComment: feedbackForm.serviceComment,
        },
        suggestions: feedbackForm.suggestions,
        wouldRecommend: feedbackForm.wouldRecommend,
      };

      const response = await apiRequest(
        editingFeedback ? `/feedbacks/${editingFeedback._id}` : "/feedbacks",
        {
          method: editingFeedback ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit feedback");
      }
      setFeedbacks((prev) =>
        editingFeedback
          ? prev.map((item) => (item._id === data._id ? data : item))
          : [data, ...prev],
      );
      closeFeedbackModal();
      setActiveTab("feedback");
    } catch (error) {
      setFeedbackError(error.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const closeFeedbackModal = () => {
    setFeedbackModalBooking(null);
    setEditingFeedback(null);
    setFeedbackForm(initialFeedbackForm);
    setFeedbackError("");
  };

  const openFeedbackEditor = (feedback) => {
    if (!feedback) return;
    const normalizedBookingId = normalizeId(feedback.bookingId);
    const booking = bookingsById.get(normalizedBookingId);
    const fallbackBooking =
      booking || {
        _id: normalizedBookingId,
        bookingId: normalizedBookingId,
        vehicle: feedback.vehicle,
        vehicleId: feedback.vehicleId,
        driverRequested: Boolean(feedback.ratings?.driverRating != null),
        bookingDetails: feedback.bookingDetails,
      };
    const requiresDriver = Boolean(fallbackBooking.driverRequested || fallbackBooking.driverId);

    setEditingFeedback(feedback);
    setFeedbackModalBooking(fallbackBooking);
    setFeedbackForm({
      bookingId: normalizedBookingId,
      vehicleRating:
        feedback.ratings?.vehicleRating != null
          ? String(feedback.ratings.vehicleRating)
          : "",
      driverRating:
        requiresDriver && feedback.ratings?.driverRating != null
          ? String(feedback.ratings.driverRating)
          : "",
      serviceRating:
        feedback.ratings?.serviceRating != null
          ? String(feedback.ratings.serviceRating)
          : "",
      overallRating:
        feedback.ratings?.overallRating != null
          ? String(feedback.ratings.overallRating)
          : "",
      vehicleComment: feedback.comments?.vehicleComment ?? "",
      serviceComment: feedback.comments?.serviceComment ?? "",
      suggestions: feedback.suggestions ?? "",
      wouldRecommend:
        feedback.wouldRecommend != null ? Boolean(feedback.wouldRecommend) : true,
    });
    setFeedbackError("");
  };

  const deleteFeedback = async (feedback) => {
    if (!feedback?._id) return;
    if (!window.confirm("Delete this feedback?")) return;
    try {
      const response = await apiRequest(`/feedbacks/${feedback._id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete feedback");
      }
      setFeedbacks((prev) => prev.filter((item) => item._id !== feedback._id));
      if (editingFeedback && editingFeedback._id === feedback._id) {
        closeFeedbackModal();
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (!user?._id) return;
    setProfileSubmitting(true);
    setProfileError("");
    try {
      const payload = {
        profile: {
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phoneNumber: profileForm.phoneNumber,
          dateOfBirth: profileForm.dateOfBirth,
        },
        preferences: {
          preferredVehicleType: profileForm.preferredVehicleType,
        },
      };

      const response = await apiRequest(`/users/${user._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }
      setUser((prev) => ({
        ...prev,
        profile: data.data.profile,
        preferences: data.data.preferences,
      }));
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const updateVehicleFilters = (partial) => {
    setVehicleFilters((prev) => ({ ...prev, ...partial }));
  };

  const resetVehicleFilters = () => {
    setVehicleFilters({ search: "", category: "", minRate: "", maxRate: "", city: "" });
  };

  const openFeedbackForBooking = (booking) => {
    if (!booking) return;
    setEditingFeedback(null);
    setFeedbackModalBooking(booking);
    setFeedbackForm({ ...initialFeedbackForm, bookingId: normalizeId(booking._id) });
    setFeedbackError("");
  };

  return (
    <div className="customer-dashboard">
      <CustomerNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="customer-main">
        <DashboardHero activeTab={activeTab} user={user} />

        {activeTab === "vehicles" && (
          <>
            <AnnouncementsCarousel />
            <VehicleExplorer
              filters={vehicleFilters}
              onFiltersChange={updateVehicleFilters}
              onResetFilters={resetVehicleFilters}
              vehicles={filteredVehicles}
              loading={vehiclesLoading}
              error={vehicleError}
              onOpenBooking={handleOpenBooking}
              onOpenDetails={(vehicle) => setDetailsModal(vehicle)}
              formatCurrency={formatCurrency}
              categories={VEHICLE_CATEGORIES}
            />
          </>
        )}

        {activeTab === "bookings" && (
          <BookingsOverview
            upcomingBookings={upcomingBookings}
            historicalBookings={historicalBookings}
            feedbacks={feedbacks}
            onCancelBooking={cancelBooking}
            onOpenFeedback={openFeedbackForBooking}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            getBookingVehicleName={getBookingVehicleName}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsOverview
            payments={payments}
            savedPaymentLabels={savedPaymentLabels}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === "feedback" && (
          <FeedbackHub
            feedbacks={feedbacks}
            feedbackEligibleBookings={feedbackEligibleBookings}
            getBookingVehicleName={getBookingVehicleName}
            formatDate={formatDate}
            onOpenFeedback={openFeedbackForBooking}
            bookingsMap={bookingsById}
            onEditFeedback={openFeedbackEditor}
            onDeleteFeedback={deleteFeedback}
          />
        )}

        {activeTab === "profile" && (
          <ProfilePreferences
            profileForm={profileForm}
            onChange={handleProfileChange}
            onSubmit={submitProfile}
            submitting={profileSubmitting}
            error={profileError}
            vehicleCategories={VEHICLE_CATEGORIES}
          />
        )}

      </main>

      {detailsModal && (
        <div className="modal-backdrop" onClick={() => setDetailsModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>
                  {detailsModal.basicInfo?.make} {detailsModal.basicInfo?.model}
                  {detailsModal.basicInfo?.year ? ` (${detailsModal.basicInfo.year})` : ""}
                </h3>
                <p>{detailsModal.location?.city || "Unknown city"}</p>
              </div>
              <button className="close-button" type="button" onClick={() => setDetailsModal(null)}>
                ×
              </button>
            </header>
            <div className="modal-body">
              <section>
                <h4>Current status</h4>
                <p>
                  {detailsModal.status === "approved"
                    ? detailsModal.availability?.isAvailable === false
                      ? "Currently booked"
                      : "Available for booking"
                    : `Status: ${detailsModal.status || "pending"}`}
                </p>
              </section>
              <section className="vehicle-detail-grid">
                <div>
                  <strong>Category</strong>
                  <p>{detailsModal.details?.category || "N/A"}</p>
                </div>
                <div>
                  <strong>Fuel</strong>
                  <p>{detailsModal.details?.fuelType || "N/A"}</p>
                </div>
                <div>
                  <strong>Transmission</strong>
                  <p>{detailsModal.details?.transmission || "N/A"}</p>
                </div>
                <div>
                  <strong>Seats</strong>
                  <p>{detailsModal.details?.seatingCapacity || "N/A"}</p>
                </div>
                <div>
                  <strong>Daily rate</strong>
                  <p>{formatCurrency(detailsModal.pricing?.dailyRate)} / day</p>
                </div>
                <div>
                  <strong>Location</strong>
                  <p>{detailsModal.location?.address || detailsModal.location?.city || "N/A"}</p>
                </div>
              </section>
              <section>
                <h4>Features</h4>
                {(() => {
                  const rawFeatures = detailsModal.details?.features;
                  const featureList = Array.isArray(rawFeatures)
                    ? rawFeatures
                    : typeof rawFeatures === "string"
                        && rawFeatures
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                  if (Array.isArray(featureList) && featureList.length > 0) {
                    return (
                      <ul className="chip-list">
                        {featureList.map((feature, index) => (
                          <li key={`${feature}-${index}`} className="chip">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return <p className="muted">No additional features listed.</p>;
                })()}
              </section>
              <section>
                <h4>Description</h4>
                <p>{detailsModal.details?.description || "No description provided."}</p>
              </section>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setDetailsModal(null)}>
                Close
              </button>
              {detailsModal.status === "approved" && detailsModal.availability?.isAvailable !== false && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    handleOpenBooking(detailsModal);
                    setDetailsModal(null);
                  }}
                >
                  Book this vehicle
                </button>
              )}
              {detailsModal.status === "approved" && detailsModal.availability?.isAvailable === false && (
                <span className="muted">Vehicle is booked for the current period.</span>
              )}
            </footer>
          </div>
        </div>
      )}

      {bookingModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setBookingModal(null);
            setModalStage("booking");
            setPaymentContext(null);
            setBookingForm(initialBookingForm);
            setPaymentForm(initialPaymentForm);
            setBookingError("");
            setPaymentError("");
          }}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>
                  {modalStage === "booking" ? "Book" : "Complete payment for"} {bookingModal.basicInfo?.make} {bookingModal.basicInfo?.model}
                </h3>
                <p>{bookingModal.location?.city || "Unknown city"}</p>
              </div>
              <button
                className="close-button"
                type="button"
                onClick={() => {
                  setBookingModal(null);
                  setModalStage("booking");
                  setPaymentContext(null);
                  setBookingForm(initialBookingForm);
                  setPaymentForm(initialPaymentForm);
                  setBookingError("");
                  setPaymentError("");
                }}
              >
                ×
              </button>
            </header>

            {modalStage === "booking" && (
              <form className="form-grid" onSubmit={submitBooking}>
                <label>
                  Start date
                  <input
                    name="startDate"
                    type="date"
                    value={bookingForm.startDate}
                    onChange={handleBookingFormChange}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    name="endDate"
                    type="date"
                    value={bookingForm.endDate}
                    onChange={handleBookingFormChange}
                    required
                  />
                </label>
                <label>
                  Pickup time
                  <input
                    name="pickupTime"
                    type="time"
                    value={bookingForm.pickupTime}
                    onChange={handleBookingFormChange}
                  />
                </label>
                <label>
                  Return time
                  <input
                    name="returnTime"
                    type="time"
                    value={bookingForm.returnTime}
                    onChange={handleBookingFormChange}
                  />
                </label>
                <label>
                  Drop-off address / destination
                  <input name="destination" value={bookingForm.destination} onChange={handleBookingFormChange} />
                </label>
                <label>
                  Purpose of trip
                  <input
                    name="reason"
                    value={bookingForm.reason}
                    onChange={handleBookingFormChange}
                    placeholder="Business, family trip, etc."
                  />
                </label>
                <label>
                  Expected kilometers
                  <input
                    name="expectedKm"
                    type="number"
                    min="0"
                    value={bookingForm.expectedKm}
                    onChange={handleBookingFormChange}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="withDriver"
                    checked={bookingForm.withDriver}
                    onChange={handleBookingFormChange}
                  />
                  Require a driver
                </label>
                {bookingForm.withDriver && (
                  <p className="muted">
                    Driver fee estimated at {formatCurrency((Number(bookingForm.expectedKm) || 0) * 50)} (LKR 50 per km)
                  </p>
                )}
                {bookingError && <p className="error-text">{bookingError}</p>}
                <button className="btn" type="submit" disabled={bookingSubmitting}>
                  {bookingSubmitting ? "Submitting..." : "Confirm booking"}
                </button>
              </form>
            )}

            {modalStage === "payment" && paymentContext && (
              <form className="form-grid" onSubmit={submitPayment}>
                <p>
                  Booking <strong>{paymentContext.bookingId || paymentContext._id}</strong> totals {formatCurrency(paymentContext.pricing?.totalAmount)}
                </p>
                {paymentContext.pricing?.driverFee ? (
                  <p className="muted">
                    Base rental {formatCurrency(paymentContext.pricing?.subtotal)} + driver fee {formatCurrency(paymentContext.pricing?.driverFee)} (LKR 500 per km)
                  </p>
                ) : null}
                <label>
                  Payment method
                  <select name="paymentMethod" value={paymentForm.paymentMethod} onChange={handlePaymentChange} required>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount (LKR)
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    required
                  />
                </label>
                {paymentError && <p className="error-text">{paymentError}</p>}
                <button className="btn" type="submit" disabled={paymentSubmitting}>
                  {paymentSubmitting ? "Processing..." : "Pay & finish"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {feedbackModalBooking && (
        <div className="modal-backdrop" onClick={closeFeedbackModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>{isEditingFeedback ? "Update your feedback" : "Share your feedback"}</h3>
                <p>{feedbackModalHeaderLabel}</p>
              </div>
              <button className="close-button" type="button" onClick={closeFeedbackModal}>
                ×
              </button>
            </header>
            <div className="modal-content">
              <form className="form-grid" onSubmit={submitFeedback}>
                <label>
                  Completed booking
                  <select
                    name="bookingId"
                    value={feedbackForm.bookingId}
                    onChange={handleFeedbackChange}
                    required
                    disabled={isEditingFeedback}
                  >
                    <option value="">Select booking</option>
                    {isEditingFeedback ? (
                      <option value={feedbackForm.bookingId}>{feedbackModalHeaderLabel}</option>
                    ) : (
                      feedbackEligibleBookings.map((booking) => (
                        <option key={booking._id} value={normalizeId(booking._id)}>
                          {booking.bookingId || booking._id} · {getBookingVehicleName(booking)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                {feedbackTripWindow && <p className="muted">{feedbackTripWindow}</p>}
                <label>
                  Vehicle rating (1-5)
                  <input
                    name="vehicleRating"
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.vehicleRating}
                    onChange={handleFeedbackChange}
                  />
                </label>
                {canRateDriver && (
                  <label>
                    Driver rating (1-5)
                    <input
                      name="driverRating"
                      type="number"
                      min="1"
                      max="5"
                      value={feedbackForm.driverRating}
                      onChange={handleFeedbackChange}
                    />
                  </label>
                )}
                <label>
                  Service rating (1-5)
                  <input
                    name="serviceRating"
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.serviceRating}
                    onChange={handleFeedbackChange}
                  />
                </label>
                <label>
                  Overall rating (1-5)
                  <input
                    name="overallRating"
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.overallRating}
                    onChange={handleFeedbackChange}
                    required
                  />
                </label>
                <label>
                  Vehicle comments
                  <textarea
                    name="vehicleComment"
                    rows={2}
                    value={feedbackForm.vehicleComment}
                    onChange={handleFeedbackChange}
                  />
                </label>
                <label>
                  Service comments
                  <textarea
                    name="serviceComment"
                    rows={2}
                    value={feedbackForm.serviceComment}
                    onChange={handleFeedbackChange}
                  />
                </label>
                <label>
                  Suggestions
                  <textarea
                    name="suggestions"
                    rows={2}
                    value={feedbackForm.suggestions}
                    onChange={handleFeedbackChange}
                  />
                </label>
                <label className="checkbox">
                  <input
                    name="wouldRecommend"
                    type="checkbox"
                    checked={feedbackForm.wouldRecommend}
                    onChange={handleFeedbackChange}
                  />
                  Would recommend to others
                </label>
                {feedbackError && <p className="error-text">{feedbackError}</p>}
                <button className="btn" type="submit" disabled={feedbackSubmitting}>
                  {feedbackSubmitting
                    ? isEditingFeedback
                      ? "Updating..."
                      : "Submitting..."
                    : isEditingFeedback
                    ? "Update feedback"
                    : "Submit feedback"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="modal-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>Booking details</h3>
                <p>
                  {selectedBooking.bookingId || selectedBooking._id} · {getBookingVehicleName(selectedBooking)}
                </p>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedBooking(null)}>
                ×
              </button>
            </header>
            <div className="modal-content">
              <section className="details-section">
                <h4>Trip summary</h4>
                <dl className="details-list">
                  <div>
                    <dt>Start</dt>
                    <dd>
                      {selectedBooking.bookingDetails?.startDate
                        ? `${formatDate(selectedBooking.bookingDetails.startDate)}${
                            selectedBooking.bookingDetails?.pickupTime
                              ? ` at ${formatTime(selectedBooking.bookingDetails.pickupTime)}`
                              : ""
                          }`
                        : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt>Return</dt>
                    <dd>
                      {selectedBooking.bookingDetails?.endDate
                        ? `${formatDate(selectedBooking.bookingDetails.endDate)}${
                            selectedBooking.bookingDetails?.returnTime
                              ? ` at ${formatTime(selectedBooking.bookingDetails.returnTime)}`
                              : ""
                          }`
                        : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt>Pickup location</dt>
                    <dd>
                      {[
                        selectedBooking.pickupLocation?.address,
                        selectedBooking.pickupLocation?.city,
                        selectedBooking.pickupLocation?.province,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt>Drop-off location</dt>
                    <dd>
                      {[
                        selectedBooking.dropoffLocation?.address,
                        selectedBooking.dropoffLocation?.city,
                        selectedBooking.dropoffLocation?.province,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not specified"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="details-section">
                <h4>Pricing</h4>
                <dl className="details-list">
                  <div>
                    <dt>Total amount</dt>
                    <dd>
                      {formatCurrency(
                        selectedBooking.pricing?.totalAmount,
                        selectedBooking.pricing?.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Daily rate</dt>
                    <dd>
                      {formatCurrency(
                        selectedBooking.pricing?.dailyRate,
                        selectedBooking.pricing?.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Total days</dt>
                    <dd>
                      {selectedBooking.bookingDetails?.totalDays
                        || selectedBooking.pricing?.totalDays
                        || "-"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="details-section">
                <h4>Driver & notes</h4>
                <dl className="details-list">
                  <div>
                    <dt>Driver requested</dt>
                    <dd>{selectedBooking.driverRequested ? "Yes" : "No"}</dd>
                  </div>
                  {selectedBooking.driverRequested && (
                    <div>
                      <dt>Driver status</dt>
                      <dd>{selectedBooking.driverStatus || "pending"}</dd>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div>
                      <dt>Notes</dt>
                      <dd>{selectedBooking.notes}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
            <footer className="modal-footer">
              <button className="btn" type="button" onClick={() => setSelectedBooking(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;
