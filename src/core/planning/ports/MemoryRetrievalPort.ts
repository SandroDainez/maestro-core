import type { Objective, PlanningMemoryContext } from "../types";
import type { MemoryCategory, MemoryScope } from "../../memory/types";

export type MemoryRetrievalQuery = {
  tenantId: string;
  projectId: string;
  projectPath: string;
  objective: Objective;
  categories?: MemoryCategory[];
  scopes?: MemoryScope[];
  limit?: number;
  successScoreThreshold?: number;
  failureScoreThreshold?: number;
};

export interface MemoryRetrievalPort {
  retrieve(query: MemoryRetrievalQuery): Promise<PlanningMemoryContext>;
}
