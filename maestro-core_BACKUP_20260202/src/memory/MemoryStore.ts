import fs from "fs";
import path from "path";

export class MemoryStore {
  private basePath = path.resolve("src/memory/data");

  constructor() {
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  save(runId: string, data: any) {
    const file = path.join(this.basePath, `${runId}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  load(runId: string) {
    const file = path.join(this.basePath, `${runId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
}

