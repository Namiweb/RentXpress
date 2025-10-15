import { useMemo } from "react";

const formatCurrency = (value = 0, currency = "LKR") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString();
};

function OverviewPage({ 
  vehicles, 
  bookings, 
  payments, 
  feedbacks, 
  isLoading, 
  bookingsByVehicle 
}) {
  const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "started", "in_progress", "in-progress"]);

  const vehicleStats = useMemo(() => {
    const total = vehicles.length;
    const approved = vehicles.filter(v => v.status === "approved").length;
    const pending = vehicles.filter(v => v.status === "pending").length;
    const needsMaintenance = vehicles.filter(v => v.inspectionStatus === "needs_maintenance").length;
    const available = vehicles.filter(v => v.availability?.isAvailable !== false && v.status === "approved").length;

    return { total, approved, pending, needsMaintenance, available };
  }, [vehicles]);

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === "pending").length;
    const active = bookings.filter(b => ACTIVE_BOOKING_STATUSES.has(b.status)).length;
    const completed = bookings.filter(b => b.status === "completed").length;
    
    // Calculate this month's bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt || b.bookingDetails?.startDate);
      return bookingDate >= monthStart;
    }).length;

    return { total, pending, active, completed, thisMonth };
  }, [bookings, ACTIVE_BOOKING_STATUSES]);

  const earningsStats = useMemo(() => {
    const completedPayments = payments.filter(p => p.status === "completed");
    const pendingPayments = payments.filter(p => p.status === "pending");
    
    const totalEarnings = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // Calculate this month's earnings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = completedPayments
      .filter(p => {
        const paymentDate = new Date(p.processedAt || p.updatedAt || p.createdAt);
        return paymentDate >= monthStart;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Calculate today's earnings
    const todayKey = now.toISOString().slice(0, 10);
    const today = completedPayments
      .filter(p => {
        const paymentDate = new Date(p.processedAt || p.updatedAt || p.createdAt);
        return paymentDate.toISOString().slice(0, 10) === todayKey;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const currency = completedPayments[0]?.currency || "LKR";

    return { totalEarnings, pendingAmount, thisMonth, today, currency };
  }, [payments]);

  const feedbackStats = useMemo(() => {
    const total = feedbacks.length;
    const averageRating = feedbacks.length > 0 
      ? feedbacks.reduce((sum, f) => {
          const rating = f.ratings?.vehicleRating || f.ratings?.overallRating || f.ratings?.serviceRating || 0;
          return sum + rating;
        }, 0) / feedbacks.length
      : 0;
    
    const recent = feedbacks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    return { total, averageRating, recent };
  }, [feedbacks]);

  if (isLoading.vehicles || isLoading.bookings || isLoading.payments || isLoading.feedbacks) {
    return (
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
        <p className="text-gray-400">Loading overview...</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #171717 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Panel */}
        <div 
          className="rounded-2xl p-6 shadow-xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #171717 100%)',
            border: '1px solid #262626'
          }}
        >
          {/* Background decorative elements */}
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: '#FF5A00', opacity: 0.05 }}
          ></div>
          <div 
            className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl"
            style={{ backgroundColor: '#FF5A00', opacity: 0.05 }}
          ></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div 
                className="w-2 h-8 rounded-full"
                style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
              ></div>
              <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
            </div>

            {/* Quick Stats Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Vehicles Card */}
                <div 
                  className="rounded-xl p-4 transition-all duration-300 hover:transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                    border: '1px solid #404040'
                  }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
                    >
                      <span className="text-white font-bold text-lg">🚗</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-300">Total Vehicles</h4>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {vehicleStats.total}
                  </p>
                  <p className="text-xs text-gray-400">
                    {vehicleStats.approved} approved, {vehicleStats.pending} pending
                  </p>
                </div>

                {/* Active Bookings Card */}
                <div 
                  className="rounded-xl p-4 transition-all duration-300 hover:transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                    border: '1px solid #404040'
                  }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
                    >
                      <span className="text-white font-bold text-lg">📅</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-300">Active Bookings</h4>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {bookingStats.active}
                  </p>
                  <p className="text-xs text-gray-400">
                    {bookingStats.pending} pending approval
                  </p>
                </div>

                {/* Monthly Earnings Card */}
                <div 
                  className="rounded-xl p-4 transition-all duration-300 hover:transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                    border: '1px solid #404040'
                  }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
                    >
                      <span className="text-white font-bold text-lg">💰</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-300">Monthly Earnings</h4>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(earningsStats.thisMonth, earningsStats.currency)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(earningsStats.today, earningsStats.currency)} today
                  </p>
                </div>

                {/* Customer Rating Card */}
                <div 
                  className="rounded-xl p-4 transition-all duration-300 hover:transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                    border: '1px solid #404040'
                  }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #EF4444, #F87171)' }}
                    >
                      <span className="text-white font-bold text-lg">⭐</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-300">Customer Rating</h4>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {feedbackStats.averageRating > 0 ? feedbackStats.averageRating.toFixed(1) : '-'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {feedbackStats.total} reviews
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fleet Status */}
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <div 
                    className="w-2 h-6 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
                  ></div>
                  <span>Fleet Status</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Available for Rent</span>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#4ADE80',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}
                    >
                      {vehicleStats.available}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Approval</span>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#FBBF24',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      {vehicleStats.pending}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Needs Maintenance</span>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#F87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {vehicleStats.needsMaintenance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <div 
                    className="w-2 h-6 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
                  ></div>
                  <span>Recent Activity</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Bookings</span>
                    <span className="text-white font-medium">{bookingStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">This Month</span>
                    <span className="text-white font-medium">{bookingStats.thisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Completed</span>
                    <span className="text-white font-medium">{bookingStats.completed}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <div 
                    className="w-2 h-6 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
                  ></div>
                  <span>Financial Summary</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Earned</span>
                    <span className="text-white font-medium">
                      {formatCurrency(earningsStats.totalEarnings, earningsStats.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Payout</span>
                    <span className="text-yellow-400 font-medium">
                      {formatCurrency(earningsStats.pendingAmount, earningsStats.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Feedback */}
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <div 
                    className="w-2 h-6 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
                  ></div>
                  <span>Recent Feedback</span>
                </h3>
                {feedbackStats.recent.length === 0 ? (
                  <p className="text-gray-400 text-sm">No feedback received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {feedbackStats.recent.map((feedback, index) => {
                      const rating = feedback.ratings?.vehicleRating || feedback.ratings?.overallRating || feedback.ratings?.serviceRating || 0;
                      const comment = feedback.comments?.vehicleComment || feedback.comments?.serviceComment || 'No comment provided';
                      
                      return (
                        <div 
                          key={feedback._id || index}
                          className="rounded-lg p-3"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid #404040'
                          }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span 
                              className="text-sm font-medium"
                              style={{ color: rating >= 4 ? '#4ADE80' : rating >= 3 ? '#FBBF24' : '#F87171' }}
                            >
                              {rating > 0 ? `${rating}/5 ⭐` : 'No rating'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(feedback.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 m-0">
                            {comment.length > 60 ? `${comment.substring(0, 60)}...` : comment}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewPage;