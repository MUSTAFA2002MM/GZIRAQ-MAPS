const STORE_KEY = "gziraq_local_store_v1";

const DEFAULT_CATEGORIES = [
  { id: 1, name: "مطاعم", icon: "restaurant" },
  { id: 2, name: "مقاهي", icon: "cafe" },
  { id: 3, name: "فنادق", icon: "hotel" },
  { id: 4, name: "مستشفيات", icon: "hospital" },
  { id: 5, name: "صيدليات", icon: "pharmacy" },
  { id: 6, name: "مدارس", icon: "school" },
  { id: 7, name: "جامعات", icon: "university" },
  { id: 8, name: "محطات وقود", icon: "fuel" },
  { id: 9, name: "أسواق", icon: "market" },
  { id: 10, name: "مساجد", icon: "mosque" },
  { id: 11, name: "حدائق", icon: "park" },
  { id: 12, name: "أخرى", icon: "other" },
];

const DEFAULT_GOVERNORATES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "النجف",
  "كربلاء",
  "الأنبار",
  "ديالى",
  "بابل",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "القادسية",
  "صلاح الدين",
  "كركوك",
  "دهوك",
  "السليمانية",
].map((name, index) => ({
  id: index + 1,
  name,
}));

const DEFAULT_SETTINGS = {
  app_name: "GZIRAQ MAPS",
  public_registration: "false",
  default_map_lat: "33.3152",
  default_map_lng: "44.3661",
  default_map_zoom: "12",
};

