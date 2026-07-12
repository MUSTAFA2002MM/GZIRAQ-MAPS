import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AdminCompanyPage from "./pages/admin/AdminCompanyPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminEmployeesPage from "./pages/admin/AdminEmployeesPage";
import AdminOpsHomePage from "./pages/admin/AdminOpsHomePage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPasswordPage from "./pages/admin/AdminPasswordPage";
import DeliveryMapPage from "./pages/delivery/DeliveryMapPage";
import EmployeeHomePage from "./pages/employee/EmployeeHomePage";
import LoginPage from "./pages/LoginPage";
import "leaflet/dist/leaflet.css";
import "./styles/theme.css";
import "./App.css";

function AdminLayout() {
  return <DashboardLayout role="admin" />;
}

function EmployeeLayout() {
  return <DashboardLayout role="employee" />;
}

function DeliveryLayout() {
  return <DashboardLayout role="delivery" />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOpsHomePage />} />
                <Route path="agents" element={<AdminAgentsPage />} />
                <Route path="employees" element={<AdminEmployeesPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="company" element={<AdminCompanyPage />} />
                <Route path="password" element={<AdminPasswordPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["employee"]} />}>
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<EmployeeHomePage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["delivery"]} />}>
              <Route path="/delivery" element={<DeliveryLayout />}>
                <Route index element={<DeliveryMapPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
