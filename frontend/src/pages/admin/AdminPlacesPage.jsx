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

export default function AdminPlacesPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
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

  const openCreate = (position) => {
    setEditingPlace(null);
    setSelectedPosition(position);
    setForm(emptyForm);
  };

  const openEdit = (place) => {
    setEditingPlace(place);
    setSelectedPosition([
      Number(place.latitude),
      Number(place.longitude),
    ]);
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
    setSelectedPosition(null);
    setEditingPlace(null);
    setForm(emptyForm);
  };

  const savePlace = async (event) => {
    event.preventDefault();

    if (!selectedPosition) {
      setMessage("حدد موقعًا على الخريطة");
      setMessageType("error");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      phone: form.phone.trim(),
      website: form.website.trim(),
      image: form.image.trim(),
      latitude: selectedPosition[0],
      longitude: selectedPosition[1],
    };

    const result = editingPlace
      ? await api.updatePlace(editingPlace.id, payload)
      : await api.createPlace(payload);

    setLoading(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر حفظ المكان");
      setMessageType("error");
      return;
    }

    closeModal();
    setMessage(editingPlace ? "تم تحديث المكان" : "تم حفظ المكان");
    setMessageType("success");
    await reload();
  };

  const deletePlace = async (placeId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المكان؟")) {
      return;
    }

    const result = await api.deletePlace(placeId);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر حذف المكان");
      setMessageType("error");
      return;
    }

    setMessage("تم حذف المكان");
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
        const next = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setFlyTo(next);
        openCreate(next);
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
          <h2>إدارة الأماكن</h2>
          <p>
            اضغط على الخريطة لإضافة مكان جديد، أو افتح العلامة لتعديلها أو حذفها
          </p>
        </div>
        <span className="places-count-pill">{places.length} مكان</span>
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
        <MapView
          places={places}
          selectedPosition={selectedPosition}
          flyTo={flyTo}
          clickToSelect
          canDelete
          canEdit
          onMapClick={openCreate}
          onDelete={deletePlace}
          onEdit={openEdit}
        />
      </div>

      {selectedPosition && (
        <PlaceFormModal
          title={editingPlace ? "تعديل المكان" : "إضافة مكان جديد"}
          mode={editingPlace ? "edit" : "create"}
          form={form}
          onChange={onChange}
          onSubmit={savePlace}
          onClose={closeModal}
          loading={loading}
          categories={categories}
          selectedPosition={selectedPosition}
        />
      )}
    </section>
  );
}
