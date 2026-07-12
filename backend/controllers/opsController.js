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

  const store = {
    ...createDefaultOps(),
    ...incoming,
    agents: Array.isArray(incoming.agents) ? incoming.agents : [],
    employees: Array.isArray(incoming.employees) ? incoming.employees : [],
    customers: Array.isArray(incoming.customers) ? incoming.customers : [],
    orders: Array.isArray(incoming.orders) ? incoming.orders : [],
    attendance: Array.isArray(incoming.attendance) ? incoming.attendance : [],
    nextIds: {
      ...createDefaultOps().nextIds,
      ...(incoming.nextIds || {}),
    },
  };

  writeStore(store);

  return res.json({
    success: true,
    store,
  });
}

module.exports = {
  getOps,
  putOps,
};
