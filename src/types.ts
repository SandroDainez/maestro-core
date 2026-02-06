// =======================
// MAESTRO TYPESYSTEM
// =======================

export enum PhaseRisk {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum MaestroMode {
  PLAN = "plan",
  EXECUTE = "execute",
  SLOW = "slow",
}

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  DONE = "done",
  FAILED = "failed",
}

// -----------------------

export interface MaestroAction {
  id: string;
  name: string;
  type: string;
  risk: PhaseRisk;
  execute: () => Promise<void>;
}

// -----------------------

export interface MaestroTask {
  id: string;
  action: MaestroAction;
  status: TaskStatus;
}

// -----------------------

export interface MaestroJob {
  id: string;
  phase: string;
  tasks: MaestroTask[];
}

// -----------------------

export interface MaestroProject {
  id: string;
  name: string;
  rootPath: string;
  currentPhase: string;
  createdAt: Date;
}

// -----------------------

export interface MaestroContext {
  project: MaestroProject;
  mode: MaestroMode;
}

// -----------------------

export type DetectedStack =
  | "typescript"
  | "node"
  | "react"
  | "next"
  | "prisma"
  | "supabase"
  | "git";

export interface AutopilotScanResult {
  hasNext: boolean;
  hasPrisma: boolean;
  hasSupabase: boolean;
  stack: DetectedStack[];
  scripts: string[];
  packageName?: string;
  packageManager?: "npm" | "yarn" | "pnpm" | "unknown";
}

export interface AutopilotRisk {
  id: string;
  risk: PhaseRisk;
  title: string;
  detail: string;
}

// -----------------------

export interface PreviewDiff {
  file: string;
  diff: string;
}

export interface AutopilotScanOutput {
  project: MaestroProject;
  scan: AutopilotScanResult;
  risks: AutopilotRisk[];
  jobs: MaestroJob[];
  runId: string;
  runDir: string;
  reportMarkdownPath: string;
  reportJsonPath: string;
  previews?: PreviewDiff[];
}

