import { X } from "lucide-react";

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

function FeedbackModal({ feedbacks, bookingsMap, vehiclesMap, isLoading, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Vehicle Feedback & Reviews
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ 
          padding: '1.5rem',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading feedback...</p>
            </div>
          )}
          
          {!isLoading && feedbacks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💬</div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#374151' }}>No feedback received yet</h4>
              <p style={{ margin: '0', color: '#6b7280' }}>
                Customer feedback will appear here once you start receiving reviews for your vehicles.
              </p>
            </div>
          )}
          
          {!isLoading && feedbacks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {feedbacks.map((feedback) => {
                const booking = bookingsMap[normalizeId(feedback.bookingId)];
                const vehicle = booking ? vehiclesMap[normalizeId(booking.vehicleId)] : undefined;
                const vehicleNameParts = [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model].filter(
                  (part) => typeof part === "string" && part.trim()
                );
                const vehicleLabel =
                  (vehicleNameParts.length ? vehicleNameParts.join(" ") : undefined) ||
                  vehicle?.basicInfo?.displayName ||
                  "Vehicle";
                const licensePlate =
                  (typeof vehicle?.basicInfo?.licensePlate === "string" && vehicle.basicInfo.licensePlate.trim()) ||
                  "License plate unavailable";
                const ratingValue = [
                  feedback.ratings?.vehicleRating,
                  feedback.ratings?.overallRating,
                  feedback.ratings?.serviceRating,
                ].find((value) => typeof value === "number" && !Number.isNaN(value));
                const vehicleComment =
                  (typeof feedback.comments?.vehicleComment === "string" &&
                    feedback.comments.vehicleComment.trim()) || "";
                const serviceComment =
                  (typeof feedback.comments?.serviceComment === "string" &&
                    feedback.comments.serviceComment.trim()) || "";
                const suggestionComment =
                  (typeof feedback.suggestions === "string" && feedback.suggestions.trim()) || "";
                const comment = vehicleComment || serviceComment || suggestionComment || "No comment provided.";
                
                return (
                  <div key={feedback._id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '16px', fontWeight: '600' }}>
                          {vehicleLabel}
                        </h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                          License Plate: {licensePlate}
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#9ca3af' }}>
                          Reviewed on {formatDate(feedback.createdAt, true)}
                        </p>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        {typeof ratingValue === "number" ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                              {ratingValue}/5
                            </span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[...Array(5)].map((_, index) => (
                                <span 
                                  key={index}
                                  style={{ 
                                    color: index < ratingValue ? '#f59e0b' : '#d1d5db',
                                    fontSize: '14px'
                                  }}
                                >
                                  ⭐
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span style={{ 
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            borderRadius: '12px'
                          }}>
                            Not rated
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer Comments */}
                    <div style={{ 
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h5 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        Customer Feedback
                      </h5>
                      <p style={{ margin: '0', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                        {comment}
                      </p>
                    </div>

                    {/* Additional Details */}
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.5rem',
                      marginTop: '1rem',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>Booking ID:</span>
                        <span style={{ marginLeft: '0.25rem' }}>{feedback.bookingId}</span>
                      </div>
                      {feedback.wouldRecommend !== undefined && (
                        <div>
                          <span style={{ fontWeight: '500' }}>Would Recommend:</span>
                          <span style={{ 
                            marginLeft: '0.25rem',
                            color: feedback.wouldRecommend ? '#10b981' : '#ef4444'
                          }}>
                            {feedback.wouldRecommend ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Individual Rating Breakdown if available */}
                    {(feedback.ratings?.vehicleRating || feedback.ratings?.serviceRating || feedback.ratings?.overallRating) && (
                      <div style={{ 
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px'
                      }}>
                        <h6 style={{ margin: '0 0 0.5rem', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                          Rating Breakdown
                        </h6>
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '0.5rem',
                          fontSize: '11px'
                        }}>
                          {feedback.ratings.vehicleRating && (
                            <div>
                              <span style={{ color: '#6b7280' }}>Vehicle: </span>
                              <span style={{ fontWeight: '500' }}>{feedback.ratings.vehicleRating}/5</span>
                            </div>
                          )}
                          {feedback.ratings.serviceRating && (
                            <div>
                              <span style={{ color: '#6b7280' }}>Service: </span>
                              <span style={{ fontWeight: '500' }}>{feedback.ratings.serviceRating}/5</span>
                            </div>
                          )}
                          {feedback.ratings.overallRating && (
                            <div>
                              <span style={{ color: '#6b7280' }}>Overall: </span>
                              <span style={{ fontWeight: '500' }}>{feedback.ratings.overallRating}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
            Showing {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} across all your vehicles
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;