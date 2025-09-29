import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../../firebase.js";

const REGISTER_ENDPOINTS = {
  driver: "/auth/register/driver",
  vehicle_owner: "/auth/register/customer-owner",
  inspector: "/auth/register/inspector",
};

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

function RoleAuthPage({ mode, role }) {
  const navigate = useNavigate();
  const { login, loginWithGoogle, getDashboardPath } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleAuthState, setGoogleAuthState] = useState({ token: "", email: "", displayName: "" });
  const isRegister = mode === "register";
  const allowGoogle = role !== "admin";
  const isGoogleLinked = Boolean(googleAuthState.token);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    nicNumber: "",
    licenseNumber: "",
    licenseType: "",
    licenseIssueDate: "",
    licenseExpiryDate: "",
    issuingAuthority: "",
    yearsOfExperience: "",
    previousEmployers: "",
  });

  const roleLabel = useMemo(() => {
    switch (role) {
      case "driver":
        return "Driver";
      case "vehicle_owner":
        return "Vehicle Owner";
      case "inspector":
        return "Inspector";
      case "admin":
        return "Administrator";
      default:
        return "User";
    }
  }, [role]);

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

  const buildDriverExtras = () => {
    if (role !== "driver") {
      return {};
    }

    const previousEmployers = formData.previousEmployers
      ? formData.previousEmployers
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined;

    const yearsOfExperience = formData.yearsOfExperience
      ? Number(formData.yearsOfExperience)
      : undefined;

    return {
      licenseNumber: formData.licenseNumber,
      licenseType: formData.licenseType || undefined,
      issueDate: formData.licenseIssueDate || undefined,
      expiryDate: formData.licenseExpiryDate || undefined,
      issuingAuthority: formData.issuingAuthority || undefined,
      yearsOfExperience,
      previousEmployers,
      licenseInfo: {
        licenseNumber: formData.licenseNumber,
        licenseType: formData.licenseType || undefined,
        issueDate: formData.licenseIssueDate || undefined,
        expiryDate: formData.licenseExpiryDate || undefined,
        issuingAuthority: formData.issuingAuthority || undefined,
      },
      experience: {
        yearsOfExperience,
        previousEmployers,
      },
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
          if (!allowGoogle) {
            throw new Error("Google registration is not available for this role");
          }

          const response = await apiRequest("/auth/register/google", {
            method: "POST",
            body: JSON.stringify({
              idToken: googleAuthState.token,
              role,
              nicNumber: formData.nicNumber || undefined,
              profile: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                dateOfBirth: formData.dateOfBirth,
              },
              ...buildDriverExtras(),
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Registration failed");
          }

          const targetEmail = data?.user?.email || googleAuthState.email;
          navigate(`/waiting-approval?email=${encodeURIComponent(targetEmail)}&role=${role}`);

          setGoogleAuthState({ token: "", email: "", displayName: "" });
        } else {
          const endpoint = REGISTER_ENDPOINTS[role];
          if (!endpoint) {
            throw new Error("Registration is not available for this role");
          }

          const payload = {
            role,
            email: formData.email,
            password: formData.password,
            nicNumber: formData.nicNumber || undefined,
            profile: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              phoneNumber: formData.phoneNumber,
              dateOfBirth: formData.dateOfBirth,
            },
            ...buildDriverExtras(),
          };

          const response = await apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Registration failed");
          }

          navigate(`/waiting-approval?email=${encodeURIComponent(formData.email)}&role=${role}`);
        }
      } else {
        const user = await login({ email: formData.email, password: formData.password });
        navigate(getDashboardPath(user.role));
      }
    } catch (submitError) {
      if (submitError.status === 403) {
        navigate(`/waiting-approval?email=${encodeURIComponent(formData.email || googleAuthState.email)}&role=${role}`);
        return;
      }
      setError(submitError.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!allowGoogle || isRegister || isSubmitting) {
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
    if (!allowGoogle || !isRegister || isSubmitting) {
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
        <h2>{isRegister ? "Register" : "Login"} as {roleLabel}</h2>
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
              <label>
                NIC Number
                <input
                  name="nicNumber"
                  type="text"
                  value={formData.nicNumber}
                  onChange={handleChange}
                />
              </label>
            </div>
          )}

          {isRegister && role === "driver" && (
            <div className="form-grid">
              <label>
                License Number
                <input
                  name="licenseNumber"
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={handleChange}
                />
              </label>
              <label>
                License Type
                <input
                  name="licenseType"
                  type="text"
                  value={formData.licenseType}
                  onChange={handleChange}
                  placeholder="e.g., Heavy, Light"
                />
              </label>
              <label>
                Issue Date
                <input
                  name="licenseIssueDate"
                  type="date"
                  value={formData.licenseIssueDate}
                  onChange={handleChange}
                />
              </label>
              <label>
                Expiry Date
                <input
                  name="licenseExpiryDate"
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={handleChange}
                />
              </label>
              <label>
                Issuing Authority
                <input
                  name="issuingAuthority"
                  type="text"
                  value={formData.issuingAuthority}
                  onChange={handleChange}
                  placeholder="Dept. of Motor Traffic"
                />
              </label>
              <label>
                Years of Experience
                <input
                  name="yearsOfExperience"
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                />
              </label>
              <label>
                Previous Employers (comma separated)
                <input
                  name="previousEmployers"
                  type="text"
                  value={formData.previousEmployers}
                  onChange={handleChange}
                  placeholder="Company A, Company B"
                />
              </label>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          {isRegister && allowGoogle && isGoogleLinked && (
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

        {allowGoogle && (
          <button
            type="button"
            className="btn btn-google"
            onClick={isRegister ? handleGoogleRegister : handleGoogleLogin}
            disabled={isSubmitting}
          >
            <span aria-hidden="true" className="google-symbol">G</span>
            {isRegister ? "Register with Google" : "Continue with Google"}
          </button>
        )}

        <div className="auth-links">
          {role !== "admin" && (
            <p>
              {isRegister ? (
                <>Already registered? <Link to={`/login/${role.replace("_", "-")}`}>Login here</Link></>
              ) : (
                <>Need an account? <Link to={`/register/${role.replace("_", "-")}`}>Register now</Link></>
              )}
            </p>
          )}
          {role !== "customer" && (
            <p>
              <Link to="/">Back to home</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleAuthPage;
