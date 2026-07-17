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

function readLoginLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع (GPS)"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error?.code === 1) {
          reject(
            new Error("يجب السماح بإذن الموقع لتسجيل دخول المندوب أو الموظف")
          );
          return;
        }
        reject(
          new Error(
            "تعذر قراءة GPS. افتح الموقع عبر HTTPS وفعّل الموقع ثم أعد المحاولة"
          )
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 8000,
      }
    );
  });
}

export default function LoginPage() {
  const { loginAdmin, loginByPin, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  const [adminPassword, setAdminPassword] = useState("");
  const [agents, setAgents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(null);
  const [agentId, setAgentId] = useState("");
  const [agentPin, setAgentPin] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPeople = async () => {
      try {
        const [agentsResult, employeesResult, companyData] = await Promise.all([
          opsApi.listAgents(),
          opsApi.listEmployees(),
          opsApi.getCompany(),
        ]);
        if (!active) return;
        setAgents(agentsResult.data.agents || []);
        setEmployees(employeesResult.data.employees || []);
        setCompany(companyData);
      } catch {
        if (!active) return;
        setMessage("تعذر تحميل قائمة المندوبين من السيرفر");
      }
    };

    loadPeople();

    const onFocus = () => {
      loadPeople();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
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

  const onPinLogin = async ({ role, id, pin }) => {
    setSubmitting(true);
    setMessage("");

    try {
      const location = await readLoginLocation();
      finishLogin(await loginByPin({ role, id, pin, location }));
    } catch (error) {
      setSubmitting(false);
      setMessage(error.message || "تعذر التحقق من الموقع");
    }
  };

  const onAgentLogin = async (event) => {
    event.preventDefault();
    await onPinLogin({
      role: "delivery",
      id: agentId,
      pin: agentPin,
    });
  };

  const onEmployeeLogin = async (event) => {
    event.preventDefault();
    await onPinLogin({
      role: "employee",
      id: employeeId,
      pin: employeePin,
    });
  };

  const geofenceHint =
    company?.requireGeofence === false
      ? "المندوب: مشاركة الموقع المباشر إجبارية · تحقق نطاق الشركة متوقف"
      : `المندوب: مشاركة الموقع المباشر إجبارية · الدخول داخل نطاق الشركة (≈ ${company?.radiusMeters || 100}م)`;

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
      <p className="empty-hint" style={{ marginTop: -8, marginBottom: 18 }}>
        {geofenceHint}
      </p>

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
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            دخول كمدير
          </button>
        </form>

        <form className="portal-card" onSubmit={onAgentLogin}>
          <h2>دخول المندوب</h2>
          <p>
            مشاركة الموقع المباشر إجبارية · لن يتم الدخول بدون تفعيل GPS والسماح
            بإذن الموقع
          </p>
          <label className="input-group">
            <span>اختر اسمك من القائمة</span>
            <select
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              required
            >
              <option value="">-- اختر مندوب --</option>
              {agents.length === 0 ? (
                <option value="" disabled>
                  لا يوجد مندوبون بعد — أضفهم من لوحة المدير
                </option>
              ) : (
                agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))
              )}
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
          <p>تسجيل حضور / انصراف فقط · يلزم GPS داخل نطاق الشركة</p>
          <label className="input-group">
            <span>اختر اسمك من القائمة</span>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
            >
              <option value="">-- اختر موظف --</option>
              {employees.length === 0 ? (
                <option value="" disabled>
                  لا يوجد موظفون بعد — أضفهم من لوحة المدير
                </option>
              ) : (
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))
              )}
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
