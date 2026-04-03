export const SUPPORTED_PLANNER_PHASES = [
  "init",
  "feature",
  "auth-install",
  "auth-config",
  "dashboard",
  "rbac",
  "seed",
  "governance-review",
  "architecture-review",
] as const;

export type SupportedPlannerPhase = (typeof SUPPORTED_PLANNER_PHASES)[number];
