const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "ops.json");

function createDefaultOps() {
  return {
    adminPassword: "Admin@123456",
    company: {
      lat: 33.3152,
      lng: 44.3661,
      radiusMeters: 100,
      autoCheckoutHour: 23,
      name: "موقع الشركة",
      requireGeofence: true,
    },
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

function normalizeCompany(company) {
  const defaults = createDefaultOps().company;
  const source = company || {};
  const lat = Number(source.lat);
  const lng = Number(source.lng);
  const radiusMeters = Number(source.radiusMeters);

  return {
    ...defaults,
    ...source,
    lat: Number.isFinite(lat) ? lat : defaults.lat,
    lng: Number.isFinite(lng) ? lng : defaults.lng,
    radiusMeters:
      Number.isFinite(radiusMeters) && radiusMeters > 0
        ? radiusMeters
        : defaults.radiusMeters,
    name: String(source.name || defaults.name).trim() || defaults.name,
    requireGeofence: source.requireGeofence !== false,
  };
}

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = createDefaultOps();
      writeStore(initial);
      return initial;
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      ...createDefaultOps(),
      ...parsed,
      company: normalizeCompany(parsed.company),
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
  } catch (error) {
    console.error("Failed to read ops store:", error);
    return createDefaultOps();
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

module.exports = {
  createDefaultOps,
  readStore,
  writeStore,
};
