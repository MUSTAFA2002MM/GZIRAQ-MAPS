import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  buildCustomerMapsLink,
  isValidCoords,
  opsApi,
  parseMapsUrlCoords,
} from "../../services/opsStore";

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
  const [editingId, setEditingId] = useState(null);
  const [picked, setPicked] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const load = async () => {
    const result = await opsApi.listCustomers(search);
    setCustomers(result.data.customers || []);
  };

  useEffect(() => {
    load();
  }, [search]);

  const mapCenter = useMemo(() => {
    if (picked) return picked;
    if (isValidCoords(form.latitude, form.longitude)) {
      return [Number(form.latitude), Number(form.longitude)];
    }
    return [33.3152, 44.3661];
  }, [picked, form.latitude, form.longitude]);

  const applyCoords = (lat, lng, note) => {
    setPicked([lat, lng]);
    setForm((current) => ({
      ...current,
      latitude: Number(lat).toFixed(6),
      longitude: Number(lng).toFixed(6),
    }));
    if (note) {
      setMessageType("success");
      setMessage(note);
    }
  };

  const onChange = (event) => {
    const { name, value } = event.target;

    if (name === "mapsUrl") {
      const parsed = parseMapsUrlCoords(value);
      setForm((current) => ({
        ...current,
        mapsUrl: value,
        ...(parsed
          ? {
              latitude: parsed.lat.toFixed(6),
              longitude: parsed.lng.toFixed(6),
            }
          : {}),
      }));
      if (parsed) {
        setPicked([parsed.lat, parsed.lng]);
        setMessageType("success");
        setMessage("تم قراءة الموقع من رابط الخريطة");
      }
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const onPick = (position) => {
    applyCoords(position[0], position[1], "تم تحديد النقطة على الخريطة");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPicked(null);
    setEditingId(null);
  };

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      mapsUrl: customer.mapsUrl || "",
      latitude: isValidCoords(customer.latitude, customer.longitude)
        ? Number(customer.latitude).toFixed(6)
        : "",
      longitude: isValidCoords(customer.latitude, customer.longitude)
        ? Number(customer.longitude).toFixed(6)
        : "",
    });
    setPicked(
      isValidCoords(customer.latitude, customer.longitude)
        ? [Number(customer.latitude), Number(customer.longitude)]
        : null
    );
    setMessageType("success");
    setMessage(`تعديل الزبون: ${customer.name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const result = editingId
      ? await opsApi.updateCustomer(editingId, form)
      : await opsApi.createCustomer(form);

    if (!result.ok) {
      setMessageType("error");
      setMessage(result.data.message);
      return;
    }

    resetForm();
    setMessageType("success");
    setMessage(editingId ? "تم تحديث الزبون" : "تمت إضافة الزبون");
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("حذف الزبون؟")) return;
    await opsApi.deleteCustomer(id);
    if (Number(editingId) === Number(id)) resetForm();
    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الزبائن</h2>
          <p>
            أدخل الرقم والموقع كتابةً، ويمكن حفظ الموقع عبر رابط Google Maps بدون
            الضغط على الخريطة
          </p>
        </div>
      </header>

      {message && (
        <div className={`message ${messageType}`}>{message}</div>
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
          <label className="input-group" style={{ gridColumn: "1 / -1" }}>
            <span>رابط Google Maps (يفتح الموقع مباشرة)</span>
            <input
              name="mapsUrl"
              value={form.mapsUrl}
              onChange={onChange}
              dir="ltr"
              placeholder="الصق رابط الموقع من Google Maps هنا"
            />
          </label>
        </div>

        <p className="empty-hint" style={{ marginTop: 8 }}>
          {isValidCoords(form.latitude, form.longitude)
            ? "تم تثبيت الإحداثيات (من الرابط أو من الخريطة)"
            : form.mapsUrl
              ? "سيتم حفظ رابط الخريطة وفتح الموقع عبره بدون نقطة على الخريطة"
              : "ألصق رابط Google Maps، أو اضغط على الخريطة لتحديد النقطة"}
        </p>

        <div className="form-buttons">
          <button className="primary-button" type="submit">
            {editingId ? "حفظ التعديل" : "إضافة زبون"}
          </button>
          {editingId ? (
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
            >
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </form>

      <div className="dashboard-map" style={{ marginBottom: 18 }} dir="ltr">
        <MapContainer
          key={editingId || "new-customer"}
          center={mapCenter}
          zoom={12}
          className="map-canvas"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickPicker onPick={onPick} />
          {picked && <Marker position={picked} icon={markerIcon} />}
          {customers
            .filter((customer) =>
              isValidCoords(customer.latitude, customer.longitude)
            )
            .map((customer) => (
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
        {customers.map((customer) => {
          const mapsLink = buildCustomerMapsLink(customer);

          return (
            <div key={customer.id} className="chip-row">
              <span>
                {customer.name}
                {customer.phone ? ` · ${customer.phone}` : ""}
                {customer.address ? ` · ${customer.address}` : ""}
              </span>
              <div className="table-actions">
                {mapsLink ? (
                  <a
                    className="secondary-button"
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    فتح الموقع
                  </a>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => startEdit(customer)}
                >
                  تعديل
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => remove(customer.id)}
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
