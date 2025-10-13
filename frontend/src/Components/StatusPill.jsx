function normalizeStatus(value) {
  if (!value) return "unknown";
  return String(value).toLowerCase().replace(/\s+/g, "_");
}

function StatusPill({ value }) {
  if (!value) return <span className="status-pill">-</span>;
  const label = String(value).replace(/_/g, " ");
  const normalized = normalizeStatus(value);
  return <span className={`status-pill status-${normalized}`}>{label}</span>;
}

export default StatusPill;