function createDefaultStore() {
  return {
    users: [
      {
        id: 1,
        name: "Admin",
        email: "admin@gziraq.com",
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    categories: DEFAULT_CATEGORIES.map((item) => ({
      ...item,
      created_at: new Date().toISOString(),
    })),
    governorates: DEFAULT_GOVERNORATES.map((item) => ({
      ...item,
      created_at: new Date().toISOString(),
    })),
    settings: { ...DEFAULT_SETTINGS },
    places: [],
    placesMeta: {},
    deletedPlaceIds: [],
    nextIds: {
      user: 2,
      category: DEFAULT_CATEGORIES.length + 1,
      governorate: DEFAULT_GOVERNORATES.length + 1,
      place: 1000,
    },
  };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);

    if (!raw) {
      const initial = createDefaultStore();
      writeStore(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);

    return {
      ...createDefaultStore(),
      ...parsed,
      places: parsed.places || [],
      deletedPlaceIds: parsed.deletedPlaceIds || [],
      placesMeta: parsed.placesMeta || {},
      nextIds: {
        ...createDefaultStore().nextIds,
        ...(parsed.nextIds || {}),
      },
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    const initial = createDefaultStore();
    writeStore(initial);
    return initial;
  }
}

function writeStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function ok(data) {
  return {
    ok: true,
    status: 200,
    data: {
      success: true,
      ...data,
    },
  };
}

function fail(message, status = 400) {
  return {
    ok: false,
    status,
    data: {
      success: false,
      message,
    },
  };
}

export const localApi = {
  getUsers(role) {
    const store = readStore();
    let users = store.users || [];

    if (role) {
      users = users.filter((user) => user.role === role);
    }

    return ok({ users });
  },

  createUser(body) {
    const store = readStore();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "employee").trim();

    if (!name || !email || !body.password || String(body.password).length < 6) {
      return fail("أدخل بيانات صحيحة مع كلمة مرور من 6 أحرف على الأقل");
    }

    if (!["employee", "delivery"].includes(role)) {
      return fail("الدور غير صالح");
    }

    if (store.users.some((user) => user.email === email)) {
      return fail("البريد الإلكتروني مستخدم مسبقًا", 409);
    }

    const user = {
      id: store.nextIds.user++,
      name,
      email,
      role,
      is_active: true,
      can_edit_places: Boolean(body.can_edit_places),
      can_upload_images: Boolean(body.can_upload_images),
      created_at: new Date().toISOString(),
    };

    store.users.unshift(user);
    writeStore(store);

    return {
      ok: true,
      status: 201,
      data: {
        success: true,
        message: "تم إنشاء الحساب بنجاح",
        user,
      },
    };
  },

  setUserActive(id, isActive) {
    const store = readStore();
    const user = store.users.find((item) => Number(item.id) === Number(id));

    if (!user) {
      return fail("المستخدم غير موجود", 404);
    }

    if (user.role === "admin") {
      return fail("لا يمكن تعطيل حساب المسؤول", 403);
    }

    user.is_active = Boolean(isActive);
    writeStore(store);

    return ok({
      message: isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب",
      user,
    });
  },

  deleteUser(id) {
    const store = readStore();
    const user = store.users.find((item) => Number(item.id) === Number(id));

    if (!user) {
      return fail("المستخدم غير موجود", 404);
    }

    if (user.role === "admin") {
      return fail("لا يمكن حذف حساب المسؤول", 403);
    }

    store.users = store.users.filter((item) => Number(item.id) !== Number(id));
    writeStore(store);

    return ok({ message: "تم حذف المستخدم" });
  },

  getCategories() {
    return ok({ categories: readStore().categories });
  },

  createCategory(body) {
    const store = readStore();
    const name = String(body.name || "").trim();
    const icon = String(body.icon || "other").trim();

    if (!name) {
      return fail("أدخل اسم التصنيف");
    }

    if (store.categories.some((item) => item.name === name)) {
      return fail("التصنيف موجود مسبقًا", 409);
    }

    const category = {
      id: store.nextIds.category++,
      name,
      icon,
      created_at: new Date().toISOString(),
    };

    store.categories.push(category);
    writeStore(store);

    return {
      ok: true,
      status: 201,
      data: {
        success: true,
        message: "تم إضافة التصنيف",
        category,
      },
    };
  },

  deleteCategory(id) {
    const store = readStore();
    const exists = store.categories.some(
      (item) => Number(item.id) === Number(id)
    );

    if (!exists) {
      return fail("التصنيف غير موجود", 404);
    }

    store.categories = store.categories.filter(
      (item) => Number(item.id) !== Number(id)
    );
    writeStore(store);

    return ok({ message: "تم حذف التصنيف" });
  },

  getGovernorates() {
    return ok({ governorates: readStore().governorates });
  },

  createGovernorate(body) {
    const store = readStore();
    const name = String(body.name || "").trim();

    if (!name) {
      return fail("أدخل اسم المحافظة");
    }

    if (store.governorates.some((item) => item.name === name)) {
      return fail("المحافظة موجودة مسبقًا", 409);
    }

    const governorate = {
      id: store.nextIds.governorate++,
      name,
      created_at: new Date().toISOString(),
    };

    store.governorates.push(governorate);
    writeStore(store);

    return {
      ok: true,
      status: 201,
      data: {
        success: true,
        message: "تم إضافة المحافظة",
        governorate,
      },
    };
  },

  deleteGovernorate(id) {
    const store = readStore();
    const exists = store.governorates.some(
      (item) => Number(item.id) === Number(id)
    );

    if (!exists) {
      return fail("المحافظة غير موجودة", 404);
    }

    store.governorates = store.governorates.filter(
      (item) => Number(item.id) !== Number(id)
    );
    writeStore(store);

    return ok({ message: "تم حذف المحافظة" });
  },

  getSettings() {
    const settings = Object.entries(readStore().settings).map(
      ([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      })
    );

    return ok({ settings });
  },

  updateSettings(body) {
    const store = readStore();
    store.settings = {
      ...store.settings,
      ...Object.fromEntries(
        Object.entries(body || {}).map(([key, value]) => [key, String(value)])
      ),
    };
    writeStore(store);

    const result = this.getSettings();
    result.data.message = "تم حفظ الإعدادات";
    return result;
  },

  getStats(placesCount = 0) {
    const store = readStore();
    const users = store.users || [];
    const localPlaces = (store.places || []).length;
    const totalPlaces = Math.max(placesCount, localPlaces);

    return ok({
      stats: {
        total_users: users.length,
        employees: users.filter((user) => user.role === "employee").length,
        delivery_accounts: users.filter((user) => user.role === "delivery")
          .length,
        active_users: users.filter((user) => user.is_active).length,
        places: totalPlaces,
        categories: (store.categories || []).length,
        governorates: (store.governorates || []).length,
      },
    });
  },

  mergePlaceMeta(places = []) {
    const store = readStore();
    const categories = store.categories || [];
    const governorates = store.governorates || [];
    const deleted = new Set((store.deletedPlaceIds || []).map(String));

    return places
      .filter((place) => !deleted.has(String(place.id)))
      .map((place) => {
        const meta = store.placesMeta?.[String(place.id)] || {};
        const category = categories.find(
          (item) =>
            Number(item.id) === Number(meta.category_id || place.category_id)
        );
        const governorate = governorates.find(
          (item) =>
            Number(item.id) ===
            Number(meta.governorate_id || place.governorate_id)
        );

        return {
          ...place,
          ...meta,
          category_name: category?.name || place.category_name,
          category_icon: category?.icon || place.category_icon,
          governorate_name: governorate?.name || place.governorate_name,
        };
      });
  },

  savePlaceMeta(placeId, meta) {
    const store = readStore();
    const key = String(placeId);

    store.placesMeta[key] = {
      ...(store.placesMeta[key] || {}),
      ...meta,
    };

    const localPlace = (store.places || []).find(
      (item) => String(item.id) === key
    );

    if (localPlace) {
      Object.assign(localPlace, meta, {
        updated_at: new Date().toISOString(),
      });
    }

    writeStore(store);
  },

  listPlaces() {
    const store = readStore();
    return this.mergePlaceMeta(store.places || []);
  },

  createPlace(body) {
    const store = readStore();
    const name = String(body.name || "").trim();

    if (!name) {
      return fail("أدخل اسم المكان");
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return fail("إحداثيات الموقع غير صحيحة");
    }

    const place = {
      id: store.nextIds.place++,
      name,
      description: String(body.description || "").trim(),
      category_id: body.category_id || null,
      governorate_id: body.governorate_id || null,
      phone: String(body.phone || "").trim(),
      website: String(body.website || "").trim(),
      image: String(body.image || "").trim(),
      latitude,
      longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_name: "Admin",
      local: true,
    };

    store.places.unshift(place);
    store.placesMeta[String(place.id)] = {
      category_id: place.category_id,
      governorate_id: place.governorate_id,
      phone: place.phone,
      website: place.website,
      image: place.image,
    };
    writeStore(store);

    const [enriched] = this.mergePlaceMeta([place]);

    return {
      ok: true,
      status: 201,
      data: {
        success: true,
        message: "تم حفظ المكان بنجاح",
        place: enriched,
      },
    };
  },

  updatePlace(placeId, body) {
    const store = readStore();
    const key = String(placeId);
    let place = (store.places || []).find((item) => String(item.id) === key);

    if (!place) {
      place = {
        id: placeId,
        local: true,
        created_at: new Date().toISOString(),
      };
      store.places.unshift(place);
    }

    Object.assign(place, {
      name: body.name ?? place.name,
      description: body.description ?? place.description,
      category_id: body.category_id ?? place.category_id,
      governorate_id: body.governorate_id ?? place.governorate_id,
      phone: body.phone ?? place.phone,
      website: body.website ?? place.website,
      image: body.image ?? place.image,
      latitude:
        body.latitude !== undefined ? Number(body.latitude) : place.latitude,
      longitude:
        body.longitude !== undefined
          ? Number(body.longitude)
          : place.longitude,
      updated_at: new Date().toISOString(),
    });

    store.placesMeta[key] = {
      ...(store.placesMeta[key] || {}),
      category_id: place.category_id,
      governorate_id: place.governorate_id,
      phone: place.phone,
      website: place.website,
      image: place.image,
      name: place.name,
      description: place.description,
    };

    writeStore(store);

    const [enriched] = this.mergePlaceMeta([place]);

    return ok({
      message: "تم تحديث المكان بنجاح",
      place: enriched,
    });
  },

  deletePlace(placeId) {
    const store = readStore();
    const key = String(placeId);

    store.places = (store.places || []).filter(
      (item) => String(item.id) !== key
    );
    delete store.placesMeta[key];

    if (!store.deletedPlaceIds.includes(placeId)) {
      store.deletedPlaceIds.push(placeId);
    }

    writeStore(store);

    return ok({ message: "تم حذف المكان" });
  },

  mergeServerPlaces(serverPlaces = []) {
    const store = readStore();
    const deleted = new Set((store.deletedPlaceIds || []).map(String));
    const localPlaces = store.places || [];
    const serverIds = new Set(
      serverPlaces.map((place) => String(place.id)).filter(Boolean)
    );

    const merged = [
      ...serverPlaces.filter((place) => !deleted.has(String(place.id))),
      ...localPlaces.filter((place) => !serverIds.has(String(place.id))),
    ];

    return this.mergePlaceMeta(merged);
  },
};
