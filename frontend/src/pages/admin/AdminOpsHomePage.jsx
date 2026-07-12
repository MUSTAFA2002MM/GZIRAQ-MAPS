import { useEffect, useMemo, useState } from "react";
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

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);

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

  const load = async () => {
    const [ordersResult, statsResult, locationsResult] = await Promise.all([
      opsApi.listOrders({ day }),
      opsApi.getStats(),
      opsApi.listAgentLocations({ maxAgeMinutes: 180 }),
    ]);
    setOrders(ordersResult.data.orders || []);
    setStats(statsResult.data.stats || null);
    setAgentLocations(locationsResult.data.locations || []);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [day]);

  const points = useMemo(() => {
    const orderPoints = orders
      .filter(
        (order) =>
          Number.isFinite(Number(order.latitude)) &&
          Number.isFinite(Number(order.longitude))
      )
      .map((order) => [Number(order.latitude), Number(order.longitude)]);

    const agentPoints = agentLocations
      .filter(
        (item) =>
          Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))
      )
      .map((item) => [Number(item.lat), Number(item.lng)]);

    return [...orderPoints, ...agentPoints];
  }, [orders, agentLocations]);

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
          <button className="secondary-button" type="button" onClick={load}>
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
      </div>

      <div className="dashboard-map">
        <MapContainer center={defaultCenter} zoom={12} className="map-canvas">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
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
                key={`order-${order.id}`}
                position={[Number(order.latitude), Number(order.longitude)]}
                icon={statusIcon(meta.color)}
              >
                <Popup>
                  <div dir="rtl">
                    <strong>{order.customer_name}</strong>
                    <p>المندوب: {order.agent_name}</p>
                    <p>الحالة: {meta.label}</p>
                    <p>المبلغ: {order.amount}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {agentLocations.map((agent) => (
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
          ))}
        </MapContainer>
      </div>

      <h3 style={{ marginTop: 18 }}>المندوبون على الخريطة ({agentLocations.length})</h3>
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
                  لا يوجد مندوب متصل بالموقع حاليًا. عندما يفتح المندوب لوحته مع GPS يظهر هنا.
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
