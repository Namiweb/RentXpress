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
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-900"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)), url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        {/* <Link 
          to="/" 
          className="inline-flex items-center text-gray-300 hover:text-[#FF5A00] transition-colors duration-200 mb-8"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link> */}

        <div className="bg-neutral-900 rounded-2xl shadow-2xl p-8 border border-black">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-3xl"></span>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#FF5A00] to-orange-600 bg-clip-text text-transparent">
                RentXpress
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white">
              {isRegister ? "Create Account" : "Welcome Back"} as {roleLabel}
            </h2>
            <p className="text-gray-400 mt-2">
              {isRegister ? `Join RentXpress as a ${roleLabel}` : `Sign in to your ${roleLabel} account`}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                disabled={isGoogleLinked}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                required={!isGoogleLinked}
                disabled={isGoogleLinked}
                value={formData.password}
                onChange={handleChange}
                placeholder={isGoogleLinked ? "Password managed by Google" : "Enter your password"}
                className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required={!isGoogleLinked}
                  disabled={isGoogleLinked}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={isGoogleLinked ? "Password managed by Google" : "Confirm your password"}
                  className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Additional Registration Fields */}
            {isRegister && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    name="phoneNumber"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 transition-all duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    NIC Number
                  </label>
                  <input
                    name="nicNumber"
                    type="text"
                    value={formData.nicNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                    placeholder="NIC Number"
                  />
                </div>
              </div>
            )}

            {/* Driver Specific Fields */}
            {isRegister && role === "driver" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      License Number
                    </label>
                    <input
                      name="licenseNumber"
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                      placeholder="License Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      License Type
                    </label>
                    <input
                      name="licenseType"
                      type="text"
                      value={formData.licenseType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                      placeholder="e.g., Heavy, Light"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Issue Date
                    </label>
                    <input
                      name="licenseIssueDate"
                      type="date"
                      value={formData.licenseIssueDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Expiry Date
                    </label>
                    <input
                      name="licenseExpiryDate"
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Issuing Authority
                    </label>
                    <input
                      name="issuingAuthority"
                      type="text"
                      value={formData.issuingAuthority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                      placeholder="Dept. of Motor Traffic"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Years of Experience
                    </label>
                    <input
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                      placeholder="Years of experience"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Previous Employers (comma separated)
                  </label>
                  <input
                    name="previousEmployers"
                    type="text"
                    value={formData.previousEmployers}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-neutral-400 border border-black rounded-lg focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent text-gray-950 placeholder-black transition-all duration-200"
                    placeholder="Company A, Company B"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Google Account Info */}
            {isRegister && allowGoogle && isGoogleLinked && (
              <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-300 text-sm mb-2">
                  Using Google account: <strong className="text-blue-200">{googleAuthState.email || "Unknown"}</strong>
                </p>
                <button 
                  type="button" 
                  onClick={handleDisconnectGoogle}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                >
                  Use a different email
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#FF5A00] text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 focus:ring-2 focus:ring-[#FF5A00] focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                  Please wait...
                </div>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          {allowGoogle && (
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-600"></div>
              <span className="mx-4 text-gray-400 text-sm">or</span>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>
          )}

          {/* Google Button */}
          {allowGoogle && (
            <button
              type="button"
              onClick={isRegister ? handleGoogleRegister : handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-neutral-700 border border-neutral-800 text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-neutral-800 hover:text-white focus:ring-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isRegister ? "Sign up with Google" : "Continue with Google"}
            </button>
          )}

          {/* Auth Links */}
          <div className="text-center mt-6 space-y-2">
            {role !== "admin" && (
              <p className="text-neutral-500">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <Link 
                  to={isRegister ? `/login/${role.replace("_", "-")}` : `/register/${role.replace("_", "-")}`} 
                  className="text-[#FF5A00] hover:text-orange-400 font-semibold transition-colors duration-200"
                >
                  {isRegister ? "Sign in" : "Sign up"}
                </Link>
              </p>
            )}
            <p className="text-neutral-500">
              <Link 
                to="/" 
                className="text-[#FF5A00] hover:text-orange-400 font-semibold transition-colors duration-200"
              >
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleAuthPage;