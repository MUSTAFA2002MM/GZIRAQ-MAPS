import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://elegant-commitment-production-336a.up.railway.app";

const defaultPosition = [33.3152, 44.3661];

const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("gziraq_token") || ""
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("gziraq_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [locations, setLocations] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLocations = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLocations(data.locations || []);
      } else if (response.status === 401) {
        logout();
      } else {
        setMessage(data.message || "تعذر جلب المواقع");
      }
    } catch (error) {
      console.error(error);
      setMessage("تعذر الاتصال بالخادم");
    }
  };

  useEffect(() => {
    loadLocations();
  }, [token]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const endpoint =
      authMode === "register" ? "/api/register" : "/api/login";

    const body =
      authMode === "register"
        ? authForm
        : {
            email: authForm.email,
            password: authForm.password,
          };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "تعذر إكمال العملية");
        return;
      }

      localStorage.setItem("gziraq_token", data.token);
      localStorage.setItem(
        "gziraq_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);
      setMessage(data.message || "تم تسجيل الدخول بنجاح");
    } catch (error) {
      console.error(error);
      setMessage("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async () => {
    if (!selectedPosition || !token) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: selectedPosition[0],
          longitude: selectedPosition[1],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "تعذر حفظ الموقع");
        return;
      }

      setSelectedPosition(null);
      setMessage("تم حفظ موقعك بنجاح");
      await loadLocations();
    } catch (error) {
      console.error(error);
      setMessage("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setMessage("جارٍ تحديد موقعك...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);

        setMessage("تم تحديد موقعك، اضغط حفظ الموقع");
      },
      () => {
        setMessage("تعذر الوصول إلى موقعك");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const logout = () => {
    localStorage.removeItem("gziraq_token");
    localStorage.removeItem("gziraq_user");

    setToken("");
    setUser(null);
    setLocations([]);
    setSelectedPosition(null);
    setMessage("");
  };

  if (!token) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuthSubmit}>
          <h1>GZIRAQ MAPS</h1>

          <h2>
            {authMode === "login"
              ? "تسجيل الدخول"
              : "إنشاء حساب"}
          </h2>

          {authMode === "register" && (
            <input
              name="name"
              type="text"
              placeholder="الاسم"
              value={authForm.name}
              onChange={handleAuthChange}
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="البريد الإلكتروني"
            value={authForm.email}
            onChange={handleAuthChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="كلمة المرور"
            value={authForm.password}
            onChange={handleAuthChange}
            minLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "يرجى الانتظار..."
              : authMode === "login"
                ? "دخول"
                : "إنشاء الحساب"}
          </button>

          <button
            type="button"
            className="switch-auth"
            onClick={() => {
              setAuthMode((current) =>
                current === "login" ? "register" : "login"
              );
              setMessage("");
            }}
          >
            {authMode === "login"
              ? "ليس لديك حساب؟ إنشاء حساب"
              : "لديك حساب؟ تسجيل الدخول"}
          </button>

          {message && <p className="message">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>GZIRAQ MAPS</h1>
          <span>مرحبًا {user?.name || "بك"}</span>
        </div>

        <div className="topbar-actions">
          <button onClick={useCurrentLocation}>
            موقعي الحالي
          </button>

          <button onClick={loadLocations}>
            تحديث المواقع
          </button>

          <button onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      </header>

      {message && <div className="status-message">{message}</div>}

      <MapContainer
        center={defaultPosition}
        zoom={13}
        className="map"
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={setSelectedPosition} />

        {locations.map((location) => (
          <Marker
            key={location.user_id}
            position={[
              Number(location.latitude),
              Number(location.longitude),
            ]}
            icon={markerIcon}
          >
            <Popup>
              <strong>{location.name}</strong>
              <br />
              آخر تحديث:
              <br />
              {new Date(location.updated_at).toLocaleString("ar-IQ")}
            </Popup>
          </Marker>
        ))}

        {selectedPosition && (
          <Marker position={selectedPosition} icon={markerIcon}>
            <Popup>الموقع المحدد</Popup>
          </Marker>
        )}
      </MapContainer>

      {selectedPosition && (
        <div className="place-form">
          <h2>تأكيد موقعك</h2>

          <p>
            {selectedPosition[0].toFixed(6)},{" "}
            {selectedPosition[1].toFixed(6)}
          </p>

          <div className="form-buttons">
            <button
              className="save-button"
              onClick={saveLocation}
              disabled={loading}
            >
              {loading ? "جارٍ الحفظ..." : "حفظ الموقع"}
            </button>

            <button
              className="cancel-button"
              onClick={() => setSelectedPosition(null)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;