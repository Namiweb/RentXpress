import { ClockIcon, CreditCardIcon, ReceiptIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

function getPaymentMethodLabel(method) {
  switch (method) {
    case "credit_card":
      return "Credit Card";
    case "debit_card":
      return "Debit Card";
    case "bank_transfer":
      return "Bank Transfer";
    case "cash":
      return "Cash";
    default:
      return method;
  }
}

function PaymentsOverview({ payments, savedPaymentLabels, formatCurrency }) {
  const getStatusDisplay = (status) => {
    const normalized = status?.toLowerCase();
    if (normalized === "completed") {
      return { 
        label: "Completed", 
        className: "bg-green-500 text-white", 
        icon: CheckCircleIcon 
      };
    }
    if (normalized === "failed") {
      return { 
        label: "Failed", 
        className: "bg-red-500 text-white", 
        icon: XCircleIcon 
      };
    }
    return { 
      label: "Pending", 
      className: "bg-yellow-500 text-black", 
      icon: ClockIcon 
    };
  };

  return (
    <section className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment History</h2>
          <p className="text-neutral-300">Review recent transactions and stored payment options.</p>
        </div>
      </div>

      {/* Saved Payment Methods */}
      <div className="mb-8 p-4 bg-neutral-700 rounded-lg border border-neutral-600">
        <h3 className="text-white font-semibold mb-3">Saved Payment Methods</h3>
        {savedPaymentLabels.length === 0 ? (
          <p className="text-neutral-400">Cards and transfer details will appear here after your first payment.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedPaymentLabels.map((label) => (
              <div key={label} className="inline-flex items-center gap-2 bg-neutral-600 text-neutral-300 px-3 py-2 rounded-lg border border-neutral-500">
                <CreditCardIcon size={16} aria-hidden="true" className="text-neutral-400" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-neutral-700 rounded-lg overflow-hidden border border-neutral-600">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-600">
                <th className="text-left py-4 px-6 text-neutral-300 font-semibold text-sm uppercase tracking-wider">
                  Payment
                </th>
                <th className="text-left py-4 px-6 text-neutral-300 font-semibold text-sm uppercase tracking-wider">
                  Booking
                </th>
                <th className="text-left py-4 px-6 text-neutral-300 font-semibold text-sm uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left py-4 px-6 text-neutral-300 font-semibold text-sm uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-4 px-6 text-neutral-300 font-semibold text-sm uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 px-6">
                    <div className="text-neutral-400">
                      <CreditCardIcon size={48} className="mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No payments recorded yet</p>
                      <p className="text-sm mt-1">Your payment history will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const statusDisplay = getStatusDisplay(payment.status);
                  const StatusIcon = statusDisplay.icon;
                  const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;
                  
                  return (
                    <tr key={payment._id} className="border-b border-neutral-600 last:border-b-0 hover:bg-neutral-600/50 transition-colors">
                      {/* Payment ID & Date */}
                      <td className="py-4 px-6">
                        <div className="text-white font-medium">{payment.paymentId}</div>
                        <div className="text-neutral-400 text-sm mt-1">
                          {createdAt && !Number.isNaN(createdAt.getTime())
                            ? createdAt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "Date not available"}
                        </div>
                      </td>
                      
                      {/* Booking ID */}
                      <td className="py-4 px-6">
                        <span className="text-neutral-300 font-mono text-sm">
                          {payment.bookingId || "—"}
                        </span>
                      </td>
                      
                      {/* Payment Method */}
                      <td className="py-4 px-6">
                        <span className="text-neutral-300">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </span>
                      </td>
                      
                      {/* Amount */}
                      <td className="py-4 px-6">
                        <span className="text-white font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                          <StatusIcon size={14} aria-hidden="true" />
                          {statusDisplay.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {payments.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Total Payments</div>
            <div className="text-white font-semibold text-xl">{payments.length}</div>
          </div>
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Completed</div>
            <div className="text-green-500 font-semibold text-xl">
              {payments.filter(p => p.status?.toLowerCase() === 'completed').length}
            </div>
          </div>
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <div className="text-neutral-400 text-sm mb-1">Total Amount</div>
            <div className="text-white font-semibold text-xl">
              {formatCurrency(
                payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
                payments[0]?.currency || 'LKR'
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PaymentsOverview;