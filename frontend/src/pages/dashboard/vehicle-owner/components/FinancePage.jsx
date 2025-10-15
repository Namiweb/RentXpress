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
        <div className="flex items-center space-x-3 mb-6">
          <div 
            className="w-2 h-8 rounded-full"
            style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
          ></div>
          <h3 className="text-xl font-bold text-white">Earnings Overview</h3>
        </div>
        
        {isLoading && (
          <div className="text-center py-8">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#FF5A00' }}
            ></div>
            <p className="text-gray-400 mt-2">Loading earnings...</p>
          </div>
        )}
        
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Earned Card */}
            <div 
              className="rounded-xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                border: '1px solid #404040'
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}
                >
                  <span className="text-white font-bold text-lg">₨</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-300">Total Earned</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(summary.total, summary.currency)}
              </p>
              <p className="text-xs text-gray-400">Lifetime earnings</p>
            </div>
            
            {/* This Month Card */}
            <div 
              className="rounded-xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                border: '1px solid #404040'
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
                >
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-300">This Month</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(summary.month, summary.currency)}
              </p>
              <p className="text-xs text-gray-400">Current month</p>
            </div>
            
            {/* Today Card */}
            <div 
              className="rounded-xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                border: '1px solid #404040'
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
                >
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-300">Today</h4>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(summary.today, summary.currency)}
              </p>
              <p className="text-xs text-gray-400">Today's earnings</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawalSection({ pending, completed, onUpdateStatus, isLoading }) {
  return (
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
        <div className="flex items-center space-x-3 mb-6">
          <div 
            className="w-2 h-8 rounded-full"
            style={{ background: 'linear-gradient(to bottom, #FF5A00, #EA580C)' }}
          ></div>
          <h3 className="text-xl font-bold text-white">Payment Withdrawals</h3>
        </div>
        
        {isLoading && (
          <div className="text-center py-8">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#FF5A00' }}
            ></div>
            <p className="text-gray-400 mt-2">Loading payouts...</p>
          </div>
        )}
        
        {!isLoading && (
          <>
            {/* Summary Stats */}
            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                border: '1px solid #404040'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-300 font-semibold">
                    Pending requests: <span style={{ color: '#FBBF24' }}>{pending.length}</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Processed: <span style={{ color: '#10B981' }}>{completed.length}</span>
                  </p>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #404040 0%, #262626 100%)'
                  }}
                >
                  <span className="font-bold text-lg" style={{ color: '#FF5A00' }}>💰</span>
                </div>
              </div>
            </div>

            {/* Pending Withdrawals */}
            {pending.length > 0 ? (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <span>Pending Withdrawals</span>
                  <span 
                    className="text-white text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: '#F59E0B' }}
                  >
                    {pending.length}
                  </span>
                </h4>
                <div className="space-y-4">
                  {pending.map((payment) => (
                    <div 
                      key={payment._id}
                      className="rounded-xl p-4 shadow-lg transition-all duration-300"
                      style={{
                        background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="text-gray-300 font-semibold mb-2">
                            Payout {payment.paymentId || payment._id}
                          </h5>
                          <p 
                            className="text-2xl font-bold mb-2"
                            style={{ color: '#FBBF24' }}
                          >
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Requested: {formatDate(payment.createdAt, true)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:transform hover:scale-105"
                          style={{
                            background: 'linear-gradient(to right, #FF5A00, #EA580C)'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #EA580C, #FF5A00)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #FF5A00, #EA580C)';
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
              <div 
                className="text-center py-8 border-2 border-dashed rounded-xl mb-8"
                style={{ borderColor: '#404040' }}
              >
                <div className="text-4xl mb-3">💰</div>
                <h4 className="text-gray-300 font-semibold mb-2">No pending withdrawals</h4>
                <p className="text-gray-400">
                  All payment requests have been processed.
                </p>
              </div>
            )}

            {/* Completed Withdrawals History */}
            {completed.length > 0 && (
              <details 
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
                  border: '1px solid #404040'
                }}
              >
                <summary className="cursor-pointer text-white font-semibold text-lg mb-4 list-none">
                  <div className="flex items-center justify-between">
                    <span>View completed withdrawals ({completed.length})</span>
                    <span className="text-gray-400">▼</span>
                  </div>
                </summary>
                <div className="space-y-3 mt-4">
                  {completed.map((payment) => (
                    <div 
                      key={payment._id}
                      className="rounded-lg p-4 transition-all duration-200 hover:border-green-500/30"
                      style={{
                        background: 'linear-gradient(135deg, #404040 0%, #262626 100%)',
                        border: '1px solid #525252'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-gray-300 font-semibold text-sm mb-1">
                            {payment.paymentId || payment._id}
                          </h5>
                          <p className="text-gray-400 text-xs">
                            Completed: {formatDate(payment.updatedAt || payment.processedAt, true)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p 
                            className="font-bold text-lg"
                            style={{ color: '#10B981' }}
                          >
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <span 
                            className="inline-block text-xs px-2 py-1 rounded-full border"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              color: '#10B981',
                              borderColor: 'rgba(16, 185, 129, 0.3)'
                            }}
                          >
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
      </div>
    </div>
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
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #171717 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-3xl font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to right, #FF5A00, #EA580C)'
              }}
            >
              Finance Dashboard
            </h1>
            <p className="text-gray-400">Manage your earnings and withdrawals</p>
          </div>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center border"
            style={{
              background: 'linear-gradient(135deg, #262626 0%, #171717 100%)',
              borderColor: '#404040'
            }}
          >
            <span className="font-bold text-lg" style={{ color: '#FF5A00' }}>$</span>
          </div>
        </div>

        {/* Content */}
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
    </div>
  );
}

export default FinancePage;