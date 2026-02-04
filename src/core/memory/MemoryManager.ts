// src/core/memory/MemoryManager.ts

import * as fs from "fs";
import * as path from "path";

export interface MaestroPreferences {
  preferredStack?: string;
  defaultDomain?: string;
  codingStyle?: "strict" | "fast" | "enterprise";
  autoApproveLowRisk?: boolean;
}

export interface MemorySnapshot {
  preferences: MaestroPreferences;
  decisions: string[];
  recentProjects: string[];
}

export class MemoryManager {
  private readonly filePath: string;
  private state: MemorySnapshot;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, ".maestro-memory.json");

    this.state = {
      preferences: {},
      decisions: [],
      recentProjects: [],
    };

    this.load();
  }

  private load() {
    if (!fs.existsSync(this.filePath)) return;

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this.state = JSON.parse(raw);
    } catch {
      console.warn("⚠️ Falha ao carregar memória. Iniciando vazia.");
    }
  }

  private persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  // -------- Preferences --------

  setPreference<K extends keyof MaestroPreferences>(
    key: K,
    value: MaestroPreferences[K]
  ) {
    this.state.preferences[key] = value;
    this.persist();
  }

  getPreference<K extends keyof MaestroPreferences>(
    key: K
  ): MaestroPreferences[K] {
    return this.state.preferences[key];
  }

  getAllPreferences() {
    return this.state.preferences;
  }

  // -------- Decisions --------

  recordDecision(text: string) {
    this.state.decisions.push(
      `${new Date().toISOString()} :: ${text}`
    );
    this.persist();
  }

  // -------- Projects --------

  markProjectUsed(name: string) {
    if (!this.state.recentProjects.includes(name)) {
      this.state.recentProjects.unshift(name);
      this.state.recentProjects = this.state.recentProjects.slice(0, 10);
      this.persist();
    }
  }
}

