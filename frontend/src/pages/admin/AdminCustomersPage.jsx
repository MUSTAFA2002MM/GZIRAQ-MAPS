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

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [picked, setPicked] = useState(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const result = await opsApi.listCustomers(search);
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
    setMessage("تم تحديد النقطة على الخريطة");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = await opsApi.createCustomer(form);

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setForm(emptyForm);
    setPicked(null);
    setMessage("تمت إضافة الزبون");
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("حذف الزبون؟")) return;
    await opsApi.deleteCustomer(id);
    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الزبائن</h2>
          <p>أدخل الرقم والموقع كتابةً، ثم حدّد النقطة على الخريطة</p>
        </div>
      </header>

      {message && (
        <div
          className={`message ${
            message.includes("تمت") || message.includes("تم تحديد")
              ? "success"
              : "error"
          }`}
        >
          {message}
        </div>
      )}

      <form className="panel-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="input-group">
            <span>اسم الزبون</span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label className="input-group">
            <span>الرقم</span>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              inputMode="tel"
              placeholder="07xxxxxxxxx"
              dir="ltr"
              required
            />
          </label>
          <label className="input-group" style={{ gridColumn: "1 / -1" }}>
            <span>الموقع (صيغة كتابة)</span>
            <input
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="مثال: بغداد - الكرادة - شارع 62 - قرب ..."
              required
            />
          </label>
          <label className="input-group">
            <span>رابط Google Maps (اختياري)</span>
            <input
              name="mapsUrl"
              value={form.mapsUrl}
              onChange={onChange}
              dir="ltr"
            />
          </label>
        </div>

        <p className="empty-hint" style={{ marginTop: 8 }}>
          {form.latitude && form.longitude
            ? `تم تثبيت النقطة على الخريطة`
            : "اضغط على الخريطة لتحديد موقع الزبون قبل الحفظ"}
        </p>

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
                <div dir="rtl">
                  <strong>{customer.name}</strong>
                  <p>{customer.phone || "—"}</p>
                  <p>{customer.address || "—"}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <input
        className="search-input"
        placeholder="بحث بالاسم أو الرقم أو الموقع"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div className="chips-list">
        {customers.map((customer) => (
          <div key={customer.id} className="chip-row">
            <span>
              {customer.name}
              {customer.phone ? ` · ${customer.phone}` : ""}
              {customer.address ? ` · ${customer.address}` : ""}
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
