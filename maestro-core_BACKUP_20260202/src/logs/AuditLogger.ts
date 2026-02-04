import fs from "fs";
import path from "path";
import { AuditEvent } from "../types";

export class AuditLogger {
  private logPath = path.resolve("src/logs/data");

  constructor() {
    fs.mkdirSync(this.logPath, { recursive: true });
  }

  log(event: AuditEvent) {
    const file = path.join(this.logPath, "audit.log");
    fs.appendFileSync(file, JSON.stringify(event) + "\n");
  }
}

