import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { opsApi } from "../services/opsStore";

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/employee";
  if (role === "delivery") return "/delivery";
  return "/";
}

export default function LoginPage() {
  const { loginAdmin, loginByPin, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  const [adminPassword, setAdminPassword] = useState("");
  const [agents, setAgents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [agentPin, setAgentPin] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const agentsResult = opsApi.listAgents();
    const employeesResult = opsApi.listEmployees();
    setAgents(agentsResult.data.agents || []);
    setEmployees(employeesResult.data.employees || []);
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  const finishLogin = (result) => {
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر تسجيل الدخول");
      return;
    }

    navigate(roleHome(result.data.user.role));
  };

  const onAdminLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    finishLogin(await loginAdmin(adminPassword));
  };

  const onAgentLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    finishLogin(
      await loginByPin({
        role: "delivery",
        id: agentId,
        pin: agentPin,
      })
    );
  };

  const onEmployeeLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    finishLogin(
      await loginByPin({
        role: "employee",
        id: employeeId,
        pin: employeePin,
      })
    );
  };

  return (
    <main className="portal-page" dir="rtl">
      <div className="portal-top">
        <div className="brand-block">
          <div className="brand-mark large">G</div>
          <div>
            <h1>GZIRAQ MAPS</h1>
            <p>نظام إدارة التوصيل والحضور</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <p className="portal-title">اختر نوع الدخول:</p>

      <div className="portal-grid">
        <form className="portal-card" onSubmit={onAdminLogin}>
          <h2>دخول المدير</h2>
          <p>لوحة مراقبة المندوبين + الزبائن + الطلبات</p>
          <label className="input-group">
            <span>كلمة المرور</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Admin@123456"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            دخول كمدير
          </button>
        </form>

        <form className="portal-card" onSubmit={onAgentLogin}>
          <h2>دخول المندوب</h2>
          <p>مشاركة الموقع + طلبات التوصيل</p>
          <label className="input-group">
            <span>اختر اسمك من القائمة</span>
            <select
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              required
            >
              <option value="">-- اختر مندوب --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label className="input-group">
            <span>PIN (4 أرقام)</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={agentPin}
              onChange={(event) => setAgentPin(event.target.value)}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            دخول كمندوب
          </button>
        </form>

        <form className="portal-card" onSubmit={onEmployeeLogin}>
          <h2>دخول الموظف</h2>
          <p>تسجيل حضور / انصراف فقط</p>
          <label className="input-group">
            <span>اختر اسمك من القائمة</span>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
            >
              <option value="">-- اختر موظف --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="input-group">
            <span>PIN (4 أرقام)</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={employeePin}
              onChange={(event) => setEmployeePin(event.target.value)}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            دخول كموظف
          </button>
        </form>
      </div>

      {message && <div className="message error portal-message">{message}</div>}
    </main>
  );
}
