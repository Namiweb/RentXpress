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

function EarningsOverview({ payments, isLoading }) {
  const summary = useMemo(() => {
    if (!payments.length) {
      return {
        currency: "LKR",
        total: 0,
        month: 0,
        today: 0,
      };
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let total = 0;
    let today = 0;
    let month = 0;
    const currency = payments[0]?.currency || payments[0]?.pricing?.currency || "LKR";

    payments.forEach((payment) => {
      const amount = Number(payment.amount) || 0;
      const processedAt = payment.processedAt || payment.updatedAt || payment.createdAt;
      const processed = processedAt ? new Date(processedAt) : null;

      total += amount;

      if (processed) {
        const processedTodayKey = processed.toISOString().slice(0, 10);
        if (processedTodayKey === todayKey) {
          today += amount;
        }
        const processedMonthKey = `${processed.getFullYear()}-${processed.getMonth()}`;
        if (processedMonthKey === monthKey) {
          month += amount;
        }
      }
    });

    return { currency, total, today, month };
  }, [payments]);

  return (
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Earnings Overview</h3>
      </header>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading earnings...</p>
        </div>
      )}
      {!isLoading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#f0fdf4'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600', color: '#166534' }}>
              Total Earned
            </h4>
            <p style={{ margin: '0', fontSize: '1.75rem', fontWeight: 'bold', color: '#15803d' }}>
              {formatCurrency(summary.total, summary.currency)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#16a34a' }}>
              Lifetime earnings
            </p>
          </div>
          
          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#fefce8'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600', color: '#a16207' }}>
              This Month
            </h4>
            <p style={{ margin: '0', fontSize: '1.75rem', fontWeight: 'bold', color: '#ca8a04' }}>
              {formatCurrency(summary.month, summary.currency)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#eab308' }}>
              Current month
            </p>
          </div>
          
          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1rem',
            backgroundColor: '#eff6ff'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600', color: '#1d4ed8' }}>
              Today
            </h4>
            <p style={{ margin: '0', fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb' }}>
              {formatCurrency(summary.today, summary.currency)}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#3b82f6' }}>
              Today's earnings
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function WithdrawalSection({ pending, completed, onUpdateStatus, isLoading }) {
  return (
    <section className="driver-panel">
      <header className="panel-header">
        <h3>Payment Withdrawals</h3>
      </header>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading payouts...</p>
        </div>
      )}
      {!isLoading && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
                Pending requests: <span style={{ color: '#f59e0b' }}>{pending.length}</span>
              </p>
              <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                Processed: <span style={{ color: '#10b981' }}>{completed.length}</span>
              </p>
            </div>
          </div>

          {/* Pending Withdrawals */}
          {pending.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '16px', fontWeight: '600' }}>
                Pending Withdrawals
              </h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {pending.map((payment) => (
                  <div key={payment._id} style={{
                    border: '1px solid #fef3c7',
                    borderRadius: '12px',
                    padding: '1rem',
                    backgroundColor: '#fffbeb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem', fontSize: '14px', fontWeight: '600' }}>
                          Payout {payment.paymentId || payment._id}
                        </h5>
                        <p style={{ margin: '0 0 0.25rem', fontSize: '16px', fontWeight: 'bold', color: '#92400e' }}>
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                          Requested: {formatDate(payment.createdAt, true)}
                        </p>
                      </div>
                      <button
                        type="button"
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #10b981',
                          borderRadius: '6px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                        onClick={() => onUpdateStatus(payment, "completed")}
                      >
                        Mark as Received
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              border: '1px dashed #d1d5db',
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💰</div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#374151' }}>No pending withdrawals</h4>
              <p style={{ margin: '0', color: '#6b7280' }}>
                All payment requests have been processed.
              </p>
            </div>
          )}

          {/* Completed Withdrawals History */}
          {completed.length > 0 && (
            <details style={{ 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <summary style={{ 
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                View completed withdrawals ({completed.length})
              </summary>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {completed.map((payment) => (
                  <div key={payment._id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h5 style={{ margin: '0 0 0.25rem', fontSize: '14px', fontWeight: '600' }}>
                          {payment.paymentId || payment._id}
                        </h5>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                          Completed: {formatDate(payment.updatedAt || payment.processedAt, true)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <span style={{ 
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#dcfce7',
                          color: '#166534'
                        }}>
                          Completed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function FinancePage({ payments, isLoading, onUpdatePaymentStatus }) {
  const pendingWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments]
  );
  
  const completedWithdrawals = useMemo(
    () => payments.filter((payment) => payment.status === "completed"),
    [payments]
  );

  const completedPayments = useMemo(
    () => payments.filter((payment) => payment.status === "completed"),
    [payments]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <EarningsOverview 
        payments={completedPayments} 
        isLoading={isLoading} 
      />
      
      <WithdrawalSection
        pending={pendingWithdrawals}
        completed={completedWithdrawals}
        onUpdateStatus={onUpdatePaymentStatus}
        isLoading={isLoading}
      />
    </div>
  );
}

export default FinancePage;