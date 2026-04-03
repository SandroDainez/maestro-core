import type {
  AutopilotRisk,
  AutopilotScanResult,
  MaestroJob,
  MaestroProject,
} from "../../types";
import type {
  MemoryCategory,
  MemoryMetadata,
  MemoryScope,
} from "../memory/types";

export type ObjectiveIntent = "scan" | "plan" | "report" | "execute";

export type Objective = {
  raw: string;
  normalized: string;
  intent: ObjectiveIntent;
  dryRun: boolean;
  projectPath: string;
};

export type MemoryRecord = {
  id: string;
  tenantId: string;
  projectId: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  score?: number;
  createdAt?: string;
};

export type PlanningPreferences = {
  preferredStack?: string;
  defaultDomain?: string;
  codingStyle?: "strict" | "fast" | "enterprise";
  autoApproveLowRisk?: boolean;
};

export type PlanningFeedbackPattern = {
  sourceRecordId: string;
  category: MemoryCategory;
  patternType:
    | "successful_plan"
    | "failed_plan"
    | "step_structure"
    | "tool_sequence"
    | "agent_usage";
  summary: string;
  score: number;
  relatedPlanId?: string;
  relatedExecutionId?: string;
};

export type PlanningPerformanceSignal = {
  sourceRecordId: string;
  entityType: "agent" | "tool";
  entityName: string;
  score: number;
  successRate: number;
  sampleSize: number;
  averageDurationMs?: number;
};

export type PlanningFeedbackContext = {
  successfulRecords: MemoryRecord[];
  failedRecords: MemoryRecord[];
  successPatterns: PlanningFeedbackPattern[];
  failurePatterns: PlanningFeedbackPattern[];
  agentPerformance: PlanningPerformanceSignal[];
  toolEffectiveness: PlanningPerformanceSignal[];
};

export type PlanningMemoryContext = {
  records: MemoryRecord[];
  recentProjects: string[];
  preferences: PlanningPreferences;
  recentDecisions: string[];
  feedback: PlanningFeedbackContext;
};

export type PlanningContext = {
  tenantId: string;
  project: MaestroProject;
  objective: Objective;
  scan: AutopilotScanResult;
  risks: AutopilotRisk[];
  memory: PlanningMemoryContext;
};

export type PlanStepType =
  | "analysis"
  | "generation"
  | "modification"
  | "validation";

export type PlanStep = {
  id: string;
  title: string;
  summary: string;
  phase: string;
  type: PlanStepType;
  order: number;
  agent: string;
  dependencies: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
  expectedOutput: string;
};

export type PlanPhase = {
  phase: string;
  summary: string;
  taskCount: number;
};

export type PlanDependency = {
  stepId: string;
  dependsOn: string[];
};

export type PlanRisk = {
  id: string;
  level: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  summary: string;
  mitigation?: string;
};

export type Plan = {
  objective: Objective;
  project: Pick<MaestroProject, "id" | "name" | "rootPath" | "currentPhase">;
  goals: string[];
  steps: PlanStep[];
  agentsRequired: string[];
  dependencies: PlanDependency[];
  risks: PlanRisk[];
  confidence: number;
  reasoningSummary: string;
  jobs: MaestroJob[];
  phases: PlanPhase[];
  summary: {
    totalJobs: number;
    totalTasks: number;
    highRiskCount: number;
  };
  metadata: Record<string, string | number | boolean | null>;
};

export type PlanPersistenceRecord = {
  tenantId: string;
  projectId: string;
  objective: Objective;
  plan: Plan;
  scan: AutopilotScanResult;
  risks: AutopilotRisk[];
};
