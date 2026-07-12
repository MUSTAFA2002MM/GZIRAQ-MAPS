export default function MapToolbar({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  categories = [],
  onLocate,
  onRefresh,
  loading,
}) {
  return (
    <div className="map-toolbar">
      <input
        className="search-input"
        type="search"
        placeholder="ابحث بالاسم أو الوصف..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="بحث الأماكن"
      />

      <select
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        aria-label="تصفية حسب التصنيف"
      >
        <option value="">كل التصنيفات</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <button className="secondary-button" type="button" onClick={onLocate}>
        موقعي الحالي
      </button>

      <button
        className="secondary-button"
        type="button"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? "جارٍ التحديث..." : "تحديث"}
      </button>
    </div>
  );
}
