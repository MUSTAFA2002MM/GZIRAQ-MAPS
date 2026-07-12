const { readStore, writeStore, createDefaultOps } = require("../services/opsService");

function getOps(req, res) {
  return res.json({
    success: true,
    store: readStore(),
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

  const defaults = createDefaultOps();
  const store = {
    ...defaults,
    ...incoming,
    company: {
      ...defaults.company,
      ...(incoming.company || {}),
    },
    agents: Array.isArray(incoming.agents) ? incoming.agents : [],
    employees: Array.isArray(incoming.employees) ? incoming.employees : [],
    customers: Array.isArray(incoming.customers) ? incoming.customers : [],
    orders: Array.isArray(incoming.orders) ? incoming.orders : [],
    attendance: Array.isArray(incoming.attendance) ? incoming.attendance : [],
    nextIds: {
      ...defaults.nextIds,
      ...(incoming.nextIds || {}),
    },
  };

  writeStore(store);

  return res.json({
    success: true,
    store: readStore(),
  });
}

module.exports = {
  getOps,
  putOps,
};
