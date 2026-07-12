import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../../hooks/useAuth";
import { ORDER_STATUS, opsApi } from "../../services/opsStore";

const meIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function statusIcon(color) {
  return L.divIcon({
    className: "order-marker",
    html: `<span style="display:block;width:16px;height:16px;border-radius:4px;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function DeliveryMapPage() {
  const { user } = useAuth();
  const [day, setDay] = useState("today");
  const [orders, setOrders] = useState([]);
  const [location, setLocation] = useState(null);
  const [track, setTrack] = useState([]);
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [company, setCompany] = useState(null);

  const loadOrders = async () => {
    const result = await opsApi.listOrders({ day, agentId: user?.id });
    setOrders(result.data.orders || []);
  };

  const loadAttendance = async () => {
    const [result, companyData] = await Promise.all([
      opsApi.getAttendance({
        day: "today",
        personType: "delivery",
      }),
      opsApi.getCompany(),
    ]);
    const mine = (result.data.attendance || []).find(
      (item) => Number(item.person_id) === Number(user?.id)
    );
    setAttendance(mine || null);
    setCompany(companyData);
  };

  useEffect(() => {
    loadOrders();
    loadAttendance();
  }, [day, user?.id]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(next);
        setTrack((current) => [...current.slice(-80), [next.lat, next.lng]]);

        const result = await opsApi.listOrders({ day, agentId: user?.id });
        const list = result.data.orders || [];
        for (const order of list) {
          if (
            order.status === "registered" &&
            Number.isFinite(order.latitude) &&
            Number.isFinite(order.longitude)
          ) {
            const meters = opsApi.distanceMeters(next, {
              lat: order.latitude,
              lng: order.longitude,
            });
            if (meters <= 150) {
              await opsApi.updateOrderStatus(order.id, { status: "nearby" });
            }
          }
        }
        await loadOrders();
      },
      () => setMessage("فعّل إذن الموقع للمتابعة"),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [day, user?.id]);

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "registered" || order.status === "nearby"
      ),
    [orders]
  );

  const updateStatus = async (order, status) => {
    let amount = order.amount;

    if (status === "delivered") {
      const value = window.prompt("مبلغ التسليم (يمكن 0)", String(order.amount || 0));
      if (value === null) return;
      amount = Number(value);
    }

    const result = await opsApi.updateOrderStatus(order.id, {
      status,
      amount,
      agentLocation: location,
    });

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setMessage(result.data.message || "تم التحديث");
    await loadOrders();
  };

  const clock = async (action) => {
    let current = location;

    if (!current && navigator.geolocation) {
      try {
        current = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }),
            reject,
            { enableHighAccuracy: true, timeout: 15000 }
          );
        });
        setLocation(current);
      } catch {
        setMessage("فعّل إذن الموقع وسجّل وأنت عند الشركة");
        return;
      }
    }

    if (!current) {
      setMessage("انتظر تحديد الموقع");
      return;
    }

    const result = await opsApi.clock({
      personType: "delivery",
      personId: user.id,
      personName: user.name,
      action,
      location: current,
    });

    setMessage(result.data.message || (result.ok ? "تم" : "فشل"));
    await loadAttendance();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>لوحة المندوب</h2>
          <p>مشاركة الموقع تعمل تلقائيًا · المندوب: {user?.name}</p>
        </div>
        <select value={day} onChange={(event) => setDay(event.target.value)}>
          <option value="today">اليوم</option>
          <option value="yesterday">أمس</option>
        </select>
      </header>

      {message && <div className="message info">{message}</div>}

      <div className="attendance-box">
        <strong>
          الحضور (نطاق الشركة {company?.radiusMeters ?? 100}م
          {company?.requireGeofence === false ? " · بدون تحقق موقع" : ""})
        </strong>
        <p className="empty-hint" style={{ marginTop: 8 }}>
          {location
            ? `الموقع جاهز · دقة ≈ ${Math.round(location.accuracy || 0)}م`
            : "جارٍ تحديد موقعك..."}
        </p>
        <div className="form-buttons" style={{ marginTop: 10 }}>
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

      <div className="dashboard-map" style={{ marginBottom: 16 }}>
        <MapContainer center={[33.3152, 44.3661]} zoom={12} className="map-canvas">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {location && (
            <Marker position={[location.lat, location.lng]} icon={meIcon}>
              <Popup>موقعي الحالي</Popup>
            </Marker>
          )}
          {track.length > 1 && <Polyline positions={track} color="#1558e0" />}
          {orders.map((order) => {
            if (
              !Number.isFinite(Number(order.latitude)) ||
              !Number.isFinite(Number(order.longitude))
            ) {
              return null;
            }
            const meta = ORDER_STATUS[order.status] || ORDER_STATUS.registered;
            return (
              <Marker
                key={order.id}
                position={[Number(order.latitude), Number(order.longitude)]}
                icon={statusIcon(meta.color)}
              >
                <Popup>
                  <div dir="rtl">
                    <strong>{order.customer_name}</strong>
                    <p>{meta.label}</p>
                    {(order.status === "nearby" || order.status === "registered") && (
                      <div className="popup-actions">
                        <button
                          className="popup-action"
                          type="button"
                          onClick={() => updateStatus(order, "delivered")}
                        >
                          تم التسليم
                        </button>
                        <button
                          className="popup-action danger"
                          type="button"
                          onClick={() => updateStatus(order, "returned")}
                        >
                          راجع
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <h3>طلبات اليوم ({openOrders.length} مفتوحة)</h3>
      <div className="chips-list">
        {orders.map((order) => (
          <div key={order.id} className="chip-row">
            <span>
              {order.customer_name} · {ORDER_STATUS[order.status]?.label} ·{" "}
              {order.amount}
            </span>
            {(order.status === "nearby" || order.status === "registered") && (
              <div className="table-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => updateStatus(order, "delivered")}
                >
                  تسليم
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => updateStatus(order, "returned")}
                >
                  راجع
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
