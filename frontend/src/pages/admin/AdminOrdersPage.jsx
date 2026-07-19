import { useEffect, useMemo, useState } from "react";
import { ORDER_STATUS, opsApi } from "../../services/opsStore";

const emptyForm = {
  agentId: "",
  customerId: "",
  customerName: "",
  amount: "",
  paid: "",
  remaining: "",
  priority: "1",
};

export default function AdminOrdersPage() {
  const [day, setDay] = useState("today");
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

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

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.phone,
        customer.address,
        customer.mapsUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, customerQuery]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((item) => Number(item.id) === Number(form.customerId)) ||
      null,
    [customers, form.customerId]
  );

  const syncMoney = (nextAmount, nextPaid, nextRemaining, changed) => {
    const amount = Number(nextAmount);
    const paid = Number(nextPaid);
    const remaining = Number(nextRemaining);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    if (changed === "amount" || changed === "paid") {
      const safePaid = Number.isFinite(paid) ? paid : 0;
      return {
        amount: nextAmount,
        paid: nextPaid,
        remaining: String(Math.max(0, safeAmount - safePaid)),
      };
    }

    if (changed === "remaining") {
      const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
      return {
        amount: nextAmount,
        paid: String(Math.max(0, safeAmount - safeRemaining)),
        remaining: nextRemaining,
      };
    }

    return {
      amount: nextAmount,
      paid: nextPaid,
      remaining: nextRemaining,
    };
  };

  const onChange = (event) => {
    const { name, value } = event.target;

    if (name === "amount" || name === "paid" || name === "remaining") {
      setForm((current) => ({
        ...current,
        ...syncMoney(
          name === "amount" ? value : current.amount,
          name === "paid" ? value : current.paid,
          name === "remaining" ? value : current.remaining,
          name
        ),
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const pickCustomer = (customer) => {
    setForm((current) => ({
      ...current,
      customerId: String(customer.id),
      customerName: customer.name,
    }));
    setCustomerQuery(
      `${customer.name}${customer.phone ? ` · ${customer.phone}` : ""}`
    );
  };

  const clearCustomer = () => {
    setForm((current) => ({
      ...current,
      customerId: "",
      customerName: "",
    }));
    setCustomerQuery("");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setCustomerQuery("");
    setEditingId(null);
  };

  const startEdit = (order) => {
    if (order.status === "cancelled") {
      setMessageType("error");
      setMessage("لا يمكن تعديل طلب ملغى");
      return;
    }
    if (order.status === "delivered" || order.status === "returned") {
      setMessageType("error");
      setMessage("لا يمكن تعديل طلب بعد التسليم أو الإرجاع");
      return;
    }

    const amount = Number(order.amount) || 0;
    const paid = Number(order.paid ?? order.paid_amount ?? 0);
    const remaining = Number.isFinite(Number(order.remaining))
      ? Number(order.remaining)
      : Math.max(0, amount - (Number.isFinite(paid) ? paid : 0));

    setEditingId(order.id);
    setForm({
      agentId: String(order.agent_id || ""),
      customerId: order.customer_id ? String(order.customer_id) : "",
      customerName: order.customer_name || "",
      amount: String(amount),
      paid: String(Number.isFinite(paid) ? paid : 0),
      remaining: String(remaining),
      priority: String(order.priority ?? 1),
    });
    setCustomerQuery(
      `${order.customer_name || ""}${
        order.customer_phone ? ` · ${order.customer_phone}` : ""
      }`
    );
    setMessageType("success");
    setMessage(`تعديل الطلب #${order.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      customerName: form.customerName || selectedCustomer?.name || customerQuery,
    };

    const result = editingId
      ? await opsApi.updateOrder(editingId, payload)
      : await opsApi.createOrder(payload);

    if (!result.ok) {
      setMessageType("error");
      setMessage(result.data.message || "تعذر حفظ الطلب");
      return;
    }

    resetForm();
    setMessageType("success");
    setMessage(
      editingId ? "تم تعديل الطلب" : "تم تسجيل الطلب على المندوب"
    );
    await load();
  };

  const cancelOrder = async (order) => {
    if (order.status === "cancelled") return;
    if (order.status === "delivered") {
      setMessageType("error");
      setMessage("لا يمكن إلغاء طلب تم تسليمه");
      return;
    }

    if (
      !window.confirm(
        `إلغاء الطلب #${order.id} للزبون ${order.customer_name}؟`
      )
    ) {
      return;
    }

    const result = await opsApi.cancelOrder(order.id);
    if (!result.ok) {
      setMessageType("error");
      setMessage(result.data.message || "تعذر إلغاء الطلب");
      return;
    }

    if (Number(editingId) === Number(order.id)) {
      resetForm();
    }
    setMessageType("success");
    setMessage("تم إلغاء الطلب");
    await load();
  };

  const collectFromCustomer = async (orderId) => {
    const result = await opsApi.markCustomerPaid(orderId);
    if (!result.ok) {
      setMessageType("error");
      setMessage(result.data.message || "تعذر تسجيل الاستلام من الزبون");
      return;
    }
    setMessageType("success");
    setMessage("تم تسجيل استلام المبلغ من الزبون");
    await load();
  };

  const collect = async (orderId) => {
    await opsApi.markOrderCollected(orderId);
    setMessageType("success");
    setMessage("تم تسجيل تحصيل المبلغ من المندوب");
    await load();
  };

  const canModify = (order) =>
    order.status === "registered" || order.status === "nearby";

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الطلبات (يومية)</h2>
          <p>
            سجّل طلبًا على مندوب، ويمكنك تعديله أو إلغاؤه قبل التسليم أو الإرجاع
          </p>
        </div>
        <select value={day} onChange={(event) => setDay(event.target.value)}>
          <option value="today">اليوم</option>
          <option value="yesterday">أمس</option>
        </select>
      </header>

      {message && (
        <div className={`message ${messageType}`}>{message}</div>
      )}

      <form className="panel-form" onSubmit={onSubmit}>
        {editingId ? (
          <p className="empty-hint" style={{ marginBottom: 10 }}>
            جارٍ تعديل الطلب رقم <strong>#{editingId}</strong>
          </p>
        ) : null}

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

          <div className="input-group customer-search-field">
            <span>الزبون</span>
            <div className="customer-search-row">
              <input
                type="search"
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  if (form.customerId) {
                    setForm((current) => ({
                      ...current,
                      customerId: "",
                      customerName: "",
                    }));
                  }
                }}
                placeholder="ابحث بالاسم أو الرقم أو الموقع..."
                autoComplete="off"
              />
              {form.customerId ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={clearCustomer}
                >
                  مسح
                </button>
              ) : null}
            </div>

            {selectedCustomer ? (
              <p className="customer-search-picked">
                المختار: <strong>{selectedCustomer.name}</strong>
                {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}
                {selectedCustomer.address
                  ? ` · ${selectedCustomer.address}`
                  : ""}
              </p>
            ) : (
              <div className="customer-search-results">
                {filteredCustomers.length === 0 ? (
                  <p className="empty-hint">لا يوجد زبون مطابق للبحث</p>
                ) : (
                  filteredCustomers.slice(0, 8).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="customer-search-item"
                      onClick={() => pickCustomer(customer)}
                    >
                      <strong>{customer.name}</strong>
                      <span>
                        {[customer.phone, customer.address]
                          .filter(Boolean)
                          .join(" · ") || "بدون تفاصيل"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <label className="input-group">
            <span>مبلغ الفاتورة</span>
            <input
              name="amount"
              value={form.amount}
              onChange={onChange}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
            />
          </label>

          <label className="input-group">
            <span>الواصل</span>
            <input
              name="paid"
              value={form.paid}
              onChange={onChange}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
            />
          </label>

          <label className="input-group">
            <span>الباقي</span>
            <input
              name="remaining"
              value={form.remaining}
              onChange={onChange}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
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
        <div className="form-buttons">
          <button className="primary-button" type="submit">
            {editingId ? "حفظ تعديل الطلب" : "تسجيل الطلب على المندوب"}
          </button>
          {editingId ? (
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
            >
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الزبون</th>
              <th>المندوب</th>
              <th>الحالة</th>
              <th>المبلغ</th>
              <th>الواصل</th>
              <th>الباقي</th>
              <th>الأولوية</th>
              <th>تحصيل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-hint">
                  لا توجد طلبات لهذا اليوم
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const amount = Number(order.amount) || 0;
                const paid = Number(order.paid ?? order.paid_amount ?? 0);
                const remaining = Number.isFinite(Number(order.remaining))
                  ? Number(order.remaining)
                  : Number.isFinite(Number(order.remaining_amount))
                    ? Number(order.remaining_amount)
                    : Math.max(0, amount - (Number.isFinite(paid) ? paid : 0));
                const meta = ORDER_STATUS[order.status] || ORDER_STATUS.registered;
                const editable = canModify(order);

                return (
                  <tr
                    key={order.id}
                    className={
                      order.status === "cancelled" ? "order-row-cancelled" : ""
                    }
                  >
                    <td>
                      <div>{order.customer_name}</div>
                      {order.customer_phone ? (
                        <small dir="ltr">{order.customer_phone}</small>
                      ) : null}
                    </td>
                    <td>{order.agent_name}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: `${meta.color}22`,
                          color: meta.color,
                          borderColor: `${meta.color}55`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td dir="ltr">{amount}</td>
                    <td dir="ltr">{Number.isFinite(paid) ? paid : 0}</td>
                    <td dir="ltr">{remaining}</td>
                    <td>{order.priority || "-"}</td>
                    <td>
                      {order.status === "cancelled" ? (
                        <span className="collect-done">—</span>
                      ) : (
                        <div className="collect-actions">
                          {order.customer_paid ? (
                            <span className="collect-done">
                              تم استلام المبلغ من الزبون
                            </span>
                          ) : (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => collectFromCustomer(order.id)}
                            >
                              استلام المبلغ من الزبون
                            </button>
                          )}

                          {order.status === "delivered" && !order.collected ? (
                            <button
                              className="primary-button"
                              type="button"
                              onClick={() => collect(order.id)}
                            >
                              تحصيل من المندوب
                            </button>
                          ) : order.collected ? (
                            <span className="collect-done">
                              تم التحصيل من المندوب
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {editable ? (
                          <>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => startEdit(order)}
                            >
                              تعديل
                            </button>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => cancelOrder(order)}
                            >
                              إلغاء
                            </button>
                          </>
                        ) : order.status === "cancelled" ? (
                          <span className="collect-done">ملغى</span>
                        ) : (
                          <span className="collect-done">مغلق</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
