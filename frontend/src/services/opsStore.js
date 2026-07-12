const OPS_KEY = "gziraq_ops_store_v1";

const API_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : "https://elegant-commitment-production-336a.up.railway.app";

const DEFAULT_COMPANY = {
  lat: 33.3152,
  lng: 44.3661,
  radiusMeters: 100,
  autoCheckoutHour: 23,
  name: "موقع الشركة",
  requireGeofence: true,
};

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultOps() {
  return {
    adminPassword: "Admin@123456",
    company: { ...DEFAULT_COMPANY },
    agents: [],
    employees: [],
    customers: [],
    orders: [],
    attendance: [],
    agentLocations: [],
    nextIds: {
      agent: 1,
      employee: 1,
      customer: 1,
      order: 1,
      attendance: 1,
    },
  };
}

function normalizeCompany(company) {
  const source = company || {};
  const lat = Number(source.lat);
  const lng = Number(source.lng);
  const radiusMeters = Number(source.radiusMeters);

  return {
    ...DEFAULT_COMPANY,
    ...source,
    lat: Number.isFinite(lat) ? lat : DEFAULT_COMPANY.lat,
    lng: Number.isFinite(lng) ? lng : DEFAULT_COMPANY.lng,
    radiusMeters: Number.isFinite(radiusMeters) && radiusMeters > 0
      ? radiusMeters
      : DEFAULT_COMPANY.radiusMeters,
    name: String(source.name || DEFAULT_COMPANY.name).trim() || DEFAULT_COMPANY.name,
    requireGeofence: source.requireGeofence !== false,
  };
}

function normalizeStore(parsed) {
  const next = {
    ...createDefaultOps(),
    ...parsed,
    company: normalizeCompany(parsed?.company),
    agents: parsed?.agents || [],
    employees: parsed?.employees || [],
    customers: parsed?.customers || [],
    orders: parsed?.orders || [],
    attendance: parsed?.attendance || [],
    agentLocations: parsed?.agentLocations || [],
    nextIds: {
      ...createDefaultOps().nextIds,
      ...(parsed?.nextIds || {}),
    },
  };

  // Never keep admin password in browser storage.
  delete next.adminPassword;
  return next;
}

