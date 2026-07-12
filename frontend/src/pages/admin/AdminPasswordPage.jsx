import { useState } from "react";
import PasswordInput from "../../components/common/PasswordInput";
import { opsApi } from "../../services/opsStore";

export default function AdminPasswordPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const result = await opsApi.changeAdminPassword(form);
    setSaving(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر تغيير كلمة المرور");
      return;
    }

    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setMessage(result.data.message || "تم تغيير كلمة مرور المدير");
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>كلمة سر المدير</h2>
          <p>غيّر كلمة المرور هنا. الحقول مخفية ولن تظهر كلمة السر على الشاشة</p>
        </div>
      </header>

      {message && (
        <div
          className={`message ${
            message.includes("تم") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      )}

      <form className="panel-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <PasswordInput
            name="currentPassword"
            label="كلمة المرور الحالية"
            value={form.currentPassword}
            onChange={onChange}
            required
            autoComplete="current-password"
          />
          <PasswordInput
            name="newPassword"
            label="كلمة المرور الجديدة"
            value={form.newPassword}
            onChange={onChange}
            minLength={6}
            required
            autoComplete="new-password"
          />
          <PasswordInput
            name="confirmPassword"
            label="تأكيد كلمة المرور الجديدة"
            value={form.confirmPassword}
            onChange={onChange}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-buttons">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
          </button>
        </div>
      </form>
    </section>
  );
}
