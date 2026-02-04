// ===============================
// Maestro Core Types
// ===============================

// -------------------------------
// Execution Mode
// -------------------------------

export type MaestroMode =
  | "normal"
  | "safe"
  | "interactive";

// -------------------------------
// Audit / Logging
// -------------------------------

export type AuditEvent = {
  id: string;
  timestamp: Date;
  message: string;
  data?: any;
};

// -------------------------------
// Project
// -------------------------------

export type MaestroProject = {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
};

// -------------------------------
// Execution Context
// -------------------------------

export type MaestroContext = {
  runId: string;
  goal: string;
  startedAt: Date;
  cwd: string;
};

