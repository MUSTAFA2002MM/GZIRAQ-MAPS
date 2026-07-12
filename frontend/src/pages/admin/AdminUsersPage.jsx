import { useEffect, useState } from "react";
import PasswordInput from "../../components/common/PasswordInput";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  can_edit_places: false,
  can_upload_images: false,
};

const roleLabels = {
  admin: "مسؤول",
  employee: "موظف",
  delivery: "توصيل",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const loadUsers = async () => {
    const result = await api.getUsers();

    if (!result.ok) {
      setMessage(result.data.message || "تعذر جلب المستخدمين");
      setMessageType("error");
      return;
    }

    setUsers(result.data.users || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setMessage("فقط المسؤول يمكنه إنشاء المستخدمين");
      setMessageType("error");
      return;
    }

    setLoading(true);

    const result = await api.createUser(form);
    setLoading(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر إنشاء الحساب");
      setMessageType("error");
      return;
    }

    setForm(emptyForm);
    setMessage("تم إنشاء الحساب");
    setMessageType("success");
    await loadUsers();
  };

  const toggleActive = async (user) => {
    if (!isAdmin) {
      setMessage("فقط المسؤول يمكنه تعديل حالة المستخدمين");
      setMessageType("error");
      return;
    }

    const result = await api.setUserActive(user.id, !user.is_active);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر تحديث الحالة");
      setMessageType("error");
      return;
    }

    setMessage(result.data.message || "تم تحديث الحالة");
    setMessageType("success");
    await loadUsers();
  };

  const confirmDelete = async () => {
    if (!isAdmin || !deletingUser) {
      setMessage("فقط المسؤول يمكنه حذف المستخدمين");
      setMessageType("error");
      return;
    }

    if (deletingUser.role === "admin") {
      setMessage("لا يمكن حذف حساب المسؤول");
      setMessageType("error");
      setDeletingUser(null);
      return;
    }

    setDeleting(true);
    const result = await api.deleteUser(deletingUser.id);
    setDeleting(false);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر حذف المستخدم");
      setMessageType("error");
      return;
    }

    setUsers((current) =>
      current.filter((user) => Number(user.id) !== Number(deletingUser.id))
    );
    setDeletingUser(null);
    setMessage(`تم حذف المستخدم: ${deletingUser.name}`);
    setMessageType("success");
  };

  const deletableUsers = users.filter((user) => user.role !== "admin");

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>إدارة المستخدمين</h2>
          <p>
            إنشاء موظفين وحسابات توصيل. حذف المستخدمين متاح للمسؤول فقط ولا يمكن
            حذف حساب الأدمن.
          </p>
        </div>
      </header>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
          <button
            className="status-close"
            type="button"
            onClick={() => setMessage("")}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      )}

      <form className="panel-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="input-group">
            <span>الاسم</span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>

          <label className="input-group">
            <span>البريد</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </label>

          <PasswordInput
            name="password"
            value={form.password}
            onChange={onChange}
            minLength={6}
            required
            placeholder="6 أحرف على الأقل"
          />

          <label className="input-group">
            <span>الدور</span>
            <select name="role" value={form.role} onChange={onChange}>
              <option value="employee">موظف</option>
              <option value="delivery">توصيل</option>
            </select>
          </label>
        </div>

        {form.role === "employee" && (
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                name="can_edit_places"
                checked={form.can_edit_places}
                onChange={onChange}
              />
              السماح بتعديل الأماكن
            </label>

            <label>
              <input
                type="checkbox"
                name="can_upload_images"
                checked={form.can_upload_images}
                onChange={onChange}
              />
              السماح برفع الصور
            </label>
          </div>
        )}

        <button className="primary-button" type="submit" disabled={loading || !isAdmin}>
          {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>إجراءات الأدمن</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td dir="ltr">{user.email}</td>
                <td>{roleLabels[user.role] || user.role}</td>
                <td>
                  <span
                    className={`status-pill ${user.is_active ? "active" : "inactive"}`}
                  >
                    {user.is_active ? "مفعّل" : "معطّل"}
                  </span>
                </td>
                <td className="table-actions">
                  {user.role === "admin" ? (
                    <span className="muted-note">محمي</span>
                  ) : (
                    isAdmin && (
                      <>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => toggleActive(user)}
                        >
                          {user.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => setDeletingUser(user)}
                        >
                          حذف المستخدم
                        </button>
                      </>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletableUsers.length === 0 && (
        <p className="empty-hint">
          لا يوجد موظفون أو حسابات توصيل للحذف حاليًا. أنشئ حسابًا ثم يمكنك حذفه
          من هنا.
        </p>
      )}

      {deletingUser && (
        <div className="modal-overlay">
          <div className="confirm-dialog">
            <h3>تأكيد حذف المستخدم</h3>
            <p>
              هل أنت متأكد من حذف{" "}
              <strong>{deletingUser.name}</strong> (
              {roleLabels[deletingUser.role] || deletingUser.role})؟
              لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="form-buttons">
              <button
                className="danger-button"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "جارٍ الحذف..." : "نعم، حذف"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
