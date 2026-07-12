import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from "../hooks/useAuth";

const adminLinks = [
  { to: "/admin", end: true, label: "لوحة المدير" },
  { to: "/admin/agents", label: "المندوبون" },
  { to: "/admin/employees", label: "الموظفون" },
  { to: "/admin/customers", label: "الزبائن" },
  { to: "/admin/orders", label: "الطلبات" },
  { to: "/admin/company", label: "موقع الشركة" },
];

const roleLabels = {
  admin: "مسؤول النظام",
  employee: "موظف",
  delivery: "مندوب",
};

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();

  const links =
    role === "admin"
      ? adminLinks
      : role === "employee"
        ? [{ to: "/employee", end: true, label: "الحضور" }]
        : [{ to: "/delivery", end: true, label: "طلبات التوصيل" }];

  return (
    <div className="dashboard-shell" dir="rtl">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <div className="brand-mark">G</div>
            <div>
              <strong>GZIRAQ MAPS</strong>
              <span>{user?.name || "مستخدم"}</span>
            </div>
          </div>
          <span className="role-badge">{roleLabels[role] || role}</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
          <button className="danger-button" type="button" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
