import { useEffect, useState } from "react";
import { ORDER_STATUS, opsApi } from "../../services/opsStore";

export default function AdminOrdersPage() {
  const [day, setDay] = useState("today");
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    agentId: "",
    customerId: "",
    customerName: "",
    amount: "",
    priority: "1",
  });
  const [message, setMessage] = useState("");

  const load = async () => {
    const [agentsResult, customersResult, ordersResult] = await Promise.all([
      opsApi.listAgents(),
      opsApi.listCustomers(),
      opsApi.listOrders({ day }),
    ]);
    setAgents(agentsResult.data.agents || []);
    setCustomers(customersResult.data.customers || []);
    setOrders(ordersResult.data.orders || []);
  };

  useEffect(() => {
    load();
  }, [day]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = await opsApi.createOrder(form);

    if (!result.ok) {
      setMessage(result.data.message);
      return;
    }

    setForm({
      agentId: "",
      customerId: "",
      customerName: "",
      amount: "",
      priority: "1",
    });
    setMessage("تم تسجيل الطلب على المندوب");
    await load();
  };

  const collect = async (orderId) => {
    await opsApi.markOrderCollected(orderId);
    await load();
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الطلبات (يومية)</h2>
          <p>سجّل طلبًا على مندوب ليظهر كمربع على الخريطة حسب الحالة</p>
        </div>
        <select value={day} onChange={(event) => setDay(event.target.value)}>
          <option value="today">اليوم</option>
          <option value="yesterday">أمس</option>
        </select>
      </header>

      {message && <div className="message success">{message}</div>}

      <form className="panel-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="input-group">
            <span>اختر المندوب</span>
            <select
              name="agentId"
              value={form.agentId}
              onChange={onChange}
              required
            >
              <option value="">-- اختر مندوب --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label className="input-group">
            <span>الزبون</span>
            <select
              name="customerId"
              value={form.customerId}
              onChange={onChange}
            >
              <option value="">-- اختر زبون --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                  {customer.address ? ` · ${customer.address}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="input-group">
            <span>مبلغ الفاتورة</span>
            <input
              name="amount"
              value={form.amount}
              onChange={onChange}
              dir="ltr"
            />
          </label>

          <label className="input-group">
            <span>أولوية التوصيل</span>
            <input
              name="priority"
              value={form.priority}
              onChange={onChange}
              dir="ltr"
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          تسجيل الطلب على المندوب
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الزبون</th>
              <th>المندوب</th>
              <th>الحالة</th>
              <th>المبلغ</th>
              <th>الأولوية</th>
              <th>تحصيل</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.customer_name}</td>
                <td>{order.agent_name}</td>
                <td>{ORDER_STATUS[order.status]?.label || order.status}</td>
                <td>{order.amount}</td>
                <td>{order.priority || "-"}</td>
                <td>
                  {order.status === "delivered" && !order.collected ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => collect(order.id)}
                    >
                      استلام المبلغ
                    </button>
                  ) : order.collected ? (
                    "تم الاستلام"
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
