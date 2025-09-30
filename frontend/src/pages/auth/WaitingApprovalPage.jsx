import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../services/api.js";

function WaitingApprovalPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const role = searchParams.get("role") || "user";
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending_verification");
  const [error, setError] = useState("");

  useEffect(() => {
    let intervalId;
    async function fetchStatus() {
      if (!email) return;
      try {
        const response = await apiRequest(`/auth/status/${encodeURIComponent(email)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to fetch status");
        }
        setStatus(data.status);
      } catch (err) {
        setError(err.message);
      }
    }

    if (email) {
      fetchStatus();
      intervalId = window.setInterval(fetchStatus, 5000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [email]);

  const handleGoToLogin = () => {
    if (role === "customer") {
      navigate("/login");
    } else if (role === "vehicle_owner") {
      navigate("/login/vehicle-owner");
    } else {
      navigate(`/login/${role.replace("_", "-")}`);
    }
  };

  return (
    <div className="page-container">
      <div className="auth-card">
        <h2>Account Pending Approval</h2>
        <p>
          Hi {email}, your {role.replace("_", " ")} account is waiting for admin approval.
          We will refresh this page automatically once the status changes.
        </p>

        <div className="status-block">
          <span className={`status-pill status-${status}`}>{status}</span>
        </div>

        {status === "active" && (
          <button className="btn" onClick={handleGoToLogin}>
            Continue to Login
          </button>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}

export default WaitingApprovalPage;
