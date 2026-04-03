import fs from "fs";
import path from "path";

export type GovernanceAuditEvent = {
  timestamp: string;
  type:
    | "memory_update"
    | "human_request"
    | "approval_required"
    | "execution_started"
    | "execution_completed"
    | "execution_blocked";
  projectPath?: string;
  runId?: string;
  actor?: string;
  details: Record<string, unknown>;
};

export class AuditLogger {
  private readonly filePath: string;

  constructor(baseDir: string = process.cwd()) {
    const auditDir = path.join(baseDir, "data");
    fs.mkdirSync(auditDir, { recursive: true });
    this.filePath = path.join(auditDir, "governance-audit.jsonl");
  }

  log(event: Omit<GovernanceAuditEvent, "timestamp">) {
    const payload: GovernanceAuditEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    fs.appendFileSync(this.filePath, `${JSON.stringify(payload)}\n`, "utf-8");
  }

  list(limit = 100): GovernanceAuditEvent[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    return fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as GovernanceAuditEvent)
      .slice(-limit)
      .reverse();
  }
}
