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
      <div className="driver-panel">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Quick Stats Grid */}
      <section className="driver-panel">
        <header className="panel-header">
          <h3>Quick Overview</h3>
        </header>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#f8fafc'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
              Total Vehicles
            </h4>
            <p style={{ margin: '0', fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {vehicleStats.total}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#6b7280' }}>
              {vehicleStats.approved} approved, {vehicleStats.pending} pending
            </p>
          </div>

          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#f0fdf4'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
              Active Bookings
            </h4>
            <p style={{ margin: '0', fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
              {bookingStats.active}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#6b7280' }}>
              {bookingStats.pending} pending approval
            </p>
          </div>

          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#fffbeb'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
              Monthly Earnings
            </h4>
            <p style={{ margin: '0', fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {formatCurrency(earningsStats.thisMonth, earningsStats.currency)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#6b7280' }}>
              {formatCurrency(earningsStats.today, earningsStats.currency)} today
            </p>
          </div>

          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#fef2f2'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
              Customer Rating
            </h4>
            <p style={{ margin: '0', fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
              {feedbackStats.averageRating > 0 ? feedbackStats.averageRating.toFixed(1) : '-'}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#6b7280' }}>
              {feedbackStats.total} reviews
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Vehicle Status Summary */}
        <section className="driver-panel">
          <header className="panel-header">
            <h3>Fleet Status</h3>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Available for Rent</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '12px', 
                backgroundColor: '#dcfce7', 
                color: '#166534',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {vehicleStats.available}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pending Approval</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '12px', 
                backgroundColor: '#fef3c7', 
                color: '#92400e',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {vehicleStats.pending}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Needs Maintenance</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '12px', 
                backgroundColor: '#fee2e2', 
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {vehicleStats.needsMaintenance}
              </span>
            </div>
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="driver-panel">
          <header className="panel-header">
            <h3>Recent Activity</h3>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
              <span>Total Bookings</span>
              <span>{bookingStats.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
              <span>This Month</span>
              <span>{bookingStats.thisMonth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
              <span>Completed</span>
              <span>{bookingStats.completed}</span>
            </div>
          </div>
        </section>

        {/* Earnings Summary */}
        <section className="driver-panel">
          <header className="panel-header">
            <h3>Financial Summary</h3>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Total Earned</span>
              <span style={{ fontWeight: '600' }}>
                {formatCurrency(earningsStats.totalEarnings, earningsStats.currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
              <span>Pending Payout</span>
              <span>{formatCurrency(earningsStats.pendingAmount, earningsStats.currency)}</span>
            </div>
          </div>
        </section>

        {/* Recent Feedback */}
        <section className="driver-panel">
          <header className="panel-header">
            <h3>Recent Feedback</h3>
          </header>
          {feedbackStats.recent.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>No feedback received yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {feedbackStats.recent.map((feedback, index) => {
                const rating = feedback.ratings?.vehicleRating || feedback.ratings?.overallRating || feedback.ratings?.serviceRating || 0;
                const comment = feedback.comments?.vehicleComment || feedback.comments?.serviceComment || 'No comment provided';
                
                return (
                  <div key={feedback._id || index} style={{ 
                    padding: '0.5rem', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>
                        {rating > 0 ? `${rating}/5 ⭐` : 'No rating'}
                      </span>
                      <span style={{ color: '#6b7280' }}>
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: '0', color: '#4b5563', fontSize: '11px' }}>
                      {comment.length > 60 ? `${comment.substring(0, 60)}...` : comment}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default OverviewPage;