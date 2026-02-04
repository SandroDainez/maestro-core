import fs from "fs";
import path from "path";

export interface PersistedState {
  maestro: any;
  tasks: any[];
  projects: any[];
}

export class MemoryStore {
  private filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), "data/state.json");
  }

  load(): PersistedState {
    if (!fs.existsSync(this.filePath)) {
      return { maestro: {}, tasks: [], projects: [] };
    }

    const raw = fs.readFileSync(this.filePath, "utf-8");

    try {
      return JSON.parse(raw);
    } catch {
      return { maestro: {}, tasks: [], projects: [] };
    }
  }

  save(state: PersistedState) {
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }
}

