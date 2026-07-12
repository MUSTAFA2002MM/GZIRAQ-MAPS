import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { opsApi } from "../../services/opsStore";

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState(null);
  const [company, setCompany] = useState(null);

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

    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setMessage("فعّل إذن الموقع لتسجيل الحضور"),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.id]);

  const clock = async (action) => {
    if (!location) {
      setMessage("انتظر تحديد الموقع");
      return;
    }

    const result = await opsApi.clock({
      personType: "employee",
      personId: user.id,
      personName: user.name,
      action,
      location,
    });

    setMessage(result.data.message || (result.ok ? "تم" : "فشل"));
    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>صفحة الموظف</h2>
          <p>حضور / انصراف فقط · الموظف: {user?.name}</p>
        </div>
      </header>

      {message && <div className="message info">{message}</div>}

      <div className="attendance-box">
        <p>
          نطاق الشركة: {company?.lat ?? "—"}, {company?.lng ?? "—"} —{" "}
          {company?.radiusMeters ?? 20}m
        </p>
        <div className="form-buttons" style={{ marginTop: 12 }}>
          <button className="primary-button" type="button" onClick={() => clock("in")}>
            تسجيل دخول
          </button>
          <button className="secondary-button" type="button" onClick={() => clock("out")}>
            تسجيل خروج
          </button>
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
