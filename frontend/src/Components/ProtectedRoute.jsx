import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function ProtectedRoute({ allowedRoles, children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="page-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = typeof user.role === "string" ? user.role.trim().toLowerCase() : "";
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles
        .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
        .filter(Boolean)
    : [];

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return (
      <div className="page-container">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this section.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
