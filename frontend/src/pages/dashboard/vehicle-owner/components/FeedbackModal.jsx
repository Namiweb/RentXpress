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

  // return (
  //   <div style={{
  //     position: 'fixed',
  //     top: 0,
  //     left: 0,
  //     right: 0,
  //     bottom: 0,
  //     backgroundColor: 'rgba(0, 0, 0, 0.5)',
  //     display: 'flex',
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //     zIndex: 1000
  //   }}>
  //     <div style={{
  //       backgroundColor: 'white',
  //       borderRadius: '12px',
  //       width: '90%',
  //       maxWidth: '700px',
  //       maxHeight: '90vh',
  //       overflow: 'hidden',
  //       boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  //     }}>
  //       {/* Modal Header */}
  //       <div style={{
  //         display: 'flex',
  //         justifyContent: 'space-between',
  //         alignItems: 'center',
  //         padding: '1.5rem',
  //         borderBottom: '1px solid #e5e7eb'
  //       }}>
  //         <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
  //           Vehicle Feedback & Reviews
  //         </h3>
  //         <button
  //           type="button"
  //           onClick={onClose}
  //           style={{
  //             padding: '8px',
  //             border: 'none',
  //             backgroundColor: 'transparent',
  //             cursor: 'pointer',
  //             borderRadius: '6px'
  //           }}
  //         >
  //           <X size={20} />
  //         </button>
  //       </div>

  //       {/* Modal Content */}
  //       <div style={{ 
  //         padding: '1.5rem',
  //         maxHeight: '70vh',
  //         overflowY: 'auto'
  //       }}>
  //         {isLoading && (
  //           <div style={{ textAlign: 'center', padding: '2rem' }}>
  //             <p>Loading feedback...</p>
  //           </div>
  //         )}
          
  //         {!isLoading && feedbacks.length === 0 && (
  //           <div style={{ textAlign: 'center', padding: '3rem' }}>
  //             <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💬</div>
  //             <h4 style={{ margin: '0 0 0.5rem', color: '#374151' }}>No feedback received yet</h4>
  //             <p style={{ margin: '0', color: '#6b7280' }}>
  //               Customer feedback will appear here once you start receiving reviews for your vehicles.
  //             </p>
  //           </div>
  //         )}
          
  //         {!isLoading && feedbacks.length > 0 && (
  //           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
  //             {feedbacks.map((feedback) => {
  //               const booking = bookingsMap[normalizeId(feedback.bookingId)];
  //               const vehicle = booking ? vehiclesMap[normalizeId(booking.vehicleId)] : undefined;
  //               const vehicleNameParts = [vehicle?.basicInfo?.make, vehicle?.basicInfo?.model].filter(
  //                 (part) => typeof part === "string" && part.trim()
  //               );
  //               const vehicleLabel =
  //                 (vehicleNameParts.length ? vehicleNameParts.join(" ") : undefined) ||
  //                 vehicle?.basicInfo?.displayName ||
  //                 "Vehicle";
  //               const licensePlate =
  //                 (typeof vehicle?.basicInfo?.licensePlate === "string" && vehicle.basicInfo.licensePlate.trim()) ||
  //                 "License plate unavailable";
  //               const ratingValue = [
  //                 feedback.ratings?.vehicleRating,
  //                 feedback.ratings?.overallRating,
  //                 feedback.ratings?.serviceRating,
  //               ].find((value) => typeof value === "number" && !Number.isNaN(value));
  //               const vehicleComment =
  //                 (typeof feedback.comments?.vehicleComment === "string" &&
  //                   feedback.comments.vehicleComment.trim()) || "";
  //               const serviceComment =
  //                 (typeof feedback.comments?.serviceComment === "string" &&
  //                   feedback.comments.serviceComment.trim()) || "";
  //               const suggestionComment =
  //                 (typeof feedback.suggestions === "string" && feedback.suggestions.trim()) || "";
  //               const comment = vehicleComment || serviceComment || suggestionComment || "No comment provided.";
                
  //               return (
  //                 <div key={feedback._id} style={{
  //                   border: '1px solid #e5e7eb',
  //                   borderRadius: '12px',
  //                   padding: '1.5rem',
  //                   backgroundColor: '#f9fafb'
  //                 }}>
  //                   <div style={{ 
  //                     display: 'flex', 
  //                     justifyContent: 'space-between', 
  //                     alignItems: 'flex-start',
  //                     marginBottom: '1rem'
  //                   }}>
  //                     <div>
  //                       <h4 style={{ margin: '0 0 0.25rem', fontSize: '16px', fontWeight: '600' }}>
  //                         {vehicleLabel}
  //                       </h4>
  //                       <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
  //                         License Plate: {licensePlate}
  //                       </p>
  //                       <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#9ca3af' }}>
  //                         Reviewed on {formatDate(feedback.createdAt, true)}
  //                       </p>
  //                     </div>
                      
  //                     <div style={{ textAlign: 'right' }}>
  //                       {typeof ratingValue === "number" ? (
  //                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  //                           <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
  //                             {ratingValue}/5
  //                           </span>
  //                           <div style={{ display: 'flex', gap: '2px' }}>
  //                             {[...Array(5)].map((_, index) => (
  //                               <span 
  //                                 key={index}
  //                                 style={{ 
  //                                   color: index < ratingValue ? '#f59e0b' : '#d1d5db',
  //                                   fontSize: '14px'
  //                                 }}
  //                               >
  //                                 ⭐
  //                               </span>
  //                             ))}
  //                           </div>
  //                         </div>
  //                       ) : (
  //                         <span style={{ 
  //                           fontSize: '12px',
  //                           padding: '4px 8px',
  //                           backgroundColor: '#f3f4f6',
  //                           color: '#6b7280',
  //                           borderRadius: '12px'
  //                         }}>
  //                           Not rated
  //                         </span>
  //                       )}
  //                     </div>
  //                   </div>

  //                   {/* Customer Comments */}
  //                   <div style={{ 
  //                     backgroundColor: 'white',
  //                     padding: '1rem',
  //                     borderRadius: '8px',
  //                     border: '1px solid #e5e7eb'
  //                   }}>
  //                     <h5 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
  //                       Customer Feedback
  //                     </h5>
  //                     <p style={{ margin: '0', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
  //                       {comment}
  //                     </p>
  //                   </div>

  //                   {/* Additional Details */}
  //                   <div style={{ 
  //                     display: 'grid',
  //                     gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  //                     gap: '0.5rem',
  //                     marginTop: '1rem',
  //                     fontSize: '12px',
  //                     color: '#6b7280'
  //                   }}>
  //                     <div>
  //                       <span style={{ fontWeight: '500' }}>Booking ID:</span>
  //                       <span style={{ marginLeft: '0.25rem' }}>{feedback.bookingId}</span>
  //                     </div>
  //                     {feedback.wouldRecommend !== undefined && (
  //                       <div>
  //                         <span style={{ fontWeight: '500' }}>Would Recommend:</span>
  //                         <span style={{ 
  //                           marginLeft: '0.25rem',
  //                           color: feedback.wouldRecommend ? '#10b981' : '#ef4444'
  //                         }}>
  //                           {feedback.wouldRecommend ? 'Yes' : 'No'}
  //                         </span>
  //                       </div>
  //                     )}
  //                   </div>

  //                   {/* Individual Rating Breakdown if available */}
  //                   {(feedback.ratings?.vehicleRating || feedback.ratings?.serviceRating || feedback.ratings?.overallRating) && (
  //                     <div style={{ 
  //                       marginTop: '1rem',
  //                       padding: '0.75rem',
  //                       backgroundColor: '#f8fafc',
  //                       borderRadius: '6px'
  //                     }}>
  //                       <h6 style={{ margin: '0 0 0.5rem', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
  //                         Rating Breakdown
  //                       </h6>
  //                       <div style={{ 
  //                         display: 'grid',
  //                         gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  //                         gap: '0.5rem',
  //                         fontSize: '11px'
  //                       }}>
  //                         {feedback.ratings.vehicleRating && (
  //                           <div>
  //                             <span style={{ color: '#6b7280' }}>Vehicle: </span>
  //                             <span style={{ fontWeight: '500' }}>{feedback.ratings.vehicleRating}/5</span>
  //                           </div>
  //                         )}
  //                         {feedback.ratings.serviceRating && (
  //                           <div>
  //                             <span style={{ color: '#6b7280' }}>Service: </span>
  //                             <span style={{ fontWeight: '500' }}>{feedback.ratings.serviceRating}/5</span>
  //                           </div>
  //                         )}
  //                         {feedback.ratings.overallRating && (
  //                           <div>
  //                             <span style={{ color: '#6b7280' }}>Overall: </span>
  //                             <span style={{ fontWeight: '500' }}>{feedback.ratings.overallRating}/5</span>
  //                           </div>
  //                         )}
  //                       </div>
  //                     </div>
  //                   )}
  //                 </div>
  //               );
  //             })}
  //           </div>
  //         )}
  //       </div>

  //       {/* Modal Footer */}
  //       <div style={{
  //         padding: '1rem 1.5rem',
  //         borderTop: '1px solid #e5e7eb',
  //         backgroundColor: '#f9fafb',
  //         textAlign: 'center'
  //       }}>
  //         <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
  //           Showing {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} across all your vehicles
  //         </p>
  //       </div>
  //     </div>
  //   </div>
  // );
