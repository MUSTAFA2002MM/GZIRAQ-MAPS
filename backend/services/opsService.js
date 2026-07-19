const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "ops.json");

function createDefaultOps() {
  return {
    adminPassword: "Admin@123456",
    adminProfile: {
      name: "مصطفى كوانزو",
      avatar: "",
    },
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
    agentLocations: [],
    notifications: [],
    nextIds: {
      agent: 1,
      employee: 1,
      customer: 1,
      order: 1,
      attendance: 1,
      notification: 1,
    },
  };
}

function normalizeAdminProfile(profile) {
  const defaults = createDefaultOps().adminProfile;
  const source = profile || {};
  return {
    name: String(source.name || defaults.name).trim() || defaults.name,
    avatar: String(source.avatar || "").trim(),
  };
}

/** Keep the freshest GPS point per agent — prevents stale PUT from wiping live tracks. */
function mergeAgentLocations(current = [], incoming = []) {
  const map = new Map();

  for (const item of [...(current || []), ...(incoming || [])]) {
    if (!item || item.agent_id == null) continue;
    const id = Number(item.agent_id);
    if (!Number.isFinite(id)) continue;

    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const next = {
      agent_id: id,
      agent_name: String(item.agent_name || "مندوب"),
      lat,
      lng,
      accuracy: Number.isFinite(Number(item.accuracy))
        ? Number(item.accuracy)
        : null,
      updated_at: item.updated_at || new Date().toISOString(),
    };

    const prev = map.get(id);
    const nextTime = next.updated_at ? new Date(next.updated_at).getTime() : 0;
    const prevTime = prev?.updated_at ? new Date(prev.updated_at).getTime() : 0;

    if (!prev || nextTime >= prevTime) {
      map.set(id, next);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });
}

function mergeNotifications(current = [], incoming = []) {
  const map = new Map();

  for (const item of [...(current || []), ...(incoming || [])]) {
    if (!item || item.id == null) continue;
    const id = Number(item.id);
    if (!Number.isFinite(id)) continue;

    const prev = map.get(id);
    if (!prev) {
      map.set(id, { ...item, id, read: Boolean(item.read) });
      continue;
    }

    const prevTime = prev.created_at ? new Date(prev.created_at).getTime() : 0;
    const nextTime = item.created_at ? new Date(item.created_at).getTime() : 0;
    const newer = nextTime >= prevTime ? item : prev;
    map.set(id, {
      ...newer,
      id,
      read: Boolean(prev.read || item.read),
    });
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 100);
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
      adminProfile: normalizeAdminProfile(parsed.adminProfile),
      company: normalizeCompany(parsed.company),
      agents: parsed.agents || [],
      employees: parsed.employees || [],
      customers: parsed.customers || [],
      orders: parsed.orders || [],
      attendance: parsed.attendance || [],
      agentLocations: parsed.agentLocations || [],
      notifications: parsed.notifications || [],
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
  normalizeAdminProfile,
  mergeAgentLocations,
  mergeNotifications,
  readStore,
  writeStore,
};
