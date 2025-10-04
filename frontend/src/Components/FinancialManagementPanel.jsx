import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api.js";

function FinancialManagementPanel() {
  const [financialRecords, setFinancialRecords] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState({});
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Fetch financial data
  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [recordsRes, configRes, summaryRes] = await Promise.all([
        apiRequest(`/financial/records?month=${selectedPeriod.month}&year=${selectedPeriod.year}&limit=100`),
        apiRequest("/financial/config"),
        apiRequest(`/financial/summary?month=${selectedPeriod.month}&year=${selectedPeriod.year}`)
      ]);

      const [recordsData, configData, summaryData] = await Promise.all([
        recordsRes.json(),
        configRes.json(),
        summaryRes.json()
      ]);

      // if (!recordsRes.ok) throw new Error(recordsData.message);
      // if (!configRes.ok) throw new Error(configData.message);
      // if (!summaryRes.ok) throw new Error(summaryData.message);

      setFinancialRecords(recordsData.financials || []);
      setSalaryConfig(configData.reduce(
        (acc, config) => ({ ...acc, [config.role]: config }),
        {}
      ));
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Calculate salaries
  const handleCalculateSalaries = async () => {
    setError("");
    setIsLoading(true);
    try {
      const response = await apiRequest("/financial/calculate-salaries", {
        method: "POST",
        body: JSON.stringify(selectedPeriod)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      await fetchFinancialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Process payments
  const handleProcessPayments = async (financialIds) => {
    setError("");
    try {
      const response = await apiRequest("/financial/process-payments", {
        method: "POST",
        body: JSON.stringify({ financialIds })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      await fetchFinancialData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update salary config
  const handleUpdateConfig = async (role, updates) => {
    setError("");
    try {
      const response = await apiRequest(`/financial/config/${role}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      await fetchFinancialData();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingPayments = useMemo(() => 
    financialRecords.filter(record => record.status === "pending"),
    [financialRecords]
  );

  const totalPendingAmount = useMemo(() => 
    pendingPayments.reduce((sum, record) => sum + record.amount, 0),
    [pendingPayments]
  );

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Financial Management</h3>
          <p className="panel-subtitle">Manage salaries, payouts, and financial records</p>
        </div>
        {/* <div className="row-actions">
          <PeriodSelector 
            period={selectedPeriod} 
            onChange={setSelectedPeriod} 
          />
          <button 
            className="btn btn-secondary" 
            onClick={handleCalculateSalaries}
            disabled={isLoading}
          >
            Calculate Salaries
          </button>
        </div> */}
      </header>

      {error && <p className="error-text">{error}</p>}

      {/* Financial Summary */}
      {summary && (
        <FinancialSummary 
          summary={summary} 
          onProcessPayments={handleProcessPayments}
          pendingPayments={pendingPayments}
          totalPendingAmount={totalPendingAmount}
        />
      )}

      {/* Salary Configuration */}
      <SalaryConfigSection 
        config={salaryConfig} 
        onUpdate={handleUpdateConfig} 
      />

      {/* Financial Records */}
      <FinancialRecordsTable 
        records={financialRecords}
        isLoading={isLoading}
        onProcessPayments={handleProcessPayments}
      />
    </section>
  );
}

// Supporting Components
function PeriodSelector({ period, onChange }) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="filter-grid">
      <select
        className="input-control"
        value={period.month}
        onChange={(e) => onChange({ ...period, month: parseInt(e.target.value) })}
      >
        {months.map((month, index) => (
          <option key={index + 1} value={index + 1}>
            {month}
          </option>
        ))}
      </select>
      <select
        className="input-control"
        value={period.year}
        onChange={(e) => onChange({ ...period, year: parseInt(e.target.value) })}
      >
        {years.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function FinancialSummary({ summary, onProcessPayments, pendingPayments, totalPendingAmount }) {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <span className="metric-label">Total Pending</span>
        <strong className="metric-value">{formatCurrency(totalPendingAmount)}</strong>
        <span className="metric-helper">{pendingPayments.length} payments</span>
        {pendingPayments.length > 0 && (
          <button
            className="btn btn-sm"
            onClick={() => onProcessPayments(pendingPayments.map(p => p._id))}
          >
            Process All
          </button>
        )}
      </div>
      <div className="metric-card">
        <span className="metric-label">Total Paid</span>
        <strong className="metric-value">{formatCurrency(summary.totals.paid)}</strong>
        <span className="metric-helper">This period</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Overall Total</span>
        <strong className="metric-value">{formatCurrency(summary.totals.overall)}</strong>
        <span className="metric-helper">All transactions</span>
      </div>
    </div>
  );
}

function SalaryConfigSection({ config, onUpdate }) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});

  const handleEdit = (role) => {
    setEditing(role);
    setFormData(config[role] || {});
  };

  const handleSave = (role) => {
    onUpdate(role, formData);
    setEditing(null);
  };

  const roles = [
    { key: "driver", label: "Driver Salary Configuration" },
    { key: "vehicle_owner", label: "Vehicle Owner Payout Configuration" },
    { key: "inspector", label: "Inspector Salary Configuration" }
  ];

  return (
    <div className="config-section">
      <h4>Salary Configuration</h4>
      <div className="config-grid">
        {roles.map(({ key, label }) => (
          <div key={key} className="config-card">
            <h5>{label}</h5>
            {editing === key ? (
              <ConfigForm 
                config={formData} 
                onChange={setFormData}
                onSave={() => handleSave(key)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <ConfigDisplay 
                config={config[key]} 
                onEdit={() => handleEdit(key)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigForm({ config, onChange, onSave, onCancel }) {
  const handleChange = (path, value) => {
    const keys = path.split(".");
    const newConfig = { ...config };
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  return (
    <div className="config-form">
      <div className="form-grid">
        {/* === Base Salary === */}
        {(config.role === "driver" || config.role === "inspector") && (
          <label>
            Base Salary
            <input
              type="number"
              value={config.baseSalary || 0}
              onChange={(e) =>
                handleChange("baseSalary", parseFloat(e.target.value) || 0)
              }
              className="input-control"
            />
          </label>
        )}

        {/* === Commission Rates === */}
        <div className="form-section">
          <h6>Commission Rates</h6>
          {config.role === "driver" && (
            <label>
              Commission per Trip (%)
              <input
                type="number"
                step="0.1"
                value={config.commissionRates?.perTrip || 0}
                onChange={(e) =>
                  handleChange(
                    "commissionRates.perTrip",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="input-control"
              />
            </label>
          )}

          {config.role === "vehicle_owner" && (
            <label>
              Revenue Share (%)
              <input
                type="number"
                step="0.1"
                value={config.commissionRates?.revenueShare || 0}
                onChange={(e) =>
                  handleChange(
                    "commissionRates.revenueShare",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="input-control"
              />
            </label>
          )}

          {config.role === "inspector" && (
            <label>
              Per Inspection Rate
              <input
                type="number"
                value={config.commissionRates?.perInspection || 0}
                onChange={(e) =>
                  handleChange(
                    "commissionRates.perInspection",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="input-control"
              />
            </label>
          )}
        </div>

        {/* === Bonuses === */}
        <div className="form-section">
          <h6>Bonuses</h6>
          {(config.role === "driver" || config.role === "vehicle_owner") && (
            <>
              <label>
                Min Trips for Bonus
                <input
                  type="number"
                  value={config.bonuses?.minTripsForBonus || 0}
                  onChange={(e) =>
                    handleChange(
                      "bonuses.minTripsForBonus",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="input-control"
                />
              </label>
              <label>
                Bonus Amount
                <input
                  type="number"
                  value={config.bonuses?.bonusAmount || 0}
                  onChange={(e) =>
                    handleChange(
                      "bonuses.bonusAmount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="input-control"
                />
              </label>
            </>
          )}

          {config.role === "inspector" && (
            <>
              <label>
                Min Inspections for Bonus
                <input
                  type="number"
                  value={config.bonuses?.minInspectionsForBonus || 0}
                  onChange={(e) =>
                    handleChange(
                      "bonuses.minInspectionsForBonus",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="input-control"
                />
              </label>
              <label>
                Inspection Bonus
                <input
                  type="number"
                  value={config.bonuses?.inspectionBonus || 0}
                  onChange={(e) =>
                    handleChange(
                      "bonuses.inspectionBonus",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="input-control"
                />
              </label>
            </>
          )}
        </div>

        {/* === Deductions === */}
        <div className="form-section">
          <h6>Deductions</h6>
          <label>
            Tax Rate (%)
            <input
              type="number"
              step="0.1"
              value={config.deductions?.taxRate || 0}
              onChange={(e) =>
                handleChange(
                  "deductions.taxRate",
                  parseFloat(e.target.value) || 0
                )
              }
              className="input-control"
            />
          </label>

          {config.role === "driver" && (
            <label>
              Other Deductions
              <input
                type="number"
                value={config.deductions?.otherDeductions || 0}
                onChange={(e) =>
                  handleChange(
                    "deductions.otherDeductions",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="input-control"
              />
            </label>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}


function ConfigDisplay({ config, onEdit }) {
  if (!config) {
    return (
      <div>
        <p className="muted">No configuration set</p>
        <button className="btn btn-sm" onClick={onEdit}>
          Configure
        </button>
      </div>
    );
  }

  const { role, baseSalary, commissionRates, bonuses, deductions } = config;

  return (
    <div>
      <dl className="config-details">
        {/* Base Salary */}
        {(role == "inspector" || role == "driver") && (
          <>
            <dt>Base Salary:</dt>
            <dd>{formatCurrency(baseSalary)}</dd>
          </>
        )}

        {/* Commission Rates Section */}
        <dt>
          <strong>Commission Rates</strong>
        </dt>

        {role === "driver" && (
          <>
            <dt>Per Trip:</dt>
            <dd>{commissionRates.perTrip}%</dd>
          </>
        )}

        {role === "vehicle_owner" && (
          <>
            <dt>Revenue Share:</dt>
            <dd>{commissionRates.revenueShare}%</dd>
          </>
        )}

        {role === "inspector" && (
          <>
            <dt>Per Inspection:</dt>
            <dd>{formatCurrency(commissionRates.perInspection)}</dd>
          </>
        )}

        {/* Bonuses Section */}
        <dt>
          <strong>Bonuses</strong>
        </dt>

        {(role === "driver" || role === "vehicle_owner") && (
          <>
            <dt>Min Trips for Bonus:</dt>
            <dd>{bonuses.minTripsForBonus}</dd>
            <dt>Bonus Amount:</dt>
            <dd>{formatCurrency(bonuses.bonusAmount)}</dd>
          </>
        )}

        {role === "inspector" && (
          <>
            <dt>Min Inspections for Bonus:</dt>
            <dd>{bonuses.minInspectionsForBonus}</dd>
            <dt>Inspection Bonus:</dt>
            <dd>{formatCurrency(bonuses.inspectionBonus)}</dd>
          </>
        )}

        {/* Deductions Section */}
        <dt>
          <strong>Deductions</strong>
        </dt>

        <dt>Tax Rate:</dt>
        <dd>{deductions.taxRate}%</dd>

        {role === "driver" && (
          <>
            <dt>Other Deductions:</dt>
            <dd>{formatCurrency(deductions.otherDeductions)}</dd>
          </>
        )}
      </dl>
      <button className="btn btn-sm" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}


function FinancialRecordsTable({ records, isLoading, onProcessPayments }) {
  const [selectedRecords, setSelectedRecords] = useState([]);

  const handleSelectRecord = (recordId, checked) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, recordId]);
    } else {
      setSelectedRecords(prev => prev.filter(id => id !== recordId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRecords(records.filter(r => r.status === "pending").map(r => r._id));
    } else {
      setSelectedRecords([]);
    }
  };

  const handleProcessSelected = () => {
    onProcessPayments(selectedRecords);
    setSelectedRecords([]);
  };

  if (isLoading) return <p>Loading financial records...</p>;
  if (records.length === 0) return <p>No financial records found for the selected period.</p>;

  return (
    <div className="table-section">
      <div className="table-header">
        <h4>Financial Records</h4>
        {selectedRecords.length > 0 && (
          <button className="btn btn-sm" onClick={handleProcessSelected}>
            Process Selected ({selectedRecords.length})
          </button>
        )}
      </div>
      <div className="table-wrapper">
        <table className="management-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={selectedRecords.length > 0 && selectedRecords.length === records.filter(r => r.status === "pending").length}
                />
              </th>
              <th>ID</th>
              <th>Recipient</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Period</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record._id}>
                <td>
                  {record.status === "pending" && (
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record._id)}
                      onChange={(e) => handleSelectRecord(record._id, e.target.checked)}
                    />
                  )}
                </td>
                <td>{record.financialId}</td>
                <td>
                  <div className="cell-stack">
                    <strong>{getUserName(record.recipientId)}</strong>
                    <span className="muted">{record.recipientType}</span>
                  </div>
                </td>
                <td>{record.type}</td>
                <td>{formatCurrency(record.amount)}</td>
                <td>{record.period.month}/{record.period.year}</td>
                <td>
                  <span className={`status-pill status-${record.status}`}>
                    {record.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-text"
                    onClick={() => {/* Show details modal */}}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper functions
function getUserName(user) {
  if (!user) return "-";
  if (user.profile) {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }
  return user.email || "-";
}

function formatCurrency(value, currency = "LKR") {
  if (value === undefined || value === null) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

export default FinancialManagementPanel;