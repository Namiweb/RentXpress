import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../../firebase.js";

function extractNameParts(displayName = "") {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function CustomerOwnerAuthPage({ mode }) {
  const navigate = useNavigate();
  const { login, loginWithGoogle, getDashboardPath } = useAuth();
  const [role, setRole] = useState("customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [googleAuthState, setGoogleAuthState] = useState({ token: "", email: "", displayName: "" });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
  });

  const isRegister = mode === "register";
  const isGoogleLinked = Boolean(googleAuthState.token);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const authenticateWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const googleEmail = result.user?.email || "";
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;

    if (!idToken) {
      throw new Error("Unable to retrieve Google credentials. Please try again.");
    }

    return {
      idToken,
      email: googleEmail,
      displayName: result.user?.displayName || "",
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isRegister && !isGoogleLinked && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isRegister) {
        if (isGoogleLinked) {
          const response = await apiRequest("/auth/register/google", {
            method: "POST",
            body: JSON.stringify({
              idToken: googleAuthState.token,
              role,
              profile: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                dateOfBirth: formData.dateOfBirth,
              },
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Registration failed");
          }

          if (role === "customer" || role === "vehicle_owner") {
            try {
              const user = await loginWithGoogle({ idToken: googleAuthState.token, role });
              navigate(getDashboardPath(user.role));
            } catch (loginError) {
              if (loginError.status === 403) {
                navigate(`/waiting-approval?email=${encodeURIComponent(googleAuthState.email)}&role=${role}`);
                return;
              }
              throw loginError;
            }
          } else {
            const targetEmail = data?.user?.email || googleAuthState.email;
            navigate(`/waiting-approval?email=${encodeURIComponent(targetEmail)}&role=${role}`);
          }

          setGoogleAuthState({ token: "", email: "", displayName: "" });
        } else {
          const response = await apiRequest("/auth/register/customer-owner", {
            method: "POST",
            body: JSON.stringify({
              role,
              email: formData.email,
              password: formData.password,
              profile: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                dateOfBirth: formData.dateOfBirth,
              },
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Registration failed");
          }

          if (role === "customer" || role === "vehicle_owner") {
            const user = await login({ email: formData.email, password: formData.password });
            navigate(getDashboardPath(user.role));
          } else {
            navigate(`/waiting-approval?email=${encodeURIComponent(formData.email)}&role=${role}`);
          }
        }
      } else {
        try {
          const user = await login({ email: formData.email, password: formData.password });
          navigate(getDashboardPath(user.role));
        } catch (loginError) {
          if (loginError.status === 403 && role !== "vehicle_owner") {
            navigate(`/waiting-approval?email=${encodeURIComponent(formData.email)}&role=${role}`);
            return;
          }
          throw loginError;
        }
      }
    } catch (submitError) {
      setError(submitError.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isRegister || isSubmitting) {
      return;
    }

    setError("");
    let googleEmail = "";

    try {
      setIsSubmitting(true);
      const googleResult = await authenticateWithGoogle();
      googleEmail = googleResult.email;

      const authenticatedUser = await loginWithGoogle({ idToken: googleResult.idToken, role });
      navigate(getDashboardPath(authenticatedUser.role));
    } catch (signInError) {
      if (signInError?.status === 403 && signInError?.details?.status === "pending_verification") {
        const targetEmail = signInError?.details?.email || googleEmail;
        navigate(`/waiting-approval?email=${encodeURIComponent(targetEmail)}&role=${role}`);
        return;
      }

      if (signInError?.status === 409 && signInError?.details?.expectedRole) {
        setError(signInError.message || "This Google account is linked to a different role.");
        return;
      }

      if (signInError?.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was closed before completion.");
        return;
      }

      setError(signInError?.message || "Google sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!isRegister || isSubmitting) {
      return;
    }

    setError("");

    try {
      setIsSubmitting(true);
      const googleResult = await authenticateWithGoogle();
      const nameParts = extractNameParts(googleResult.displayName);

      setGoogleAuthState({
        token: googleResult.idToken,
        email: googleResult.email,
        displayName: googleResult.displayName,
      });

      setFormData((prev) => ({
        ...prev,
        email: googleResult.email,
        password: "",
        confirmPassword: "",
        firstName: prev.firstName || nameParts.firstName,
        lastName: prev.lastName || nameParts.lastName,
      }));
    } catch (signInError) {
      if (signInError?.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was closed before completion.");
        return;
      }
      setError(signInError?.message || "Google sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleAuthState({ token: "", email: "", displayName: "" });
    setFormData((prev) => ({
      ...prev,
      email: "",
      password: "",
      confirmPassword: "",
    }));
  };

  return (
    <div className="page-container">
      <div className="auth-card">
        <h2>{isRegister ? "Register" : "Login"} as {role === "customer" ? "Customer" : "Vehicle Owner"}</h2>
        <div className="toggle-group">
          <button
            type="button"
            className={role === "customer" ? "toggle active" : "toggle"}
            onClick={() => setRole("customer")}
          >
            Customer
          </button>
          <button
            type="button"
            className={role === "vehicle_owner" ? "toggle active" : "toggle"}
            onClick={() => setRole("vehicle_owner")}
          >
            Vehicle Owner
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              disabled={isGoogleLinked}
              value={formData.email}
              onChange={handleChange}
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              required={!isGoogleLinked}
              disabled={isGoogleLinked}
              value={formData.password}
              onChange={handleChange}
              placeholder={isGoogleLinked ? "Not required with Google" : undefined}
            />
          </label>

          {isRegister && (
            <label>
              Confirm Password
              <input
                name="confirmPassword"
                type="password"
                required={!isGoogleLinked}
                disabled={isGoogleLinked}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={isGoogleLinked ? "Not required with Google" : undefined}
              />
            </label>
          )}

          {isRegister && (
            <div className="form-grid">
              <label>
                First Name
                <input
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </label>
              <label>
                Last Name
                <input
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </label>
              <label>
                Phone Number
                <input
                  name="phoneNumber"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </label>
              <label>
                Date of Birth
                <input
                  name="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </label>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          {isRegister && isGoogleLinked && (
            <div className="info-text">
              Using Google account: {googleAuthState.email || "Unknown"}
              <button type="button" className="link-button" onClick={handleDisconnectGoogle}>
                Use a different email
              </button>
            </div>
          )}

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-google"
          onClick={isRegister ? handleGoogleRegister : handleGoogleLogin}
          disabled={isSubmitting}
        >
          <span aria-hidden="true" className="google-symbol">G</span>
          {isRegister ? "Register with Google" : "Continue with Google"}
        </button>

        <div className="auth-links">
          {isRegister ? (
            <p>
              Already have an account? <Link to="/login">Login here</Link>
            </p>
          ) : (
            <p>
              Need an account? <Link to="/register">Register now</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerOwnerAuthPage;
