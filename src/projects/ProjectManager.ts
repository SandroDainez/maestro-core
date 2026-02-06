import { MaestroProject } from "../types";

export class ProjectManager {
  private projects: MaestroProject[] = [];

  add(project: MaestroProject) {
    this.projects.push(project);
  }

  list() {
    return this.projects;
  }

  getById(id: string) {
    return this.projects.find((p) => p.id === id);
  }
}

