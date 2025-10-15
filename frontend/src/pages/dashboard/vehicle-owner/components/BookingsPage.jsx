import { useState, useMemo } from "react";
import { generateBookingReport } from '../../../../utils/pdfGenerator';

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

function BookingsPage({ bookings, vehiclesMap, isLoading }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    vehicle: true,
    date: true,
    status: true,
    bookingId: true
  });

  const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "started", "in_progress", "in-progress"]);

  // Base filtered bookings by tab
  const baseFiltered = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return bookings.filter((booking) => booking.status === "pending");
      case "ongoing":
        return bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status) && booking.status !== "pending");
      case "past":
        return bookings.filter((booking) => !ACTIVE_BOOKING_STATUSES.has(booking.status));
      default:
        return bookings;
    }
  }, [activeTab, bookings]);

  // Search functionality
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) {
      return baseFiltered;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return baseFiltered.filter((booking) => {
      const vehicleId = normalizeId(booking.vehicleId);
      const vehicle = vehiclesMap[vehicleId];
      
      // Search in vehicle information (make, model, name)
      if (searchFilters.vehicle && vehicle) {
        const vehicleMake = vehicle.basicInfo?.make?.toLowerCase() || '';
        const vehicleModel = vehicle.basicInfo?.model?.toLowerCase() || '';
        const vehicleName = `${vehicleMake} ${vehicleModel}`.trim();
        const vehicleYear = vehicle.basicInfo?.year?.toString() || '';
        
        if (vehicleName.includes(searchLower) || 
            vehicleMake.includes(searchLower) || 
            vehicleModel.includes(searchLower) ||
            vehicleYear.includes(searchLower)) {
          return true;
        }
      }
      
      // Search in dates (pickup and return dates)
      if (searchFilters.date) {
        const pickupDate = formatDate(booking.bookingDetails?.startDate)?.toLowerCase() || '';
        const returnDate = formatDate(booking.bookingDetails?.endDate)?.toLowerCase() || '';
        const pickupTime = booking.bookingDetails?.pickupTime?.toLowerCase() || '';
        const returnTime = booking.bookingDetails?.returnTime?.toLowerCase() || '';
        
        // Search in various date formats
        if (pickupDate.includes(searchLower) || 
            returnDate.includes(searchLower) ||
            pickupTime.includes(searchLower) ||
            returnTime.includes(searchLower)) {
          return true;
        }
        
        // Also search in raw date strings for partial matches
        const startDate = booking.bookingDetails?.startDate;
        const endDate = booking.bookingDetails?.endDate;
        
        if (startDate && startDate.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        if (endDate && endDate.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search for month names, year, etc.
        const pickupDateObj = startDate ? new Date(startDate) : null;
        const returnDateObj = endDate ? new Date(endDate) : null;
        
        if (pickupDateObj) {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthName = monthNames[pickupDateObj.getMonth()];
          const year = pickupDateObj.getFullYear().toString();
          const day = pickupDateObj.getDate().toString();
          
          if (monthName.includes(searchLower) || 
              year.includes(searchLower) ||
              day.includes(searchLower)) {
            return true;
          }
        }
        
        if (returnDateObj) {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthName = monthNames[returnDateObj.getMonth()];
          const year = returnDateObj.getFullYear().toString();
          const day = returnDateObj.getDate().toString();
          
          if (monthName.includes(searchLower) || 
              year.includes(searchLower) ||
              day.includes(searchLower)) {
            return true;
          }
        }
      }
      
      // Search in status
      if (searchFilters.status) {
        const status = booking.status?.toLowerCase() || '';
        if (status.includes(searchLower)) {
          return true;
        }
      }
      
      // Search in booking ID
      if (searchFilters.bookingId) {
        const bookingId = booking._id?.toLowerCase() || '';
        if (bookingId.includes(searchLower)) {
          return true;
        }
      }
      
      return false;
    });
  }, [baseFiltered, searchTerm, searchFilters, vehiclesMap]);

  const handleGenerateReport = async () => {
    if (filtered.length === 0) {
      alert('No bookings available to generate report');
      return;
    }

    setIsGeneratingReport(true);
    try {
      await generateBookingReport(filtered, vehiclesMap, activeTab);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterToggle = (filterName) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const tabs = [
    { id: "pending", label: "Pending" },
    { id: "ongoing", label: "Ongoing" },
    { id: "past", label: "Completed" },
    { id: "all", label: "All" },
  ];

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #171717 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div 
          className="rounded-2xl p-6 shadow-xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #171717 100%)',
            border: '1px solid #262626'
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-2 h-8 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
                ></div>
                <h1 className="text-2xl font-bold text-white">Manage Bookings</h1>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || filtered.length === 0}
                className="flex items-center space-x-2 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                style={{
                  background: isGeneratingReport ? '' : 'linear-gradient(to right, #FF5A00, #EA580C)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  if (!isGeneratingReport && filtered.length > 0) {
                    e.target.style.background = 'linear-gradient(to right, #EA580C, #FF5A00)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isGeneratingReport && filtered.length > 0) {
                    e.target.style.background = 'linear-gradient(to right, #FF5A00, #EA580C)';
                  }
                }}
              >
                {isGeneratingReport ? (
                  <>
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-transparent border-t-white animate-spin"
                    ></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Section */}
            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                border: '1px solid #404040'
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by vehicle, date, status..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full text-white placeholder-gray-400"
                    style={{
                      padding: '12px 40px 12px 16px',
                      background: '#171717',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#FF5A00'}
                    onBlur={(e) => e.target.style.borderColor = '#404040'}
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Search Tips */}
              <div 
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(255, 90, 0, 0.1)',
                  border: '1px solid rgba(255, 90, 0, 0.2)'
                }}
              >
                <p className="text-sm" style={{ color: '#FFA500' }}>
                  <strong>💡 Search tips:</strong> Try searching by vehicle name (Toyota), date (2024, October, 15), 
                  status (pending), or booking ID
                </p>
              </div>

              {/* Search Results Info */}
              {searchTerm && (
                <div 
                  className="rounded-lg p-3 mt-3"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: '#60A5FA' }}>
                    <strong>Search results:</strong> Found {filtered.length} booking{filtered.length !== 1 ? 's' : ''} 
                    {baseFiltered.length !== filtered.length && (
                      <span> (from {baseFiltered.length} total in this view)</span>
                    )}
                    {filtered.length === 0 && (
                      <span> - No bookings match your search criteria</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div 
              className="flex space-x-1 p-1 rounded-lg mb-6"
              style={{
                background: '#171717',
                border: '1px solid #404040'
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="flex-1 py-3 px-4 rounded-md transition-all duration-200 font-medium"
                  style={{
                    background: tab.id === activeTab 
                      ? 'linear-gradient(135deg, #FF5A00, #EA580C)' 
                      : 'transparent',
                    color: tab.id === activeTab ? 'white' : '#9CA3AF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Booking Count Info */}
            {!isLoading && (
              <div 
                className="flex justify-between items-center p-4 rounded-lg mb-6"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <span className="text-gray-300">
                  {searchTerm ? 'Search results: ' : 'Showing '}
                  {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
                  {searchTerm && baseFiltered.length !== filtered.length && (
                    <span> (from {baseFiltered.length} total in "{activeTab}" view)</span>
                  )}
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    background: filtered.length > 0 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : 'rgba(156, 163, 175, 0.2)',
                    color: filtered.length > 0 ? '#4ADE80' : '#9CA3AF',
                    border: filtered.length > 0 
                      ? '1px solid rgba(34, 197, 94, 0.3)' 
                      : '1px solid rgba(156, 163, 175, 0.3)'
                  }}
                >
                  {filtered.length > 0 ? 'Ready for PDF export' : 'No bookings to export'}
                </span>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div 
                className="text-center py-12 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <div 
                  className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-orange-500 animate-spin mx-auto mb-4"
                ></div>
                <p className="text-gray-400">Loading bookings...</p>
              </div>
            )}
            
            {/* Empty States */}
            {!isLoading && filtered.length === 0 && (
              <div 
                className="text-center py-16 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                {searchTerm ? (
                  <>
                    <div className="text-5xl mb-4">🔍</div>
                    <h4 className="text-xl font-semibold text-white mb-2">No matching bookings found</h4>
                    <p className="text-gray-400 mb-2">
                      No bookings match "<strong className="text-orange-400">{searchTerm}</strong>" in the {activeTab} view.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Try adjusting your search terms or check different search filters.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-4">📋</div>
                    <h4 className="text-xl font-semibold text-white mb-2">No bookings in this view</h4>
                    <p className="text-gray-400">
                      Switch to a different tab or wait for customers to book your vehicles.
                    </p>
                  </>
                )}
              </div>
            )}
            
            {/* Booking List */}
            {!isLoading && filtered.length > 0 && (
              <div className="grid gap-4">
                {filtered.map((booking) => {
                  const vehicleId = normalizeId(booking.vehicleId);
                  const vehicle = vehiclesMap[vehicleId];
                  const vehicleLabel =
                    [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model]
                      .filter((value) => typeof value === "string" && value.trim())
                      .join(" ") ||
                    vehicle?.basicInfo?.displayName ||
                    "Vehicle";
                  const licensePlate =
                    (typeof vehicle?.basicInfo?.licensePlate === "string" && vehicle.basicInfo.licensePlate.trim()) ||
                    "N/A";
                  const pickupDate = formatDate(booking.bookingDetails?.startDate);
                  const dropoffDate = formatDate(booking.bookingDetails?.endDate);
                  const pickupTime = booking.bookingDetails?.pickupTime;
                  const returnTime = booking.bookingDetails?.returnTime;
                  const pickupLabel = pickupTime ? `${pickupDate} at ${pickupTime}` : pickupDate;
                  const dropoffLabel = returnTime ? `${dropoffDate} at ${returnTime}` : dropoffDate;

                  return (
                    <div 
                      key={booking._id}
                      className="rounded-xl p-6 transition-all duration-300 hover:transform hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                        border: '1px solid #404040',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{vehicleLabel}</h3>
                            {vehicle?.basicInfo?.year && (
                              <span className="text-gray-400 ml-2">
                                ({vehicle.basicInfo.year})
                              </span>
                            )}
                          </div>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: 
                                booking.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' :
                                ACTIVE_BOOKING_STATUSES.has(booking.status) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                              color:
                                booking.status === 'pending' ? '#FBBF24' :
                                ACTIVE_BOOKING_STATUSES.has(booking.status) ? '#4ADE80' : '#9CA3AF',
                              border: 
                                booking.status === 'pending' ? '1px solid rgba(245, 158, 11, 0.3)' :
                                ACTIVE_BOOKING_STATUSES.has(booking.status) ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)'
                            }}
                          >
                            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Pickup</span>
                            <p className="text-white mt-1">{pickupLabel}</p>
                          </div>
                          {dropoffDate !== "-" && (
                            <div>
                              <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Return</span>
                              <p className="text-white mt-1">{dropoffLabel}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            Booking ID: {booking._id?.slice(-8)}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            Plate: {licensePlate}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Background decorative elements */}
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: '#FF5A00', opacity: 0.05 }}
          ></div>
          <div 
            className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl"
            style={{ backgroundColor: '#FF5A00', opacity: 0.05 }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default BookingsPage;