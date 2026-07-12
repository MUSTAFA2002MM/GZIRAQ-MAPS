import { useEffect, useState } from "react";
import { opsApi } from "../../services/opsStore";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    const result = opsApi.listAgents();
    setAgents(result.data.agents || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    const result = opsApi.createAgent({ name, pin });

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setName("");
    setPin("");
    setMessage("تمت إضافة المندوب");
    load();
  };

  const remove = (id) => {
    if (!window.confirm("حذف المندوب؟")) return;
    opsApi.deleteAgent(id);
    load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>إدارة المندوبين</h2>
          <p>أضف مندوبًا مع PIN من 4 أرقام لتسجيل الدخول</p>
        </div>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form inline-form" onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="اسم المندوب الجديد"
          required
        />
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN للمندوب (4 أرقام)"
          maxLength={4}
          inputMode="numeric"
          required
        />
        <button className="primary-button" type="submit">
          إضافة مندوب
        </button>
      </form>

      <div className="chips-list">
        {agents.map((agent) => (
          <div key={agent.id} className="chip-row">
            <span>
              {agent.name} · PIN: {agent.pin}
            </span>
            <button
              className="danger-button"
              type="button"
              onClick={() => remove(agent.id)}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
