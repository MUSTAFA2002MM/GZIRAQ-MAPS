import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const result = await api.getSettings();

      if (!result.ok) {
        setMessage(result.data.message || "تعذر جلب الإعدادات");
        return;
      }

      const mapped = {};

      (result.data.settings || []).forEach((item) => {
        mapped[item.key] = item.value;
      });

      setSettings(mapped);
    }

    load();
  }, []);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? (checked ? "true" : "false") : value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const result = await api.updateSettings(settings);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر التحديث");
      return;
    }

    setMessage("تم حفظ الإعدادات");
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>إعدادات النظام</h2>
          <p>التحكم باسم التطبيق والتسجيل العام وإعدادات الخريطة</p>
        </div>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form" onSubmit={onSubmit}>
        <label className="input-group">
          <span>اسم التطبيق</span>
          <input
            name="app_name"
            value={settings.app_name || ""}
            onChange={onChange}
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            name="public_registration"
            checked={settings.public_registration === "true"}
            onChange={onChange}
          />
          السماح بالتسجيل العام
        </label>

        <div className="form-grid">
          <label className="input-group">
            <span>خط عرض افتراضي</span>
            <input
              name="default_map_lat"
              value={settings.default_map_lat || ""}
              onChange={onChange}
              dir="ltr"
            />
          </label>

          <label className="input-group">
            <span>خط طول افتراضي</span>
            <input
              name="default_map_lng"
              value={settings.default_map_lng || ""}
              onChange={onChange}
              dir="ltr"
            />
          </label>

          <label className="input-group">
            <span>مستوى التكبير</span>
            <input
              name="default_map_zoom"
              value={settings.default_map_zoom || ""}
              onChange={onChange}
              dir="ltr"
            />
          </label>
        </div>

        <button className="primary-button" type="submit">
          حفظ الإعدادات
        </button>
      </form>
    </section>
  );
}
