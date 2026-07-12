import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import PasswordInput from "../../components/common/PasswordInput";
import { opsApi } from "../../services/opsStore";

const companyIcon = L.divIcon({
  className: "company-pin-icon",
  html: `<span class="company-pin-mark" title="موقع الشركة"></span>`,
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

function ClickPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 17));
  }, [map, lat, lng]);

  return null;
}

export default function AdminCompanyPage() {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({
    name: "موقع الشركة",
    lat: "",
    lng: "",
    radiusMeters: "20",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const load = async () => {
    const current = await opsApi.getCompany();
    setCompany(current);
    setForm({
      name: current.name || "موقع الشركة",
      lat: String(current.lat),
      lng: String(current.lng),
      radiusMeters: String(current.radiusMeters || 20),
    });
  };

  useEffect(() => {
    load();
  }, []);

  const center = useMemo(() => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
    return [33.3152, 44.3661];
  }, [form.lat, form.lng]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onPick = (lat, lng) => {
    setForm((current) => ({
      ...current,
      lat: Number(lat).toFixed(6),
      lng: Number(lng).toFixed(6),
    }));
    setMessage("تم تحديد الموقع على الخريطة — اضغط حفظ التثبيت");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPick(position.coords.latitude, position.coords.longitude);
        setMessage("تم أخذ موقعك الحالي — اضغط حفظ التثبيت");
      },
      () => setMessage("تعذر قراءة GPS. فعّل إذن الموقع"),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await opsApi.setCompany({
      name: form.name,
      lat: form.lat,
      lng: form.lng,
      radiusMeters: form.radiusMeters,
    });
    setSaving(false);

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setCompany(result.data.company);
    setMessage(result.data.message || "تم تثبيت موقع الشركة");
  };

  const onPasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const onPasswordSave = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage("");
    const result = await opsApi.changeAdminPassword(passwordForm);
    setPasswordSaving(false);

    if (!result.ok) {
      setPasswordMessage(result.data.message);
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage(result.data.message || "تم تغيير كلمة المرور");
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>تثبيت موقع الشركة</h2>
          <p>
            أيقونة الموقع الخاصة بالمدير — اضغط على الخريطة أو استخدم GPS ثم احفظ
          </p>
        </div>
        <button
          className="company-pin-button"
          type="button"
          onClick={useMyLocation}
          title="تثبيت موقعي الحالي"
        >
          <span className="company-pin-mark small" aria-hidden="true" />
          تثبيت موقعي الآن
        </button>
      </header>

      {message && <div className="message info">{message}</div>}

      <form className="panel-form" onSubmit={onSave}>
        <div className="form-grid">
          <label className="input-group">
            <span>اسم الموقع</span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label className="input-group">
            <span>نطاق الحضور (متر)</span>
            <input
              name="radiusMeters"
              type="number"
              min="5"
              max="500"
              value={form.radiusMeters}
              onChange={onChange}
              required
            />
          </label>
          <label className="input-group">
            <span>Latitude</span>
            <input
              name="lat"
              value={form.lat}
              onChange={onChange}
              dir="ltr"
              required
            />
          </label>
          <label className="input-group">
            <span>Longitude</span>
            <input
              name="lng"
              value={form.lng}
              onChange={onChange}
              dir="ltr"
              required
            />
          </label>
        </div>

        <div className="form-buttons">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ تثبيت موقع الشركة"}
          </button>
        </div>
      </form>

      <div className="map-panel company-map-panel">
        <MapContainer
          center={center}
          zoom={17}
          style={{ height: 420, width: "100%", borderRadius: 16 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickPicker onPick={onPick} />
          <Recenter lat={Number(form.lat)} lng={Number(form.lng)} />
          {Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng)) && (
            <>
              <Marker position={center} icon={companyIcon}>
                <Popup>
                  {form.name || "موقع الشركة"}
                  <br />
                  نطاق: {form.radiusMeters}م
                </Popup>
              </Marker>
              <Circle
                center={center}
                radius={Number(form.radiusMeters) || 20}
                pathOptions={{
                  color: "#1558e0",
                  fillColor: "#f5c518",
                  fillOpacity: 0.2,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {company && (
        <p className="empty-hint" style={{ marginTop: 12 }}>
          الموقع الحالي المحفوظ: {company.name} · {company.lat}, {company.lng} ·{" "}
          {company.radiusMeters}م
        </p>
      )}

      <section className="attendance-box" style={{ marginTop: 24 }}>
        <header className="panel-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>تغيير كلمة سر المدير</h2>
            <p>لن تظهر كلمة المرور في الشاشة أو في بيانات السيرفر العامة</p>
          </div>
        </header>

        {passwordMessage && (
          <div
            className={`message ${
              passwordMessage.includes("تم") ? "success" : "error"
            }`}
          >
            {passwordMessage}
          </div>
        )}

        <form className="panel-form" onSubmit={onPasswordSave}>
          <div className="form-grid">
            <PasswordInput
              name="currentPassword"
              label="كلمة المرور الحالية"
              value={passwordForm.currentPassword}
              onChange={onPasswordChange}
              required
              autoComplete="current-password"
            />
            <PasswordInput
              name="newPassword"
              label="كلمة المرور الجديدة"
              value={passwordForm.newPassword}
              onChange={onPasswordChange}
              minLength={6}
              required
              autoComplete="new-password"
            />
            <PasswordInput
              name="confirmPassword"
              label="تأكيد كلمة المرور الجديدة"
              value={passwordForm.confirmPassword}
              onChange={onPasswordChange}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-buttons">
            <button
              className="primary-button"
              type="submit"
              disabled={passwordSaving}
            >
              {passwordSaving ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
