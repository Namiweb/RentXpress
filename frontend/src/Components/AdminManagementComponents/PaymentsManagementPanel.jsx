import { useCallback, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getUserName } from "../../utils/getUserName";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import { apiRequest } from "../../services/api";
import StatusPill from "../StatusPill";

const DEFAULT_CURRENCY = "LKR";
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];
const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"];

const PaymentsManagementPanel = ({
  payments = [],
  payouts = [],
  paymentsLoading,
  payoutsLoading,
  paymentsError,
  payoutsError,
  onRefresh,
}) => {
  const [paymentDrafts, setPaymentDrafts] = useState({});
  // const [payoutDrafts, setPayoutDrafts] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  const currency =
    payments.find((payment) => payment.currency)?.currency || DEFAULT_CURRENCY;

  const getBookingLabel = (payment) => {
    const booking = payment?.booking || payment?.bookingId;
    if (!booking) return "-";
    if (typeof booking === "string") return booking;
    return booking.bookingId || booking._id || booking.id || "-";
  };

  const getDriverLabel = (payout) => {
    const driver = payout?.driver || payout?.driverId;
    if (!driver) return "-";
    if (typeof driver === "string") return driver;
    return getUserName(driver);
  };

  const handleDownloadReport = useCallback(() => {
    if (!payments.length && !payouts.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    const totalPayments = payments.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    // const totalPayouts = payouts.reduce(
    //   (sum, item) => sum + (Number(item.amount) || 0),
    //   0
    // );

    doc.setFontSize(18);
    doc.text("Payments Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(
      `Payments: ${payments.length}`,
      marginLeft,
      headerY + 35
    );
    doc.text(
      `Totals: Payments ${formatCurrency(
        totalPayments,
        currency
      )}`,
      marginLeft,
      headerY + 50
    );

    let tableY = headerY + 75;

    if (payments.length) {
      autoTable(doc, {
        startY: tableY,
        head: [
          ["Payment", "Booking", "Customer", "Amount", "Status", "Processed"],
        ],
        body: payments.map((payment) => [
          payment.paymentId || payment._id,
          getBookingLabel(payment),
          payment.customerId
            ? getUserName(payment.customerId)
            : "-",
          formatCurrency(payment.amount, payment.currency || currency),
          payment.status ? payment.status.replace(/_/g, " ") : "-",
          formatDateTime(
            payment.updatedAt || payment.processedAt || payment.createdAt
          ),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        columnStyles: {
          0: { halign: "center", cellWidth: 90 },
          3: { halign: "right", cellWidth: 120 },
          4: { halign: "center", cellWidth: 100 },
        },
      });
      tableY = doc.lastAutoTable.finalY + 30;
    }

    if (payouts.length) {
      autoTable(doc, {
        startY: tableY,
        head: [["Payout", "Driver", "Amount", "Status", "Updated"]],
        body: payouts.map((payout) => [
          payout.paymentId || payout._id,
          getDriverLabel(payout),
          formatCurrency(payout.amount, payout.currency || currency),
          payout.status ? payout.status.replace(/_/g, " ") : "-",
          formatDateTime(
            payout.updatedAt || payout.processedAt || payout.createdAt
          ),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        columnStyles: {
          0: { halign: "center", cellWidth: 90 },
          2: { halign: "right", cellWidth: 120 },
          3: { halign: "center", cellWidth: 100 },
        },
      });
    }

    doc.save("payments-payouts-report.pdf");
  }, [payments, payouts, currency]);

  const paymentStatusOptions = useMemo(
    () => (payment) => {
      const options = new Set([...PAYMENT_STATUSES, payment.status]);
      return Array.from(options);
    },
    []
  );

  // const payoutStatusOptions = useMemo(
  //   () => (payout) => {
  //     const options = new Set([...PAYOUT_STATUSES, payout.status]);
  //     return Array.from(options);
  //   },
  //   []
  // );

  const handlePaymentDraftChange = (paymentId, status) => {
    setPaymentDrafts((prev) => ({ ...prev, [paymentId]: status }));
  };

  // const handlePayoutDraftChange = (payoutId, status) => {
  //   setPayoutDrafts((prev) => ({ ...prev, [payoutId]: status }));
  // };

  const updatePaymentStatus = async (payment) => {
    const desiredStatus = paymentDrafts[payment._id] || payment.status;
    if (!desiredStatus || desiredStatus === payment.status) return;

    setActionError("");
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/payments/${payment._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: desiredStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update payment");
      }
      await onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // const updatePayoutStatus = async (payout) => {
  //   const desiredStatus = payoutDrafts[payout._id] || payout.status;
  //   if (!desiredStatus || desiredStatus === payout.status) return;

  //   setActionError("");
  //   setIsUpdating(true);
  //   try {
  //     const response = await apiRequest(`/driver-payments/${payout._id}`, {
  //       method: "PUT",
  //       body: JSON.stringify({ status: desiredStatus }),
  //     });
  //     if (!response.ok) {
  //       const data = await response.json();
  //       throw new Error(data.message || "Failed to update payout");
  //     }
  //     await onRefresh();
  //   } catch (err) {
  //     setActionError(err.message);
  //   } finally {
  //     setIsUpdating(false);
  //   }
  // };

  const refreshDisabled = paymentsLoading || payoutsLoading;
  const downloadDisabled =
    refreshDisabled || (payments.length === 0 && payouts.length === 0);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Payments &amp; Payouts</h3>
          <p className="panel-subtitle">
            Reconcile customer transactions and driver disbursements.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadDisabled}
          >
            Download PDF
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
          >
            Refresh
          </button>
        </div>
      </header>
      {paymentsError && <p className="error-text">{paymentsError}</p>}
      {payoutsError && <p className="error-text">{payoutsError}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      <div className="two-column">
        <div className="management-subpanel">
          <h4>Customer payments</h4>
          {paymentsLoading ? (
            <p>Loading payments…</p>
          ) : payments.length === 0 ? (
            <p>No payments recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{payment.paymentId}</strong>
                          <span className="muted">
                            {formatDate(
                              payment.processedAt || payment.createdAt
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{getUserName(payment.customerId)}</span>
                          <span className="muted">
                            {payment.customerId?.email}
                          </span>
                        </div>
                      </td>
                      <td>
                        {formatCurrency(
                          payment.amount,
                          payment.currency || currency
                        )}
                      </td>
                      <td>
                        <StatusPill value={payment.status} />
                      </td>
                      <td>
                        <div className="row-inline">
                          <select
                            className="input-control"
                            value={paymentDrafts[payment._id] || payment.status}
                            onChange={(event) =>
                              handlePaymentDraftChange(
                                payment._id,
                                event.target.value
                              )
                            }
                          >
                            {paymentStatusOptions(payment).map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePaymentStatus(payment)}
                          >
                            {isUpdating ? "Saving…" : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* <div className="management-subpanel">
          <h4>Driver payouts</h4>
          {payoutsLoading ? (
            <p>Loading payouts…</p>
          ) : payouts.length === 0 ? (
            <p>No driver payouts recorded.</p>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Payout</th>
                    <th>Driver</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{payout.paymentId}</strong>
                          <span className="muted">
                            {formatDate(payout.processedAt || payout.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td>{payout.driverId || "-"}</td>
                      <td>
                        {formatCurrency(
                          payout.amount,
                          payout.currency || currency
                        )}
                      </td>
                      <td>
                        <StatusPill value={payout.status} />
                      </td>
                      <td>
                        <div className="row-inline">
                          <select
                            className="input-control"
                            value={payoutDrafts[payout._id] || payout.status}
                            onChange={(event) =>
                              handlePayoutDraftChange(
                                payout._id,
                                event.target.value
                              )
                            }
                          >
                            {payoutStatusOptions(payout).map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePayoutStatus(payout)}
                          >
                            {isUpdating ? "Saving…" : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div> */}
      </div>
    </section>
  );
}

export default PaymentsManagementPanel;
