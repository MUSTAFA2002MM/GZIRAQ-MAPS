import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { opsApi } from "../../services/opsStore";

function readPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
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
          reject(new Error("يجب السماح بإذن الموقع من المتصفح"));
        } else if (!window.isSecureContext) {
          reject(
            new Error(
              "المتصفح يمنع GPS على HTTP. افتح الموقع من HTTPS أو فعّل الموقع يدويًا إن أمكن"
            )
          );
        } else {
          reject(new Error("تعذر قراءة الموقع. حاول مرة أخرى في مكان مفتوح"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  });
}

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [location, setLocation] = useState(null);
  const [company, setCompany] = useState(null);
  const [busy, setBusy] = useState(false);

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
      setMessageType("error");
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return undefined;
    }

    if (!window.isSecureContext) {
      setMessageType("info");
      setMessage(
        "تنبيه: بعض المتصفحات تمنع GPS على HTTP. إن فشل الموقع جرّب Chrome بإذن الموقع أو HTTPS"
      );
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        setMessageType("error");
        setMessage("فعّل إذن الموقع لتسجيل الحضور");
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
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
      try {
        current = await readPosition();
        setLocation(current);
      } catch (error) {
        if (!current) {
          setMessageType("error");
          setMessage(error.message || "تعذر تحديد الموقع");
          setBusy(false);
          return;
        }
      }

      const result = await opsApi.clock({
        personType: "employee",
        personId: user.id,
        personName: user.name,
        action,
        location: current,
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
          {location
            ? `موقعك جاهز · الدقة ≈ ${Math.round(location.accuracy || 0)}م${
                distanceText !== null ? ` · بعدك عن الشركة ${distanceText}م` : ""
              }`
            : "جارٍ تحديد موقعك..."}
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
