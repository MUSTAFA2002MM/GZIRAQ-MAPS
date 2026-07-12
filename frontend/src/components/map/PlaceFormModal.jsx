export default function PlaceFormModal({
  title = "إضافة مكان جديد",
  form,
  onChange,
  onSubmit,
  onClose,
  loading,
  categories = [],
  selectedPosition,
  mode = "create",
}) {
  return (
    <div className="modal-overlay">
      <form className="place-form" onSubmit={onSubmit}>
        <div className="form-header">
          <div>
            <h2>{title}</h2>
            <p>
              {mode === "edit"
                ? "حدّث معلومات المكان"
                : "أدخل معلومات المكان المحدد"}
            </p>
          </div>

          <button className="close-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="input-group">
          <span>اسم المكان</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={onChange}
            maxLength={150}
            required
          />
        </label>

        <label className="input-group">
          <span>الوصف</span>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={3}
          />
        </label>

        <label className="input-group">
          <span>التصنيف</span>
          <select
            name="category_id"
            value={form.category_id}
            onChange={onChange}
          >
            <option value="">بدون تصنيف</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label className="input-group">
            <span>الهاتف</span>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={onChange}
              dir="ltr"
            />
          </label>

          <label className="input-group">
            <span>الموقع الإلكتروني</span>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={onChange}
              dir="ltr"
            />
          </label>
        </div>

        <label className="input-group">
          <span>رابط الصورة</span>
          <input
            type="url"
            name="image"
            value={form.image}
            onChange={onChange}
            dir="ltr"
            placeholder="https://..."
          />
        </label>

        {selectedPosition && (
          <div className="coordinates">
            <div>
              <span>خط العرض</span>
              <strong>{selectedPosition[0].toFixed(6)}</strong>
            </div>
            <div>
              <span>خط الطول</span>
              <strong>{selectedPosition[1].toFixed(6)}</strong>
            </div>
          </div>
        )}

        <div className="form-buttons">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
