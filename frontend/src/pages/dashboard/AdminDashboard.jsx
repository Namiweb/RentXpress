import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../services/api.js";
import FinancialManagementPanel from "../../Components/FinancialManagementPanel";

const USER_ROLES = ["customer", "driver", "vehicle_owner", "inspector", "admin"];
const USER_STATUSES = ["pending_verification", "active", "inactive", "suspended"];
const VEHICLE_STATUSES = ["pending", "approved", "rejected"];
const BOOKING_STATUSES = ["pending", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];
const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"];
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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function normalizeStatus(value) {
  if (!value) return "unknown";
  return String(value).toLowerCase().replace(/\s+/g, "_");
}

function StatusPill({ value }) {
  if (!value) return <span className="status-pill">-</span>;
  const label = String(value).replace(/_/g, " ");
  const normalized = normalizeStatus(value);
  return <span className={`status-pill status-${normalized}`}>{label}</span>;
}

function getUserName(user) {
  if (!user) return "-";
  const first = user.profile?.firstName;
  const last = user.profile?.lastName;
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined) return combined;
  if (user.email) return user.email;
  if (user.userId) return user.userId;
  return "-";
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
        <OverviewCard
          label="Total Earnings"
          value={formatCurrency(metrics.earnings, currency)}
          // helper={`Driver payouts: ${formatCurrency(metrics.payouts, currency)}`}
          loading={isLoading}
          variant="accent"
        />
      </div>
    </section>
  );
}

