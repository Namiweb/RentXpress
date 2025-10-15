function ProfilePreferences({
  profileForm,
  onChange,
  onSubmit,
  submitting,
  error,
  vehicleCategories,
}) {
  return (
    <section className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Profile & Preferences</h2>
          <p className="text-neutral-300">Make sure your contact details and preferred vehicle type are current.</p>
        </div>
      </div>

      {/* Profile Form */}
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">
              First Name <span className="text-red-400">*</span>
            </span>
            <input
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              name="firstName"
              value={profileForm.firstName}
              onChange={onChange}
              placeholder="Enter your first name"
              required
            />
          </label>

          {/* Last Name */}
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">
              Last Name <span className="text-red-400">*</span>
            </span>
            <input
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              name="lastName"
              value={profileForm.lastName}
              onChange={onChange}
              placeholder="Enter your last name"
              required
            />
          </label>

          {/* Phone Number */}
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">
              Phone Number <span className="text-red-400">*</span>
            </span>
            <input
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              name="phoneNumber"
              value={profileForm.phoneNumber}
              onChange={onChange}
              placeholder="Enter your phone number"
              required
            />
          </label>

          {/* Date of Birth */}
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">
              Date of Birth <span className="text-red-400">*</span>
            </span>
            <input
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              name="dateOfBirth"
              type="date"
              value={profileForm.dateOfBirth}
              onChange={onChange}
              required
            />
          </label>
        </div>

        {/* Preferred Vehicle Type - Full Width */}
        <label className="block">
          <span className="text-neutral-300 text-sm font-medium mb-2 block">
            Preferred Vehicle Type
          </span>
          <select
            className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            name="preferredVehicleType"
            value={profileForm.preferredVehicleType}
            onChange={onChange}
          >
            {vehicleCategories
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.value} value={option.value} className="bg-neutral-700">
                  {option.label}
                </option>
              ))}
          </select>
          <p className="text-neutral-400 text-xs mt-2">
            This helps us recommend the best vehicles for your needs
          </p>
        </label>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Current Preferences Summary */}
        <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
          <h3 className="text-white font-semibold mb-3">Current Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">Name:</span>
              <span className="text-white ml-2">
                {profileForm.firstName} {profileForm.lastName}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Phone:</span>
              <span className="text-white ml-2">{profileForm.phoneNumber || "Not set"}</span>
            </div>
            <div>
              <span className="text-neutral-400">Date of Birth:</span>
              <span className="text-white ml-2">
                {profileForm.dateOfBirth ? new Date(profileForm.dateOfBirth).toLocaleDateString() : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Preferred Vehicle:</span>
              <span className="text-white ml-2 capitalize">
                {vehicleCategories.find(cat => cat.value === profileForm.preferredVehicleType)?.label || "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-neutral-700">
          <button 
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] flex items-center justify-center"
            type="submit" 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfilePreferences;