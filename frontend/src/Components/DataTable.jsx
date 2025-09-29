import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

function normalizeValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DataTable({ title, endpoint, query = {}, transform, filters }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const queryKey = JSON.stringify(query);

  const buildQueryString = () => {
    const params = new URLSearchParams(query);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiRequest(`${endpoint}${buildQueryString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load data");
      }

      let processed = Array.isArray(data) ? data : [data];
      if (filters) {
        processed = processed.filter(filters);
      }
      if (transform) {
        processed = processed.map(transform);
      }
      setRows(processed);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, queryKey]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <section className="panel">
      <header className="panel-header">
        <h3>{title}</h3>
        <button className="btn btn-secondary" onClick={fetchData} disabled={isLoading}>
          Refresh
        </button>
      </header>
      {isLoading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!isLoading && !error && rows.length === 0 && <p>No records found.</p>}
      {!isLoading && !error && rows.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row._id || index}>
                  {columns.map((column) => (
                    <td key={column}>{normalizeValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default DataTable;