// Enhanced Announcement Management Component
function AnnouncementManagementPanel({ adminId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiRequest("/announcements");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch announcements");
      setAnnouncements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Delete announcement
  const handleDelete = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    
    setError("");
    try {
      const response = await apiRequest(`/announcements/${announcementId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete announcement");
      }
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  // Open edit form
  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  // Close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAnnouncement(null);
  };

  // Handle form submission (create/update)
  const handleSubmit = async (formData) => {
    setError("");
    setIsSubmitting(true);
    try {
      let response;
      if (editingAnnouncement) {
        // Update existing announcement
        response = await apiRequest(`/announcements/${editingAnnouncement._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        // Create new announcement
        response = await apiRequest("/announcements", {
          method: "POST",
          body: JSON.stringify({
            announcementId: `ANN${Date.now().toString().slice(-6)}`,
            createdBy: adminId,
            ...formData,
          }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
      }

      await fetchAnnouncements();
      handleCloseForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update announcement status
  const handleStatusUpdate = async (announcementId, newStatus) => {
    setError("");
    try {
      const response = await apiRequest(`/announcements/${announcementId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update status");
      }
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Announcement Management</h3>
          <p className="panel-subtitle">Create and manage platform announcements</p>
        </div>
        <button className="btn" type="button" onClick={() => setShowForm(true)}>
          Create Announcement
        </button>
      </header>

      {error && <p className="error-text">{error}</p>}

      {isLoading ? (
        <p>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements found. Create your first announcement!</p>
      ) : (
        <div className="table-wrapper">
          <table className="management-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Target Audience</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement) => (
                <tr key={announcement._id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{announcement.title}</strong>
                      <span className="muted">{announcement.content.substring(0, 100)}...</span>
                    </div>
                  </td>
                  <td>
                    <StatusPill value={announcement.status} />
                  </td>
                  <td>
                    <span className={`priority-pill priority-${announcement.priority}`}>
                      {announcement.priority}
                    </span>
                  </td>
                  <td>
                    {announcement.targetAudience?.length > 0 
                      ? announcement.targetAudience.join(", ") 
                      : "All users"}
                  </td>
                  <td>{formatDate(announcement.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <select
                        className="input-control"
                        value={announcement.status}
                        onChange={(e) => handleStatusUpdate(announcement._id, e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleEdit(announcement)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleDelete(announcement._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

// Enhanced Announcement Form Component
function AnnouncementForm({ announcement, onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: announcement?.title || "",
    content: announcement?.content || "",
    status: announcement?.status || "draft",
    targetAudience: announcement?.targetAudience || [],
    priority: announcement?.priority || "low",
    expiryDate: announcement?.expiryDate ? new Date(announcement.expiryDate).toISOString().split('T')[0] : ""
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        targetAudience: checked 
          ? [...prev.targetAudience, value]
          : prev.targetAudience.filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // Prepare payload
    const payload = {
      title: formData.title,
      content: formData.content,
      status: formData.status,
      targetAudience: formData.targetAudience,
      priority: formData.priority,
    };

    // Add expiry date if provided
    if (formData.expiryDate) {
      payload.expiryDate = new Date(formData.expiryDate);
    }

    // Add publishedAt if status is being changed to published
    if (formData.status === "published" && (!announcement || announcement.status !== "published")) {
      payload.publishedAt = new Date();
    }

    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h3>{announcement ? "Edit Announcement" : "Create Announcement"}</h3>
            <p className="panel-subtitle">
              {announcement ? "Update announcement details" : "Create a new platform announcement"}
            </p>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        
        <div className="modal-body">
          <div className="form-grid">
            <label>
              Title
              <input
                className="input-control"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </label>
            
            <label>
              Status
              <select
                className="input-control"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            
            <label>
              Priority
              <select
                className="input-control"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            
            <label>
              Expiry Date
              <input
                className="input-control"
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </label>
          </div>

          <label>
            Content
            <textarea
              className="input-control"
              name="content"
              rows={4}
              value={formData.content}
              onChange={handleChange}
              required
            />
          </label>

          <div className="checkbox-group">
            <label className="checkbox-group-label">Target Audience</label>
            <div className="checkbox-grid">
              <label className="checkbox">
                <input
                  type="checkbox"
                  value="customer"
                  checked={formData.targetAudience.includes("customer")}
                  onChange={handleChange}
                />
                Customers
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  value="vehicle_owner"
                  checked={formData.targetAudience.includes("vehicle_owner")}
                  onChange={handleChange}
                />
                Vehicle Owners
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  value="admin"
                  checked={formData.targetAudience.includes("admin")}
                  onChange={handleChange}
                />
                Admins
              </label>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : announcement ? "Update Announcement" : "Create Announcement"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function AdvertisementForm({ adminId, onCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    isActive: true,
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await apiRequest("/advertisements", {
        method: "POST",
        body: JSON.stringify({
          adId: `ADV${Date.now().toString().slice(-6)}`,
          createdBy: adminId,
          title: formData.title,
          description: formData.description,
          isActive: formData.isActive,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create advertisement");
      }
      setFormData({ title: "", description: "", isActive: true });
      onCreated?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h3>Create Advertisement</h3>
      <label>
        Title
        <input name="title" value={formData.title} onChange={handleChange} required className="input-control" />
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="input-control"
        />
      </label>
      <label className="checkbox">
        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
        Active
      </label>
      {error && <p className="error-text">{error}</p>}
      <button className="btn" type="submit">
        Create
      </button>
    </form>
  );
}


function UserManagementPanel({ users = [], isLoading, error, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users
      .filter((user) => (roleFilter === "all" ? true : user.role === roleFilter))
      .filter((user) => (statusFilter === "all" ? true : user.status === statusFilter))
      .filter((user) => {
        if (!term) return true;
        const haystack = [
          user.email,
          user.role,
          user.status,
          user.userId,
          user.profile?.firstName,
          user.profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [users, roleFilter, statusFilter, searchTerm]);

  const handleStatusUpdate = async (userId, status) => {
    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Failed to update user status");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (userRecord) => {
    setActionError("");
    setEditForm({
      _id: userRecord._id,
      email: userRecord.email || "",
      role: userRecord.role || "customer",
      status: userRecord.status || "active",
      firstName: userRecord.profile?.firstName || "",
      lastName: userRecord.profile?.lastName || "",
      phoneNumber: userRecord.profile?.phoneNumber || "",
      dateOfBirth: userRecord.profile?.dateOfBirth
        ? new Date(userRecord.profile.dateOfBirth).toISOString().slice(0, 10)
        : "",
    });
  };

  const closeEditModal = () => {
    setEditForm(null);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editForm) return;
    setActionError("");
    setIsUpdating(true);
    try {
      const payload = {
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
        profile: {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phoneNumber: editForm.phoneNumber,
          dateOfBirth: editForm.dateOfBirth,
        },
      };
      const response = await apiRequest(`/users/${editForm._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update user");
      }
      await onRefresh();
      setEditForm(null);
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
          <h3>User Management</h3>
          <p className="panel-subtitle">Approve new users, adjust roles, and keep accounts up to date.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </header>
      <div className="filter-grid">
        <input
          className="input-control"
          type="search"
          placeholder="Search by name, email, or ID"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select className="input-control" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All roles</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select className="input-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {USER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      {isLoading ? (
        <p>Loading users…</p>
      ) : filteredUsers.length === 0 ? (
        <p>No users match your filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="management-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userRecord) => (
                <tr key={userRecord._id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{getUserName(userRecord)}</strong>
                      <span className="muted">{userRecord.email}</span>
                    </div>
                  </td>
                  <td>{userRecord.role.replace(/_/g, " ")}</td>
                  <td>
                    <StatusPill value={userRecord.status} />
                  </td>
                  <td>{formatDate(userRecord.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={isUpdating || userRecord.status === "active"}
                        onClick={() => handleStatusUpdate(userRecord._id, "active")}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={isUpdating || userRecord.status === "inactive"}
                        onClick={() => handleStatusUpdate(userRecord._id, "inactive")}
                      >
                        Deactivate
                      </button>
                      <button className="btn" type="button" onClick={() => openEditModal(userRecord)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editForm && (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <form className="modal" onSubmit={handleEditSubmit} onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>Edit User</h3>
                <p className="panel-subtitle">Update profile details, role, and status.</p>
              </div>
              <button className="close-button" type="button" onClick={closeEditModal}>
                ×
              </button>
            </header>
            <div className="modal-body">
              <div className="form-grid">
                <label>
                  First name
                  <input
                    className="input-control"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    className="input-control"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    className="input-control"
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    className="input-control"
                    name="phoneNumber"
                    value={editForm.phoneNumber}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    className="input-control"
                    type="date"
                    name="dateOfBirth"
                    value={editForm.dateOfBirth}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    className="input-control"
                    name="role"
                    value={editForm.role}
                    onChange={handleEditChange}
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    className="input-control"
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

const vehicleFormInitialState = {
  ownerId: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  licensePlate: "",
  category: "Car",
  fuelType: "Petrol",
  transmission: "Automatic",
  condition: "Excellent",
  seatingCapacity: "",
  mileage: "",
  dailyRate: "",
  weeklyRate: "",
  monthlyRate: "",
  securityDeposit: "",
  currency: DEFAULT_CURRENCY,
  address: "",
  city: "",
  province: "",
  postalCode: "",
  features: "",
  description: "",
};

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildVehiclePayload(formState) {
  const features = formState.features
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    vehicleId: `VEH${Date.now().toString().slice(-6)}`,
    ownerId: formState.ownerId,
    basicInfo: {
      make: formState.make,
      model: formState.model,
      year: Number(formState.year),
      color: formState.color || undefined,
      licensePlate: formState.licensePlate || undefined,
    },
    details: {
      category: formState.category,
      fuelType: formState.fuelType,
      transmission: formState.transmission,
      condition: formState.condition,
      seatingCapacity: parseNumber(formState.seatingCapacity),
      mileage: parseNumber(formState.mileage),
      features,
      description: formState.description || undefined,
    },
    pricing: {
      dailyRate: Number(formState.dailyRate),
      weeklyRate: parseNumber(formState.weeklyRate),
      monthlyRate: parseNumber(formState.monthlyRate),
      securityDeposit: parseNumber(formState.securityDeposit),
      currency: formState.currency || DEFAULT_CURRENCY,
    },
    location: {
      address: formState.address,
      city: formState.city,
      province: formState.province || undefined,
      postalCode: formState.postalCode || undefined,
    },
    availability: {
      isAvailable: false,
    },
  };
}

function AddVehicleModal({ owners, onClose, onSubmit, isSubmitting }) {
  const [formState, setFormState] = useState(vehicleFormInitialState);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = buildVehiclePayload(formState);
      await onSubmit(payload);
      setFormState(vehicleFormInitialState);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h3>Add Vehicle</h3>
            <p className="panel-subtitle">Register a vehicle on behalf of an owner.</p>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <label>
              Vehicle owner
              <select
                className="input-control"
                name="ownerId"
                value={formState.ownerId}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select owner
                </option>
                {owners.map((owner) => (
                  <option key={owner._id} value={owner._id}>
                    {`${getUserName(owner)} (${owner.email})`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Make
              <input
                className="input-control"
                name="make"
                value={formState.make}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Model
              <input
                className="input-control"
                name="model"
                value={formState.model}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Year
              <input
                className="input-control"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                name="year"
                value={formState.year}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Color
              <input className="input-control" name="color" value={formState.color} onChange={handleChange} />
            </label>
            <label>
              License plate
              <input
                className="input-control"
                name="licensePlate"
                value={formState.licensePlate}
                onChange={handleChange}
              />
            </label>
            <label>
              Category
              <select className="input-control" name="category" value={formState.category} onChange={handleChange}>
                {[
                  "Sedan",
                  "SUV",
                  "Van",
                  "Truck",
                  "Motorcycle",
                  "Other",
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fuel type
              <select className="input-control" name="fuelType" value={formState.fuelType} onChange={handleChange}>
                {["Petrol", "Diesel", "Electric", "Hybrid"].map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {fuel}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Transmission
              <select
                className="input-control"
                name="transmission"
                value={formState.transmission}
                onChange={handleChange}
              >
                {["Automatic", "Manual"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Condition
              <select className="input-control" name="condition" value={formState.condition} onChange={handleChange}>
                {["Excellent", "Good", "Fair", "Poor"].map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seating capacity
              <input
                className="input-control"
                type="number"
                min="1"
                name="seatingCapacity"
                value={formState.seatingCapacity}
                onChange={handleChange}
              />
            </label>
            <label>
              Mileage (km)
              <input
                className="input-control"
                type="number"
                min="0"
                name="mileage"
                value={formState.mileage}
                onChange={handleChange}
              />
            </label>
            <label>
              Daily rate
              <input
                className="input-control"
                type="number"
                min="0"
                step="0.01"
                name="dailyRate"
                value={formState.dailyRate}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Weekly rate
              <input
                className="input-control"
                type="number"
                min="0"
                step="0.01"
                name="weeklyRate"
                value={formState.weeklyRate}
                onChange={handleChange}
              />
            </label>
            <label>
              Monthly rate
              <input
                className="input-control"
                type="number"
                min="0"
                step="0.01"
                name="monthlyRate"
                value={formState.monthlyRate}
                onChange={handleChange}
              />
            </label>
            <label>
              Security deposit
              <input
                className="input-control"
                type="number"
                min="0"
                step="0.01"
                name="securityDeposit"
                value={formState.securityDeposit}
                onChange={handleChange}
              />
            </label>
            <label>
              Currency
              <input className="input-control" name="currency" value={formState.currency} onChange={handleChange} />
            </label>
            <label>
              Address
              <input
                className="input-control"
                name="address"
                value={formState.address}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              City
              <input className="input-control" name="city" value={formState.city} onChange={handleChange} required />
            </label>
            <label>
              Province
              <input className="input-control" name="province" value={formState.province} onChange={handleChange} />
            </label>
            <label>
              Postal code
              <input
                className="input-control"
                name="postalCode"
                value={formState.postalCode}
                onChange={handleChange}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              className="input-control"
              name="description"
              rows={3}
              value={formState.description}
              onChange={handleChange}
            />
          </label>
          <label>
            Features (comma separated)
            <textarea
              className="input-control"
              name="features"
              rows={2}
              value={formState.features}
              onChange={handleChange}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
        </div>
        <footer className="modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create vehicle"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function VehicleManagementPanel({ vehicles = [], owners = [], isLoading, error, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingVehicleId, setUpdatingVehicleId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const ownerMap = useMemo(() => {
    const map = new Map();
    owners.forEach((owner) => {
      map.set(owner._id, owner);
    });
    return map;
  }, [owners]);

  const vehicleOwners = useMemo(
    () => owners.filter((owner) => owner.role === "vehicle_owner" || owner.role === "admin"),
    [owners]
  );

  const getOwnerLabel = useCallback(
    (vehicle) => {
      const owner = ownerMap.get(vehicle.ownerId);
      if (!owner) return vehicle.ownerId || "Unknown";
      return `${getUserName(owner)} · ${owner.email}`;
    },
    [ownerMap]
  );

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles
      .filter((vehicle) => (statusFilter === "all" ? true : vehicle.status === statusFilter))
      .filter((vehicle) => {
        if (!term) return true;
        const owner = ownerMap.get(vehicle.ownerId);
        const haystack = [
          vehicle.vehicleId,
          vehicle.basicInfo?.make,
          vehicle.basicInfo?.model,
          vehicle.basicInfo?.licensePlate,
          vehicle.details?.category,
          owner?.email,
          owner?.profile?.firstName,
          owner?.profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [vehicles, statusFilter, searchTerm, ownerMap]);

  const handleDownloadReport = useCallback(() => {
    if (!filteredVehicles.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    doc.setFontSize(18);
    doc.text("Vehicle Management Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Total vehicles: ${filteredVehicles.length}`, marginLeft, headerY + 35);

    const activeFilters = [];
    if (statusFilter !== "all") activeFilters.push(`Status: ${statusFilter.replace(/_/g, " ")}`);
    if (searchTerm.trim()) activeFilters.push(`Search: "${searchTerm.trim()}"`);
    if (activeFilters.length > 0) {
      doc.text(`Filters: ${activeFilters.join(" | ")}`, marginLeft, headerY + 50);
    }

    autoTable(doc, {
      startY: headerY + 75,
      head: [["#", "Vehicle", "Plate", "Owner", "Status", "Daily rate", "Created"]],
      body: filteredVehicles.map((vehicle, index) => [
        index + 1,
        `${[vehicle.basicInfo?.make, vehicle.basicInfo?.model].filter(Boolean).join(" ") || vehicle.vehicleId || "-"}`,
        vehicle.basicInfo?.licensePlate || vehicle.vehicleId || "-",
        getOwnerLabel(vehicle),
        vehicle.status ? vehicle.status.replace(/_/g, " ") : "-",
        formatCurrency(vehicle.pricing?.dailyRate, vehicle.pricing?.currency),
        vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : "-",
      ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [17, 24, 39] },
      columnStyles: {
        0: { halign: "center", cellWidth: 40 },
        5: { halign: "right" },
      },
    });

    doc.save("vehicle-management-report.pdf");
  }, [filteredVehicles, getOwnerLabel, searchTerm, statusFilter]);

  const handleStatusDraftChange = (vehicleId, newStatus) => {
    setStatusDrafts((prev) => ({ ...prev, [vehicleId]: newStatus }));
  };

  const handleStatusUpdate = async (vehicle) => {
    const desiredStatus = statusDrafts[vehicle._id] || vehicle.status;
    if (!desiredStatus || desiredStatus === vehicle.status) return;

    setActionError("");
    setUpdatingVehicleId(vehicle._id);
    try {
      const payload = { status: desiredStatus };
      if (desiredStatus === "approved") {
        payload.inspectionStatus = "available";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: true,
        };
      } else if (desiredStatus === "rejected") {
        payload.inspectionStatus = "needs_maintenance";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: false,
        };
      } else if (desiredStatus === "pending") {
        payload.inspectionStatus = "pending";
        payload.availability = {
          ...(vehicle.availability || {}),
          isAvailable: false,
        };
      }

      const response = await apiRequest(`/vehicles/${vehicle._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update vehicle");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingVehicleId("");
    }
  };

  const handleCreateVehicle = async (payload) => {
    setActionError("");
    setIsCreating(true);
    try {
      const response = await apiRequest("/vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create vehicle");
      }
      await onRefresh();
      setShowAddModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const detailRows = useMemo(() => {
    if (!selectedVehicle) return [];
    const vehicle = selectedVehicle;
    return [
      { label: "Vehicle ID", value: vehicle.vehicleId },
      { label: "Owner", value: getOwnerLabel(vehicle) },
      { label: "Status", value: vehicle.status },
      { label: "Inspection", value: vehicle.inspectionStatus },
      { label: "Make", value: vehicle.basicInfo?.make },
      { label: "Model", value: vehicle.basicInfo?.model },
      { label: "Year", value: vehicle.basicInfo?.year },
      { label: "Color", value: vehicle.basicInfo?.color },
      { label: "License plate", value: vehicle.basicInfo?.licensePlate },
      { label: "Chassis", value: vehicle.basicInfo?.chassisNumber },
      { label: "Engine", value: vehicle.basicInfo?.engineNumber },
      { label: "Category", value: vehicle.details?.category },
      { label: "Fuel", value: vehicle.details?.fuelType },
      { label: "Transmission", value: vehicle.details?.transmission },
      { label: "Condition", value: vehicle.details?.condition },
      { label: "Seating", value: vehicle.details?.seatingCapacity },
      { label: "Mileage", value: vehicle.details?.mileage },
      {
        label: "Features",
        value: vehicle.details?.features?.length ? vehicle.details.features.join(", ") : "-",
      },
      { label: "Daily rate", value: formatCurrency(vehicle.pricing?.dailyRate, vehicle.pricing?.currency) },
      { label: "Weekly rate", value: formatCurrency(vehicle.pricing?.weeklyRate, vehicle.pricing?.currency) },
      { label: "Monthly rate", value: formatCurrency(vehicle.pricing?.monthlyRate, vehicle.pricing?.currency) },
      { label: "Deposit", value: formatCurrency(vehicle.pricing?.securityDeposit, vehicle.pricing?.currency) },
      { label: "Address", value: vehicle.location?.address },
      { label: "City", value: vehicle.location?.city },
      { label: "Province", value: vehicle.location?.province },
      { label: "Created", value: vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleString() : "-" },
    ];
  }, [selectedVehicle, getOwnerLabel]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Vehicle Management</h3>
          <p className="panel-subtitle">Review pending listings, adjust statuses, and onboard vehicles.</p>
        </div>
        <div className="row-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleDownloadReport}
            disabled={filteredVehicles.length === 0}
          >
            Download report
          </button>
          <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </button>
          <button className="btn" type="button" onClick={() => setShowAddModal(true)}>
            Add vehicle
          </button>
        </div>
      </header>
      <div className="filter-grid">
        <input
          className="input-control"
          type="search"
          placeholder="Search by make, model, owner, or plate"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select className="input-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {VEHICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      {isLoading ? (
        <p>Loading vehicles…</p>
      ) : filteredVehicles.length === 0 ? (
        <p>No vehicles found for the current filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="management-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Pricing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle._id}>
                  <td>
                    <button className="btn-text" type="button" onClick={() => setSelectedVehicle(vehicle)}>
                      <div className="cell-stack">
                        <strong>
                          {vehicle.basicInfo?.make} {vehicle.basicInfo?.model}
                        </strong>
                        <span className="muted">{vehicle.basicInfo?.licensePlate || vehicle.vehicleId}</span>
                      </div>
                    </button>
                  </td>
                  <td>{getOwnerLabel(vehicle)}</td>
                  <td>
                    <StatusPill value={vehicle.status} />
                  </td>
                  <td>
                    {formatCurrency(vehicle.pricing?.dailyRate, vehicle.pricing?.currency)} / day
                  </td>
                  <td>
                    <div className="row-inline">
                      <select
                        className="input-control"
                        value={statusDrafts[vehicle._id] || vehicle.status}
                        onChange={(event) => handleStatusDraftChange(vehicle._id, event.target.value)}
                      >
                        {VEHICLE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={updatingVehicleId === vehicle._id}
                        onClick={() => handleStatusUpdate(vehicle)}
                      >
                        {updatingVehicleId === vehicle._id ? "Saving…" : "Update"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVehicle && (
        <div className="modal-backdrop" onClick={() => setSelectedVehicle(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <h3>
                  {selectedVehicle.basicInfo?.make} {selectedVehicle.basicInfo?.model}
                </h3>
                <p className="panel-subtitle">{selectedVehicle.basicInfo?.licensePlate || selectedVehicle.vehicleId}</p>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedVehicle(null)}>
                ×
              </button>
            </header>
            <div className="modal-body">
              <dl className="vehicle-detail-grid">
                {detailRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value ?? "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddVehicleModal
          owners={vehicleOwners}
          onClose={() => {
            if (!isCreating) setShowAddModal(false);
          }}
          onSubmit={handleCreateVehicle}
          isSubmitting={isCreating}
        />
      )}
    </section>
  );
}

function BookingManagementPanel({ bookings = [], vehicles = [], users = [], isLoading, error, onRefresh }) {
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
      .filter((booking) => (statusFilter === "all" ? true : booking.status === statusFilter))
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
    const confirmCancel = window.confirm(`Cancel booking ${booking.bookingId}?`);
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
          <p className="panel-subtitle">Monitor trips, adjust statuses, and handle cancellations.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={isLoading}>
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
        <select className="input-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
                  ? new Date(booking.bookingDetails.startDate).toLocaleDateString()
                  : "-";
                const end = booking.bookingDetails?.endDate
                  ? new Date(booking.bookingDetails.endDate).toLocaleDateString()
                  : "-";
                return (
                  <tr key={booking._id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{booking.bookingId}</strong>
                        <span className="muted">Created: {formatDate(booking.createdAt)}</span>
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
                        <span className="muted">{vehicle?.basicInfo?.licensePlate || vehicle?.vehicleId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>
                          {start} → {end}
                        </span>
                        <span className="muted">{booking.bookingDetails?.totalDays || 0} day(s)</span>
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
                          onChange={(event) => handleStatusDraftChange(booking._id, event.target.value)}
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
                          disabled={isUpdating || booking.status === "cancelled"}
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

function PaymentsManagementPanel({
  payments = [],
  payouts = [],
  paymentsLoading,
  payoutsLoading,
  paymentsError,
  payoutsError,
  onRefresh,
}) {
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [payoutDrafts, setPayoutDrafts] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  const currency = payments.find((payment) => payment.currency)?.currency || DEFAULT_CURRENCY;

  const getBookingLabel = (payment) => {
    const booking = payment?.booking || payment?.bookingId;
    if (!booking) return "-";
    if (typeof booking === "string") return booking;
    return booking.bookingId || booking._id || booking.id || "-";
  };

  const getDriverLabel = (payout) => {
    const driver = payout?.driver || payout?.driverId;
    if (!driver) return "-";
    if (typeof driver === "string") return driver;
    return getUserName(driver);
  };

  const handleDownloadReport = useCallback(() => {
    if (!payments.length && !payouts.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    const totalPayments = payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalPayouts = payouts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    doc.setFontSize(18);
    doc.text("Payments & Payouts Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Payments: ${payments.length} · Payouts: ${payouts.length}`, marginLeft, headerY + 35);
    doc.text(
      `Totals: Payments ${formatCurrency(totalPayments, currency)} · Payouts ${formatCurrency(totalPayouts, currency)}`,
      marginLeft,
      headerY + 50
    );

    let tableY = headerY + 75;

    if (payments.length) {
      autoTable(doc, {
        startY: tableY,
        head: [["Payment", "Booking", "Customer", "Amount", "Status", "Processed"]],
        body: payments.map((payment) => [
          payment.paymentId || payment._id,
          getBookingLabel(payment),
          payment.customer ? getUserName(payment.customer) : payment.customerId || "-",
          formatCurrency(payment.amount, payment.currency || currency),
          payment.status ? payment.status.replace(/_/g, " ") : "-",
          formatDateTime(payment.updatedAt || payment.processedAt || payment.createdAt),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        columnStyles: {
          0: { halign: "center", cellWidth: 90 },
          3: { halign: "right", cellWidth: 120 },
          4: { halign: "center", cellWidth: 100 },
        },
      });
      tableY = doc.lastAutoTable.finalY + 30;
    }

    if (payouts.length) {
      autoTable(doc, {
        startY: tableY,
        head: [["Payout", "Driver", "Amount", "Status", "Updated"]],
        body: payouts.map((payout) => [
          payout.paymentId || payout._id,
          getDriverLabel(payout),
          formatCurrency(payout.amount, payout.currency || currency),
          payout.status ? payout.status.replace(/_/g, " ") : "-",
          formatDateTime(payout.updatedAt || payout.processedAt || payout.createdAt),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        columnStyles: {
          0: { halign: "center", cellWidth: 90 },
          2: { halign: "right", cellWidth: 120 },
          3: { halign: "center", cellWidth: 100 },
        },
      });
    }

    doc.save("payments-payouts-report.pdf");
  }, [payments, payouts, currency]);

  const paymentStatusOptions = useMemo(
    () => (payment) => {
      const options = new Set([...PAYMENT_STATUSES, payment.status]);
      return Array.from(options);
    },
    []
  );

  const payoutStatusOptions = useMemo(
    () => (payout) => {
      const options = new Set([...PAYOUT_STATUSES, payout.status]);
      return Array.from(options);
    },
    []
  );

  const handlePaymentDraftChange = (paymentId, status) => {
    setPaymentDrafts((prev) => ({ ...prev, [paymentId]: status }));
  };

  const handlePayoutDraftChange = (payoutId, status) => {
    setPayoutDrafts((prev) => ({ ...prev, [payoutId]: status }));
  };

  const updatePaymentStatus = async (payment) => {
    const desiredStatus = paymentDrafts[payment._id] || payment.status;
    if (!desiredStatus || desiredStatus === payment.status) return;

    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/payments/${payment._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: desiredStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update payment");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePayoutStatus = async (payout) => {
    const desiredStatus = payoutDrafts[payout._id] || payout.status;
    if (!desiredStatus || desiredStatus === payout.status) return;

    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/driver-payments/${payout._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: desiredStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update payout");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshDisabled = paymentsLoading || payoutsLoading;
  const downloadDisabled = refreshDisabled || (payments.length === 0 && payouts.length === 0);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Payments &amp; Payouts</h3>
          <p className="panel-subtitle">Reconcile customer transactions and driver disbursements.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadDisabled}
          >
            Download PDF
          </button>
          <button className="btn btn-secondary" type="button" onClick={onRefresh} disabled={refreshDisabled}>
            Refresh
          </button>
        </div>
      </header>
      {paymentsError && <p className="error-text">{paymentsError}</p>}
      {payoutsError && <p className="error-text">{payoutsError}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      <div className="two-column">
        <div className="management-subpanel">
          <h4>Customer payments</h4>
          {paymentsLoading ? (
            <p>Loading payments…</p>
          ) : payments.length === 0 ? (
            <p>No payments recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{payment.paymentId}</strong>
                          <span className="muted">{formatDate(payment.processedAt || payment.createdAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{getUserName(payment.customerId)}</span>
                          <span className="muted">{payment.customerId?.email}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(payment.amount, payment.currency || currency)}</td>
                      <td>
                        <StatusPill value={payment.status} />
                      </td>
                      <td>
                        <div className="row-inline">
                          <select
                            className="input-control"
                            value={paymentDrafts[payment._id] || payment.status}
                            onChange={(event) => handlePaymentDraftChange(payment._id, event.target.value)}
                          >
                            {paymentStatusOptions(payment).map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePaymentStatus(payment)}
                          >
                            {isUpdating ? "Saving…" : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="management-subpanel">
          <h4>Driver payouts</h4>
          {payoutsLoading ? (
            <p>Loading payouts…</p>
          ) : payouts.length === 0 ? (
            <p>No driver payouts recorded.</p>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Payout</th>
                    <th>Driver</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{payout.paymentId}</strong>
                          <span className="muted">{formatDate(payout.processedAt || payout.createdAt)}</span>
                        </div>
                      </td>
                      <td>{payout.driverId || "-"}</td>
                      <td>{formatCurrency(payout.amount, payout.currency || currency)}</td>
                      <td>
                        <StatusPill value={payout.status} />
                      </td>
                      <td>
                        <div className="row-inline">
                          <select
                            className="input-control"
                            value={payoutDrafts[payout._id] || payout.status}
                            onChange={(event) => handlePayoutDraftChange(payout._id, event.target.value)}
                          >
                            {payoutStatusOptions(payout).map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePayoutStatus(payout)}
                          >
                            {isUpdating ? "Saving…" : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function AdminDashboard() {
  const { user, logout } = useAuth();

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
    <div className="dashboard-container admin-page">
      <header className="dashboard-header admin-hero">
        <div className="admin-hero-copy">
          <span className="eyebrow">Administration</span>
          <h1>Welcome back, {user?.profile?.firstName || user?.email}</h1>
          <p className="hero-subtitle">
            Monitor approvals, manage platform activity, and keep operations running smoothly from one place.
          </p>
        </div>
        <nav className="dashboard-nav">
          <Link to="/">View site</Link>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>

      <div className="panel-stack">
       
        <OverviewSection metrics={metrics} currency={currency} onRefresh={refreshAll} isLoading={overviewLoading} />
         <FinancialManagementPanel />
         <AnnouncementManagementPanel adminId={user?._id} />
        <div className="admin-panels">
          <AdvertisementForm adminId={user?._id} />
        </div>
        

        <UserManagementPanel
          users={usersResource.data}
          isLoading={usersResource.isLoading}
          error={usersResource.error}
          onRefresh={refreshUsers}
        />
        <VehicleManagementPanel
          vehicles={vehiclesResource.data}
          owners={usersResource.data}
          isLoading={vehiclesResource.isLoading}
          error={vehiclesResource.error}
          onRefresh={refreshVehicles}
        />
        <BookingManagementPanel
          bookings={bookingsResource.data}
          vehicles={vehiclesResource.data}
          users={usersResource.data}
          isLoading={bookingsResource.isLoading}
          error={bookingsResource.error}
          onRefresh={refreshBookings}
        />
        <PaymentsManagementPanel
          payments={paymentsResource.data}
          payouts={payoutsResource.data}
          paymentsLoading={paymentsResource.isLoading}
          payoutsLoading={payoutsResource.isLoading}
          paymentsError={paymentsResource.error}
          payoutsError={payoutsResource.error}
          onRefresh={async () => {
            await Promise.all([
              refreshPayments(),
              refreshPayouts(),
            ]);
          }}
        />
        


      </div>
    </div>
  );
}

export default AdminDashboard;