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
    <section className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/40 p-6 backdrop-blur-sm">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-700/30">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            User Management
          </h3>
          <p className="text-gray-400 mt-1 text-sm">
            Approve new users, adjust roles, and keep accounts up to date.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <input
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
            type="search"
            placeholder="Search by name, email, or ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <svg className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select 
          className="px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
          value={roleFilter} 
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="all">All roles</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select 
          className="px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
          value={statusFilter} 
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {USER_STATUSES.map((status) => (
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
            <span>Loading users…</span>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-700/50 rounded-lg">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <p className="text-gray-400">No users match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-neutral-700/50 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/80 border-b border-neutral-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {filteredUsers.map((userRecord) => (
                  <tr key={userRecord._id} className="hover:bg-neutral-800/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <strong className="text-white font-medium">{getUserName(userRecord)}</strong>
                        <span className="text-gray-400 text-sm mt-1">{userRecord.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {userRecord.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill value={userRecord.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-300">{formatDate(userRecord.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          type="button"
                          disabled={isUpdating || userRecord.status === "active"}
                          onClick={() => handleStatusUpdate(userRecord._id, "active")}
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          type="button"
                          disabled={isUpdating || userRecord.status === "inactive"}
                          onClick={() => handleStatusUpdate(userRecord._id, "inactive")}
                        >
                          Deactivate
                        </button>
                        <button 
                          className="px-3 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white text-sm font-medium rounded transition-all duration-200 whitespace-nowrap"
                          type="button" 
                          onClick={() => openEditModal(userRecord)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form 
            className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn"
            onSubmit={handleEditSubmit} 
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between p-6 border-b border-neutral-700/50">
              <div>
                <h3 className="text-xl font-bold text-white">Edit User</h3>
                <p className="text-gray-400 mt-1 text-sm">Update profile details, role, and status.</p>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-all duration-200"
                type="button" 
                onClick={closeEditModal}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">First name</span>
                  <input
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Last name</span>
                  <input
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Email</span>
                  <input
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Phone number</span>
                  <input
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
                    name="phoneNumber"
                    value={editForm.phoneNumber}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Date of birth</span>
                  <input
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200"
                    type="date"
                    name="dateOfBirth"
                    value={editForm.dateOfBirth}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Role</span>
                  <select
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                <label className="block">
                  <span className="text-sm font-medium text-gray-300 mb-2 block">Status</span>
                  <select
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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

            {/* Modal Footer */}
            <footer className="flex justify-end gap-3 p-6 border-t border-neutral-700/50">
              <button 
                className="px-4 py-2 bg-transparent hover:bg-neutral-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200 border border-neutral-600/50"
                type="button" 
                onClick={closeEditModal}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit" 
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving…
                  </div>
                ) : "Save changes"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

export default UserManagementPanel;