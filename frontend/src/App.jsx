import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import CustomerOwnerAuthPage from "./pages/auth/CustomerOwnerAuthPage.jsx";
import RoleAuthPage from "./pages/auth/RoleAuthPage.jsx";
import WaitingApprovalPage from "./pages/auth/WaitingApprovalPage.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";
import CustomerDashboard from "./pages/dashboard/CustomerDashboard.jsx";
import VehicleOwnerDashboard from "./pages/dashboard/VehicleOwnerDashboard.jsx";
import DriverDashboard from "./pages/dashboard/DriverDashboard.jsx";
import InspectorDashboard from "./pages/dashboard/InspectorDashboard.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<CustomerOwnerAuthPage mode="login" />} />
          <Route path="/register" element={<CustomerOwnerAuthPage mode="register" />} />

          <Route path="/login/admin" element={<RoleAuthPage mode="login" role="admin" />} />
          <Route path="/login/driver" element={<RoleAuthPage mode="login" role="driver" />} />
          <Route path="/login/vehicle-owner" element={<RoleAuthPage mode="login" role="vehicle_owner" />} />
          <Route path="/login/inspector" element={<RoleAuthPage mode="login" role="inspector" />} />

          <Route path="/register/driver" element={<RoleAuthPage mode="register" role="driver" />} />
          <Route path="/register/vehicle-owner" element={<RoleAuthPage mode="register" role="vehicle_owner" />} />
          <Route path="/register/inspector" element={<RoleAuthPage mode="register" role="inspector" />} />

          <Route path="/waiting-approval" element={<WaitingApprovalPage />} />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/customer"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/vehicle-owner"
            element={
              <ProtectedRoute allowedRoles={["vehicle_owner"]}>
                <VehicleOwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/driver"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/inspector"
            element={
              <ProtectedRoute allowedRoles={["inspector"]}>
                <InspectorDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
