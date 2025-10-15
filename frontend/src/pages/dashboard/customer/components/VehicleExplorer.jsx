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
      <li className="flex items-center gap-2 text-neutral-300 text-sm">
        <IconComponent size={16} aria-hidden="true" className="text-neutral-400" />
        <span>{label}</span>
      </li>
    );
  };

  return (
    <section className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      {/* Header Section */}
      <div className="mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Available Vehicles</h2>
          <p className="text-neutral-300">Use filters to spot the best match for your next trip.</p>
        </div>
        
        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              className="w-full bg-neutral-700 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search by make, model, or city..."
            />
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-500 text-white px-4 py-3 rounded-lg border border-neutral-700 transition-colors"
              onClick={toggleFilters}
            >
              <FilterIcon size={18} aria-hidden="true" />
              <span>{showFilters ? "Hide filters" : "Show filters"}</span>
            </button>
            
            <button 
              type="button" 
              className="bg-neutral-700 hover:bg-neutral-500 text-white px-4 py-3 rounded-lg border border-neutral-700 transition-colors"
              onClick={onResetFilters}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-neutral-700 rounded-lg border border-neutral-500">
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">Vehicle Type</span>
            <select 
              className="w-full bg-neutral-600 border border-neutral-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              name="category" 
              value={filters.category} 
              onChange={handleChange}
            >
              {categories.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">City</span>
            <input 
              className="w-full bg-neutral-600 border border-neutral-500 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              name="city" 
              value={filters.city} 
              onChange={handleChange} 
              placeholder="Enter city name" 
            />
          </label>
          
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">Min Daily Rate (LKR)</span>
            <input
              type="number"
              min="0"
              className="w-full bg-neutral-600 border border-neutral-500 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              name="minRate"
              value={filters.minRate}
              onChange={handleChange}
              placeholder="Min price"
            />
          </label>
          
          <label className="block">
            <span className="text-neutral-300 text-sm font-medium mb-2 block">Max Daily Rate (LKR)</span>
            <input
              type="number"
              min="0"
              className="w-full bg-neutral-600 border border-neutral-500 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              name="maxRate"
              value={filters.maxRate}
              onChange={handleChange}
              placeholder="Max price"
            />
          </label>
        </form>
      )}

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-neutral-300 font-medium">{resultsLabel}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 bg-neutral-600 rounded-lg">
          <p className="text-neutral-300 text-lg">Loading vehicles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <article key={vehicle._id} className="bg-neutral-900 rounded-lg overflow-hidden shadow-lg border border-neutral-900 hover:border-neutral-400 transition-all duration-300 hover:shadow-xl">
                {/* Image Section */}
                <div className="relative h-48 bg-neutral-700 overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={`${vehicle.basicInfo?.make || "Vehicle"} ${vehicle.basicInfo?.model || ""}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-700" aria-hidden="true">
                      <span className="text-neutral-400">No image available</span>
                    </div>
                  )}
                  
                  {/* Price Badge */}
                  <span className="absolute top-3 right-3 bg-neutral-950 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                    {formatCurrency(vehicle.pricing?.dailyRate)} / day
                  </span>
                  
                  {/* Availability Badge */}
                  <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                    canBook 
                      ? "bg-green-500 text-white" 
                      : "bg-red-500 text-white"
                  }`}>
                    {canBook ? "Available" : "Booked"}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-4">
                  {/* Header */}
                  <header className="mb-3">
                    <h3 className="text-white font-semibold text-lg truncate mb-1">
                      {vehicle.basicInfo?.make} {vehicle.basicInfo?.model}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                      <MapPinIcon size={16} aria-hidden="true" />
                      <span>{vehicle.location?.city || "Unknown city"}</span>
                      {vehicle.details?.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{vehicle.details.category}</span>
                        </>
                      )}
                    </div>
                  </header>

                  {/* Specifications */}
                  <ul className="grid grid-cols-2 gap-2 mb-3">
                    {renderSpec(UsersIcon, seatsLabel)}
                    {renderSpec(FuelIcon, fuelLabel)}
                    {renderSpec(Settings2Icon, transmissionLabel)}
                    {renderSpec(CalendarDaysIcon, yearLabel)}
                  </ul>

                  {/* Description */}
                  <p className="text-neutral-300 text-sm line-clamp-2 mb-4">
                    {vehicle.details?.description || "No additional description provided."}
                  </p>

                  {/* Actions */}
                  <footer className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 bg-neutral-700 hover:bg-neutral-400 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => onOpenDetails(vehicle)}
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        canBook
                          ? "bg-neutral-700 hover:bg-orange-600 text-white"
                          : "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                      }`}
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && vehicles.length === 0 && (
        <div className="text-center py-12 bg-neutral-600 rounded-lg">
          <p className="text-neutral-300 text-lg">No vehicles match your current filters.</p>
          <p className="text-neutral-400 mt-2">Try adjusting your search criteria</p>
        </div>
      )}
    </section>
  );
}

export default VehicleExplorer;