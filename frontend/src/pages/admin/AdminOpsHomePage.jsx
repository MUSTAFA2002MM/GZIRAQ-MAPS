import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { ORDER_STATUS, opsApi } from "../../services/opsStore";

const defaultCenter = [33.3152, 44.3661];

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

function isValidLatLng(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function MapReadyFix() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // map may be disposed during route change
      }
    };

    refresh();
    const timers = [100, 300, 800, 1600].map((ms) => setTimeout(refresh, ms));

    window.addEventListener("resize", refresh);

    const container = map.getContainer();
    let observer;
    if (typeof ResizeObserver !== "undefined" && container) {
      observer = new ResizeObserver(() => refresh());
      observer.observe(container.parentElement || container);
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", refresh);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

/** Fit once per day/refresh — do not jump the map on every GPS poll. */
function FitBoundsOnce({ points, resetKey }) {
  const map = useMap();
  const fittedKey = useRef("");

  useEffect(() => {
    if (!points.length) return;
    if (fittedKey.current === resetKey) return;

    map.invalidateSize({ animate: false });

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
    } else {
      map.fitBounds(points, {
        padding: [56, 56],
        maxZoom: 15,
        animate: false,
      });
    }

    fittedKey.current = resetKey;
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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [day]);

  const orderPoints = useMemo(
    () =>
      orders
        .filter((order) => isValidLatLng(order.latitude, order.longitude))
        .map((order) => [Number(order.latitude), Number(order.longitude)]),
    [orders]
  );

  const agentPoints = useMemo(
    () =>
      agentLocations
        .filter((item) => isValidLatLng(item.lat, item.lng))
        .map((item) => [Number(item.lat), Number(item.lng)]),
    [agentLocations]
  );

  const companyPoint = useMemo(() => {
    if (!company || !isValidLatLng(company.lat, company.lng)) return null;
    return [Number(company.lat), Number(company.lng)];
  }, [company]);

  /** Bounds used only for initial framing (orders + agents + company). */
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

      <div className="dashboard-map admin-live-map">
        <MapContainer
          key={`admin-map-${resetKey}`}
          center={mapCenter}
          zoom={12}
          className="map-canvas"
          scrollWheelZoom
          style={{ width: "100%", height: "100%", minHeight: 480 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            subdomains="abcd"
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
            if (!isValidLatLng(order.latitude, order.longitude)) {
              return null;
            }

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
                    {order.customer_phone ? <p>الرقم: {order.customer_phone}</p> : null}
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
            if (!isValidLatLng(agent.lat, agent.lng)) return null;

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
      </div>

      {!hasMarkers && (
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
