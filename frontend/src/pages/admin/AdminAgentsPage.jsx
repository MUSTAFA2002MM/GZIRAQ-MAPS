import { useEffect, useState } from "react";
import { opsApi } from "../../services/opsStore";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const result = await opsApi.listAgents();
    setAgents(result.data.agents || []);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await opsApi.createAgent({ name, pin });

      if (!result.ok) {
        setMessageType("error");
        setMessage(result.data.message || "تعذر إضافة المندوب");
        return;
      }

      setName("");
      setPin("");
      setMessageType("success");
      setMessage("تمت إضافة المندوب بنجاح");
      setAgents(result.data.agents || []);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("حذف المندوب؟")) return;
    const result = await opsApi.deleteAgent(id);
    if (result.ok) {
      setAgents(result.data.agents || []);
      setMessageType("success");
      setMessage("تم حذف المندوب");
    } else {
      setMessageType("error");
      setMessage(result.data.message || "تعذر الحذف");
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>إدارة المندوبين</h2>
          <p>أضف مندوبًا مع PIN من 4 أرقام لتسجيل الدخول من أي جهاز</p>
        </div>
      </header>

      {message && <div className={`message ${messageType}`}>{message}</div>}

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
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "جارٍ الإضافة..." : "إضافة مندوب"}
        </button>
      </form>

      <div className="chips-list">
        {agents.length === 0 ? (
          <p className="empty-hint">لا يوجد مندوبون بعد</p>
        ) : (
          agents.map((agent) => (
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
          ))
        )}
      </div>
    </section>
  );
}
