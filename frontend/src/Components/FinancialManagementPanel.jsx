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

  // Calculate salaries
  // const handleCalculateSalaries = async () => {
  //   setError("");
  //   setIsLoading(true);
  //   try {
  //     const response = await apiRequest("/financial/calculate-salaries", {
  //       method: "POST",
  //       body: JSON.stringify(selectedPeriod)
  //     });
  //     const data = await response.json();
  //     if (!response.ok) throw new Error(data.message);
      
  //     await fetchFinancialData();
  //   } catch (err) {
  //     setError(err.message);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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
    <section className="bg-white rounded-xl shadow-sm border border-gray-200">
      <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Financial Management
          </h3>
          <p className="text-gray-600 mt-1">
            Manage salaries, payouts, and financial records
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/*
          <PeriodSelector 
            period={selectedPeriod} 
            onChange={setSelectedPeriod} 
          />
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            onClick={handleCalculateSalaries}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Calculating...</span>
              </>
            ) : (
              <>
                <span>💰</span>
                <span>Calculate Salaries</span>
              </>
            )}
          </button>*/}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 flex items-center">
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
    <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Period:</span>
        <select
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
    <div className="p-6 bg-gray-50 rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">
          Financial Overview
        </h4>
        <select
          className="mt-3 md:mt-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white p-6 rounded-xl border border-gray-200 border-l-4 border-l-blue-500">
          <span className="text-sm font-medium text-gray-600">
            Current Period
          </span>
          <strong className="block mt-2 text-2xl text-gray-900">
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
        <div className="bg-white p-6 rounded-xl border border-gray-200 border-l-4 border-l-green-500">
          <span className="text-sm font-medium text-gray-600">
            Previous Period
          </span>
          <strong className="block mt-2 text-2xl text-gray-900">
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
    <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xl font-semibold text-gray-900">Salary Configuration</h4>
          <p className="text-gray-600 mt-1">Configure payment rules for different roles</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>⚙️</span>
          <span>Manage payroll settings</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map(({ key, label, icon, description }) => (
          <div key={key} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{icon}</span>
              <div>
                <h5 className="text-lg font-semibold text-gray-900">{label}</h5>
                <p className="text-sm text-gray-500">{description}</p>
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
            <label className="text-sm font-medium text-gray-700">Base Salary (LKR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
              <input
                type="number"
                value={config.baseSalary || 0}
                onChange={(e) => handleChange("baseSalary", parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter base salary"
                min="0"
                step="1000"
              />
            </div>
          </div>
        )}

        {/* Commission Rates */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h6 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
            <span className="mr-2">💸</span>
            Commission Rates
          </h6>
          <div className="space-y-3">
            {role === "driver" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Commission per Trip (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getFieldValue("commissionRates", "perTrip")}
                    onChange={(e) => handleNestedChange("commissionRates", "perTrip", parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            )}

            {role === "vehicle_owner" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Revenue Share (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getFieldValue("commissionRates", "revenueShare")}
                    onChange={(e) => handleNestedChange("commissionRates", "revenueShare", parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            )}

            {role === "inspector" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Per Inspection Rate (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={getFieldValue("commissionRates", "perInspection")}
                    onChange={(e) => handleNestedChange("commissionRates", "perInspection", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bonuses */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h6 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
            <span className="mr-2">🎯</span>
            Performance Bonuses
          </h6>
          <div className="grid grid-cols-1 gap-3">
            {(role === "driver" || role === "vehicle_owner") && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Minimum Trips for Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={getFieldValue("bonuses", "minTripsForBonus")}
                    onChange={(e) => handleNestedChange("bonuses", "minTripsForBonus", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Bonus Amount (LKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={getFieldValue("bonuses", "bonusAmount")}
                      onChange={(e) => handleNestedChange("bonuses", "bonusAmount", parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {role === "inspector" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Minimum Inspections for Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={getFieldValue("bonuses", "minInspectionsForBonus")}
                    onChange={(e) => handleNestedChange("bonuses", "minInspectionsForBonus", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Inspection Bonus (LKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={getFieldValue("bonuses", "inspectionBonus")}
                      onChange={(e) => handleNestedChange("bonuses", "inspectionBonus", parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h6 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
            <span className="mr-2">📉</span>
            Deductions
          </h6>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={getFieldValue("deductions", "taxRate")}
                  onChange={(e) => handleNestedChange("deductions", "taxRate", parseFloat(e.target.value) || 0)}
                  className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            {role === "driver" &&  (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Other Deductions (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₨</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={getFieldValue("deductions", "otherDeductions")}
                    onChange={(e) => handleNestedChange("deductions", "otherDeductions", parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        <button 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
        <div className="text-4xl mb-3 text-gray-400">⚙️</div>
        <p className="text-gray-500 mb-4">No configuration set</p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <span className={`text-sm font-semibold ${
                item.label.includes('Tax') || item.label.includes('Deduction') ? 'text-red-600' : 'text-green-600'
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
      
      <button 
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
        onClick={onEdit}
      >
        <span>✏️</span>
        <span>Edit Configuration</span>
      </button>
    </div>
  );
}

function FinancialRecordsTable() {
  const [payouts, setPayouts] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)

  const getDriverLabel = (payout) => {
    const driver = payout?.driver || payout?.driverId;
    if (!driver) return "-";
    if (typeof driver === "string") return driver;
    return getUserName(driver);
  };

  const fetchPayouts = async () => {
    try {
      setPayoutsLoading(true)
      const response = await apiRequest("/Financial/payouts");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || `Failed to load financial records`);
      }
      setPayouts(payload)
      return payload;
    } catch (error) {
      console.error("An error occured: ", error)
    } finally{
      setPayoutsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [])

  const handleDownloadReport = useCallback(() => {
    if (!payouts.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    const marginLeft = 40;
    const headerY = 60;
    const now = new Date();

    // const totalPayments = payments.reduce(
    //   (sum, item) => sum + (Number(item.amount) || 0),
    //   0
    // );
    const totalPayouts = payouts.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    doc.setFontSize(18);
    doc.text("Payouts Report", marginLeft, headerY);

    doc.setFontSize(11);
    doc.text(`Generated: ${now.toLocaleString()}`, marginLeft, headerY + 20);
    doc.text(`Payouts: ${payouts.length}`, marginLeft, headerY + 35);
    doc.text(
      `Totals: Payouts ${formatCurrency(totalPayouts)}`,
      marginLeft,
      headerY + 50
    );

    let tableY = headerY + 75;

    // if (payments.length) {
    //   autoTable(doc, {
    //     startY: tableY,
    //     head: [
    //       ["Payment", "Booking", "Customer", "Amount", "Status", "Processed"],
    //     ],
    //     body: payments.map((payment) => [
    //       payment.paymentId || payment._id,
    //       getBookingLabel(payment),
    //       payment.customerId ? getUserName(payment.customerId) : "-",
    //       formatCurrency(payment.amount, payment.currency || currency),
    //       payment.status ? payment.status.replace(/_/g, " ") : "-",
    //       formatDateTime(
    //         payment.updatedAt || payment.processedAt || payment.createdAt
    //       ),
    //     ]),
    //     styles: { fontSize: 10, cellPadding: 6 },
    //     headStyles: { fillColor: [17, 24, 39], textColor: 255 },
    //     columnStyles: {
    //       0: { halign: "center", cellWidth: 90 },
    //       3: { halign: "right", cellWidth: 120 },
    //       4: { halign: "center", cellWidth: 100 },
    //     },
    //   });
    //   tableY = doc.lastAutoTable.finalY + 30;
    // }

    if (payouts.length) {
      autoTable(doc, {
        startY: tableY,
        head: [["Payout", "User", "Role", "Amount", "Status", "Updated"]],
        body: payouts.map((payout) => [
          payout.financialId || payout._id,
          getUserName(payout.recipientId),
          payout.recipientType,
          formatCurrency(payout.amount),
          payout.status ? payout.status.replace(/_/g, " ") : "-",
          formatDateTime(
            payout.updatedAt || payout.processedAt || payout.createdAt
          ),
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [17, 24, 39], textColor: 255 },
        columnStyles: {
          0: { halign: "center", cellWidth: 120 },
          2: { halign: "left", cellWidth: 90 },
          3: { halign: "center", cellWidth: 100 },
        },
      });
    }

    doc.save("payouts-report.pdf");
  }, [payouts]);

  const refreshDisabled = payoutsLoading;
  const downloadDisabled =
    refreshDisabled || (payouts.length === 0);

  if (payoutsLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-3 text-gray-600">Loading financial records...</p>
    </div>
  );

  if (payouts.length === 0) return (
    <div className="p-8 text-center">
      <div className="text-4xl mb-3 text-gray-400">📊</div>
      <p className="text-gray-500">No financial records found for the selected period.</p>
    </div>
  );

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h3>Payouts</h3>
          <p className="panel-subtitle">Salaries, Commissions & Expenses</p>
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
            onClick={fetchPayouts}
            disabled={refreshDisabled}
          >
            Refresh
          </button>
        </div>
      </header>
      <div className="two-column">
        {/* <div className="management-subpanel">
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
        </div> */}
        <div className="management-subpanel">
          
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
                    <th>User</th>
                    <th>Role</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{payout.financialId}</strong>
                          <span className="muted">
                            {formatDate(payout.processedAt || payout.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span>{getUserName(payout.recipientId)}</span>
                          <span className="muted">
                            {payout.recipientId?.email}
                          </span>
                        </div>
                      </td>
                      <td>{payout.recipientType || "-"}</td>
                      <td>{formatCurrency(payout.amount)}</td>
                      <td>
                        <StatusPill value={payout.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
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