return (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gradient-to-br from-neutral-900 to-black border-2 border-white/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative">
      {/* White border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/30 to-white/10"></div>
      
      {/* Modal Header */}
      <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 to-black">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF5A00] to-orange-600 rounded-full"></div>
          <h3 className="text-xl font-bold text-white">
            Vehicle Feedback & Reviews
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 max-h-[70vh] overflow-y-auto bg-gradient-to-b from-neutral-900 to-black">
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-neutral-700 border-t-[#FF5A00] animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading feedback...</p>
          </div>
        )}
        
        {!isLoading && feedbacks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💬</div>
            <h4 className="text-xl font-semibold text-white mb-2">No feedback received yet</h4>
            <p className="text-gray-400 max-w-md mx-auto">
              Customer feedback will appear here once you start receiving reviews for your vehicles.
            </p>
          </div>
        )}
        
        {!isLoading && feedbacks.length > 0 && (
          <div className="space-y-4">
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
                <div key={feedback._id} className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 hover:border-neutral-600 transition-all duration-300 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-1">
                        {vehicleLabel}
                      </h4>
                      <p className="text-gray-400 text-sm mb-1">
                        License Plate: {licensePlate}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Reviewed on {formatDate(feedback.createdAt, true)}
                      </p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      {typeof ratingValue === "number" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-amber-400">
                            {ratingValue}/5
                          </span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, index) => (
                              <span 
                                key={index}
                                className={`text-sm ${
                                  index < ratingValue ? 'text-amber-400' : 'text-neutral-600'
                                }`}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-neutral-700 text-gray-400 rounded-full text-xs font-medium">
                          Not rated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Comments */}
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mb-3">
                    <h5 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#FF5A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Customer Feedback
                    </h5>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {comment}
                    </p>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium">Booking ID:</span>
                      <span className="text-gray-300 font-mono">{feedback.bookingId}</span>
                    </div>
                    {feedback.wouldRecommend !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">Would Recommend:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          feedback.wouldRecommended 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {feedback.wouldRecommend ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Individual Rating Breakdown if available */}
                  {(feedback.ratings?.vehicleRating || feedback.ratings?.serviceRating || feedback.ratings?.overallRating) && (
                    <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-3">
                      <h6 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                        <svg className="w-3 h-3 text-[#FF5A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Rating Breakdown
                      </h6>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {feedback.ratings.vehicleRating && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs">Vehicle</span>
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 text-xs font-semibold">{feedback.ratings.vehicleRating}</span>
                              <span className="text-gray-600">/5</span>
                            </div>
                          </div>
                        )}
                        {feedback.ratings.serviceRating && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs">Service</span>
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 text-xs font-semibold">{feedback.ratings.serviceRating}</span>
                              <span className="text-gray-600">/5</span>
                            </div>
                          </div>
                        )}
                        {feedback.ratings.overallRating && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs">Overall</span>
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 text-xs font-semibold">{feedback.ratings.overallRating}</span>
                              <span className="text-gray-600">/5</span>
                            </div>
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
      <div className="p-4 border-t border-neutral-800 bg-neutral-900 text-center">
        <p className="text-gray-400 text-sm">
          Showing <span className="text-[#FF5A00] font-semibold">{feedbacks.length}</span> feedback{feedbacks.length !== 1 ? 's' : ''} across all your vehicles
        </p>
      </div>
    </div>
  </div>
);
}

export default FeedbackModal;