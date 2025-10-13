import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import { formatDate } from "../../utils/formatDate";
import AnnouncementForm from "./AnnouncementForm";
import StatusPill from "../StatusPill";

const AnnouncementManagementPanel = ({ adminId }) => {
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
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-gray-600 mt-1">Manage platform announcements and updates</p>
            </div>
          </div>
          <button 
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button" 
            onClick={() => setShowForm(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Announcement</span>
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-4 animate-fade-in">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading announcements...</p>
            <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Get started by creating your first announcement to share important updates with users.
            </p>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              onClick={() => setShowForm(true)}
            >
              Create First Announcement
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Announcement
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {announcements.map((announcement) => (
                    <tr key={announcement._id} className="hover:bg-blue-50/30 transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <strong className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                              {announcement.title}
                            </strong>
                            {announcement.status === 'published' && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                Live
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {announcement.content.substring(0, 120)}
                            {announcement.content.length > 120 && '...'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill value={announcement.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          announcement.priority === 'high' 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : announcement.priority === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(announcement.createdAt)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(announcement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                            value={announcement.status}
                            onChange={(e) => handleStatusUpdate(announcement._id, e.target.value)}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Publish</option>
                            
                          </select>
                          <button
                            className="flex items-center space-x-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm"
                            type="button"
                            onClick={() => handleEdit(announcement)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            className="flex items-center space-x-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm"
                            type="button"
                            onClick={() => handleDelete(announcement._id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
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
      </div>

      {/* Announcement Form Modal */}
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

export default AnnouncementManagementPanel;