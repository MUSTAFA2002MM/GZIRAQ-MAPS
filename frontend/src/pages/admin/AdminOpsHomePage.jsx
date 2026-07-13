import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { ORDER_STATUS, isValidCoords, opsApi } from "../../services/opsStore";

const defaultCenter = [33.3152, 44.3661];

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function statusIcon(color) {
  return L.divIcon({
    className: "order-marker",
    html: `<span style="display:block;width:16px;height:16px;border-radius:4px;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function agentIcon() {
  return L.divIcon({
    className: "agent-live-icon",
    html: `<span class="agent-live-mark"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function companyMapIcon() {
  return L.divIcon({
    className: "company-pin-icon",
    html: `<span class="company-pin-mark"></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
  });
}

function MapReadyFix() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    };

    refresh();
    const timers = [50, 200, 500, 1200].map((ms) => setTimeout(refresh, ms));
    window.addEventListener("resize", refresh);

    const parent = map.getContainer()?.parentElement;
    let observer;
    if (typeof ResizeObserver !== "undefined" && parent) {
      observer = new ResizeObserver(refresh);
      observer.observe(parent);
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", refresh);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

/** Frame the map once when data first appears for this day/refresh. */
function FitBoundsOnce({ points, resetKey }) {
  const map = useMap();
  const fittedKey = useRef("");

  useEffect(() => {
    if (!points.length) return;
    if (fittedKey.current === resetKey) return;

    map.invalidateSize({ animate: false });

    try {
      if (points.length === 1) {
        map.setView(points[0], 14, { animate: false });
      } else {
        map.fitBounds(L.latLngBounds(points), {
          padding: [48, 48],
          maxZoom: 15,
          animate: false,
        });
      }
      fittedKey.current = resetKey;
    } catch {
      /* ignore invalid bounds */
    }
  }, [map, points, resetKey]);

  return null;
}

function formatUpdatedAt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminOpsHomePage() {
  const [day, setDay] = useState("today");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [agentLocations, setAgentLocations] = useState([]);
  const [company, setCompany] = useState(null);
  const [mapNonce, setMapNonce] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const load = async () => {
    try {
      const [ordersResult, statsResult, locationsResult, companyData] =
        await Promise.all([
          opsApi.listOrders({ day }),
          opsApi.getStats(),
          opsApi.listAgentLocations({ maxAgeMinutes: 180 }),
          opsApi.getCompany(),
        ]);
      setOrders(ordersResult.data.orders || []);
      setStats(statsResult.data.stats || null);
      setAgentLocations(locationsResult.data.locations || []);
      setCompany(companyData);
    } finally {
      setMapReady(true);
    }
  };

  useEffect(() => {
    setMapReady(false);
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [day]);

  const orderPoints = useMemo(
    () =>
      orders
        .filter((order) => isValidCoords(order.latitude, order.longitude))
        .map((order) => [Number(order.latitude), Number(order.longitude)]),
    [orders]
  );

  const agentPoints = useMemo(
    () =>
      agentLocations
        .filter((item) => isValidCoords(item.lat, item.lng))
        .map((item) => [Number(item.lat), Number(item.lng)]),
    [agentLocations]
  );

  const companyPoint = useMemo(() => {
    if (!company || !isValidCoords(company.lat, company.lng)) return null;
    return [Number(company.lat), Number(company.lng)];
  }, [company]);

  const fitPoints = useMemo(() => {
    const all = [...orderPoints, ...agentPoints];
    if (companyPoint) all.push(companyPoint);
    return all;
  }, [orderPoints, agentPoints, companyPoint]);

  const mapCenter = companyPoint || defaultCenter;
  const resetKey = `${day}-${mapNonce}`;
  const hasMarkers =
    orderPoints.length > 0 || agentPoints.length > 0 || Boolean(companyPoint);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>لوحة المدير</h2>
          <p>خريطة الطلبات + مواقع المندوبين المباشرة</p>
        </div>
        <div className="topbar-actions">
          <select value={day} onChange={(event) => setDay(event.target.value)}>
            <option value="today">اليوم</option>
            <option value="yesterday">أمس</option>
          </select>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              load();
              setMapNonce((value) => value + 1);
            }}
          >
            تحديث المواقع
          </button>
        </div>
      </header>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <article className="stat-card">
            <span>المندوبون</span>
            <strong>{stats.agents}</strong>
          </article>
          <article className="stat-card">
            <span>متصلون الآن</span>
            <strong>{stats.live_agents ?? agentLocations.length}</strong>
          </article>
          <article className="stat-card">
            <span>الموظفون</span>
            <strong>{stats.employees}</strong>
          </article>
          <article className="stat-card">
            <span>الزبائن</span>
            <strong>{stats.customers}</strong>
          </article>
          <article className="stat-card">
            <span>طلبات اليوم</span>
            <strong>{stats.orders_today}</strong>
          </article>
          <article className="stat-card">
            <span>تم التسليم</span>
            <strong>{stats.delivered_today}</strong>
          </article>
        </div>
      )}

      <div className="legend-row">
        {Object.values(ORDER_STATUS).map((item) => (
          <span key={item.key} className="legend-item">
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
        <span className="legend-item">
          <i style={{ background: "#111", border: "2px solid #f5c518" }} />
          موقع المندوب المباشر
        </span>
        <span className="legend-item">
          <i style={{ background: "#c62828" }} />
          موقع الشركة
        </span>
      </div>

      <div className="dashboard-map admin-live-map" dir="ltr">
        {mapReady ? (
          <MapContainer
            key={`admin-map-${resetKey}`}
            center={mapCenter}
            zoom={12}
            className="map-canvas"
            scrollWheelZoom
            style={{ width: "100%", height: "100%", minHeight: 480 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={OSM_URL}
              maxZoom={19}
            />
            <MapReadyFix />
            <FitBoundsOnce points={fitPoints} resetKey={resetKey} />

            {companyPoint && (
              <Marker position={companyPoint} icon={companyMapIcon()}>
                <Popup>
                  <div dir="rtl">
                    <strong>{company?.name || "موقع الشركة"}</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {orders.map((order) => {
              if (!isValidCoords(order.latitude, order.longitude)) return null;
              const meta = ORDER_STATUS[order.status] || ORDER_STATUS.registered;
              return (
                <Marker
                  key={`order-${order.id}`}
                  position={[Number(order.latitude), Number(order.longitude)]}
                  icon={statusIcon(meta.color)}
                >
                  <Popup>
                    <div dir="rtl">
                      <strong>{order.customer_name}</strong>
                      {order.customer_phone ? (
                        <p>الرقم: {order.customer_phone}</p>
                      ) : null}
                      {order.customer_address ? (
                        <p>الموقع: {order.customer_address}</p>
                      ) : null}
                      <p>المندوب: {order.agent_name}</p>
                      <p>الحالة: {meta.label}</p>
                      <p>المبلغ: {order.amount}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {agentLocations.map((agent) => {
              if (!isValidCoords(agent.lat, agent.lng)) return null;
              return (
                <Marker
                  key={`agent-${agent.agent_id}`}
                  position={[Number(agent.lat), Number(agent.lng)]}
                  icon={agentIcon()}
                >
                  <Popup>
                    <div dir="rtl">
                      <strong>{agent.agent_name}</strong>
                      <p>موقع مباشر للمندوب</p>
                      <p>آخر تحديث: {formatUpdatedAt(agent.updated_at)}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="empty-hint" style={{ padding: 24 }}>
            جاري تحميل الخريطة...
          </div>
        )}
      </div>

      {!hasMarkers && mapReady && (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          لا توجد نقاط على الخريطة بعد. ثبّت موقع الشركة من قائمة الشركة، أو أضف زبائن
          بضغط الخريطة، أو سجّل طلبات، أو فعّل GPS للمندوب.
        </p>
      )}

      <h3 style={{ marginTop: 18 }}>
        المندوبون على الخريطة ({agentLocations.length})
      </h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>المندوب</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {agentLocations.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-hint">
                  لا يوجد مندوب متصل بالموقع حاليًا. عندما يفتح المندوب لوحته مع GPS
                  يظهر هنا.
                </td>
              </tr>
            ) : (
              agentLocations.map((agent) => (
                <tr key={agent.agent_id}>
                  <td>{agent.agent_name}</td>
                  <td dir="ltr">{Number(agent.lat).toFixed(6)}</td>
                  <td dir="ltr">{Number(agent.lng).toFixed(6)}</td>
                  <td dir="ltr">{formatUpdatedAt(agent.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
