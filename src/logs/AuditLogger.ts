import fs from "fs";
import path from "path";

/* ---------------- TYPES ---------------- */

export type AuditEventType =
  | "boot"
  | "mode_changed"
  | "task_added"
  | "task_selected"
  | "task_started"
  | "task_done"
  | "task_failed"
  | "approval"
  | "no_pending_tasks"
  | "task_cleared"
  | "project_created"
  | "project_used";

export interface AuditEvent {
  ts?: string;
  type: AuditEventType;
  mode?: string;
  task?: string;
  taskId?: string;
  project?: string;
  agent?: string;
  approved?: boolean;
  msg?: string;
}

/* ---------------- LOGGER ---------------- */

export class AuditLogger {
  private filePath: string;

  constructor() {
    const base = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(base)) {
      fs.mkdirSync(base, { recursive: true });
    }

    this.filePath = path.join(base, "audit.log");
  }

  log(event: AuditEvent) {
    const entry: AuditEvent = {
      ts: new Date().toISOString(),
      ...event,
    };

    fs.appendFileSync(this.filePath, JSON.stringify(entry) + "\n");
  }

  read(): AuditEvent[] {
    if (!fs.existsSync(this.filePath)) return [];

    const raw = fs.readFileSync(this.filePath, "utf-8");

    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  readLastLines(maxLines = 50): AuditEvent[] {
    return this.read().slice(-maxLines);
  }

  clear() {
    fs.writeFileSync(this.filePath, "");
  }
}

