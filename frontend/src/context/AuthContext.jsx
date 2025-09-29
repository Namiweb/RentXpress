import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api.js";

const AuthContext = createContext(null);

function readStoredAuth() {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  const stored = window.localStorage.getItem("rentxpress_auth");
  if (!stored) {
    return { user: null, token: null };
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      user: parsed?.user || null,
      token: parsed?.token || null,
    };
  } catch (error) {
    console.error("Failed to parse auth cache", error);
    window.localStorage.removeItem("rentxpress_auth");
    return { user: null, token: null };
  }
}

function getDashboardPath(role) {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "vehicle_owner":
      return "/dashboard/vehicle-owner";
    case "driver":
      return "/dashboard/driver";
    case "inspector":
      return "/dashboard/inspector";
    default:
      return "/dashboard/customer";
  }
}

export function AuthProvider({ children }) {
  const storedAuth = useMemo(() => readStoredAuth(), []);
  const [user, setUser] = useState(storedAuth.user);
  const [token, setToken] = useState(storedAuth.token);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setInitializing(false);
  }, []);

  useEffect(() => {
    if (user || token) {
      window.localStorage.setItem(
        "rentxpress_auth",
        JSON.stringify({ user, token })
      );
    } else {
      window.localStorage.removeItem("rentxpress_auth");
    }
  }, [user, token]);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.message || "Login failed");
      error.status = response.status;
      error.details = errorBody;
      throw error;
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);

    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async ({ idToken, role }) => {
    const response = await apiRequest("/auth/login/google", {
      method: "POST",
      body: JSON.stringify({ idToken, role }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.message || "Google login failed");
      error.status = response.status;
      error.details = errorBody;
      throw error;
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    navigate("/login");
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      token,
      setUser,
      login,
      logout,
      loginWithGoogle,
      getDashboardPath,
      initializing,
    }),
    [user, token, login, loginWithGoogle, logout, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
