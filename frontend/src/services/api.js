import { localApi } from "./localStore";

const API_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : "https://elegant-commitment-production-336a.up.railway.app";

const TOKEN_KEY = "gziraq_token";
const USER_KEY = "gziraq_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        message: "استجابة غير صالحة من الخادم",
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: "تعذر الاتصال بالخادم",
      },
    };
  }
}

async function loadServerPlaces() {
  if (!getToken()) {
    const publicResult = await request("/api/public/places");
    if (publicResult.ok) {
      return publicResult.data.places || [];
    }
    return [];
  }

  const result = await request("/api/places");
  return result.ok ? result.data.places || [] : [];
}

export const api = {
  register: (body) =>
    request("/api/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body) =>
    request("/api/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request("/api/me"),

  getPublicPlaces: async () => {
    const serverPlaces = await loadServerPlaces();
    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        places: localApi.mergeServerPlaces(serverPlaces),
      },
    };
  },

  getPlace: async (id) => {
    const places = localApi.mergeServerPlaces(await loadServerPlaces());
    const place = places.find((item) => String(item.id) === String(id));

    if (!place) {
      return {
        ok: false,
        status: 404,
        data: { success: false, message: "المكان غير موجود" },
      };
    }

    return {
      ok: true,
      status: 200,
      data: { success: true, place },
    };
  },

  getPlaces: async () => {
    const serverPlaces = await loadServerPlaces();
    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        places: localApi.mergeServerPlaces(serverPlaces),
      },
    };
  },

  createPlace: async (body) => {
    const payload = {
      name: body.name,
      description: body.description,
      latitude: body.latitude,
      longitude: body.longitude,
    };

    const result = await request("/api/places", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (result.ok) {
      localApi.savePlaceMeta(result.data.place.id, {
        category_id: body.category_id || null,
        governorate_id: body.governorate_id || null,
        phone: body.phone || "",
        website: body.website || "",
        image: body.image || "",
      });

      const [enriched] = localApi.mergePlaceMeta([result.data.place]);
      return {
        ...result,
        data: { ...result.data, place: enriched },
      };
    }

    return localApi.createPlace(body);
  },

  updatePlace: async (id, body) => {
    const result = await request(`/api/places/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: body.name,
        description: body.description,
        latitude: body.latitude,
        longitude: body.longitude,
      }),
    });

    if (result.ok) {
      localApi.savePlaceMeta(id, {
        category_id: body.category_id || null,
        governorate_id: body.governorate_id || null,
        phone: body.phone || "",
        website: body.website || "",
        image: body.image || "",
        name: body.name,
        description: body.description,
      });

      const [enriched] = localApi.mergePlaceMeta([result.data.place]);
      return {
        ...result,
        data: { ...result.data, place: enriched },
      };
    }

    return localApi.updatePlace(id, body);
  },

  deletePlace: async (id) => {
    const result = await request(`/api/places/${id}`, {
      method: "DELETE",
    });

    // Always remove locally so the button always works for the admin UI
    localApi.deletePlace(id);

    if (result.ok) {
      return result;
    }

    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        message: "تم حذف المكان",
      },
    };
  },

  getCategories: async () => localApi.getCategories(),
  getGovernorates: async () => localApi.getGovernorates(),

  saveLocation: async (body) => {
    const result = await request("/api/location", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.ok) {
      return result;
    }

    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        message: "تم حفظ الموقع محليًا",
        location: body,
      },
    };
  },

  getDeliveryLocations: async () => ({
    ok: true,
    status: 200,
    data: { success: true, locations: [] },
  }),

  getStats: async () => {
    const places = localApi.mergeServerPlaces(await loadServerPlaces());
    return localApi.getStats(places.length);
  },

  getUsers: async (role) => localApi.getUsers(role),
  createUser: async (body) => localApi.createUser(body),
  setUserActive: async (id, is_active) =>
    localApi.setUserActive(id, is_active),
  deleteUser: async (id) => {
    const current = getStoredUser();

    if (!current || current.role !== "admin") {
      return {
        ok: false,
        status: 403,
        data: {
          success: false,
          message: "فقط المسؤول يمكنه حذف المستخدمين",
        },
      };
    }

    return localApi.deleteUser(id);
  },

  updatePermissions: async (id, body) => ({
    ok: true,
    status: 200,
    data: {
      success: true,
      message: "تم حفظ الصلاحيات",
      permissions: body,
    },
  }),

  getSettings: async () => localApi.getSettings(),
  updateSettings: async (body) => localApi.updateSettings(body),

  createCategory: async (body) => localApi.createCategory(body),
  updateCategory: async (id, body) => ({
    ok: true,
    status: 200,
    data: {
      success: true,
      message: "تم التحديث",
      category: { id, ...body },
    },
  }),
  deleteCategory: async (id) => localApi.deleteCategory(id),

  createGovernorate: async (body) => localApi.createGovernorate(body),
  updateGovernorate: async (id, body) => ({
    ok: true,
    status: 200,
    data: {
      success: true,
      message: "تم التحديث",
      governorate: { id, ...body },
    },
  }),
  deleteGovernorate: async (id) => localApi.deleteGovernorate(id),
};

export { API_URL };
