import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDateTime } from "../utils/formatDate.js";
import StatusPill from "./StatusPill.jsx";

function FinancialManagementPanel() {
  const [financialRecords, setFinancialRecords] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [filterType, setFilterType] = useState("day");
  const [advancedPaymentDetails, setAdvancedPaymentDetails] = useState([]);

  // Fetch financial data
  const fetchFinancialData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [recordsRes, configRes, advancedRes] = await Promise.all([
        apiRequest(`/financial/records?month=${selectedPeriod.month}&year=${selectedPeriod.year}&limit=100`),
        apiRequest("/financial/config"),
        apiRequest(`/payments/advanced?type=${filterType}`)
      ]);

      const [recordsData, configData, advancedData] = await Promise.all([
        recordsRes.json(),
        configRes.json(),
        advancedRes.json()
      ]);

      setFinancialRecords(recordsData.financials || []);
      setSalaryConfig(configData.reduce(
        (acc, config) => ({ ...acc, [config.role]: config }),
        {}
      ));
      setAdvancedPaymentDetails(advancedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Fetch advanced payment details
  const fetchAdvancedPaymentDetails = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`/payments/advanced?type=${filterType}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setAdvancedPaymentDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAdvancedPaymentDetails();
  }, [filterType]);

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

  return (
    <section className="bg-neutral-800 rounded-2xl border border-neutral-700 shadow-lg">
      <header className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">
            Financial Management
          </h3>
          <p className="text-gray-400 mt-1">
            Manage salaries, payouts, and financial records
          </p>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-300 flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Financial Summary */}
      <FinancialSummary
        filterType={filterType}
        setFilterType={setFilterType}
        data={advancedPaymentDetails}
        loading={isLoading}
      />

      {/* Salary Configuration */}
      <SalaryConfigSection
        config={salaryConfig}
        onUpdate={handleUpdateConfig}
      />

      {/* Financial Records */}
      <FinancialRecordsTable />
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
    <div className="flex items-center space-x-3 bg-neutral-700 p-3 rounded-lg border border-neutral-600">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">Period:</span>
        <select
          className="w-32 px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white text-sm"
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
          className="w-24 px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white text-sm"
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
    </div>
  );
}

function FinancialSummary({ filterType, setFilterType, data, loading }) {
  return (
    <div className="p-6 bg-neutral-700/50 rounded-xl border border-neutral-600 m-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h4 className="text-lg font-semibold text-white">
          Financial Overview
        </h4>
        <select
          className="mt-3 md:mt-0 px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Period Card */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 border-l-4 border-l-[#FF5A00]">
          <span className="text-sm font-medium text-gray-400">
            Current Period
          </span>
          <strong className="block mt-2 text-2xl text-white">
            {formatCurrency(data[0]?.amount)}
          </strong>
          <span className="text-sm text-gray-500 mt-1 block">
            {data[0]?.count ?? 0} bookings
          </span>
          {loading && (
            <span className="text-xs text-gray-400 mt-1 block">…</span>
          )}
        </div>

        {/* Previous Period Card */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 border-l-4 border-l-green-500">
          <span className="text-sm font-medium text-gray-400">
            Previous Period
          </span>
          <strong className="block mt-2 text-2xl text-white">
            {formatCurrency(data[1]?.amount)}
          </strong>
          <span className="text-sm text-gray-500 mt-1 block">
            {data[1]?.count ?? 0} bookings
          </span>
          {loading && (
            <span className="text-xs text-gray-400 mt-1 block">…</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryConfigSection({ config, onUpdate }) {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleEdit = (role) => {
    setEditing(role);
    setFormData(config[role] || { role });
  };

  const handleSave = async (role) => {
    setSaving(true);
    try {
      await onUpdate(role, formData);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setFormData({});
  };

  const roles = [
    { 
      key: "driver", 
      label: "Driver Salary", 
      icon: "🚗",
      description: "Configure driver commissions and bonuses"
    },
    { 
      key: "vehicle_owner", 
      label: "Vehicle Owner", 
      icon: "👤",
      description: "Set owner revenue sharing rates"
    },
    { 
      key: "inspector", 
      label: "Inspector Salary", 
      icon: "🔍",
      description: "Define inspection fees and bonuses"
    }
  ];

  return (
    <div className="mt-6 p-6 bg-neutral-700/50 rounded-xl border border-neutral-600 mx-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xl font-semibold text-white">Salary Configuration</h4>
          <p className="text-gray-400 mt-1">Configure payment rules for different roles</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>⚙️</span>
          <span>Manage payroll settings</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map(({ key, label, icon, description }) => (
          <div key={key} className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{icon}</span>
              <div>
                <h5 className="text-lg font-semibold text-white">{label}</h5>
                <p className="text-sm text-gray-400">{description}</p>
              </div>
            </div>
            
            {editing === key ? (
              <ConfigForm 
                config={formData} 
                onChange={setFormData}
                onSave={() => handleSave(key)}
                onCancel={handleCancel}
                saving={saving}
                role={key}
              />
            ) : (
              <ConfigDisplay 
                config={config[key]} 
                onEdit={() => handleEdit(key)}
                role={key}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigForm({ config, onChange, onSave, onCancel, saving, role }) {
  const handleChange = (field, value) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const handleNestedChange = (parent, field, value) => {
    onChange({
      ...config,
      [parent]: {
        ...config[parent],
        [field]: value
      }
    });
  };

  const getFieldValue = (parent, field, defaultValue = 0) => {
    return config[parent]?.[field] || defaultValue;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Base Salary */}
        {(role === "driver" || role === "inspector") && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Base Salary (LKR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
              <input
                type="number"
                value={config.baseSalary || 0}
                onChange={(e) => handleChange("baseSalary", parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                placeholder="Enter base salary"
                min="0"
                step="1000"
              />
            </div>
          </div>
        )}

        {/* Commission Rates */}
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
          <h6 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
            <span className="mr-2">💸</span>
            Commission Rates
          </h6>
          <div className="space-y-3">
            {role === "driver" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Commission per Trip (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getFieldValue("commissionRates", "perTrip")}
                    onChange={(e) => handleNestedChange("commissionRates", "perTrip", parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            )}

            {role === "vehicle_owner" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Revenue Share (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getFieldValue("commissionRates", "revenueShare")}
                    onChange={(e) => handleNestedChange("commissionRates", "revenueShare", parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            )}

            {role === "inspector" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Per Inspection Rate (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={getFieldValue("commissionRates", "perInspection")}
                    onChange={(e) => handleNestedChange("commissionRates", "perInspection", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bonuses */}
        <div className="p-4 bg-green-900/20 rounded-lg border border-green-700/50">
          <h6 className="text-sm font-semibold text-green-300 mb-3 flex items-center">
            <span className="mr-2">🎯</span>
            Performance Bonuses
          </h6>
          <div className="grid grid-cols-1 gap-3">
            {(role === "driver" || role === "vehicle_owner") && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Minimum Trips for Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={getFieldValue("bonuses", "minTripsForBonus")}
                    onChange={(e) => handleNestedChange("bonuses", "minTripsForBonus", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Bonus Amount (LKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={getFieldValue("bonuses", "bonusAmount")}
                      onChange={(e) => handleNestedChange("bonuses", "bonusAmount", parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                    />
                  </div>
                </div>
              </>
            )}

            {role === "inspector" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Minimum Inspections for Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={getFieldValue("bonuses", "minInspectionsForBonus")}
                    onChange={(e) => handleNestedChange("bonuses", "minInspectionsForBonus", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Inspection Bonus (LKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={getFieldValue("bonuses", "inspectionBonus")}
                      onChange={(e) => handleNestedChange("bonuses", "inspectionBonus", parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50">
          <h6 className="text-sm font-semibold text-red-300 mb-3 flex items-center">
            <span className="mr-2">📉</span>
            Deductions
          </h6>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tax Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={getFieldValue("deductions", "taxRate")}
                  onChange={(e) => handleNestedChange("deductions", "taxRate", parseFloat(e.target.value) || 0)}
                  className="w-full pr-8 pl-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            {role === "driver" &&  (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Other Deductions (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={getFieldValue("deductions", "otherDeductions")}
                    onChange={(e) => handleNestedChange("deductions", "otherDeductions", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-600">
        <button 
          className="px-4 py-2 bg-neutral-600 text-gray-300 rounded-lg font-medium hover:bg-neutral-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button 
          className="px-4 py-2 bg-[#FF5A00] text-white rounded-lg font-medium hover:bg-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ConfigDisplay({ config, onEdit, role }) {
  if (!config) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3 text-gray-500">⚙️</div>
        <p className="text-gray-400 mb-4">No configuration set</p>
        <button 
          className="px-4 py-2 bg-[#FF5A00] text-white rounded-lg font-medium hover:bg-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
          onClick={onEdit}
        >
          Configure Settings
        </button>
      </div>
    );
  }

  const { baseSalary, commissionRates = {}, bonuses = {}, deductions = {} } = config;

  const getSummaryItems = () => {
    const items = [];
    
    if (baseSalary) {
      items.push({ label: "Base Salary", value: formatCurrency(baseSalary), icon: "💰" });
    }
    
    if (commissionRates.perTrip) {
      items.push({ label: "Trip Commission", value: `${commissionRates.perTrip}%`, icon: "🚗" });
    }
    
    if (commissionRates.revenueShare) {
      items.push({ label: "Revenue Share", value: `${commissionRates.revenueShare}%`, icon: "📊" });
    }
    
    if (commissionRates.perInspection) {
      items.push({ label: "Inspection Fee", value: formatCurrency(commissionRates.perInspection), icon: "🔍" });
    }
    
    if (bonuses.bonusAmount) {
      items.push({ label: "Performance Bonus", value: formatCurrency(bonuses.bonusAmount), icon: "🎯" });
    }

    if (bonuses.inspectionBonus) {
      items.push({
        label: "Inspection Bonus",
        value: formatCurrency(bonuses.inspectionBonus),
        icon: "🎯",
      });
    }
    
    if (deductions.taxRate) {
      items.push({ label: "Tax Rate", value: `${deductions.taxRate}%`, icon: "📉" });
    }

    return items;
  };

  const summaryItems = getSummaryItems();

  return (
    <div>
      {summaryItems.length > 0 ? (
        <div className="space-y-3">
          {summaryItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-neutral-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-gray-300">{item.label}</span>
              </div>
              <span className={`text-sm font-semibold ${
                item.label.includes('Tax') || item.label.includes('Deduction') ? 'text-red-400' : 'text-green-400'
              }`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Basic configuration applied</p>
        </div>
      )}
    </div>
  );
}

function FinancialRecordsTable() {
  const [financials, setFinancials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    role: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const fetchFinancialRecords = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);

      const response = await apiRequest(`/financial/paid-records?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setFinancials(data.financials || []);
    } catch (error) {
      console.error("Error fetching financial records:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialStats = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);

      const response = await apiRequest(`/financial/stats?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setStats(data);
    } catch (error) {
      console.error("Error fetching financial stats:", error);
    }
  };

  useEffect(() => {
    fetchFinancialRecords();
    fetchFinancialStats();
  }, [filters]);

  const handleDownloadReport = () => {
    if (!financials.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    // Calculate totals
    const totalsByRole = financials.reduce((acc, record) => {
      const role = record.recipientType;
      if (!acc[role]) acc[role] = 0;
      acc[role] += record.amount;
      return acc;
    }, {});

    const totalAmount = Object.values(totalsByRole).reduce((sum, amount) => sum + amount, 0);

    doc.setFontSize(18);
    doc.text("Financial Records Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Period: ${filters.month}/${filters.year}`, marginLeft, headerY + 35);
    doc.text(`Total Records: ${financials.length}`, marginLeft, headerY + 50);
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, marginLeft, headerY + 65);

    let tableY = headerY + 85;

    autoTable(doc, {
      startY: tableY,
      head: [["Financial ID", "Recipient", "Role", "Amount", "Period", "Payment Date", "Status"]],
      body: financials.map((record) => [
        record.financialId || record._id,
        getUserName(record.recipientId),
        record.recipientType,
        formatCurrency(record.amount),
        `${record.period.month}/${record.period.year}`,
        formatDate(record.paymentDate || record.updatedAt),
        record.status
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 100 },
        2: { cellWidth: 80 },
        3: { cellWidth: 80 },
        4: { cellWidth: 60 },
        5: { cellWidth: 80 }
      },
    });

    // Add summary table
    const summaryY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(14);
    doc.text("Summary by Role", marginLeft, summaryY);

    autoTable(doc, {
      startY: summaryY + 15,
      head: [["Role", "Total Amount", "Record Count"]],
      body: Object.entries(totalsByRole).map(([role, amount]) => [
        role,
        formatCurrency(amount),
        financials.filter(f => f.recipientType === role).length
      ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    doc.save(`financial-records-${filters.month}-${filters.year}.pdf`);
  };

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'driver', label: 'Drivers' },
    { value: 'vehicle_owner', label: 'Vehicle Owners' },
    { value: 'inspector', label: 'Inspectors' }
  ];

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('en', { month: 'long' })
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year, label: year.toString() };
  });

  return (
    <section className="p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">Financial Records</h3>
          <p className="text-gray-400 mt-1">All Salary Payments & Payouts</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {/* Filters */}
          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.month}
            onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
            className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
          >
            {yearOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            className="px-4 py-2 bg-[#FF5A00] text-white rounded-lg font-medium hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50"
            type="button"
            onClick={handleDownloadReport}
            disabled={loading || financials.length === 0}
          >
            Download PDF
          </button>
          
          <button
            className="px-4 py-2 bg-neutral-600 text-white rounded-lg font-medium hover:bg-neutral-500 transition-colors duration-200 disabled:opacity-50"
            type="button"
            onClick={fetchFinancialRecords}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      {stats.totalsByRole && stats.totalsByRole.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.totalsByRole.map((roleStat) => (
            <div key={roleStat._id} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 capitalize">
                    {roleStat._id || 'Unknown'}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(roleStat.totalPaid)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {roleStat.paidCount} payments
                  </p>
                  {roleStat.totalPending > 0 && (
                    <p className="text-sm text-orange-400">
                      {formatCurrency(roleStat.totalPending)} pending
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Records Table */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5A00] mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading financial records...</p>
          </div>
        ) : financials.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3 text-gray-500">📊</div>
            <p className="text-gray-400">No financial records found for the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Financial ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700">
                {financials.map((record) => (
                  <tr key={record._id} className="hover:bg-neutral-700/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{record.financialId}</div>
                        <div className="text-xs text-gray-400">
                          {record.type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-white">{getUserName(record.recipientId)}</div>
                        <div className="text-xs text-gray-400">
                          {record.recipientId?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        record.recipientType === 'driver' ? 'bg-blue-900/50 text-blue-300' :
                        record.recipientType === 'vehicle_owner' ? 'bg-green-900/50 text-green-300' :
                        'bg-purple-900/50 text-purple-300'
                      }`}>
                        {record.recipientType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {record.period.month}/{record.period.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(record.paymentDate || record.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusPill value={record.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-[#FF5A00] hover:text-orange-400 text-sm font-medium transition-colors duration-200"
                        onClick={() => {
                          console.log('Calculation details:', record.calculationDetails);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

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