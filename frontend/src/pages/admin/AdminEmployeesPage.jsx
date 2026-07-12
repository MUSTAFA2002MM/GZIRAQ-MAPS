import { useEffect, useState } from "react";
import { opsApi } from "../../services/opsStore";

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const result = await opsApi.listEmployees();
    setEmployees(result.data.employees || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = await opsApi.createEmployee({ name, pin });

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setName("");
    setPin("");
    setMessage("تمت إضافة الموظف — يظهر الآن لكل الأجهزة");
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("حذف الموظف؟")) return;
    await opsApi.deleteEmployee(id);
    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>إدارة الموظفين</h2>
          <p>أضف موظفًا مع PIN من 4 أرقام لتسجيل الحضور من أي جهاز</p>
        </div>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form inline-form" onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="اسم الموظف الجديد"
          required
        />
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN للموظف (4 أرقام)"
          maxLength={4}
          inputMode="numeric"
          required
        />
        <button className="primary-button" type="submit">
          إضافة موظف
        </button>
      </form>

      <div className="chips-list">
        {employees.map((employee) => (
          <div key={employee.id} className="chip-row">
            <span>
              {employee.name} · PIN: {employee.pin}
            </span>
            <button
              className="danger-button"
              type="button"
              onClick={() => remove(employee.id)}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
