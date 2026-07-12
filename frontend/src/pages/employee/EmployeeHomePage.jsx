import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";
import { opsApi } from "../../services/opsStore";

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [company, setCompany] = useState(null);
  const [busy, setBusy] = useState(false);
  const {
    location,
    geoStatus,
    geoMessage,
    canBypassGeo,
    refreshLocation,
  } = useDeviceLocation();

  const load = async () => {
    const [attendanceResult, companyData] = await Promise.all([
      opsApi.getAttendance({
        day: "today",
        personType: "employee",
      }),
      opsApi.getCompany(),
    ]);
    const mine = (attendanceResult.data.attendance || []).find(
      (item) => Number(item.person_id) === Number(user?.id)
    );
    setAttendance(mine || null);
    setCompany(companyData);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const distanceText = useMemo(() => {
    if (!location || !company) return null;
    const meters = opsApi.distanceMeters(
      { lat: location.lat, lng: location.lng },
      { lat: company.lat, lng: company.lng }
    );
    return Math.round(meters);
  }, [location, company]);

  const clock = async (action) => {
    setBusy(true);
    setMessage("");

    try {
      let current = location;
      let bypassGeo = false;

      if (geoStatus === "ready") {
        try {
          current = await refreshLocation();
        } catch {
          current = location;
        }
      } else {
        bypassGeo = true;
      }

      if (!current && !bypassGeo && !canBypassGeo) {
        setMessageType("error");
        setMessage("انتظر تحديد الموقع أو أعد المحاولة");
        return;
      }

      if (!current) {
        bypassGeo = true;
      }

      const result = await opsApi.clock({
        personType: "employee",
        personId: user.id,
        personName: user.name,
        action,
        location: current,
        bypassGeo,
      });

      setMessageType(result.ok ? "success" : "error");
      setMessage(result.data.message || (result.ok ? "تم" : "فشل تسجيل الحضور"));
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>صفحة الموظف</h2>
          <p>حضور / انصراف فقط · الموظف: {user?.name}</p>
        </div>
      </header>

      {message && <div className={`message ${messageType}`}>{message}</div>}

      <div className="attendance-box">
        <p>
          نطاق الشركة: {company?.radiusMeters ?? 100}م
          {company?.requireGeofence === false ? " · التحقق من الموقع متوقف" : ""}
        </p>
        <p className="empty-hint">
          {geoMessage}
          {distanceText !== null ? ` · بعدك عن الشركة ${distanceText}م` : ""}
        </p>
        <div className="form-buttons" style={{ marginTop: 12 }}>
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => clock("in")}
          >
            تسجيل دخول
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => clock("out")}
          >
            تسجيل خروج
          </button>
          {geoStatus !== "ready" && geoStatus !== "insecure" && (
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => refreshLocation().catch(() => {})}
            >
              إعادة محاولة GPS
            </button>
          )}
        </div>
        <p className="empty-hint">
          {attendance?.check_in
            ? `دخول: ${new Date(attendance.check_in).toLocaleTimeString("ar-IQ")}`
            : "لا يوجد دخول اليوم"}
          {attendance?.check_out
            ? ` · خروج: ${new Date(attendance.check_out).toLocaleTimeString("ar-IQ")}`
            : attendance?.check_in
              ? " · مستمر"
              : ""}
        </p>
      </div>
    </section>
  );
}
