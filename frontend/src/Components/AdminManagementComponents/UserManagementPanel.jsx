import { useMemo, useState } from "react";
import { apiRequest } from "../../services/api";
import { getUserName } from "../../utils/getUserName";
import { formatDate } from "../../utils/formatDate";
import StatusPill from "../StatusPill";

const USER_ROLES = [
  "customer",
  "driver",
  "vehicle_owner",
  "inspector",
  "admin",
];
const USER_STATUSES = [
  "pending_verification",
  "active",
  "inactive",
  "suspended",
];

const UserManagementPanel = ({ users = [], isLoading, error, onRefresh }) => {
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

export default UserManagementPanel;