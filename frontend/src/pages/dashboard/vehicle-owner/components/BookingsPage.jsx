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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="driver-panel">
        <header className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Manage Bookings</h3>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || filtered.length === 0}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: isGeneratingReport ? '#6b7280' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: isGeneratingReport || filtered.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isGeneratingReport || filtered.length === 0 ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isGeneratingReport ? (
              <>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Generating PDF...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                Download PDF Report
              </>
            )}
          </button>
        </header>

        {/* Search Section */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px', 
          margin: '16px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search by vehicle, date..."
                value={searchTerm}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Search Tips */}
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#0369a1',
            border: '1px solid #bae6fd'
          }}>
            <strong>💡 Search tips:</strong> Try searching by vehicle name (Toyota), date (2024, October, 15), 
            status (pending), or booking ID
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              backgroundColor: '#dbeafe', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              <strong>Search results:</strong> Found {filtered.length} booking{filtered.length !== 1 ? 's' : ''} 
              {baseFiltered.length !== filtered.length && (
                <span> (from {baseFiltered.length} total in this view)</span>
              )}
              {filtered.length === 0 && (
                <span> - No bookings match your search criteria</span>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: tab.id === activeTab ? '2px solid #3b82f6' : '2px solid transparent',
                color: tab.id === activeTab ? '#3b82f6' : '#6b7280',
                fontWeight: tab.id === activeTab ? '600' : '400',
                fontSize: '14px'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Booking Count Info */}
        {!isLoading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 0',
            fontSize: '14px',
            color: '#6b7280',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '1rem'
          }}>
            <span>
              {searchTerm ? 'Search results: ' : 'Showing '}
              {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
              {searchTerm && baseFiltered.length !== filtered.length && (
                <span> (from {baseFiltered.length} total in "{activeTab}" view)</span>
              )}
            </span>
            <span style={{ 
              padding: '4px 8px', 
              backgroundColor: filtered.length > 0 ? '#dcfce7' : '#f3f4f6',
              color: filtered.length > 0 ? '#166534' : '#6b7280',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {filtered.length > 0 ? 'Ready for PDF export' : 'No bookings to export'}
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            Loading bookings...
          </div>
        )}
        
        {/* Empty States */}
        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {searchTerm ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h4 style={{ margin: '0 0 8px', color: '#374151' }}>No matching bookings found</h4>
                <p style={{ margin: 0 }}>
                  No bookings match "<strong>{searchTerm}</strong>" in the {activeTab} view.
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
                  Try adjusting your search terms or check different search filters.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h4 style={{ margin: '0 0 8px', color: '#374151' }}>No bookings in this view</h4>
                <p style={{ margin: 0 }}>
                  Switch to a different tab or wait for customers to book your vehicles.
                </p>
              </>
            )}
          </div>
        )}
        
        {/* Booking List */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '1rem' }}>
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
                <div key={booking._id} style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px', 
                  padding: '1.5rem',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '16px', color: '#1f2937' }}>{vehicleLabel}</strong>
                        {vehicle?.basicInfo?.year && (
                          <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px' }}>
                            ({vehicle.basicInfo.year})
                          </span>
                        )}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: 
                          booking.status === 'pending' ? '#fef3c7' :
                          ACTIVE_BOOKING_STATUSES.has(booking.status) ? '#dcfce7' : '#f3f4f6',
                        color:
                          booking.status === 'pending' ? '#92400e' :
                          ACTIVE_BOOKING_STATUSES.has(booking.status) ? '#166534' : '#374151'
                      }}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Pickup</span>
                        <p style={{ margin: '2px 0 0', color: '#374151' }}>{pickupLabel}</p>
                      </div>
                      {dropoffDate !== "-" && (
                        <div>
                          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Return</span>
                          <p style={{ margin: '2px 0 0', color: '#374151' }}>{dropoffLabel}</p>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                        Booking ID: {booking._id}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                        Plate: {licensePlate}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add CSS for spinner animation */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </section>
    </div>
  );
}

export default BookingsPage;