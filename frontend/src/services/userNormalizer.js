const BOOTSTRAP_ADMIN_EMAIL = "admin@gziraq.com";

/**
 * Old Railway API does not return role yet.
 * Keep the known bootstrap admin usable until the new backend is deployed.
 */
export function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const email = String(user.email || "")
    .trim()
    .toLowerCase();

  if (!user.role && email === BOOTSTRAP_ADMIN_EMAIL) {
    return {
      ...user,
      role: "admin",
      is_active: true,
    };
  }

  return {
    ...user,
    role: user.role || "employee",
    is_active: user.is_active !== false,
  };
}

export { BOOTSTRAP_ADMIN_EMAIL };
