import { useState } from "react";

const AnnouncementForm = ({ announcement, onClose, onSubmit, isSubmitting }) => {
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
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <form 
        className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn"
        onSubmit={handleSubmit} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-gradient-to-r from-neutral-800 to-neutral-900 px-6 py-5 border-b border-neutral-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#FF5A00]/10 rounded-lg border border-[#FF5A00]/20">
                <svg className="w-6 h-6 text-[#FF5A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {announcement ? "Edit Announcement" : "Create New Announcement"}
                </h2>
                <p className="text-gray-400 mt-1">
                  {announcement ? "Update announcement details" : "Create a new platform announcement"}
                </p>
              </div>
            </div>
            <button 
              className="p-2 hover:bg-neutral-700 rounded-lg transition-colors duration-200 group"
              type="button" 
              onClick={onClose}
            >
              <svg className="w-6 h-6 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 placeholder-gray-500 text-white"
                placeholder="Enter announcement title..."
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Grid Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="draft" required>Draft</option>
                  <option value="published" required>Published</option>
                </select>
              </div>
              
              {/* Priority Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 text-white"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Content Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Content <span className="text-red-400">*</span>
              </label>
              <textarea
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600/50 rounded-xl focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-all duration-200 placeholder-gray-500 text-white resize-none"
                placeholder="Write your announcement content here..."
                name="content"
                rows={5}
                value={formData.content}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
                <p className="text-sm text-gray-400">
                  Character count: <span className="text-white font-medium">{formData.content.length}</span>
                </p>
                <p className="text-sm">
                  {formData.content.length > 500 ? (
                    <span className="text-orange-400 font-medium">
                      Consider breaking into shorter paragraphs
                    </span>
                  ) : (
                    <span className="text-gray-400">Keep it clear and concise</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-neutral-800/50 border-t border-neutral-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>All fields marked with * are required</span>
            </div>
            <div className="flex space-x-3">
              <button 
                className="px-6 py-3 border border-neutral-600 text-gray-300 rounded-xl font-medium hover:bg-neutral-700 hover:text-white transition-all duration-200 flex items-center space-x-2"
                type="button" 
                onClick={onClose}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </button>
              <button 
                className="px-6 py-3 bg-[#FF5A00] text-white rounded-xl font-medium hover:bg-[#FF5A00]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30"
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{announcement ? "Update Announcement" : "Create Announcement"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
}

export default AnnouncementForm;