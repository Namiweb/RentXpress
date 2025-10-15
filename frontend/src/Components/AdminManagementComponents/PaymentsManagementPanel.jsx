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



  const refreshDisabled = paymentsLoading || payoutsLoading;
  const downloadDisabled =
    refreshDisabled || (payments.length === 0 && payouts.length === 0);

  return (
    <section className="bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl shadow-black/40 p-6 backdrop-blur-sm">
      {/* Header Section */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-700/30">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Payments & Payouts
          </h3>
          <p className="text-gray-400 mt-1 text-sm">
            Reconcile customer transactions and driver disbursements.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className="px-4 py-2 bg-transparent hover:bg-neutral-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200 border border-neutral-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadDisabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            className="px-4 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#FF5A00]/20 hover:shadow-[#FF5A00]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Error Messages */}
      <div className="space-y-3 mb-6">
        {paymentsError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {paymentsError}
            </p>
          </div>
        )}
        {payoutsError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {payoutsError}
            </p>
          </div>
        )}
        {actionError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {actionError}
            </p>
          </div>
        )}
      </div>

      {/* Customer Payments Panel */}
      <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Customer Payments
          </h4>
          {!paymentsLoading && payments.length > 0 && (
            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm font-medium rounded-full border border-green-500/20">
              {payments.length} transactions
            </span>
          )}
        </div>

        {paymentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-[#FF5A00] border-t-transparent rounded-full animate-spin"></div>
              <span>Loading payments…</span>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-700/50 rounded-lg">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <p className="text-gray-400">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-neutral-700/50 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/80 border-b border-neutral-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/50">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-neutral-800/30 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <strong className="text-white font-medium">{payment.paymentId}</strong>
                          <span className="text-gray-400 text-sm mt-1">
                            {formatDate(payment.processedAt || payment.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white">{getUserName(payment.customerId)}</span>
                          <span className="text-gray-400 text-sm mt-1">
                            {payment.customerId?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-semibold text-lg">
                          {formatCurrency(payment.amount, payment.currency || currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill value={payment.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            className="px-3 py-2 bg-neutral-800 border border-neutral-600/50 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A00]/50 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                            className="px-4 py-2 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[80px]"
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updatePaymentStatus(payment)}
                          >
                            {isUpdating ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving…
                              </div>
                            ) : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PaymentsManagementPanel;
