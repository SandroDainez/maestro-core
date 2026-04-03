import type { PlanPersistenceRecord } from "../types";

export interface PlanPersistencePort {
  save(record: PlanPersistenceRecord): Promise<void>;
}
