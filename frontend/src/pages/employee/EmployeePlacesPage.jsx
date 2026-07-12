import { useEffect, useMemo, useState } from "react";
import MessageBanner from "../../components/common/MessageBanner";
import MapToolbar from "../../components/map/MapToolbar";
import MapView from "../../components/map/MapView";
import PlaceFormModal from "../../components/map/PlaceFormModal";
import { usePlaces } from "../../hooks/usePlaces";
import { api } from "../../services/api";

const emptyForm = {
  name: "",
  description: "",
  category_id: "",
  phone: "",
  website: "",
  image: "",
};

export default function EmployeePlacesPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [flyTo, setFlyTo] = useState(null);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      category_id: categoryId || undefined,
    }),
    [search, categoryId]
  );

  const { places, loading: placesLoading, reload } = usePlaces(filters, {
    publicOnly: false,
  });

  useEffect(() => {
    async function loadMeta() {
      const categoriesResult = await api.getCategories();

      if (categoriesResult.ok) {
        setCategories(categoriesResult.data.categories || []);
      }
    }

    loadMeta();
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openEdit = (place) => {
    setEditingPlace(place);
    setForm({
      name: place.name || "",
      description: place.description || "",
      category_id: place.category_id || "",
      phone: place.phone || "",
      website: place.website || "",
      image: place.image || "",
    });
  };

  const closeModal = () => {
    setEditingPlace(null);
    setForm(emptyForm);
  };

  const savePlace = async (event) => {
    event.preventDefault();

    if (!editingPlace) {
      return;
    }

    setLoading(true);

    const result = await api.updatePlace(editingPlace.id, {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      phone: form.phone.trim(),
      website: form.website.trim(),
      image: form.image.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر تحديث المكان");
      setMessageType("error");
      return;
    }

    closeModal();
    setMessage("تم تحديث المكان");
    setMessageType("success");
    await reload();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع");
      setMessageType("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFlyTo([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setMessage("تعذر الوصول إلى موقعك");
        setMessageType("error");
      }
    );
  };

  return (
    <section className="panel map-panel">
      <header className="panel-header">
        <div>
          <h2>أماكن المنصة</h2>
          <p>عرض الأماكن وتعديلها إذا كانت الصلاحية مفعّلة من المسؤول</p>
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
        loading={placesLoading}
      />

      <MessageBanner
        message={message}
        type={messageType}
        onClose={() => setMessage("")}
      />

      <div className="dashboard-map">
        <MapView places={places} flyTo={flyTo} canEdit onEdit={openEdit} />
      </div>

      {editingPlace && (
        <PlaceFormModal
          title="تعديل المكان"
          mode="edit"
          form={form}
          onChange={onChange}
          onSubmit={savePlace}
          onClose={closeModal}
          loading={loading}
          categories={categories}
          selectedPosition={[
            Number(editingPlace.latitude),
            Number(editingPlace.longitude),
          ]}
        />
      )}
    </section>
  );
}
