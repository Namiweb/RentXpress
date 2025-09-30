function ProfilePreferences({
  profileForm,
  onChange,
  onSubmit,
  submitting,
  error,
  vehicleCategories,
}) {
  return (
    <section className="customer-panel">
      <div className="panel-header">
        <div>
          <h2>Profile & preferences</h2>
          <p>Make sure your contact details and preferred vehicle type are current.</p>
        </div>
      </div>

      <form className="profile-grid" onSubmit={onSubmit}>
        <label>
          First name
          <input
            name="firstName"
            value={profileForm.firstName}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            value={profileForm.lastName}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Phone number
          <input
            name="phoneNumber"
            value={profileForm.phoneNumber}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Date of birth
          <input
            name="dateOfBirth"
            type="date"
            value={profileForm.dateOfBirth}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Preferred vehicle type
          <select
            name="preferredVehicleType"
            value={profileForm.preferredVehicleType}
            onChange={onChange}
          >
            {vehicleCategories
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="profile-actions">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfilePreferences;
