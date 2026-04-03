const ROLE_ORDER = ["member", "manager", "admin", "owner"] as const;

export type AppRole = (typeof ROLE_ORDER)[number];

export function normalizeRole(role?: string | null): AppRole {
  const normalized = (role ?? "member").trim().toLowerCase();

  if (ROLE_ORDER.includes(normalized as AppRole)) {
    return normalized as AppRole;
  }

  return "member";
}

export function hasRequiredRole(role: string | null | undefined, minimum: AppRole) {
  return ROLE_ORDER.indexOf(normalizeRole(role)) >= ROLE_ORDER.indexOf(minimum);
}

export function isAdminRole(role: string | null | undefined) {
  return hasRequiredRole(role, "admin");
}
