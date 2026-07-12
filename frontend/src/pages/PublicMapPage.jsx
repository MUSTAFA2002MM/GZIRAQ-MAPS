import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MessageBanner from "../components/common/MessageBanner";
import ThemeToggle from "../components/common/ThemeToggle";
import MapToolbar from "../components/map/MapToolbar";
import MapView from "../components/map/MapView";
import { useAuth } from "../hooks/useAuth";
import { usePlaces } from "../hooks/usePlaces";
import { api } from "../services/api";

export default function PublicMapPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [flyTo, setFlyTo] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      category_id: categoryId || undefined,
    }),
    [search, categoryId]
  );

  const { places, loading, error, reload } = usePlaces(filters, {
    publicOnly: true,
  });

  useEffect(() => {
    async function loadFilters() {
      const categoriesResult = await api.getCategories();

      if (categoriesResult.ok) {
        setCategories(categoriesResult.data.categories || []);
      }
    }

    loadFilters();
  }, []);

  useEffect(() => {
    const placeId = searchParams.get("place");

    if (!placeId || places.length === 0) {
      return;
    }

    const place = places.find(
      (item) => String(item.id) === String(placeId)
    );

    if (place) {
      setFlyTo([Number(place.latitude), Number(place.longitude)]);
    }
  }, [searchParams, places]);

  useEffect(() => {
    if (error) {
      setMessage(error);
      setMessageType("error");
    }
  }, [error]);

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "employee"
        ? "/employee"
        : user?.role === "delivery"
          ? "/delivery"
          : "/login";

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      setMessageType("error");
      return;
    }

    setMessage("جارٍ تحديد موقعك...");
    setMessageType("info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFlyTo([position.coords.latitude, position.coords.longitude]);
        setMessage("تم تحديد موقعك على الخريطة");
        setMessageType("success");
      },
      () => {
        setMessage("تعذر الوصول إلى موقعك");
        setMessageType("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  return (
    <div className="public-shell" dir="rtl">
      <header className="public-topbar">
        <div className="brand-block">
          <div className="brand-mark">G</div>
          <div>
            <h1>GZIRAQ MAPS</h1>
            <p>منصة خرائط العراق الاحترافية</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="places-count-pill">{places.length} مكان</span>
          <ThemeToggle />

          {isAuthenticated ? (
            <Link className="primary-button" to={dashboardPath}>
              لوحة التحكم
            </Link>
          ) : (
            <Link className="primary-button" to="/login">
              دخول الموظفين
            </Link>
          )}
        </div>
      </header>

      <MapToolbar
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
        onLocate={useCurrentLocation}
        onRefresh={reload}
        loading={loading}
      />

      <MessageBanner
        message={message}
        type={messageType}
        onClose={() => setMessage("")}
      />

      <section className="map-section">
        <MapView places={places} flyTo={flyTo} />
        <div className="map-floating-hint">
          ابحث أو صفّ حسب التصنيف لاستكشاف الأماكن
        </div>
      </section>
    </div>
  );
}
