import { ClockIcon, CreditCardIcon, ReceiptIcon } from "lucide-react";

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
      return { label: "Completed", className: "status-chip status-chip--success", icon: CreditCardIcon };
    }
    if (normalized === "failed") {
      return { label: "Failed", className: "status-chip status-chip--danger", icon: ReceiptIcon };
    }
    return { label: "Pending", className: "status-chip status-chip--warning", icon: ClockIcon };
  };

  return (
    <section className="customer-panel">
      <div className="panel-header">
        <div>
          <h2>Payment history</h2>
          <p>Review recent transactions and stored payment options.</p>
        </div>
      </div>

      <div className="saved-methods">
        {savedPaymentLabels.length === 0 ? (
          <p className="muted">Cards and transfer details will appear here after your first payment.</p>
        ) : (
          <ul className="chip-list">
            {savedPaymentLabels.map((label) => (
              <li key={label} className="chip">
                <CreditCardIcon size={16} aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Payment</th>
              <th>Booking</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const statusDisplay = getStatusDisplay(payment.status);
                const StatusIcon = statusDisplay.icon;
                const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;
                return (
                  <tr key={payment._id}>
                    <td>
                      <div className="table-primary">{payment.paymentId}</div>
                      <div className="table-secondary">
                        {createdAt && !Number.isNaN(createdAt.getTime())
                          ? createdAt.toLocaleString()
                          : "Date not available"}
                      </div>
                    </td>
                    <td>{payment.bookingId || "—"}</td>
                    <td>{getPaymentMethodLabel(payment.paymentMethod)}</td>
                    <td>{formatCurrency(payment.amount, payment.currency)}</td>
                    <td>
                      <span className={statusDisplay.className}>
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
    </section>
  );
}

export default PaymentsOverview;
