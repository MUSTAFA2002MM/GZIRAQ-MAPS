const OPS_KEY = "gziraq_ops_store_v1";

const COMPANY = {
  lat: 33.3152,
  lng: 44.3661,
  radiusMeters: 20,
  autoCheckoutHour: 23,
};

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function createDefaultOps() {
  return {
    adminPassword: "Admin@123456",
    agents: [],
    employees: [],
    customers: [],
    orders: [],
    attendance: [],
    nextIds: {
      agent: 1,
      employee: 1,
      customer: 1,
      order: 1,
      attendance: 1,
    },
  };
}

function readOps() {
  try {
    const raw = localStorage.getItem(OPS_KEY);
    if (!raw) {
      const initial = createDefaultOps();
      writeOps(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultOps(),
      ...parsed,
      agents: parsed.agents || [],
      employees: parsed.employees || [],
      customers: parsed.customers || [],
      orders: parsed.orders || [],
      attendance: parsed.attendance || [],
      nextIds: {
        ...createDefaultOps().nextIds,
        ...(parsed.nextIds || {}),
      },
    };
  } catch {
    const initial = createDefaultOps();
    writeOps(initial);
    return initial;
  }
}

function writeOps(store) {
  localStorage.setItem(OPS_KEY, JSON.stringify(store));
}

function ok(data) {
  return { ok: true, status: 200, data: { success: true, ...data } };
}

function fail(message, status = 400) {
  return { ok: false, status, data: { success: false, message } };
}

function distanceMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const ORDER_STATUS = {
  registered: { key: "registered", label: "مسجل", color: "#2563eb" },
  nearby: { key: "nearby", label: "قريب", color: "#eab308" },
  delivered: { key: "delivered", label: "تم التسليم", color: "#16a34a" },
  returned: { key: "returned", label: "راجع", color: "#dc2626" },
};

export const opsApi = {
  getCompany() {
    return COMPANY;
  },

  verifyAdminPassword(password) {
    const store = readOps();
    if (String(password) !== store.adminPassword && String(password) !== "Admin@123456") {
      return fail("كلمة مرور المدير غير صحيحة", 401);
    }

    return ok({
      token: `local-admin-${Date.now()}`,
      user: {
        id: 1,
        name: "المدير",
        email: "admin@gziraq.com",
        role: "admin",
        is_active: true,
      },
    });
  },

  listAgents() {
    return ok({ agents: readOps().agents });
  },

  createAgent({ name, pin }) {
    const store = readOps();
    const cleanName = String(name || "").trim();
    const cleanPin = String(pin || "").trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return fail("أدخل اسم المندوب و PIN من 4 أرقام");
    }

    if (store.agents.some((item) => item.pin === cleanPin)) {
      return fail("رمز PIN مستخدم مسبقًا", 409);
    }

    const agent = {
      id: store.nextIds.agent++,
      name: cleanName,
      pin: cleanPin,
      role: "delivery",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.agents.unshift(agent);
    writeOps(store);
    return { ok: true, status: 201, data: { success: true, agent } };
  },

  deleteAgent(id) {
    const store = readOps();
    store.agents = store.agents.filter((item) => Number(item.id) !== Number(id));
    writeOps(store);
    return ok({ message: "تم حذف المندوب" });
  },

  listEmployees() {
    return ok({ employees: readOps().employees });
  },

  createEmployee({ name, pin }) {
    const store = readOps();
    const cleanName = String(name || "").trim();
    const cleanPin = String(pin || "").trim();

    if (!cleanName || !/^\d{4}$/.test(cleanPin)) {
      return fail("أدخل اسم الموظف و PIN من 4 أرقام");
    }

    if (store.employees.some((item) => item.pin === cleanPin)) {
      return fail("رمز PIN مستخدم مسبقًا", 409);
    }

    const employee = {
      id: store.nextIds.employee++,
      name: cleanName,
      pin: cleanPin,
      role: "employee",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.employees.unshift(employee);
    writeOps(store);
    return { ok: true, status: 201, data: { success: true, employee } };
  },

  deleteEmployee(id) {
    const store = readOps();
    store.employees = store.employees.filter(
      (item) => Number(item.id) !== Number(id)
    );
    writeOps(store);
    return ok({ message: "تم حذف الموظف" });
  },

  loginByPin({ role, id, pin }) {
    const store = readOps();
    const list = role === "delivery" ? store.agents : store.employees;
    const person = list.find((item) => Number(item.id) === Number(id));

    if (!person || String(person.pin) !== String(pin)) {
      return fail("الاسم أو رمز PIN غير صحيح", 401);
    }

    if (!person.is_active) {
      return fail("الحساب غير مفعّل", 403);
    }

    return ok({
      token: `local-${role}-${person.id}-${Date.now()}`,
      user: {
        id: person.id,
        name: person.name,
        role,
        is_active: true,
        pin: person.pin,
      },
    });
  },

  listCustomers(search = "") {
    const store = readOps();
    const query = String(search || "").trim().toLowerCase();
    let customers = store.customers;

    if (query) {
      customers = customers.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    return ok({ customers });
  },

  createCustomer({ name, mapsUrl, latitude, longitude }) {
    const store = readOps();
    const cleanName = String(name || "").trim();
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!cleanName || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return fail("أدخل اسم الزبون وإحداثيات صحيحة");
    }

    const customer = {
      id: store.nextIds.customer++,
      name: cleanName,
      mapsUrl: String(mapsUrl || "").trim(),
      latitude: lat,
      longitude: lng,
      created_at: new Date().toISOString(),
    };

    store.customers.unshift(customer);
    writeOps(store);
    return { ok: true, status: 201, data: { success: true, customer } };
  },

  deleteCustomer(id) {
    const store = readOps();
    store.customers = store.customers.filter(
      (item) => Number(item.id) !== Number(id)
    );
    writeOps(store);
    return ok({ message: "تم حذف الزبون" });
  },

  listOrders({ day = "today", agentId } = {}) {
    const store = readOps();
    const key =
      day === "yesterday"
        ? todayKey(new Date(Date.now() - 86400000))
        : todayKey();

    let orders = store.orders.filter((order) => order.day === key);

    if (agentId) {
      orders = orders.filter(
        (order) => Number(order.agent_id) === Number(agentId)
      );
    }

    return ok({ orders, day: key });
  },

  createOrder({ agentId, customerId, customerName, amount, priority }) {
    const store = readOps();
    const agent = store.agents.find(
      (item) => Number(item.id) === Number(agentId)
    );
    const customer = store.customers.find(
      (item) => Number(item.id) === Number(customerId)
    );

    if (!agent) {
      return fail("اختر المندوب");
    }

    const name = customer?.name || String(customerName || "").trim();
    if (!name) {
      return fail("اختر أو اكتب اسم الزبون");
    }

    const order = {
      id: store.nextIds.order++,
      agent_id: agent.id,
      agent_name: agent.name,
      customer_id: customer?.id || null,
      customer_name: name,
      latitude: customer?.latitude ?? null,
      longitude: customer?.longitude ?? null,
      amount: Number(amount) || 0,
      priority: Number(priority) || 0,
      status: "registered",
      collected: false,
      day: todayKey(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.orders.unshift(order);
    writeOps(store);
    return { ok: true, status: 201, data: { success: true, order } };
  },

  updateOrderStatus(orderId, { status, amount, agentLocation }) {
    const store = readOps();
    const order = store.orders.find(
      (item) => Number(item.id) === Number(orderId)
    );

    if (!order) {
      return fail("الطلب غير موجود", 404);
    }

    if (status === "delivered" || status === "returned") {
      if (
        agentLocation &&
        Number.isFinite(order.latitude) &&
        Number.isFinite(order.longitude)
      ) {
        const meters = distanceMeters(
          { lat: agentLocation.lat, lng: agentLocation.lng },
          { lat: order.latitude, lng: order.longitude }
        );

        if (meters > 150) {
          return fail("يجب الاقتراب من موقع الزبون (≤ 150 متر)");
        }
      }

      if (status === "delivered" && amount !== undefined) {
        order.amount = Number(amount) || 0;
      }
    }

    order.status = status;
    order.updated_at = new Date().toISOString();
    writeOps(store);
    return ok({ order, message: "تم تحديث الطلب" });
  },

  markOrderCollected(orderId) {
    const store = readOps();
    const order = store.orders.find(
      (item) => Number(item.id) === Number(orderId)
    );

    if (!order) {
      return fail("الطلب غير موجود", 404);
    }

    order.collected = true;
    order.updated_at = new Date().toISOString();
    writeOps(store);
    return ok({ order });
  },

  clock({ personType, personId, personName, action, location }) {
    const store = readOps();
    const company = COMPANY;

    if (!location) {
      return fail("الموقع مطلوب للحضور");
    }

    const meters = distanceMeters(
      { lat: location.lat, lng: location.lng },
      { lat: company.lat, lng: company.lng }
    );

    if (meters > company.radiusMeters) {
      return fail(
        `يجب أن تكون داخل نطاق الشركة (${company.radiusMeters} متر). بعدك الآن ${Math.round(meters)} م`
      );
    }

    const day = todayKey();
    let record = store.attendance.find(
      (item) =>
        item.day === day &&
        item.person_type === personType &&
        Number(item.person_id) === Number(personId)
    );

    if (!record) {
      record = {
        id: store.nextIds.attendance++,
        day,
        person_type: personType,
        person_id: personId,
        person_name: personName,
        check_in: null,
        check_out: null,
      };
      store.attendance.unshift(record);
    }

    const now = new Date().toISOString();

    if (action === "in") {
      if (record.check_in && !record.check_out) {
        return fail("مسجّل دخول مسبقًا");
      }
      record.check_in = now;
      record.check_out = null;
    } else {
      if (!record.check_in) {
        return fail("سجّل الدخول أولًا");
      }
      record.check_out = now;
    }

    writeOps(store);
    return ok({ attendance: record, message: "تم تسجيل الحضور" });
  },

  getAttendance({ day = "today", personType } = {}) {
    const store = readOps();
    const key =
      day === "yesterday"
        ? todayKey(new Date(Date.now() - 86400000))
        : todayKey();

    let rows = store.attendance.filter((item) => item.day === key);

    if (personType) {
      rows = rows.filter((item) => item.person_type === personType);
    }

    return ok({ attendance: rows, day: key });
  },

  getStats() {
    const store = readOps();
    const day = todayKey();
    const todayOrders = store.orders.filter((order) => order.day === day);

    return ok({
      stats: {
        agents: store.agents.length,
        employees: store.employees.length,
        customers: store.customers.length,
        orders_today: todayOrders.length,
        delivered_today: todayOrders.filter((o) => o.status === "delivered")
          .length,
        returned_today: todayOrders.filter((o) => o.status === "returned")
          .length,
      },
    });
  },

  distanceMeters,
};
