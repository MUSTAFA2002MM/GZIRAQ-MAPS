import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { opsApi } from "../../services/opsStore";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    mapsUrl: "",
    latitude: "",
    longitude: "",
  });
  const [picked, setPicked] = useState(null);
  const [message, setMessage] = useState("");

  const load = () => {
    const result = opsApi.listCustomers(search);
    setCustomers(result.data.customers || []);
  };

  useEffect(() => {
    load();
  }, [search]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onPick = (position) => {
    setPicked(position);
    setForm((current) => ({
      ...current,
      latitude: position[0].toFixed(6),
      longitude: position[1].toFixed(6),
    }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const result = opsApi.createCustomer(form);

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setForm({ name: "", mapsUrl: "", latitude: "", longitude: "" });
    setPicked(null);
    setMessage("تمت إضافة الزبون");
    load();
  };

  const remove = (id) => {
    if (!window.confirm("حذف الزبون؟")) return;
    opsApi.deleteCustomer(id);
    load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الزبائن</h2>
          <p>أضف الزبائن بالإحداثيات أو بالضغط على الخريطة</p>
        </div>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="input-group">
            <span>اسم الزبون</span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label className="input-group">
            <span>رابط Google Maps</span>
            <input
              name="mapsUrl"
              value={form.mapsUrl}
              onChange={onChange}
              dir="ltr"
            />
          </label>
          <label className="input-group">
            <span>Latitude</span>
            <input
              name="latitude"
              value={form.latitude}
              onChange={onChange}
              dir="ltr"
              required
            />
          </label>
          <label className="input-group">
            <span>Longitude</span>
            <input
              name="longitude"
              value={form.longitude}
              onChange={onChange}
              dir="ltr"
              required
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          إضافة زبون
        </button>
      </form>

      <div className="dashboard-map" style={{ marginBottom: 18 }}>
        <MapContainer center={[33.3152, 44.3661]} zoom={12} className="map-canvas">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickPicker onPick={onPick} />
          {picked && <Marker position={picked} icon={markerIcon} />}
          {customers.map((customer) => (
            <Marker
              key={customer.id}
              position={[customer.latitude, customer.longitude]}
              icon={markerIcon}
            >
              <Popup>
                <div dir="rtl">{customer.name}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <input
        className="search-input"
        placeholder="بحث باسم الزبون"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div className="chips-list">
        {customers.map((customer) => (
          <div key={customer.id} className="chip-row">
            <span>
              {customer.name} · {customer.latitude}, {customer.longitude}
            </span>
            <button
              className="danger-button"
              type="button"
              onClick={() => remove(customer.id)}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
