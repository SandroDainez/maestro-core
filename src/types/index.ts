// src/types/index.ts

export interface MaestroProject {
  id: string;
  name: string;
  slug: string;
  rootDir: string;
  commits: string[];
  currentPhase: number;
}

export interface MaestroContext {
  runId: string;

  // modo de execução
  mode: "run" | "resume" | "retry";
}

