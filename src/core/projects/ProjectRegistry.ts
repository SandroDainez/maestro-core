// src/core/projects/ProjectRegistry.ts

import type { MaestroProject } from "../../../src/types";

export class ProjectRegistry {
  private projects = new Map<string, MaestroProject>();
  private activeProjectId: string | null = null;

  registerProject(project: MaestroProject) {
    this.projects.set(project.id, project);
  }

  createProject(projectPath: string): MaestroProject {
    const id = `proj-${projectPath}-${Date.now()}`.replace(/[^\w-]/g, "-");
    const name = projectPath === "." ? "root" : projectPath;

    const project: MaestroProject = {
      id,
      name,
      rootPath: projectPath,
      currentPhase: "scan",
      createdAt: new Date(),
    };

    this.registerProject(project);
    this.setActiveProject(project.id);

    return project;
  }

  setActiveProject(projectId: string) {
    if (!this.projects.has(projectId)) {
      throw new Error(`ProjectRegistry: projectId não registrado: ${projectId}`);
    }
    this.activeProjectId = projectId;
  }

  getActiveProject(): MaestroProject {
    if (!this.activeProjectId) {
      throw new Error("No active project");
    }
    const p = this.projects.get(this.activeProjectId);
    if (!p) throw new Error("No active project");
    return p;
  }

  getProject(projectId: string): MaestroProject | null {
    return this.projects.get(projectId) ?? null;
  }
}

