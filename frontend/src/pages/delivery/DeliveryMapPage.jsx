import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../../hooks/useAuth";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";
import {
  DELIVERY_RADIUS_METERS,
  ORDER_STATUS,
  opsApi,
} from "../../services/opsStore";

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
  const [track, setTrack] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [attendance, setAttendance] = useState(null);
  const [company, setCompany] = useState(null);
  const [busy, setBusy] = useState(false);
  const {
    location,
    geoStatus,
    geoMessage,
    insecure,
    refreshLocation,
  } = useDeviceLocation({ auto: true, intervalMs: 5000 });

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
    if (!user?.id) return undefined;

    let cancelled = false;

    const pushLocation = async (point) => {
      if (!point || cancelled) return;
      await opsApi.updateAgentLocation({
        agentId: user.id,
        agentName: user.name,
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy,
      });
    };

    const syncCycle = async () => {
      let point = location;
      try {
        point = await refreshLocation();
      } catch {
        point = location;
      }

      if (!point) return;

      setTrack((current) => [...current.slice(-80), [point.lat, point.lng]]);
      await pushLocation(point);

      const result = await opsApi.listOrders({ day, agentId: user.id });
      const list = result.data.orders || [];
      for (const order of list) {
        if (
          order.status === "registered" &&
          Number.isFinite(order.latitude) &&
          Number.isFinite(order.longitude)
        ) {
          const meters = opsApi.distanceMeters(point, {
            lat: order.latitude,
            lng: order.longitude,
          });
          if (meters <= DELIVERY_RADIUS_METERS) {
            await opsApi.updateOrderStatus(order.id, {
              status: "nearby",
              agentLocation: point,
            });
          }
        }
      }

      if (!cancelled) {
        await loadOrders();
      }
    };

    syncCycle();
    const timer = setInterval(syncCycle, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [day, user?.id, user?.name]);

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "registered" || order.status === "nearby"
      ),
    [orders]
  );

  const ordersWithDistance = useMemo(() => {
    return orders.map((order) => {
      const hasCustomerPoint =
        Number.isFinite(Number(order.latitude)) &&
        Number.isFinite(Number(order.longitude));
      const meters =
        location && hasCustomerPoint
          ? opsApi.distanceMeters(location, {
              lat: Number(order.latitude),
              lng: Number(order.longitude),
            })
          : null;
      const canComplete =
        meters !== null && meters <= DELIVERY_RADIUS_METERS;

      return {
        ...order,
        distanceMeters: meters === null ? null : Math.round(meters),
        canComplete,
      };
    });
  }, [orders, location]);

  const updateStatus = async (order, status) => {
    setMessage("");
    let amount = order.amount;
    let current = location;

    try {
      current = await refreshLocation();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message ||
          "فعّل GPS للوصول لموقع الزبون قبل التسليم"
      );
      return;
    }

    if (status === "delivered") {
      const value = window.prompt(
        "مبلغ التسليم (يمكن 0)",
        String(order.amount || 0)
      );
      if (value === null) return;
      amount = Number(value);
    }

    const result = await opsApi.updateOrderStatus(order.id, {
      status,
      amount,
      agentLocation: current,
    });

    setMessageType(result.ok ? "success" : "error");
    setMessage(result.data.message || (result.ok ? "تم" : "فشل"));
    if (result.ok) {
      await loadOrders();
    }
  };

  const clock = async (action) => {
    setBusy(true);
    setMessage("");

    try {
      let current = location;
      let bypassGeo = geoStatus !== "ready";

      if (geoStatus === "ready") {
        try {
          current = await refreshLocation();
        } catch {
          current = location;
        }
      }

      if (!current) {
        bypassGeo = true;
      }

      const result = await opsApi.clock({
        personType: "delivery",
        personId: user.id,
        personName: user.name,
        action,
        location: current,
        bypassGeo,
      });

      setMessageType(result.ok ? "success" : "error");
      setMessage(result.data.message || (result.ok ? "تم" : "فشل"));
      await loadAttendance();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>لوحة المندوب</h2>
          <p>
            التتبع المباشر يعمل تلقائيًا · التسليم فقط عند الوصول للزبون (≤{" "}
            {DELIVERY_RADIUS_METERS}م)
          </p>
        </div>
        <select value={day} onChange={(event) => setDay(event.target.value)}>
          <option value="today">اليوم</option>
          <option value="yesterday">أمس</option>
        </select>
      </header>

      {message && <div className={`message ${messageType}`}>{message}</div>}

      <div className="attendance-box">
        <strong>
          الحضور (نطاق الشركة {company?.radiusMeters ?? 100}م)
        </strong>
        <p className="empty-hint" style={{ marginTop: 8 }}>
          {geoMessage}
          {insecure
            ? " · افتح https://129.121.93.45 بعد تفعيل HTTPS حتى يعمل التتبع التلقائي"
            : ""}
        </p>
        <div className="form-buttons" style={{ marginTop: 10 }}>
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
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              refreshLocation()
                .then(() => {
                  setMessageType("success");
                  setMessage("تم تحديث موقع التتبع");
                })
                .catch((error) => {
                  setMessageType("error");
                  setMessage(error.message || "تعذر تحديث الموقع");
                })
            }
          >
            تحديث موقعي للتتبع
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
              <Popup>موقعي الحالي (تتبع مباشر)</Popup>
            </Marker>
          )}
          {track.length > 1 && <Polyline positions={track} color="#1558e0" />}
          {ordersWithDistance.map((order) => {
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
                    <p>
                      {order.distanceMeters === null
                        ? "فعّل GPS لمعرفة المسافة"
                        : `المسافة: ${order.distanceMeters}م`}
                    </p>
                    {(order.status === "nearby" ||
                      order.status === "registered") && (
                      <div className="popup-actions">
                        <button
                          className="popup-action"
                          type="button"
                          disabled={!order.canComplete}
                          onClick={() => updateStatus(order, "delivered")}
                        >
                          {order.canComplete
                            ? "تم التسليم"
                            : "اقترب أكثر للتسليم"}
                        </button>
                        <button
                          className="popup-action danger"
                          type="button"
                          disabled={!order.canComplete}
                          onClick={() => updateStatus(order, "returned")}
                        >
                          {order.canComplete ? "راجع" : "اقترب أكثر"}
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
        {ordersWithDistance.map((order) => (
          <div key={order.id} className="chip-row">
            <span>
              {order.customer_name} · {ORDER_STATUS[order.status]?.label} ·{" "}
              {order.amount}
              {order.distanceMeters !== null
                ? ` · ${order.distanceMeters}م`
                : " · بانتظار GPS"}
            </span>
            {(order.status === "nearby" || order.status === "registered") && (
              <div className="table-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!order.canComplete}
                  onClick={() => updateStatus(order, "delivered")}
                >
                  {order.canComplete ? "تسليم" : `اقترب ≤${DELIVERY_RADIUS_METERS}م`}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={!order.canComplete}
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
