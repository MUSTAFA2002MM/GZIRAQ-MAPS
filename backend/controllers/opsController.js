const {
  readStore,
  writeStore,
  createDefaultOps,
  normalizeAdminProfile,
} = require("../services/opsService");

function publicStore(store) {
  const safe = { ...store };
  delete safe.adminPassword;
  return safe;
}

function getOps(req, res) {
  return res.json({
    success: true,
    store: publicStore(readStore()),
  });
}

function putOps(req, res) {
  const incoming = req.body?.store;

  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({
      success: false,
      message: "بيانات العمليات غير صالحة",
    });
  }

  const current = readStore();
  const defaults = createDefaultOps();
  const store = {
    ...defaults,
    ...incoming,
    adminPassword: current.adminPassword || defaults.adminPassword,
    adminProfile: normalizeAdminProfile(
      incoming.adminProfile || current.adminProfile
    ),
    updatedAt: Math.max(
      Number(incoming.updatedAt) || 0,
      Number(current.updatedAt) || 0,
      Date.now()
    ),
    company: {
      ...defaults.company,
      ...(incoming.company || {}),
    },
    agents: Array.isArray(incoming.agents) ? incoming.agents : [],
    employees: Array.isArray(incoming.employees) ? incoming.employees : [],
    customers: Array.isArray(incoming.customers) ? incoming.customers : [],
    orders: Array.isArray(incoming.orders) ? incoming.orders : [],
    attendance: Array.isArray(incoming.attendance) ? incoming.attendance : [],
    agentLocations: Array.isArray(incoming.agentLocations)
      ? incoming.agentLocations
      : current.agentLocations || [],
    nextIds: {
      ...defaults.nextIds,
      ...(incoming.nextIds || {}),
    },
  };

  writeStore(store);

  return res.json({
    success: true,
    store: publicStore(readStore()),
  });
}

function adminLogin(req, res) {
  const password = String(req.body?.password || "");
  const store = readStore();

  if (!password || password !== store.adminPassword) {
    return res.status(401).json({
      success: false,
      message: "كلمة مرور المدير غير صحيحة",
    });
  }

  const profile = normalizeAdminProfile(store.adminProfile);

  return res.json({
    success: true,
    token: `ops-admin-${Date.now()}`,
    user: {
      id: 1,
      name: profile.name || "المدير",
      email: "admin@gziraq.com",
      role: "admin",
      is_active: true,
      avatar: profile.avatar || "",
    },
  });
}

function changeAdminPassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    });
  }

  const store = readStore();

  if (!currentPassword || currentPassword !== store.adminPassword) {
    return res.status(401).json({
      success: false,
      message: "كلمة المرور الحالية غير صحيحة",
    });
  }

  store.adminPassword = newPassword;
  writeStore(store);

  return res.json({
    success: true,
    message: "تم تغيير كلمة مرور المدير",
  });
}

module.exports = {
  getOps,
  putOps,
  adminLogin,
  changeAdminPassword,
};
