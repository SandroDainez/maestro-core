import crypto from "crypto";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  status: "planning" | "active" | "paused" | "done";
  tasks: any[];
  history: any[];
}

export class ProjectStore {
  private projects: Project[] = [];
  private activeId?: string;

  load(data: any) {
    this.projects = data?.projects || [];
    this.activeId = data?.activeProjectId;
  }

  dump() {
    return {
      projects: this.projects,
      activeProjectId: this.activeId,
    };
  }

  create(name: string): Project {
    const p: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      status: "planning",
      tasks: [],
      history: [],
    };

    this.projects.push(p);
    this.activeId = p.id;

    return p;
  }

  getActive(): Project | undefined {
    return this.projects.find((p) => p.id === this.activeId);
  }

  list() {
    return this.projects;
  }

  use(name: string): Project | undefined {
    const p = this.projects.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (p) this.activeId = p.id;
    return p;
  }

  clearActiveTasks() {
    const p = this.getActive();
    if (p) p.tasks = [];
  }
}

