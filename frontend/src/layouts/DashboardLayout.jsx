import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminNotifications from "../components/admin/AdminNotifications";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { opsApi } from "../services/opsStore";

const adminLinks = [
  { to: "/admin", end: true, label: "لوحة المدير" },
  { to: "/admin/agents", label: "المندوبون" },
  { to: "/admin/employees", label: "الموظفون" },
  { to: "/admin/customers", label: "الزبائن" },
  { to: "/admin/orders", label: "الطلبات" },
  { to: "/admin/attendance", label: "الحضور" },
  { to: "/admin/company", label: "موقع الشركة" },
  { to: "/admin/password", label: "الملف الشخصي" },
];

const roleLabels = {
  admin: "مسؤول النظام",
  employee: "موظف",
  delivery: "مندوب",
};

export default function DashboardLayout({ role }) {
  const { user, logout, updateUser } = useAuth();

  useEffect(() => {
    if (role !== "admin") return;

    let active = true;
    opsApi.getAdminProfile().then((profile) => {
      if (!active || !profile) return;
      updateUser?.({
        name: profile.name || user?.name,
        avatar: profile.avatar || "",
      });
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const links =
    role === "admin"
      ? adminLinks
      : role === "employee"
        ? [{ to: "/employee", end: true, label: "الحضور" }]
        : [{ to: "/delivery", end: true, label: "طلبات التوصيل" }];

  const displayName =
    role === "admin"
      ? user?.name || "مصطفى كوانزو"
      : user?.name || "مستخدم";

  return (
    <div className="dashboard-shell" dir="rtl">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            {role === "admin" && user?.avatar ? (
              <img
                className="sidebar-avatar"
                src={user.avatar}
                alt={displayName}
              />
            ) : (
              <div className="brand-mark">G</div>
            )}
            <div>
              <strong className="sidebar-brand-title">
                {role === "admin"
                  ? `لوحة ادارة ${displayName}`
                  : "GZIRAQ MAPS"}
              </strong>
              <span>{displayName}</span>
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
        {role === "admin" ? <AdminNotifications /> : null}
        <Outlet />
      </main>
    </div>
  );
}