function readLocalOps() {
  try {
    const raw = localStorage.getItem(OPS_KEY);
    if (!raw) {
      const initial = createDefaultOps();
      localStorage.setItem(OPS_KEY, JSON.stringify(initial));
      return initial;
    }
    return normalizeStore(JSON.parse(raw));
  } catch {
    const initial = createDefaultOps();
    localStorage.setItem(OPS_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeLocalOps(store) {
  localStorage.setItem(OPS_KEY, JSON.stringify(store));
}

function storeHasData(store) {
  return (
    store.agents.length > 0 ||
    store.employees.length > 0 ||
    store.customers.length > 0 ||
    store.orders.length > 0 ||
    store.attendance.length > 0 ||
    (store.agentLocations || []).length > 0
  );
}

async function pullRemoteOps() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${API_URL}/api/ops`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("ops sync failed:", response.status);
      return null;
    }
    const data = await response.json();
    return data?.store ? normalizeStore(data.store) : null;
  } catch (error) {
    console.warn("ops sync error:", error);
    return null;
  }
}

async function pushRemoteOps(store) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(`${API_URL}/api/ops`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // Keep local copy if server is unreachable.
  }
}

async function syncOpsFromServer() {
  const remote = await pullRemoteOps();
  const local = readLocalOps();

  if (remote) {
    if (!storeHasData(remote) && storeHasData(local)) {
      await pushRemoteOps(local);
      return local;
    }
    writeLocalOps(remote);
    return remote;
  }

  return local;
}

async function saveOps(store) {
  writeLocalOps(store);
  await pushRemoteOps(store);
  return store;
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
  async getCompany() {
    const store = await syncOpsFromServer();
    return store.company;
  },

  async setCompany({ lat, lng, radiusMeters, name, requireGeofence }) {
    const store = await syncOpsFromServer();
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    const nextRadius = Number(radiusMeters);

    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      return fail("حدد موقع الشركة على الخريطة أو عبر GPS");
    }

    store.company = normalizeCompany({
      ...store.company,
      lat: nextLat,
      lng: nextLng,
      radiusMeters: Number.isFinite(nextRadius) ? nextRadius : store.company.radiusMeters,
      name: name !== undefined ? name : store.company.name,
      requireGeofence:
        requireGeofence !== undefined
          ? Boolean(requireGeofence)
          : store.company.requireGeofence !== false,
    });

    await saveOps(store);
    return ok({ company: store.company, message: "تم تثبيت موقع الشركة" });
  },

  async refresh() {
    return syncOpsFromServer();
  },

  async verifyAdminPassword(password) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${API_URL}/api/ops/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: String(password || "") }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return fail(data.message || "كلمة مرور المدير غير صحيحة", response.status);
      }

      return ok({
        token: data.token,
        user: data.user,
      });
    } catch {
      return fail("تعذر الاتصال بالسيرفر لتسجيل الدخول", 503);
    }
  },

  async changeAdminPassword({ currentPassword, newPassword, confirmPassword }) {
    if (String(newPassword || "") !== String(confirmPassword || "")) {
      return fail("تأكيد كلمة المرور غير مطابق");
    }

    if (String(newPassword || "").length < 6) {
      return fail("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${API_URL}/api/ops/admin-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(currentPassword || ""),
          newPassword: String(newPassword || ""),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return fail(data.message || "تعذر تغيير كلمة المرور", response.status);
      }

      return ok({ message: data.message || "تم تغيير كلمة مرور المدير" });
    } catch {
      return fail("تعذر الاتصال بالسيرفر", 503);
    }
  },

  async listAgents() {
    const store = await syncOpsFromServer();
    return ok({ agents: store.agents });
  },

  async createAgent({ name, pin }) {
    const store = await syncOpsFromServer();
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
    await saveOps(store);
    return { ok: true, status: 201, data: { success: true, agent } };
  },

  async deleteAgent(id) {
    const store = await syncOpsFromServer();
    store.agents = store.agents.filter((item) => Number(item.id) !== Number(id));
    await saveOps(store);
    return ok({ message: "تم حذف المندوب" });
  },

  async listEmployees() {
    const store = await syncOpsFromServer();
    return ok({ employees: store.employees });
  },

  async createEmployee({ name, pin }) {
    const store = await syncOpsFromServer();
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
    await saveOps(store);
    return { ok: true, status: 201, data: { success: true, employee } };
  },

  async deleteEmployee(id) {
    const store = await syncOpsFromServer();
    store.employees = store.employees.filter(
      (item) => Number(item.id) !== Number(id)
    );
    await saveOps(store);
    return ok({ message: "تم حذف الموظف" });
  },

  async loginByPin({ role, id, pin }) {
    const store = await syncOpsFromServer();
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

  async listCustomers(search = "") {
    const store = await syncOpsFromServer();
    const query = String(search || "").trim().toLowerCase();
    let customers = store.customers;

    if (query) {
      customers = customers.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    return ok({ customers });
  },

  async createCustomer({ name, mapsUrl, latitude, longitude }) {
    const store = await syncOpsFromServer();
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
    await saveOps(store);
    return { ok: true, status: 201, data: { success: true, customer } };
  },

  async deleteCustomer(id) {
    const store = await syncOpsFromServer();
    store.customers = store.customers.filter(
      (item) => Number(item.id) !== Number(id)
    );
    await saveOps(store);
    return ok({ message: "تم حذف الزبون" });
  },

  async listOrders({ day = "today", agentId } = {}) {
    const store = await syncOpsFromServer();
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

  async createOrder({ agentId, customerId, customerName, amount, priority }) {
    const store = await syncOpsFromServer();
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
    await saveOps(store);
    return { ok: true, status: 201, data: { success: true, order } };
  },

  async updateOrderStatus(orderId, { status, amount, agentLocation }) {
    const store = await syncOpsFromServer();
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
    await saveOps(store);
    return ok({ order, message: "تم تحديث الطلب" });
  },

  async markOrderCollected(orderId) {
    const store = await syncOpsFromServer();
    const order = store.orders.find(
      (item) => Number(item.id) === Number(orderId)
    );

    if (!order) {
      return fail("الطلب غير موجود", 404);
    }

    order.collected = true;
    order.updated_at = new Date().toISOString();
    await saveOps(store);
    return ok({ order });
  },

  async clock({ personType, personId, personName, action, location, bypassGeo }) {
    const store = await syncOpsFromServer();
    const company = store.company;
    const allowBypass =
      Boolean(bypassGeo) || company.requireGeofence === false;

    let coords = location;
    const hasCoords =
      coords &&
      Number.isFinite(Number(coords.lat)) &&
      Number.isFinite(Number(coords.lng));

    if (!hasCoords) {
      if (!allowBypass) {
        return fail(
          "الموقع مطلوب للحضور. فعّل GPS أو أوقف التحقق الجغرافي من لوحة المدير"
        );
      }

      coords = {
        lat: company.lat,
        lng: company.lng,
        accuracy: 0,
        bypassed: true,
      };
    }

    const meters = distanceMeters(
      { lat: Number(coords.lat), lng: Number(coords.lng) },
      { lat: company.lat, lng: company.lng }
    );

    const accuracy = Number(coords.accuracy);
    const accuracyBuffer = Number.isFinite(accuracy)
      ? Math.min(Math.max(accuracy, 0), 150)
      : 50;
    const allowedRadius = Number(company.radiusMeters) + accuracyBuffer;
    const skippedGeo = Boolean(coords.bypassed) || company.requireGeofence === false;

    if (!skippedGeo && company.requireGeofence !== false && meters > allowedRadius) {
      return fail(
        `يجب الاقتراب من موقع الشركة. المسافة الحالية ${Math.round(meters)}م (المسموح ≈ ${Math.round(allowedRadius)}م)`
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
        check_in_distance: null,
        check_out_distance: null,
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
      record.check_in_distance = skippedGeo ? null : Math.round(meters);
      record.check_out_distance = null;
    } else {
      if (!record.check_in) {
        return fail("سجّل الدخول أولًا");
      }
      record.check_out = now;
      record.check_out_distance = skippedGeo ? null : Math.round(meters);
    }

    await saveOps(store);

    const distanceNote = skippedGeo
      ? "بدون GPS"
      : `المسافة ${Math.round(meters)}م`;

    return ok({
      attendance: record,
      message:
        action === "in"
          ? `تم تسجيل الدخول · ${distanceNote}`
          : `تم تسجيل الخروج · ${distanceNote}`,
    });
  },

  async getAttendance({ day = "today", month, months, personType } = {}) {
    const store = await syncOpsFromServer();
    let rows = store.attendance || [];

    if (months) {
      const count = Math.max(1, Number(months) || 2);
      const allowed = new Set();
      const now = new Date();

      for (let index = 0; index < count; index += 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        allowed.add(value);
      }

      rows = rows.filter((item) =>
        allowed.has(String(item.day || "").slice(0, 7))
      );
    } else if (month) {
      const monthKey = String(month).slice(0, 7);
      rows = rows.filter((item) => String(item.day || "").startsWith(monthKey));
    } else if (day === "all") {
      // keep all rows
    } else if (day === "yesterday") {
      const key = todayKey(new Date(Date.now() - 86400000));
      rows = rows.filter((item) => item.day === key);
    } else if (day && day !== "today") {
      rows = rows.filter((item) => item.day === day);
    } else {
      const key = todayKey();
      rows = rows.filter((item) => item.day === key);
    }

    if (personType) {
      rows = rows.filter((item) => item.person_type === personType);
    }

    rows = [...rows].sort((a, b) => {
      const aTime = a.check_in ? new Date(a.check_in).getTime() : 0;
      const bTime = b.check_in ? new Date(b.check_in).getTime() : 0;
      return bTime - aTime;
    });

    return ok({
      attendance: rows,
      day: month || day,
      month: month || null,
      months: months || null,
    });
  },

  async updateAgentLocation({ agentId, agentName, lat, lng, accuracy }) {
    const store = await syncOpsFromServer();
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    if (!agentId || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      return fail("موقع المندوب غير صالح");
    }

    const locations = Array.isArray(store.agentLocations)
      ? [...store.agentLocations]
      : [];
    const index = locations.findIndex(
      (item) => Number(item.agent_id) === Number(agentId)
    );

    const entry = {
      agent_id: Number(agentId),
      agent_name: agentName || "مندوب",
      lat: nextLat,
      lng: nextLng,
      accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
      updated_at: new Date().toISOString(),
    };

    if (index >= 0) {
      locations[index] = entry;
    } else {
      locations.unshift(entry);
    }

    store.agentLocations = locations;
    await saveOps(store);
    return ok({ location: entry });
  },

  async listAgentLocations({ maxAgeMinutes = 120 } = {}) {
    const store = await syncOpsFromServer();
    const maxAgeMs = Math.max(1, Number(maxAgeMinutes) || 120) * 60 * 1000;
    const now = Date.now();

    const locations = (store.agentLocations || [])
      .filter((item) => {
        const updated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        return Number.isFinite(updated) && now - updated <= maxAgeMs;
      })
      .sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });

    return ok({ locations });
  },

  async getStats() {
    const store = await syncOpsFromServer();
    const day = todayKey();
    const todayOrders = store.orders.filter((order) => order.day === day);
    const liveAgents = (store.agentLocations || []).filter((item) => {
      const updated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
      return Number.isFinite(updated) && Date.now() - updated <= 30 * 60 * 1000;
    }).length;

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
        live_agents: liveAgents,
      },
    });
  },

  distanceMeters,
};
