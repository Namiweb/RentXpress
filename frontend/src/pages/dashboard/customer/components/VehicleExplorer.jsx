import {
  CalendarDays as CalendarDaysIcon,
  Filter as FilterIcon,
  Fuel as FuelIcon,
  MapPin as MapPinIcon,
  Search as SearchIcon,
  Settings2 as Settings2Icon,
  Users as UsersIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

function VehicleExplorer({
  filters,
  onFiltersChange,
  onResetFilters,
  vehicles,
  loading,
  error,
  onOpenBooking,
  onOpenDetails,
  formatCurrency,
  categories,
}) {
  const [showFilters, setShowFilters] = useState(true);

  const handleChange = (event) => {
    const { name, value } = event.target;
    onFiltersChange({ [name]: value });
  };

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const resultsLabel = useMemo(() => {
    if (vehicles.length === 0) {
      return "No vehicles found";
    }
    return `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"} found`;
  }, [vehicles.length]);

  const renderSpec = (IconComponent, label) => {
    if (!label) return null;
    return (
      <li>
        <IconComponent size={16} aria-hidden="true" />
        <span>{label}</span>
      </li>
    );
  };

  return (
    <section className="customer-panel">
      <div className="panel-header panel-header--stack">
        <div className="vehicle-search__intro">
          <h2>Available vehicles</h2>
          <p>Use filters to spot the best match for your next trip.</p>
        </div>
        <div className="vehicle-search__bar">
          <div className="vehicle-search__input">
            <SearchIcon size={18} aria-hidden="true" />
            <input
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search by make, model, or city..."
            />
          </div>
          <button type="button" className="vehicle-search__toggle" onClick={toggleFilters}>
            <FilterIcon size={18} aria-hidden="true" />
            <span>{showFilters ? "Hide filters" : "Show filters"}</span>
          </button>
          <button type="button" className="vehicle-search__clear" onClick={onResetFilters}>
            <span>Clear</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <form className="filters-grid filters-grid--elevated">
          <label>
            Vehicle type
            <select name="category" value={filters.category} onChange={handleChange}>
              {categories.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input name="city" value={filters.city} onChange={handleChange} placeholder="Enter city name" />
          </label>
          <label>
            Min daily rate (LKR)
            <input
              type="number"
              min="0"
              name="minRate"
              value={filters.minRate}
              onChange={handleChange}
              placeholder="Min price"
            />
          </label>
          <label>
            Max daily rate (LKR)
            <input
              type="number"
              min="0"
              name="maxRate"
              value={filters.maxRate}
              onChange={handleChange}
              placeholder="Max price"
            />
          </label>
        </form>
      )}

      <div className="vehicle-results">
        <p>{resultsLabel}</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="muted">Loading vehicles...</p>
      ) : (
        <div className="vehicle-grid">
          {vehicles.map((vehicle) => {
            const canBook =
              vehicle.status === "approved" && vehicle.availability?.isAvailable !== false;
           const image =
  vehicle.imageUrl ||
  (vehicle.images?.[0]?.data &&
    `data:${vehicle.images[0].contentType};base64,${vehicle.images[0].data}`) ||
  vehicle.media?.[0]?.url ||
  null;


            const seatsLabel = vehicle.details?.seatingCapacity
              ? `${vehicle.details.seatingCapacity} seats`
              : null;
            const fuelLabel = vehicle.details?.fuelType || null;
            const transmissionLabel = vehicle.details?.transmission || null;
            const yearLabel = vehicle.basicInfo?.year || vehicle.details?.year || null;
            return (
              <article key={vehicle._id} className="vehicle-card">
                <div className="vehicle-card__media">
                 {image ? (
  <img
    src={image}
    alt={`${vehicle.basicInfo?.make || "Vehicle"} ${vehicle.basicInfo?.model || ""}`}
    className="vehicle-card__image"
    loading="lazy"
  />
) : (
  <div className="vehicle-card__media--placeholder" aria-hidden="true">
    <span>No image</span>
  </div>
)}

                  <span className="vehicle-card__price-pill">
                    {formatCurrency(vehicle.pricing?.dailyRate)} / day
                  </span>
                </div>

                <div className="vehicle-card__body">
                  <header className="vehicle-card__header">
                    <h3>
                      {vehicle.basicInfo?.make} {vehicle.basicInfo?.model}
                    </h3>
                    <span className={canBook ? "status-pill status-pill--positive" : "status-pill status-pill--neutral"}>
                      {canBook ? "Available" : "Booked"}
                    </span>
                  </header>

                  <div className="vehicle-card__meta">
                    <span>
                      <MapPinIcon size={16} aria-hidden="true" />
                      {vehicle.location?.city || "Unknown city"}
                    </span>
                    {vehicle.details?.category && <span>· {vehicle.details.category}</span>}
                  </div>

                  <ul className="vehicle-card__specs">
                    {renderSpec(UsersIcon, seatsLabel)}
                    {renderSpec(FuelIcon, fuelLabel)}
                    {renderSpec(Settings2Icon, transmissionLabel)}
                    {renderSpec(CalendarDaysIcon, yearLabel)}
                  </ul>

                  <p className="vehicle-card__description">
                    {vehicle.details?.description || "No additional description provided."}
                  </p>
                </div>

                <footer className="vehicle-card__actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onOpenDetails(vehicle)}
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={!canBook}
                    onClick={() => {
                      if (canBook) {
                        onOpenBooking(vehicle);
                      }
                    }}
                  >
                    {canBook ? "Book now" : "Unavailable"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {!loading && vehicles.length === 0 && (
        <div className="empty-state">
          <p>No vehicles match your current filters.</p>
        </div>
      )}
    </section>
  );
}

export default VehicleExplorer;
