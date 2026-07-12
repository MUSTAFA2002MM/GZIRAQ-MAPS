import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("other");
  const [message, setMessage] = useState("");

  const load = async () => {
    const result = await api.getCategories();

    if (result.ok) {
      setCategories(result.data.categories || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();

    const result = await api.createCategory({ name, icon });

    if (!result.ok) {
      setMessage(result.data.message || "تعذر إضافة التصنيف");
      return;
    }

    setName("");
    setIcon("other");
    setMessage("تمت الإضافة");
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("حذف التصنيف؟")) return;

    const result = await api.deleteCategory(id);

    if (!result.ok) {
      setMessage(result.data.message || "تعذر الحذف");
      return;
    }

    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>التصنيفات</h2>
          <p>إدارة تصنيفات الأماكن وأيقوناتها</p>
        </div>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form inline-form" onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="اسم التصنيف"
          required
        />
        <input
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="الأيقونة"
        />
        <button className="primary-button" type="submit">
          إضافة
        </button>
      </form>

      <div className="chips-list">
        {categories.map((category) => (
          <div key={category.id} className="chip-row">
            <span>
              {category.name} · {category.icon}
            </span>
            <button
              className="danger-button"
              type="button"
              onClick={() => remove(category.id)}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
